import BaseRepository from './BaseRepository.js';
import Zone from '../models/Zone.js';

class ZoneRepository extends BaseRepository {
  constructor() {
    super(Zone);
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
    });
  }
}

export default new ZoneRepository();
