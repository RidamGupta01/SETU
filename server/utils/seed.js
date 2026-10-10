import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import all models
import User from '../models/User.js';
import Department from '../models/Department.js';
import Permit from '../models/Permit.js';
import Complaint from '../models/Complaint.js';
import Notification from '../models/Notification.js';
import Road from '../models/Road.js';
import ActivityLog from '../models/ActivityLog.js';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import Zone from '../models/Zone.js';
import Ward from '../models/Ward.js';
import PermitTimeline from '../models/PermitTimeline.js';
import ComplaintTimeline from '../models/ComplaintTimeline.js';
import ConflictReport from '../models/ConflictReport.js';

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/setu');
    console.log('MongoDB connected for seeding...');

    // Clear existing data in correct order to prevent orphans
    await User.deleteMany();
    await Department.deleteMany();
    await Permit.deleteMany();
    await PermitTimeline.deleteMany();
    await Complaint.deleteMany();
    await ComplaintTimeline.deleteMany();
    await ConflictReport.deleteMany();
    await Notification.deleteMany();
    await Road.deleteMany();
    await ActivityLog.deleteMany();
    await Role.deleteMany();
    await Permission.deleteMany();
    await Zone.deleteMany();
    await Ward.deleteMany();

    console.log('Database cleared completely.');

    // 1. Seed Zones (Polygons covering local bounding boxes)
    const zones = [
      {
        name: 'North Zone',
        code: 'NZ01',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [77.3800, 23.2700],
              [77.4200, 23.2700],
              [77.4200, 23.2900],
              [77.3800, 23.2900],
              [77.3800, 23.2700]
            ]
          ]
        }
      },
      {
        name: 'South Zone',
        code: 'SZ02',
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [77.3800, 23.1600],
              [77.4400, 23.1600],
              [77.4400, 23.2600],
              [77.3800, 23.2600],
              [77.3800, 23.1600]
            ]
          ]
        }
      }
    ];
    const createdZones = await Zone.create(zones);
    console.log(`${createdZones.length} Zones seeded.`);

    const zoneMap = {};
    createdZones.forEach((z) => {
      zoneMap[z.name] = z._id;
    });

    // 2. Seed Wards inside Zones
    const wards = [
      {
        zone: zoneMap['South Zone'],
        name: 'Ward 45 (MP Nagar)',
        number: 45,
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [77.4000, 23.2400],
              [77.4200, 23.2400],
              [77.4200, 23.2600],
              [77.4000, 23.2600],
              [77.4000, 23.2400]
            ]
          ]
        }
      },
      {
        zone: zoneMap['South Zone'],
        name: 'Ward 52 (Habibganj)',
        number: 52,
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [77.4200, 23.2200],
              [77.4400, 23.2200],
              [77.4400, 23.2400],
              [77.4200, 23.2400],
              [77.4200, 23.2200]
            ]
          ]
        }
      },
      {
        zone: zoneMap['South Zone'],
        name: 'Ward 12 (TT Nagar)',
        number: 12,
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [77.3800, 23.2400],
              [77.4000, 23.2400],
              [77.4000, 23.2600],
              [77.3800, 23.2600],
              [77.3800, 23.2400]
            ]
          ]
        }
      },
      {
        zone: zoneMap['South Zone'],
        name: 'Ward 80 (Kolar)',
        number: 80,
        boundary: {
          type: 'Polygon',
          coordinates: [
            [
              [77.3900, 23.1700],
              [77.4100, 23.1700],
              [77.4100, 23.1900],
              [77.3900, 23.1900],
              [77.3900, 23.1700]
            ]
          ]
        }
      }
    ];
    const createdWards = await Ward.create(wards);
    console.log(`${createdWards.length} Wards seeded.`);

    const wardMap = {};
    createdWards.forEach((w) => {
      wardMap[w.number] = w._id;
    });

    // 3. Seed Permissions
    const permissionsData = [
      { name: 'CREATE_PERMIT', description: 'Apply for utility road digging permits', module: 'permits' },
      { name: 'APPROVE_PERMIT', description: 'Review and approve permit applications', module: 'permits' },
      { name: 'REJECT_PERMIT', description: 'Reject permit applications', module: 'permits' },
      { name: 'VIEW_PERMITS', description: 'View permit logs and schedules', module: 'permits' },
      { name: 'CREATE_COMPLAINT', description: 'Submit complaint tickets', module: 'complaints' },
      { name: 'RESOLVE_COMPLAINT', description: 'Resolve citizen complaints', module: 'complaints' },
      { name: 'MANAGE_USERS', description: 'Edit and manage user accounts', module: 'users' },
      { name: 'VIEW_ANALYTICS', description: 'Access dashboard chart statistics', module: 'map' },
      { name: 'MANAGE_SETTINGS', description: 'Modify application variables', module: 'settings' }
    ];
    const createdPermissions = await Permission.create(permissionsData);
    console.log(`${createdPermissions.length} Permissions seeded.`);

    const permMap = {};
    createdPermissions.forEach((p) => {
      permMap[p.name] = p._id;
    });

    // 4. Seed Roles linking Permissions
    const rolesData = [
      {
        name: 'Super Admin',
        description: 'Super Nodal Admin with complete control over platforms, users, and settings.',
        permissions: createdPermissions.map(p => p._id),
        isSystemDefault: true
      },
      {
        name: 'Department Officer',
        description: 'Department Officer who applies for permits and resolves assigned complaints.',
        permissions: [
          permMap['CREATE_PERMIT'],
          permMap['VIEW_PERMITS'],
          permMap['RESOLVE_COMPLAINT'],
          permMap['VIEW_ANALYTICS']
        ],
        isSystemDefault: true
      },
      {
        name: 'Citizen',
        description: 'General Public Citizen filing complaints and checking permit timelines.',
        permissions: [
          permMap['VIEW_PERMITS'],
          permMap['CREATE_COMPLAINT']
        ],
        isSystemDefault: true
      }
    ];
    const createdRoles = await Role.create(rolesData);
    console.log(`${createdRoles.length} Roles seeded.`);

    const roleMap = {};
    createdRoles.forEach((r) => {
      roleMap[r.name] = r._id;
    });

    // 5. Seed Departments
    const depts = [
      {
        name: 'Public Works Department',
        code: 'PWD',
        description: 'Responsible for road construction, repair, and overall infrastructure.',
        color: '#f43f5e',
        headOfDepartment: 'Shri R. K. Sharma',
        phone: '011-23456781',
        email: 'pwd@setu.gov.in',
      },
      {
        name: 'Electricity Board',
        code: 'ELEC',
        description: 'Manages electric cabling, power distribution grid, and sub-stations.',
        color: '#eab308',
        headOfDepartment: 'Smt. Anjali Gupta',
        phone: '011-23456782',
        email: 'elec@setu.gov.in',
      },
      {
        name: 'Water Supply Board',
        code: 'WATER',
        description: 'Maintains main pipelines, potable water supply networks, and pumping plants.',
        color: '#06b6d4',
        headOfDepartment: 'Shri Manoj Mishra',
        phone: '011-23456783',
        email: 'water@setu.gov.in',
      },
      {
        name: 'Telecommunications Division',
        code: 'TELE',
        description: 'Laying fiber optic cables and establishing communication nodes.',
        color: '#a855f7',
        headOfDepartment: 'Dr. Vivek Dev',
        phone: '011-23456784',
        email: 'tele@setu.gov.in',
      },
    ];
    const createdDepts = await Department.create(depts);
    console.log(`${createdDepts.length} departments seeded.`);

    const deptMap = {};
    createdDepts.forEach((d) => {
      deptMap[d.code] = d._id;
    });

    // 6. Seed Users
    const users = [
      {
        name: 'Nodal Officer (Admin)',
        email: 'admin@setu.gov.in',
        password: 'admin123',
        role: roleMap['Super Admin'],
        phone: '9999999999',
        isVerified: true
      },
      {
        name: 'PWD Officer',
        email: 'pwd@setu.gov.in',
        password: 'pwd123',
        role: roleMap['Department Officer'],
        department: deptMap['PWD'],
        phone: '9888888881',
        isVerified: true
      },
      {
        name: 'Electricity Officer',
        email: 'elec@setu.gov.in',
        password: 'elec123',
        role: roleMap['Department Officer'],
        department: deptMap['ELEC'],
        phone: '9888888882',
        isVerified: true
      },
      {
        name: 'Water Supply Officer',
        email: 'water@setu.gov.in',
        password: 'water123',
        role: roleMap['Department Officer'],
        department: deptMap['WATER'],
        phone: '9888888883',
        isVerified: true
      },
      {
        name: 'Telecom Officer',
        email: 'tele@setu.gov.in',
        password: 'tele123',
        role: roleMap['Department Officer'],
        department: deptMap['TELE'],
        phone: '9888888884',
        isVerified: true
      },
      {
        name: 'Tarun Citizen',
        email: 'citizen@gmail.com',
        password: 'citizen123',
        role: roleMap['Citizen'],
        phone: '9777777777',
        ward: wardMap[45],
        isVerified: true
      },
    ];

    const createdUsers = [];
    for (const u of users) {
      const newUser = await User.create(u);
      createdUsers.push(newUser);
    }
    console.log(`${createdUsers.length} users seeded.`);

    const citizenUser = createdUsers.find((user) => user.email === 'citizen@gmail.com');
    const teleUser = createdUsers.find((user) => user.email === 'tele@setu.gov.in');

    // 7. Seed Roads
    const roads = [
      {
        name: 'Link Road No. 1',
        ward: wardMap[45],
        status: 'Closed',
        closureReason: 'Telecom fiber laying project in progress.',
        geometry: {
          type: 'LineString',
          coordinates: [
            [77.4000, 23.2500],
            [77.4050, 23.2520],
            [77.4100, 23.2550],
          ],
        },
      },
      {
        name: 'Hoshangabad Road',
        ward: wardMap[52],
        status: 'Open',
        geometry: {
          type: 'LineString',
          coordinates: [
            [77.4200, 23.2300],
            [77.4250, 23.2320],
            [77.4300, 23.2350],
          ],
        },
      },
      {
        name: 'Kolar Road Expressway',
        ward: wardMap[80],
        status: 'Open',
        geometry: {
          type: 'LineString',
          coordinates: [
            [77.3900, 23.1800],
            [77.3950, 23.1820],
            [77.4000, 23.1850],
          ],
        },
      },
    ];
    const createdRoads = await Road.create(roads);
    console.log(`${createdRoads.length} roads seeded.`);

    // 8. Seed Permits
    const permits = [
      {
        permitNumber: 'PMT-887123',
        department: deptMap['TELE'],
        applicant: teleUser._id,
        roadName: 'Link Road No. 1',
        ward: wardMap[45],
        location: {
          type: 'Point',
          coordinates: [77.4050, 23.2520],
        },
        radius: 100,
        purpose: 'Laying ultra high-speed fiber cables for Smart City infrastructure.',
        startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        depth: 1.5,
        restorationPlan: 'Refilling with crushed stone, followed by hot asphalt re-metalling.',
        status: 'Active',
      },
      {
        permitNumber: 'PMT-900456',
        department: deptMap['WATER'],
        applicant: createdUsers.find(u => u.email === 'water@setu.gov.in')._id,
        roadName: 'Link Road No. 1',
        ward: wardMap[45],
        location: {
          type: 'Point',
          coordinates: [77.4055, 23.2525],
        },
        radius: 100,
        purpose: 'Repairing main water mains that leak under Ring Road.',
        startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        depth: 2.5,
        restorationPlan: 'Soil compaction, structural concrete base, and tarmac top layer.',
        status: 'Conflict',
        isJointExcavationSuggested: true,
      },
      {
        permitNumber: 'PMT-102983',
        department: deptMap['PWD'],
        applicant: createdUsers.find(u => u.email === 'pwd@setu.gov.in')._id,
        roadName: 'Hoshangabad Road',
        ward: wardMap[52],
        location: {
          type: 'Point',
          coordinates: [77.4250, 23.2320],
        },
        radius: 50,
        purpose: 'Constructing reinforced flyover support base.',
        startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        depth: 4.0,
        restorationPlan: 'Comprehensive cement-concrete road restoration.',
        status: 'Pending',
      },
      {
        permitNumber: 'PMT-409112',
        department: deptMap['ELEC'],
        applicant: createdUsers.find(u => u.email === 'elec@setu.gov.in')._id,
        roadName: 'Kolar Road Expressway',
        ward: wardMap[80],
        location: {
          type: 'Point',
          coordinates: [77.3950, 23.1820],
        },
        radius: 50,
        purpose: 'Laying underground high tension power cable grid line.',
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        depth: 1.8,
        restorationPlan: 'Trench backfill with sand, standard paving tiles restoration.',
        status: 'Completed',
      },
    ];

    const createdPermits = await Permit.create(permits);
    console.log(`${createdPermits.length} permits seeded.`);

    // Link Road ClosedByPermit
    await Road.findOneAndUpdate({ name: 'Link Road No. 1' }, { closedByPermit: createdPermits[0]._id });

    // Seed Permit Timelines
    const pTimelines = [
      {
        permit: createdPermits[0]._id,
        actor: teleUser._id,
        previousStatus: null,
        newStatus: 'Pending',
        actionPerformed: 'SUBMITTED',
        remarks: 'Initial application submitted for review.'
      },
      {
        permit: createdPermits[0]._id,
        actor: createdUsers.find(u => u.email === 'admin@setu.gov.in')._id,
        previousStatus: 'Pending',
        newStatus: 'Approved',
        actionPerformed: 'APPROVED',
        remarks: 'Approved. Coordinates validated and mapped.'
      },
      {
        permit: createdPermits[0]._id,
        actor: teleUser._id,
        previousStatus: 'Approved',
        newStatus: 'Active',
        actionPerformed: 'ACTIVATE',
        remarks: 'Excavation work initiated at site.'
      }
    ];
    await PermitTimeline.create(pTimelines);

    // 9. Seed Conflict Reports
    const conflictReports = [
      {
        reportNumber: 'CFR-38827',
        primaryPermit: createdPermits[1]._id,
        conflictingPermits: [createdPermits[0]._id],
        overlapCoordinates: {
          type: 'Point',
          coordinates: [77.4052, 23.2522]
        },
        distanceMeters: 55,
        severity: 'High',
        status: 'Open',
        resolutionNotes: 'Awaiting coordination meeting.'
      }
    ];
    const createdConflicts = await ConflictReport.create(conflictReports);
    console.log(`${createdConflicts.length} conflicts reports seeded.`);

    // Map conflict ID inside the Permit
    createdPermits[1].conflictingPermits = [createdPermits[0]._id];
    await createdPermits[1].save();

    // 10. Seed Complaints
    const complaints = [
      {
        complaintNumber: 'CMP-771239',
        citizen: citizenUser._id,
        description: 'Unauthorized trench digging left unattended in front of residential apartments, causing massive traffic hazard.',
        location: {
          type: 'Point',
          coordinates: [77.4010, 23.2510],
        },
        ward: wardMap[45],
        complaintType: 'Unauthorized Digging',
        department: deptMap['PWD'],
        priority: 'High',
        status: 'In Progress',
      },
      {
        complaintNumber: 'CMP-990881',
        citizen: citizenUser._id,
        description: 'Large leakage in drinking water main pipe. Gushing water flooded the local roadway, eroding road foundation.',
        location: {
          type: 'Point',
          coordinates: [77.4220, 23.2310],
        },
        ward: wardMap[52],
        complaintType: 'Water Leakage',
        department: deptMap['WATER'],
        priority: 'High',
        status: 'Resolved',
      },
    ];

    const createdComplaints = await Complaint.create(complaints);
    console.log(`${createdComplaints.length} complaints seeded.`);

    // Seed Complaint Timelines
    const cTimelines = [
      {
        complaint: createdComplaints[0]._id,
        actor: citizenUser._id,
        previousStatus: null,
        newStatus: 'Received',
        remarks: 'Grievance ticket registered by citizen.'
      },
      {
        complaint: createdComplaints[0]._id,
        actor: createdUsers.find(u => u.email === 'admin@setu.gov.in')._id,
        previousStatus: 'Received',
        newStatus: 'Assigned',
        remarks: 'Ticket auto-assigned to PWD department.'
      }
    ];
    await ComplaintTimeline.create(cTimelines);

    // 11. Seed Notifications
    const notifications = [
      {
        recipientDepartment: deptMap['TELE'],
        title: 'Conflict Alert',
        message: 'Conflict alert triggered with Water Supply Board on Link Road No. 1.',
        type: 'Conflict',
        metadata: { permitId: createdPermits[0]._id },
      },
      {
        recipientDepartment: deptMap['WATER'],
        title: 'Conflict Alert',
        message: 'Conflict alert triggered with Telecommunications Division on Link Road No. 1.',
        type: 'Conflict',
        metadata: { permitId: createdPermits[1]._id },
      },
      {
        recipient: citizenUser._id,
        title: 'Water Leakage Resolved',
        message: 'Your complaint regarding the water pipe leakage was marked as Resolved.',
        type: 'ComplaintStatus',
        metadata: { complaintId: createdComplaints[1]._id },
      },
    ];
    await Notification.create(notifications);
    console.log('Sample Notifications seeded.');

    // 12. Seed Activity Logs
    const logs = [
      {
        actor: createdUsers.find(u => u.email === 'admin@setu.gov.in')._id,
        action: 'SYSTEM_SEED',
        details: 'Initial system database setup and master records seed.',
        ipAddress: '127.0.0.1'
      },
    ];
    await ActivityLog.create(logs);

    console.log('Database Seeding Completed Successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
