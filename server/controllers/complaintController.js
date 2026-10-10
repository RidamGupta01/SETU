const Complaint = require('../models/Complaint');
const ComplaintTimeline = require('../models/ComplaintTimeline');
const Permit = require('../models/Permit');
const Ward = require('../models/Ward');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Notification = require('../models/Notification');
const photoAnalysisService = require('../services/photoAnalysisService');
const openaiAssistantService = require('../services/openaiAssistantService');

// Helper to map UI issue categories to backend Complaint types
function mapCategoryToType(cat) {
  switch (cat) {
    case 'pothole': return 'Road Damage';
    case 'waterlogging': return 'Water Leakage';
    case 'garbage': return 'Debris Accumulation';
    case 'blockage': return 'Cable Exposure';
    case 'pollution': return 'Other';
    case 'streetlight': return 'Other';
    default: return 'Other';
  }
}

// Background photo analysis logic
async function analyzeComplaintPhotoInBackground(complaintId, io) {
  try {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint || !complaint.photoUrl) return;

    console.log(`Starting background AI analysis for complaint ${complaint.complaintNumber}...`);
    let analysis;
    try {
      analysis = await photoAnalysisService.analyzeImage(complaint.photoUrl);
    } catch (apiErr) {
      console.error(`AI photo analysis failed for ${complaint.complaintNumber}:`, apiErr.message);
      complaint.aiReviewStatus = 'not_analyzed';
      await complaint.save();
      
      if (io) {
        io.emit('complaint:analyzed', { complaintId, status: 'not_analyzed' });
      }
      return;
    }

    complaint.aiCategory = analysis.category;
    complaint.aiSeverity = analysis.severity;
    complaint.aiConfidence = analysis.confidence;
    complaint.aiDescription = analysis.description;

    const confidenceThreshold = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD) || 0.75;
    
    // Ensure AI system user exists for audit log trail
    let aiUser = await User.findOne({ email: 'ai_auto_router@bhopal.gov.in' });
    if (!aiUser) {
      aiUser = await User.create({
        email: 'ai_auto_router@bhopal.gov.in',
        password: 'ai_system_password_123',
        fullName: 'auto_routed_by_ai',
        role: 'admin'
      });
    }

    if (analysis.confidence >= confidenceThreshold && analysis.category !== 'other') {
      // 1. Auto-routing based on category mapping
      let targetDeptName = '';
      let fallbackDeptName = '';
      
      switch (analysis.category) {
        case 'pothole':
        case 'broken_road':
          targetDeptName = 'PWD';
          fallbackDeptName = 'PWD';
          break;
        case 'open_sewer':
        case 'waterlogging':
          targetDeptName = 'Jal Sansadhan';
          fallbackDeptName = 'Water';
          break;
        case 'exposed_wiring':
          targetDeptName = 'Discom';
          fallbackDeptName = 'Electricity';
          break;
        case 'debris_blockage':
          targetDeptName = 'Smart City/Metro';
          fallbackDeptName = 'BMC';
          break;
        default:
          targetDeptName = 'BMC';
          fallbackDeptName = 'BMC';
      }

      let deptDoc = await Department.findOne({ name: targetDeptName });
      if (!deptDoc && fallbackDeptName) {
        deptDoc = await Department.findOne({ name: fallbackDeptName });
      }

      if (deptDoc) {
        const previousDeptId = complaint.department;
        complaint.department = deptDoc._id;
        complaint.aiReviewStatus = 'auto_routed';
        
        const note = `Auto-routed to ${deptDoc.name} by AI (Category: ${analysis.category}, Confidence: ${(analysis.confidence * 100).toFixed(0)}%)`;
        
        // Append Timeline Entry
        await ComplaintTimeline.create({
          complaint: complaint._id,
          actor: aiUser._id,
          previousStatus: complaint.status,
          newStatus: complaint.status,
          remarks: note
        });

        // Write to Audit Trail with "auto_routed_by_ai" actor
        await AuditLog.create({
          actor: aiUser._id,
          entityType: 'complaint',
          entityId: complaint._id,
          fromStatus: 'Received',
          toStatus: 'Received (Auto-Routed)',
          note: note
        });
      } else {
        complaint.aiReviewStatus = 'needs_review';
      }
    } else {
      // 2. Needs Review (Triage)
      complaint.department = null; // Unassign so it enters triage queue
      complaint.aiReviewStatus = 'needs_review';

      const note = `AI Photo Analysis completed with low confidence (${(analysis.confidence * 100).toFixed(0)}%). Sent to Nodal Triage queue.`;

      await ComplaintTimeline.create({
        complaint: complaint._id,
        actor: aiUser._id,
        previousStatus: complaint.status,
        newStatus: complaint.status,
        remarks: note
      });
    }

    await complaint.save();
    console.log(`AI photo-analysis complete for complaint ${complaint.complaintNumber}. Status: ${complaint.aiReviewStatus}`);
    
    if (io) {
      io.emit('complaint:analyzed', { complaintId, status: complaint.aiReviewStatus });
    }
  } catch (err) {
    console.error('Background photo analysis exception:', err);
  }
}

