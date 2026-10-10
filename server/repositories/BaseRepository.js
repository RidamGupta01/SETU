class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async find(filter = {}, populate = '', select = '', sort = {}) {
    return this.model.find(filter).populate(populate).select(select).sort(sort);
  }

  async findOne(filter = {}, populate = '', select = '') {
    return this.model.findOne(filter).populate(populate).select(select);
  }

  async findById(id, populate = '', select = '') {
    return this.model.findById(id).populate(populate).select(select);
  }

  async create(data) {
    return this.model.create(data);
  }

  async update(id, data, options = { new: true, runValidators: true }) {
    return this.model.findByIdAndUpdate(id, data, options);
  }

  async delete(id) {
    if (this.model.schema.paths.isDeleted) {
      return this.model.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    }
    return this.model.findByIdAndDelete(id);
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter);
  }
}

export default BaseRepository;
