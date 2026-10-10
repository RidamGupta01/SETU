require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
const Ward = require('./models/Ward');
const Zone = require('./models/Zone');
const Permit = require('./models/Permit');
const Complaint = require('./models/Complaint');
const ComplaintTimeline = require('./models/ComplaintTimeline');
const AuditLog = require('./models/AuditLog');

async function runTest() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/setu';
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    // 1. Ensure a default Department exists
    let dept = await Department.findOne({ name: 'BMC' });
    if (!dept) {
      console.log('Creating default BMC department...');
      dept = await Department.create({ name: 'BMC', description: 'Bhopal Municipal Corporation' });
    }

    // 2. Ensure a default Zone and Ward exist
    let zone = await Zone.findOne({ code: 'Z-1' });
    if (!zone) {
      console.log('Creating Zone 1...');
      zone = await Zone.create({
        name: 'Zone 1',
        code: 'Z-1',
        boundary: {
          type: 'Polygon',
          coordinates: [[[77.30, 23.15], [77.46, 23.15], [77.46, 23.30], [77.30, 23.30], [77.30, 23.15]]]
        }
      });
    }

    let ward = await Ward.findOne({ number: 45 });
    if (!ward) {
      console.log('Creating Ward 45 default mapping...');
      ward = await Ward.create({
        zone: zone._id,
        name: 'Ward 45 (MP Nagar)',
        number: 45,
        boundary: {
          type: 'Polygon',
          coordinates: [[[77.30, 23.15], [77.46, 23.15], [77.46, 23.30], [77.30, 23.30], [77.30, 23.15]]]
        },
        defaultDepartment: dept._id
      });
    } else if (!ward.defaultDepartment) {
      ward.defaultDepartment = dept._id;
      await ward.save();
    }

    // 3. Ensure a test User exists
    let citizen = await User.findOne({ email: 'test_citizen@example.com' });
    if (!citizen) {
      console.log('Creating test citizen...');
      citizen = await User.create({
        email: 'test_citizen@example.com',
        password: 'password123',
        fullName: 'Test Citizen',
        role: 'citizen'
      });
    }

    // 4. Create a Complaint with Auto-Assignment
    console.log('Simulating new Complaint creation...');
    const complaintNumber = `CMP-${Math.floor(100000 + Math.random() * 900000)}`;
    const lat = 23.23;
    const lng = 77.43;

    // Assignment Logic
    let assignedDepartmentId = null;
    let assignmentNote = '';

    // Check Permit proximity
    const nearestPermit = await Permit.findOne({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 500
        }
      },
      status: { $in: ['Approved', 'Active'] }
    }).populate('department');

    // Check Ward geo-intersection
    const containingWard = await Ward.findOne({
      boundary: {
        $geoIntersects: {
          $geometry: { type: 'Point', coordinates: [lng, lat] }
        }
      }
    }).populate('defaultDepartment');

    if (nearestPermit && nearestPermit.department) {
      assignedDepartmentId = nearestPermit.department._id;
      assignmentNote = `Auto-assigned to ${nearestPermit.department.name} due to proximity to active Permit (${nearestPermit.permitNumber})`;
    } else if (containingWard && containingWard.defaultDepartment) {
      assignedDepartmentId = containingWard.defaultDepartment._id;
      assignmentNote = `Auto-assigned to ${containingWard.defaultDepartment.name} (default department for ${containingWard.name})`;
    } else {
      assignedDepartmentId = dept._id;
      assignmentNote = `Auto-assigned to default department (BMC) as no nearby active permits or ward mappings were found.`;
    }

    const complaint = await Complaint.create({
      complaintNumber,
      citizen: citizen._id,
      department: assignedDepartmentId,
      complaintType: 'Road Damage',
      description: 'Pothole on main lane causing safety risks.',
      location: { type: 'Point', coordinates: [lng, lat] },
      ward: ward._id,
      priority: 'High',
      status: 'Received',
      slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days SLA
    });

    console.log(`Complaint created: ${complaint.complaintNumber}`);
    console.log(`Assignment Note: ${assignmentNote}`);

    // Create Initial Timeline Step
    await ComplaintTimeline.create({
      complaint: complaint._id,
      actor: citizen._id,
      previousStatus: null,
      newStatus: 'Received',
      remarks: assignmentNote,
    });

    // Write Initial Audit Log
    await AuditLog.create({
      actor: citizen._id,
      entityType: 'complaint',
      entityId: complaint._id,
      fromStatus: 'None',
      toStatus: 'Received',
      note: assignmentNote,
    });

    console.log('Initial timeline and Audit Log written successfully.');

    // 5. Update Status
    console.log('Simulating status update to "In Progress" by an officer...');
    const prevStatus = complaint.status;
    complaint.status = 'In Progress';
    await complaint.save();

    const note = 'Dispatching repair crew to site.';
    await ComplaintTimeline.create({
      complaint: complaint._id,
      actor: citizen._id, // simulate actor
      previousStatus: prevStatus,
      newStatus: 'In Progress',
      remarks: note,
    });

    await AuditLog.create({
      actor: citizen._id,
      entityType: 'complaint',
      entityId: complaint._id,
      fromStatus: prevStatus,
      toStatus: 'In Progress',
      note: note,
    });

    console.log('Status updated, timeline and Audit Log appended.');

    // 6. Complete Resolution & Rate Feedback
    console.log('Simulating status update to "Resolved"...');
    complaint.status = 'Resolved';
    await complaint.save();
    
    await ComplaintTimeline.create({
      complaint: complaint._id,
      actor: citizen._id,
      previousStatus: 'In Progress',
      newStatus: 'Resolved',
      remarks: 'Pothole successfully patched.',
    });

    await AuditLog.create({
      actor: citizen._id,
      entityType: 'complaint',
      entityId: complaint._id,
      fromStatus: 'In Progress',
      toStatus: 'Resolved',
      note: 'Pothole successfully patched.',
    });

    console.log('Simulating citizen feedback submission (5 Stars)...');
    complaint.rating = 5;
    complaint.ratingComment = 'Fast work, very satisfied!';
    await complaint.save();

    await AuditLog.create({
      actor: citizen._id,
      entityType: 'complaint',
      entityId: complaint._id,
      fromStatus: 'Resolved',
      toStatus: 'Resolved (Rated)',
      note: 'Citizen rated: 5 stars. Comment: Fast work, very satisfied!',
    });

    console.log('Feedback rating logged. Lifecycle test completed successfully!');
    
    // Verify count of audit logs for this complaint
    const audits = await AuditLog.find({ entityId: complaint._id });
    console.log(`Verification: Total Audit Log entries created for this complaint = ${audits.length} (Expected: 4)`);

    mongoose.connection.close();
  } catch (err) {
    console.error('Test Failed:', err);
    mongoose.connection.close();
  }
}

runTest();
