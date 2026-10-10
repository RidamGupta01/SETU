import BaseRepository from './BaseRepository.js';
import Permission from '../models/Permission.js';

class PermissionRepository extends BaseRepository {
  constructor() {
    super(Permission);
  }

  async findByModule(moduleName) {
    return this.model.find({ module: moduleName });
  }

  async findByName(name) {
    return this.model.findOne({ name: name.toUpperCase() });
  }
}

export default new PermissionRepository();
