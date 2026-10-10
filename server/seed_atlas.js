require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Department = require('./models/Department');
const Issue = require('./models/Issue');
const DeptWork = require('./models/DeptWork');

const DEPARTMENTS = [
  { name: 'PWD', description: 'Public Works Department' },
  { name: 'BMC', description: 'Bhopal Municipal Corporation' },
  { name: 'Traffic', description: 'Traffic Police' },
  { name: 'Pollution Board', description: 'MP Pollution Control Board' },
  { name: 'Electricity', description: 'MP Madhya Kshetra Vidyut Vitaran' },
  { name: 'Water', description: 'Water Supply Department' }
];

async function seedAtlasDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('Connected to Atlas. Seeding database...');

    // We do NOT delete users/issues in production, but since this is a test DB for the hackathon:
    try {
      await mongoose.connection.db.dropCollection('departments');
    } catch (e) {
      // Ignore if collection doesn't exist
    }
    
    // Only insert departments
    const createdDepts = await Department.insertMany(DEPARTMENTS);
    
    // Insert a dummy admin user if not exists
    const adminExists = await User.findOne({ email: 'admin@bhopal.gov.in' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('password123', salt);
      await User.create({ email: 'admin@bhopal.gov.in', password: hash, fullName: 'Bhopal Admin', role: 'super_admin' });
    }

    console.log('Atlas DB seeded with Departments!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedAtlasDB();