// POST /api/complaints
exports.createComplaint = async (req, res) => {
  try {
    const { description, category, lat, lng, area, priority } = req.body;
    
    if (!description || !lat || !lng) {
      return res.status(400).json({ error: 'Description, latitude, and longitude are required.' });
    }

    const complaintType = mapCategoryToType(category);
    const coordinates = [parseFloat(lng), parseFloat(lat)];
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Phase 5 Proximity / Ward Default assignment (saved as initial fallback)
    let assignedDepartmentId = null;
    let assignmentNote = '';
    
    const nearestPermit = await Permit.findOne({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates },
          $maxDistance: 500
        }
      },
      status: { $in: ['Approved', 'Active'] }
    }).populate('department');

    const containingWard = await Ward.findOne({
      boundary: {
        $geoIntersects: {
          $geometry: { type: 'Point', coordinates }
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
      const bmcDept = await Department.findOne({ name: 'BMC' });
      assignedDepartmentId = bmcDept ? bmcDept._id : null;
      assignmentNote = `Auto-assigned to default department (BMC) as no nearby active permits or ward mappings were found.`;
    }

    let wardId = containingWard ? containingWard._id : null;
    if (!wardId) {
      const anyWard = await Ward.findOne();
      if (anyWard) wardId = anyWard._id;
    }

    const complaintNumber = `CMP-${Math.floor(100000 + Math.random() * 900000)}`;

    const complaint = await Complaint.create({
      complaintNumber,
      citizen: req.user._id,
      department: assignedDepartmentId,
      complaintType,
      description,
      location: { type: 'Point', coordinates },
      photoUrl,
      ward: wardId,
      priority: priority || 'Medium',
      status: 'Received',
      slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      aiReviewStatus: photoUrl ? 'not_analyzed' : 'not_analyzed'
    });

    // Save initial timeline step
    await ComplaintTimeline.create({
      complaint: complaint._id,
      actor: req.user._id,
      previousStatus: null,
      newStatus: 'Received',
      remarks: assignmentNote,
    });

    // Write to Audit Trail
    await AuditLog.create({
      actor: req.user._id,
      entityType: 'complaint',
      entityId: complaint._id,
      fromStatus: 'None',
      toStatus: 'Received',
      note: assignmentNote,
    });

    // Fire background AI photo-analysis asynchronously (DO NOT block the HTTP response)
    const io = req.app.get('io');
    if (photoUrl) {
      // Async trigger
      analyzeComplaintPhotoInBackground(complaint._id, io);
    } else {
      if (io) io.emit('complaint:created', complaint);
    }

    res.status(201).json(complaint);
  } catch (err) {
    console.error('Create complaint error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/complaints
exports.getComplaints = async (req, res) => {
  try {
    let query = { isDeleted: { $ne: true } };

    // Role-based visibility
    if (req.user.role === 'citizen') {
      query.citizen = req.user._id;
    } else if (req.user.role === 'officer' || req.user.role === 'dept_admin') {
      if (!req.user.department) {
        return res.status(400).json({ error: 'Officer/Admin must belong to a department.' });
      }
      query.department = req.user.department;
      query.aiReviewStatus = { $ne: 'needs_review' }; // Hide complaints pending nodal triage
    }

    const complaints = await Complaint.find(query)
      .populate('citizen', 'fullName email')
      .populate('department', 'name')
      .populate('ward', 'name number')
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/complaints/:id
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('citizen', 'fullName email')
      .populate('department', 'name')
      .populate('ward', 'name number');

    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    // Validate access
    if (req.user.role === 'citizen' && complaint.citizen._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }
    if ((req.user.role === 'officer' || req.user.role === 'dept_admin') && 
        complaint.department && complaint.department._id.toString() !== req.user.department.toString()) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const timeline = await ComplaintTimeline.find({ complaint: complaint._id })
      .populate('actor', 'fullName role')
      .sort({ createdAt: 1 });

    res.json({ complaint, timeline });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/complaints/:id/status
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required.' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    const previousStatus = complaint.status;
    complaint.status = status;
    await complaint.save();

    const remarks = note || `Status updated from ${previousStatus} to ${status}`;

    // Call OpenAI Assistant Service to generate conversational citizen update
    let aiMessage = '';
    try {
      aiMessage = await openaiAssistantService.generateStatusMessage(previousStatus, status, complaint.complaintType, 'Bhopal');
    } catch (err) {
      aiMessage = `Your complaint status has changed from '${previousStatus}' to '${status}'.`;
    }

    // Append to timeline
    await ComplaintTimeline.create({
      complaint: complaint._id,
      actor: req.user._id,
      previousStatus,
      newStatus: status,
      remarks,
      message: aiMessage
    });

    // Write Status Change to Audit Trail
    await AuditLog.create({
      actor: req.user._id,
      entityType: 'complaint',
      entityId: complaint._id,
      fromStatus: previousStatus,
      toStatus: status,
      note: remarks,
    });

    // Create Notification for the citizen
    await Notification.create({
      recipient: complaint.citizen,
      title: status === 'Resolved' ? 'Work Completed 🎉' : 'Complaint Status Update',
      message: aiMessage,
      type: 'ComplaintStatus',
      metadata: { complaintId: complaint._id }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('complaint:updated', {
        complaintId: complaint._id,
        status,
        remarks,
        message: aiMessage,
        citizenId: complaint.citizen,
      });
    }

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/complaints/:id/rate
exports.rateComplaint = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating) return res.status(400).json({ error: 'Rating is required.' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    if (complaint.citizen.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the citizen who filed this complaint can submit feedback.' });
    }

    if (complaint.status !== 'Resolved') {
      return res.status(400).json({ error: 'You can only rate a complaint after it has been marked as Resolved.' });
    }

    complaint.rating = rating;
    complaint.ratingComment = comment || '';
    await complaint.save();

    await AuditLog.create({
      actor: req.user._id,
      entityType: 'complaint',
      entityId: complaint._id,
      fromStatus: 'Resolved',
      toStatus: 'Resolved (Rated)',
      note: `Citizen rated: ${rating} stars. Comment: ${comment || 'none'}`,
    });

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/complaints/:id/confirm-triage (Nodal Admin reassigns and confirms triage)
exports.confirmTriage = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only Nodal Admins can confirm triage.' });
    }

    const { departmentId, note } = req.body;
    if (!departmentId) return res.status(400).json({ error: 'Department ID is required.' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    const deptDoc = await Department.findById(departmentId);
    if (!deptDoc) return res.status(404).json({ error: 'Department not found.' });

    const remarks = note || `Nodal admin resolved triage and assigned to ${deptDoc.name}`;
    complaint.department = deptDoc._id;
    complaint.aiReviewStatus = 'auto_routed'; // Marks triage resolved
    await complaint.save();

    // Call OpenAI Assistant Service to generate conversational citizen update
    let aiMessage = '';
    try {
      aiMessage = await openaiAssistantService.generateStatusMessage('Needs Triage', 'Assigned', complaint.complaintType, 'Bhopal');
    } catch (err) {
      aiMessage = `Your complaint was manually triaged and assigned to ${deptDoc.name}.`;
    }

    // Append to timeline
    await ComplaintTimeline.create({
      complaint: complaint._id,
      actor: req.user._id,
      previousStatus: 'Received (Needs Review)',
      newStatus: complaint.status,
      remarks,
      message: aiMessage
    });

    // Write to Audit Trail
    await AuditLog.create({
      actor: req.user._id,
      entityType: 'complaint',
      entityId: complaint._id,
      fromStatus: 'Received (Needs Review)',
      toStatus: 'Received (Assigned)',
      note: remarks,
    });

    // Create Notification for the citizen
    await Notification.create({
      recipient: complaint.citizen,
      title: 'Complaint Assigned',
      message: aiMessage,
      type: 'ComplaintStatus',
      metadata: { complaintId: complaint._id }
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('complaint:updated', {
        complaintId: complaint._id,
        status: complaint.status,
        remarks,
        message: aiMessage,
        citizenId: complaint.citizen,
      });
    }

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/complaints/:id/reassign (Manually reassign complaint department)
exports.reassignComplaint = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'dept_admin') {
      return res.status(403).json({ error: 'Unauthorized to reassign department.' });
    }
    const { departmentId, note } = req.body;
    if (!departmentId) return res.status(400).json({ error: 'Department ID is required.' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    const prevDept = await Department.findById(complaint.department);
    const newDept = await Department.findById(departmentId);
    if (!newDept) return res.status(404).json({ error: 'Target department not found.' });

    complaint.department = newDept._id;
    // Set review status to auto_routed/completed to indicate it is assigned
    complaint.aiReviewStatus = 'auto_routed';
    await complaint.save();

    const remarks = note || `Manually reassigned from ${prevDept ? prevDept.name : 'None'} to ${newDept.name}`;

    await ComplaintTimeline.create({
      complaint: complaint._id,
      actor: req.user._id,
      previousStatus: complaint.status,
      newStatus: complaint.status,
      remarks
    });

    await AuditLog.create({
      actor: req.user._id,
      entityType: 'complaint',
      entityId: complaint._id,
      fromStatus: `Assigned (${prevDept ? prevDept.name : 'None'})`,
      toStatus: `Assigned (${newDept.name})`,
      note: remarks
    });

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/audit-logs
exports.getAuditLogs = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Nodal Admin privileges required.' });
    }

    const logs = await AuditLog.find()
      .populate('actor', 'fullName email role')
      .sort({ createdAt: -1 })
      .limit(500);

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
