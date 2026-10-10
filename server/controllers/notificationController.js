import NotificationRepository from '../repositories/NotificationRepository.js';
import AppError from '../utils/appError.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const deptId = req.user.department?._id || null;
    const roleName = req.user.role && typeof req.user.role === 'object' ? req.user.role.name : req.user.role;

    const queryConditions = [
      { recipient: userId }
    ];

    if (roleName === 'Department Officer' && deptId) {
      queryConditions.push({ recipientDepartment: deptId });
    }

    if (roleName === 'Super Admin') {
      queryConditions.push({ type: 'Conflict' });
    }

    const notifications = await NotificationRepository.find(
      { $or: queryConditions },
      '',
      '',
      { createdAt: -1 }
    );

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markRead = async (req, res, next) => {
  try {
    const notification = await NotificationRepository.findById(req.params.id);
    if (!notification) {
      return next(new AppError('Notification not found', 404, 'NOT_FOUND'));
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const deptId = req.user.department?._id || null;
    const roleName = req.user.role && typeof req.user.role === 'object' ? req.user.role.name : req.user.role;

    const queryConditions = [
      { recipient: userId }
    ];

    if (roleName === 'Department Officer' && deptId) {
      queryConditions.push({ recipientDepartment: deptId });
    }

    if (roleName === 'Super Admin') {
      queryConditions.push({ type: 'Conflict' });
    }

    await NotificationRepository.model.updateMany(
      {
        $or: queryConditions,
        isRead: false,
      },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      data: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};
