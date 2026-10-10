const mongoose = require('mongoose');
require('dotenv').config();
const Department = require('./models/Department');
const User = require('./models/User');

async function checkDepts() {
  await mongoose.connect(process.env.MONGO_URI);
  const depts = await Department.find();
  console.log('Departments:', depts.map(d => d.name));
  
  const users = await User.find({ role: 'dept_admin' });
  console.log('Dept Admins:', users.map(u => ({ email: u.email, dept: u.department })));
  
  mongoose.disconnect();
}
checkDepts();
