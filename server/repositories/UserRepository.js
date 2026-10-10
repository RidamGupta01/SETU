import BaseRepository from './BaseRepository.js';
import User from '../models/User.js';

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmailWithPassword(email) {
    return this.model.findOne({ email }).select('+password').populate('role');
  }

  async findByEmail(email) {
    return this.model.findOne({ email }).populate('role');
  }

  async findWithDetails(filter = {}) {
    return this.model.find(filter)
      .populate('role')
      .populate('department')
      .populate('ward');
  }

  async findByIdWithDetails(id) {
    return this.model.findById(id)
      .populate('role')
      .populate('department')
      .populate('ward');
  }
}

export default new UserRepository();
