import BaseRepository from './BaseRepository.js';
import ConflictReport from '../models/ConflictReport.js';

class ConflictReportRepository extends BaseRepository {
  constructor() {
    super(ConflictReport);
  }

  async findWithDetails(filter = {}, sort = { createdAt: -1 }) {
    return this.model.find(filter)
      .populate({
        path: 'primaryPermit',
        populate: [{ path: 'department' }, { path: 'ward' }]
      })
      .populate({
        path: 'conflictingPermits',
        populate: [{ path: 'department' }, { path: 'ward' }]
      })
      .sort(sort);
  }

  async findByIdWithDetails(id) {
    return this.model.findById(id)
      .populate({
        path: 'primaryPermit',
        populate: [{ path: 'department' }, { path: 'ward' }]
      })
      .populate({
        path: 'conflictingPermits',
        populate: [{ path: 'department' }, { path: 'ward' }]
      });
  }

  async findByPermit(permitId) {
    return this.model.find({
      $or: [
        { primaryPermit: permitId },
        { conflictingPermits: permitId }
      ]
    }).populate('primaryPermit').populate('conflictingPermits');
  }
}

export default new ConflictReportRepository();
