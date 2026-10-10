import BaseRepository from './BaseRepository.js';
import Ward from '../models/Ward.js';

class WardRepository extends BaseRepository {
  constructor() {
    super(Ward);
  }

  async findByCoordinates(longitude, latitude) {
    return this.model.findOne({
      boundary: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          }
        }
      }
    }).populate('zone');
  }

  async findByZone(zoneId) {
    return this.model.find({ zone: zoneId });
  }
}

export default new WardRepository();
