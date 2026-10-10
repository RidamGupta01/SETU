require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
const Issue = require('./models/Issue');
const DeptWork = require('./models/DeptWork');
const DepartmentDependency = require('./models/DepartmentDependency');

// Bhopal specific bounding box
const BHOPAL_BBOX = {
  minLat: 23.15, maxLat: 23.30,
  minLng: 77.30, maxLng: 77.46,
};

function getRandomCoords() {
  const lat = Math.random() * (BHOPAL_BBOX.maxLat - BHOPAL_BBOX.minLat) + BHOPAL_BBOX.minLat;
  const lng = Math.random() * (BHOPAL_BBOX.maxLng - BHOPAL_BBOX.minLng) + BHOPAL_BBOX.minLng;
  return { lat, lng };
}

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB. Clearing old data...');

    await Issue.deleteMany({});
    await DeptWork.deleteMany({});
    await DepartmentDependency.deleteMany({});
    
    // Get or create departments
    let depts = await Department.find();
    if (depts.length === 0) {
      console.log('No departments found. Creating default departments...');
      const defaultDepartments = [
        { name: 'PWD', description: 'Public Works Department' },
        { name: 'BMC', description: 'Bhopal Municipal Corporation' },
        { name: 'Traffic', description: 'Traffic Police' },
        { name: 'Pollution Board', description: 'Pollution Control Board' },
        { name: 'Electricity', description: 'Electricity Department' },
        { name: 'Water', description: 'Water Supply Department' }
      ];
      depts = await Department.insertMany(defaultDepartments);
    }
    
    const pwd = depts.find(d => d.name === 'PWD')?._id;
    const bmc = depts.find(d => d.name === 'BMC')?._id;
    const traffic = depts.find(d => d.name === 'Traffic')?._id;
    const pollution = depts.find(d => d.name === 'Pollution Board')?._id;
    const elec = depts.find(d => d.name === 'Electricity')?._id;
    const water = depts.find(d => d.name === 'Water')?._id;

    let citizen = await User.findOne({ role: 'citizen' });
    if (!citizen) {
      citizen = await User.create({
        email: 'citizen_demo@bhopal.gov.in',
        password: 'password123',
        fullName: 'Demo Citizen',
        role: 'citizen'
      });
    }

    console.log('Ensuring department admins exist...');
    for (const dept of depts) {
      const adminEmail = dept.name.toLowerCase().replace(' ', '') + '_admin@bhopal.gov.in';
      const exists = await User.findOne({ email: adminEmail });
      if (!exists) {
        await User.create({
          email: adminEmail,
          password: 'password123',
          fullName: dept.name + ' Admin',
          role: 'dept_admin',
          department: dept._id
        });
      }
    }

    console.log('Seeding Bhopal citizen reports...');

    const sampleIssues = [
      {
        title: "Massive pothole causing accidents near DB City Mall",
        description: "The main road turning towards DB City Mall has a 3-foot wide pothole. Two bikers fell yesterday.",
        category: "pothole", area: "MP Nagar", primaryDepartment: pwd, status: "open",
        aiSummary: "Citizen reports a hazardous 3-foot pothole near DB City Mall in MP Nagar causing recent accidents.",
        aiResolutionPlan: "1. Dispatch PWD inspection team immediately.\n2. Barricade the pothole to prevent further accidents.\n3. Schedule emergency patching using cold asphalt.\n4. Complete patching within 24 hours.",
        aiSuggestedDepartment: "Traffic"
      },
      {
        title: "Severe waterlogging at Jyoti Talkies Square",
        description: "Water is knee-deep after the recent 2-hour rain. Drains are completely choked.",
        category: "waterlogging", area: "MP Nagar", primaryDepartment: bmc, status: "assigned",
        aiSummary: "Knee-deep waterlogging reported at Jyoti Talkies Square due to choked drains after heavy rain.",
        aiResolutionPlan: "1. Send BMC sanitation workers to clear the surface debris from drains.\n2. Deploy high-capacity water suction pumps to clear standing water.\n3. Inspect drains for deeper blockages.\n4. Coordinate with Traffic department to manage vehicle diversion during clearing.",
        aiSuggestedDepartment: "Traffic"
      },
      {
        title: "Open manhole on Kolar Road",
        description: "Manhole cover is missing near the Banjari cross. Very dangerous at night.",
        category: "blockage", area: "Kolar Road", primaryDepartment: bmc, status: "in_progress",
        aiSummary: "Missing manhole cover on Kolar Road near Banjari cross poses severe risk at night.",
        aiResolutionPlan: "1. BMC to place warning signs and barricades around the manhole.\n2. Transport and install a replacement heavy-duty manhole cover.\n3. Secure cover to prevent theft.",
        aiSuggestedDepartment: null
      },
      {
        title: "Thick black smoke from illegal garbage burning",
        description: "People are burning plastic and rubber tires in the empty plot behind Bittan Market.",
        category: "pollution", area: "Arera Colony", primaryDepartment: pollution, status: "open",
        aiSummary: "Illegal burning of plastic and rubber tires behind Bittan Market causing severe toxic smoke.",
        aiResolutionPlan: "1. Pollution Control Board (PCB) to dispatch an inspector to the site.\n2. Douse the fire completely (coordinate with Fire Dept if necessary).\n3. Issue fines to offenders if identified.\n4. BMC to clear the accumulated garbage to prevent recurrence.",
        aiSuggestedDepartment: "BMC"
      },
      {
        title: "Traffic signal completely dead at Roshanpura Square",
        description: "Massive jam because the signal has no power since morning.",
        category: "blockage", area: "New Market", primaryDepartment: traffic, status: "open",
        aiSummary: "Roshanpura Square traffic signal is dead since morning, causing massive traffic jams.",
        aiResolutionPlan: "1. Traffic police to immediately deploy personnel for manual traffic management.\n2. Electricity department to inspect the power supply to the signal.\n3. Restore power and test signal synchronization.",
        aiSuggestedDepartment: "Electricity"
      },
      {
        title: "Streetlights not working on VIP Road",
        description: "A 2km stretch of VIP road is pitch black. This is a prime accident zone.",
        category: "streetlight", area: "Old City", primaryDepartment: elec, status: "assigned",
        aiSummary: "A 2km stretch of VIP road is completely dark due to non-functioning streetlights, posing high accident risk.",
        aiResolutionPlan: "1. Electricity department to check the main distribution panel for the VIP road sector.\n2. Identify and replace fused bulbs or repair wiring faults.\n3. Ensure all lights are functional by evening.",
        aiSuggestedDepartment: null
      },
      {
        title: "Pipeline burst wasting thousands of liters",
        description: "Main Narmada water line is leaking heavily near Shahpura lake.",
        category: "waterlogging", area: "Shahpura", primaryDepartment: water, status: "open",
        aiSummary: "Major Narmada water pipeline burst near Shahpura lake, causing immense water wastage.",
        aiResolutionPlan: "1. Water department to isolate the leaking section by shutting local valves.\n2. Excavate the area to expose the burst pipe.\n3. Weld or replace the damaged pipe section.\n4. Restore water supply and test for leaks.",
        aiSuggestedDepartment: "PWD"
      },
      {
        title: "Fallen tree blocking the road",
        description: "A huge neem tree fell during the storm and blocked the entire road to Bairagarh.",
        category: "blockage", area: "Bairagarh", primaryDepartment: bmc, status: "open",
        aiSummary: "A fallen neem tree is completely blocking the road to Bairagarh following a storm.",
        aiResolutionPlan: "1. BMC horticulture/emergency team to bring chainsaws and heavy machinery.\n2. Cut the tree into manageable logs.\n3. Clear the debris from the road.\n4. Traffic department to handle diversions during clearance.",
        aiSuggestedDepartment: "Traffic"
      },
      {
        title: "Severe road damage after laying cables",
        description: "Telecom company dug up the road and didn't repair it in Habibganj.",
        category: "pothole", area: "Habibganj", primaryDepartment: pwd, status: "open",
        aiSummary: "Road severely damaged in Habibganj due to un-repaired telecom cable trenching.",
        aiResolutionPlan: "1. PWD to inspect the damage and issue a notice to the telecom company.\n2. Fill the trench with proper sub-base material.\n3. Re-surface the road section with asphalt.",
        aiSuggestedDepartment: null
      },
      {
        title: "Garbage piled up for 2 weeks",
        description: "The corner of 10 Number stop is turning into a mini dump yard.",
        category: "garbage", area: "Arera Colony", primaryDepartment: bmc, status: "resolved",
        aiSummary: "Resolved: Garbage pile cleared from 10 Number stop.",
        aiResolutionPlan: "Cleared by BMC sanitation trucks.",
        aiSuggestedDepartment: null
      },
      {
        title: "Broken divider causing wrong-side driving",
        description: "The concrete divider is broken near Board Office square, people are cutting across dangerously.",
        category: "pothole", area: "MP Nagar", primaryDepartment: pwd, status: "open",
        aiSummary: "Broken concrete divider near Board Office square encouraging dangerous wrong-side driving.",
        aiResolutionPlan: "1. PWD to assess the required length of divider repair.\n2. Place temporary plastic barricades to stop wrong-side crossing.\n3. Cast and install new concrete divider blocks.",
        aiSuggestedDepartment: "Traffic"
      }
    ];

    for (const data of sampleIssues) {
      const coords = getRandomCoords();
      await Issue.create({
        ...data,
        reporterId: citizen._id,
        location: {
          type: 'Point',
          coordinates: [coords.lng, coords.lat]
        }
      });
    }

    console.log('Seeding Department Scheduled Works...');

    const sampleWorks = [
      {
        title: "Metro Pillar Foundation", department: "PWD",
        description: "Digging 20ft deep foundation for metro pillars on Hoshangabad road.",
        area: "MP Nagar",
        startsOn: new Date(Date.now() + 86400000 * 1), // Tomorrow
        endsOn: new Date(Date.now() + 86400000 * 5),
      },
      {
        title: "Underground Drainage Upgrade", department: "BMC",
        description: "Laying new 40-inch drainage pipes.",
        area: "MP Nagar",
        startsOn: new Date(Date.now() + 86400000 * 3), // Overlapping!
        endsOn: new Date(Date.now() + 86400000 * 10),
      },
      {
        title: "Smart City Smart Poles", department: "Electricity",
        description: "Erecting 15 smart poles with cameras and Wi-Fi.",
        area: "New Market",
        startsOn: new Date(Date.now() + 86400000 * 2),
        endsOn: new Date(Date.now() + 86400000 * 4),
      },
      {
        title: "Sewer Line Repair", department: "Water",
        description: "Fixing major sewer line leakage.",
        area: "New Market",
        startsOn: new Date(Date.now() + 86400000 * 3), // Overlapping!
        endsOn: new Date(Date.now() + 86400000 * 6),
      },
      {
        title: "Road Resurfacing", department: "PWD",
        description: "Laying fresh bitumen on the Kolar stretch.",
        area: "Kolar Road",
        startsOn: new Date(Date.now() + 86400000 * 10),
        endsOn: new Date(Date.now() + 86400000 * 15),
      }
    ];

    for (const data of sampleWorks) {
      const coords = getRandomCoords();
      await DeptWork.create({
        ...data,
        lat: coords.lat,
        lng: coords.lng
      });
    }

    console.log('Successfully seeded data!');
    mongoose.disconnect();
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seedData();
