import path = require("node:path");
import express = require("express");
import mongoose = require("mongoose");
import cors = require("cors");
import http = require("node:http");
import { Server } from "socket.io";
import cron = require("node-cron");
import authRoutes = require("./routes/auth");
import issueRoutes = require("./routes/issues");
import departmentRoutes = require("./routes/departments");
import workRoutes = require("./routes/works");
import complaintRoutes = require("./routes/complaintRoutes");
import assistantRoutes = require("./routes/assistantRoutes");
import Complaint = require("./models/Complaint");
import NotificationModel = require("./models/Notification");
import User = require("./models/User");

const allowedOrigins: string[] = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins },
});

// Middleware
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/works", workRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/assistant", assistantRoutes);

// Make io accessible in routes
app.set("io", io);

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Database connection
const PORT = process.env.PORT || 5000;

// Setup SLA Cron Monitoring (node-cron)
async function checkSlaViolations() {
  try {
    console.log("Checking SLA violations...");
    const now = new Date();

    // Find all complaints not resolved/rejected where slaDeadline has passed
    const breached = await Complaint.find({
      status: { $nin: ["Resolved", "Rejected"] },
      slaDeadline: { $lt: now },
      isSlaViolated: false,
    });

    if (breached.length > 0) {
      console.log(`Found ${breached.length} SLA violations. Informing admins...`);
      const admins = await User.find({ role: { $in: ["admin", "super_admin"] } });

      for (const complaint of breached) {
        complaint.isSlaViolated = true;
        await complaint.save();

        const msg = `Complaint #${complaint.complaintNumber} has exceeded the 7-day SLA resolution period.`;

        // Create Notifications
        for (const admin of admins) {
          await NotificationModel.create({
            recipient: admin._id,
            title: "SLA Violation Alert",
            message: msg,
            type: "ComplaintStatus",
            metadata: { complaintId: complaint._id },
          });
        }

        // Emit socket alert
        io.emit("sla:violated", {
          complaintId: complaint._id,
          complaintNumber: complaint.complaintNumber,
          message: msg,
        });
      }
    }
  } catch (err) {
    console.error("SLA check error:", err);
  }
}

// Run cron hourly
cron.schedule("0 * * * *", checkSlaViolations);

async function startServer() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not set. Add it to server/.env before starting the backend.");
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set. Add it to server/.env before starting the backend.");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");
    setTimeout(checkSlaViolations, 5000);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
