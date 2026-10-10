import ComplaintRepository from '../repositories/ComplaintRepository.js';
import PermitRepository from '../repositories/PermitRepository.js';
import DepartmentRepository from '../repositories/DepartmentRepository.js';
import ConflictReportRepository from '../repositories/ConflictReportRepository.js';
import ComplaintTimeline from '../models/ComplaintTimeline.js';
import Complaint from '../models/Complaint.js';

// @desc    Get dashboard analytics metrics
// @route   GET /api/analytics
// @access  Private (Department Officer / Super Admin)
export const getAnalytics = async (req, res, next) => {
  try {
    // 1. General Permits Stats
    const permitStats = await PermitRepository.model.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedPermits = {
      Pending: 0,
      Approved: 0,
      Active: 0,
      Completed: 0,
      Conflict: 0,
      Rejected: 0,
      Suspended: 0
    };
    permitStats.forEach((stat) => {
      if (formattedPermits[stat._id] !== undefined) {
        formattedPermits[stat._id] = stat.count;
      }
    });

    // 2. Complaints by Ward (Using lookup join for name)
    const complaintsByWard = await Complaint.aggregate([
      {
        $group: {
          _id: '$ward',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'wards',
          localField: '_id',
          foreignField: '_id',
          as: 'wardDetails'
        }
      },
      { $unwind: '$wardDetails' },
      {
        $project: {
          _id: 1,
          wardName: '$wardDetails.name',
          wardNumber: '$wardDetails.number',
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 3. Department Performance
    const departments = await DepartmentRepository.find();
    const deptPerformance = [];

    for (const dept of departments) {
      const totalComplaints = await ComplaintRepository.count({ department: dept._id });
      const resolvedComplaints = await ComplaintRepository.count({ department: dept._id, status: 'Resolved' });
      const totalPermits = await PermitRepository.count({ department: dept._id });
      const conflictPermits = await PermitRepository.count({ department: dept._id, status: 'Conflict' });

      deptPerformance.push({
        department: dept.code,
        name: dept.name,
        color: dept.color,
        complaints: totalComplaints,
        resolved: resolvedComplaints,
        permits: totalPermits,
        conflicts: conflictPermits,
      });
    }

    // 4. Average Resolution Time (Aggregation over ComplaintTimeline)
    const timeStats = await ComplaintTimeline.aggregate([
      {
        $group: {
          _id: '$complaint',
          resolvedTime: {
            $max: {
              $cond: [{ $eq: ['$newStatus', 'Resolved'] }, '$createdAt', null]
            }
          },
          createdTime: {
            $min: {
              $cond: [{ $eq: ['$previousStatus', null] }, '$createdAt', null]
            }
          }
        }
      },
      {
        $project: {
          durationMs: { $subtract: ['$resolvedTime', '$createdTime'] }
        }
      },
      {
        $match: {
          durationMs: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          avgDurationMs: { $avg: '$durationMs' }
        }
      }
    ]);

    const avgResolutionTimeHours = timeStats.length > 0
      ? Math.round(timeStats[0].avgDurationMs / (1000 * 60 * 60))
      : 0;

    // 5. Conflict Statistics
    const totalConflicts = await ConflictReportRepository.count();
    const resolvedConflicts = await ConflictReportRepository.count({ status: 'Resolved' });

    res.status(200).json({
      success: true,
      data: {
        permits: formattedPermits,
        complaintsByWard,
        departmentPerformance: deptPerformance,
        averageResolutionHours: avgResolutionTimeHours,
        conflicts: {
          total: totalConflicts,
          jointAgreed: resolvedConflicts,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
