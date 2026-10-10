import BaseRepository from './BaseRepository.js';
import Complaint from '../models/Complaint.js';

class ComplaintRepository extends BaseRepository {
  constructor() {
    super(Complaint);
  }

  async findWithDetails(filter = {}, sort = { createdAt: -1 }) {
    return this.model.find(filter)
      .populate('citizen', 'name email phone')
      .populate('department')
      .populate('ward')
      .sort(sort);
  }

  async findByIdWithDetails(id) {
    return this.model.findById(id)
      .populate('citizen', 'name email phone')
      .populate('department')
      .populate('ward');
  }

  async findNear(longitude, latitude, maxDistanceMeters, filter = {}) {
    return this.model.find({
      ...filter,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistanceMeters
        }
      }
    }).populate('citizen', 'name email phone').populate('department').populate('ward');
  }
}

export default new ComplaintRepository();
