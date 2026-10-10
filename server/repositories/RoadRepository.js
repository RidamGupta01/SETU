import BaseRepository from './BaseRepository.js';
import Road from '../models/Road.js';

class RoadRepository extends BaseRepository {
  constructor() {
    super(Road);
  }

  async findWithDetails(filter = {}) {
    return this.model.find(filter).populate('ward').populate('closedByPermit');
  }

  async findIntersectingPoints(longitude, latitude, maxDistanceMeters) {
    return this.model.find({
      geometry: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: maxDistanceMeters
        }
      }
    }).populate('ward').populate('closedByPermit');
  }
}

export default new RoadRepository();
