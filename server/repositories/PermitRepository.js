import BaseRepository from './BaseRepository.js';
import Permit from '../models/Permit.js';

class PermitRepository extends BaseRepository {
  constructor() {
    super(Permit);
  }

  async findWithDetails(filter = {}, sort = {}) {
    return this.model.find(filter)
      .populate('department')
      .populate('applicant', 'name email phone')
      .populate('ward')
      .sort(sort);
  }

  async findByIdWithDetails(id) {
    return this.model.findById(id)
      .populate('department')
      .populate('applicant', 'name email phone')
      .populate('ward');
  }

  // Find permits within a maxDistance in meters
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
    }).populate('department').populate('ward');
  }

  // Find permits that overlap in time AND intersect spatially within overlapping buffers
  async findOverlapping(longitude, latitude, radiusMeters, startDate, endDate, excludePermitId = null) {
    const query = {
      status: { $in: ['Pending', 'Approved', 'Active', 'Conflict'] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: radiusMeters
        }
      }
    };

    if (excludePermitId) {
      query._id = { $ne: excludePermitId };
    }

    return this.model.find(query).populate('department').populate('ward');
  }
}

export default new PermitRepository();
