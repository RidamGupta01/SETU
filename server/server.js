require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/works', require('./routes/works'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/assistant', require('./routes/assistantRoutes'));

// Make io accessible in routes
app.set('io', io);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Database connection
const PORT = process.env.PORT || 5000;

// Setup SLA Cron Monitoring (node-cron)
const cron = require('node-cron');
const Complaint = require('./models/Complaint');
const Notification = require('./models/Notification');
const User = require('./models/User');

async function checkSlaViolations() {
  try {
    console.log('Checking SLA violations...');
    const now = new Date();
    
    // Find all complaints not resolved/rejected where slaDeadline has passed
    const breached = await Complaint.find({
      status: { $nin: ['Resolved', 'Rejected'] },
      slaDeadline: { $lt: now },
      isSlaViolated: false
    });

    if (breached.length > 0) {
      console.log(`Found ${breached.length} SLA violations. Informing admins...`);
      const admins = await User.find({ role: { $in: ['admin', 'super_admin'] } });

      for (const complaint of breached) {
        complaint.isSlaViolated = true;
        await complaint.save();

        const msg = `Complaint #${complaint.complaintNumber} has exceeded the 7-day SLA resolution period.`;

        // Create Notifications
        for (const admin of admins) {
          await Notification.create({
            recipient: admin._id,
            title: 'SLA Violation Alert',
            message: msg,
            type: 'ComplaintStatus',
            metadata: { complaintId: complaint._id }
          });
        }

        // Emit socket alert
        io.emit('sla:violated', {
          complaintId: complaint._id,
          complaintNumber: complaint.complaintNumber,
          message: msg
        });
      }
    }
  } catch (err) {
    console.error('SLA check error:', err);
  }
}

// Run cron hourly
cron.schedule('0 * * * *', checkSlaViolations);

async function startServer() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/setu';
    
    console.log('Connecting to MongoDB...');
    mongoose.connect(mongoUri)
      .then(() => {
        console.log('Connected to MongoDB');
        // Trigger initial SLA check after database connection is ready
        setTimeout(checkSlaViolations, 5000);
      })
      .catch((err) => {
        console.error('Failed to connect to MongoDB on startup. Mongoose will try to reconnect automatically.', err.message);
      });

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Error starting server:', err);
  }
}

startServer();
