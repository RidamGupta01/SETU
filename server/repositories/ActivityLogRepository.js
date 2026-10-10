import BaseRepository from './BaseRepository.js';
import ActivityLog from '../models/ActivityLog.js';

class ActivityLogRepository extends BaseRepository {
  constructor() {
    super(ActivityLog);
  }

  async log(actorId, action, details, ipAddress) {
    return this.create({
      actor: actorId,
      action,
      details,
      ipAddress
    });
  }
}

export default new ActivityLogRepository();
