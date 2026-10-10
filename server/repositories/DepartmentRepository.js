import BaseRepository from './BaseRepository.js';
import Department from '../models/Department.js';

class DepartmentRepository extends BaseRepository {
  constructor() {
    super(Department);
  }

  async findActive() {
    return this.model.find({ isActive: true, isDeleted: { $ne: true } });
  }

  async findByCode(code) {
    return this.model.findOne({ code: code.toUpperCase() });
  }
}

export default new DepartmentRepository();
