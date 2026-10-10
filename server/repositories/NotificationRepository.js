import BaseRepository from './BaseRepository.js';
import Notification from '../models/Notification.js';

class NotificationRepository extends BaseRepository {
  constructor() {
    super(Notification);
  }

  async findByRecipient(userId, departmentId, sort = { createdAt: -1 }) {
    const query = {
      $or: [
        { recipient: userId },
        { recipientDepartment: departmentId }
      ]
    };
    return this.model.find(query).sort(sort);
  }

  async markAllRead(userId, departmentId) {
    const query = {
      $or: [
        { recipient: userId },
        { recipientDepartment: departmentId }
      ],
      isRead: false
    };
    return this.model.updateMany(query, { isRead: true });
  }
}

export default new NotificationRepository();
