import crypto from 'crypto';
import PermitRepository from '../repositories/PermitRepository.js';
import ConflictReportRepository from '../repositories/ConflictReportRepository.js';
import NotificationRepository from '../repositories/NotificationRepository.js';
import { getIO } from '../sockets/socketHandler.js';
import logger from '../utils/logger.js';

/**
 * Detects conflicts for a given permit request
 * Checks:
 * 1. Proximity: Within radius of coordinates (GeoJSON 2dsphere $near)
 * 2. Time overlap: Overlapping schedules
 * 3. Recently completed works: Digging on the same segment within a 60-day window after completion
 */
export const detectConflicts = async (permitId) => {
  try {
    const permit = await PermitRepository.findByIdWithDetails(permitId);
    if (!permit) return null;

    const lon = permit.location.coordinates[0];
    const lat = permit.location.coordinates[1];
    const radius = permit.radius || 100;
    const startDate = permit.startDate;
    const endDate = permit.endDate;

    // 1. Find overlapping permits (nearby + date intersection)
    const overlappingPermits = await PermitRepository.findOverlapping(
      lon,
      lat,
      radius,
      startDate,
      endDate,
      permit._id
    );

    // 2. Check recently completed works (same road completed in last 60 days)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentlyCompleted = await PermitRepository.findNear(
      lon,
      lat,
      radius,
      {
        _id: { $ne: permit._id },
        status: 'Completed',
        endDate: { $gte: sixtyDaysAgo }
      }
    );

    const allConflictingPermits = [...overlappingPermits, ...recentlyCompleted];

    if (allConflictingPermits.length > 0) {
      // Flag permit status to Conflict
      permit.status = 'Conflict';
      permit.conflictingPermits = allConflictingPermits.map(p => p._id);
      permit.isJointExcavationSuggested = true;
      await permit.save();

      // Create Conflict Report
      const reportNumber = `CFR-${crypto.randomInt(10000, 99999)}`;
      
      // Calculate average coordinates or use primary permit coordinates as point of conflict
      const conflictReport = await ConflictReportRepository.create({
        reportNumber,
        primaryPermit: permit._id,
        conflictingPermits: allConflictingPermits.map(p => p._id),
        overlapCoordinates: {
          type: 'Point',
          coordinates: [lon, lat]
        },
        distanceMeters: 25, // default estimated distance
        severity: overlappingPermits.length > 0 ? 'High' : 'Medium',
        status: 'Open'
      });

      logger.info(`Conflict report '${reportNumber}' generated for Permit ID ${permit._id}`);

      // Dispatch Notifications
      const io = getIO();

      for (const conflict of allConflictingPermits) {
        const otherDept = conflict.department;
        const currentDept = permit.department;

        const title = 'Excavation Conflict Detected!';
        const message = `A conflict has been detected on ${permit.roadName} between your permit request and a project by ${otherDept.name}. A joint excavation has been suggested.`;

        // Save notifications using NotificationRepository
        const notif1 = await NotificationRepository.create({
          recipientDepartment: currentDept._id,
          title,
          message,
          type: 'Conflict',
          metadata: {
            permitId: permit._id,
            complaintId: undefined
          }
        });

        const notif2 = await NotificationRepository.create({
          recipientDepartment: otherDept._id,
          title: `Conflict Alert: ${currentDept.name}`,
          message: `The department ${currentDept.name} has submitted a permit request overlapping with your project on ${permit.roadName}. Joint excavation suggested.`,
          type: 'Conflict',
          metadata: {
            permitId: conflict._id,
            complaintId: undefined
          }
        });

        // Push via Socket.io
        if (io) {
          io.to(`dept_${currentDept._id.toString()}`).emit('notification', notif1);
          io.to(`dept_${otherDept._id.toString()}`).emit('notification', notif2);

          io.emit('conflict_alert', {
            permit,
            conflict,
            message: `Conflict detected on ${permit.roadName} between ${currentDept.name} and ${otherDept.name}.`
          });
        }
      }
    }

    return permit;
  } catch (error) {
    logger.error(`Error in detectConflicts: ${error.message}`);
    throw error;
  }
};
