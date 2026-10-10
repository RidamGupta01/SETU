import BaseRepository from './BaseRepository.js';
import Session from '../models/Session.js';

class SessionRepository extends BaseRepository {
  constructor() {
    super(Session);
  }

  async findByToken(token) {
    return this.model.findOne({ token, isValid: true }).populate({
      path: 'user',
      populate: { path: 'role' }
    });
  }

  async invalidateUserSessions(userId) {
    return this.model.updateMany({ user: userId, isValid: true }, { isValid: false });
  }

  async invalidateSession(token) {
    return this.model.findOneAndUpdate({ token }, { isValid: false }, { new: true });
  }
}

export default new SessionRepository();
