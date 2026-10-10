import BaseRepository from './BaseRepository.js';
import Role from '../models/Role.js';

class RoleRepository extends BaseRepository {
  constructor() {
    super(Role);
  }

  async findByName(name) {
    return this.model.findOne({ name: new RegExp(`^${name}$`, 'i') }).populate('permissions');
  }

  async findWithPermissions(filter = {}) {
    return this.model.find(filter).populate('permissions');
  }
}

export default new RoleRepository();
