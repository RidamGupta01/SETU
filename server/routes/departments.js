const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const Issue = require('../models/Issue');

// GET /api/departments
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find();
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/departments/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    // Basic leaderboard: count of resolved issues vs total assigned
    const stats = await Issue.aggregate([
      { $match: { primaryDepartment: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$primaryDepartment",
          totalIssues: { $sum: 1 },
          resolvedIssues: {
            $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] }
          },
        }
      },
      {
        $lookup: {
          from: "departments",
          localField: "_id",
          foreignField: "_id",
          as: "departmentInfo"
        }
      },
      { $unwind: "$departmentInfo" },
      {
        $project: {
          departmentName: "$departmentInfo.name",
          totalIssues: 1,
          resolvedIssues: 1,
          resolutionRate: {
            $multiply: [
              { $divide: ["$resolvedIssues", { $cond: [{ $eq: ["$totalIssues", 0] }, 1, "$totalIssues"] }] },
              100
            ]
          }
        }
      },
      { $sort: { resolutionRate: -1 } }
    ]);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
