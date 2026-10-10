function softDeletePlugin(schema) {
  schema.pre('find', function() {
    this.where({ isDeleted: { $ne: true } });
  });

  schema.pre('findOne', function() {
    this.where({ isDeleted: { $ne: true } });
  });

  schema.pre('countDocuments', function() {
    this.where({ isDeleted: { $ne: true } });
  });

  schema.pre('aggregate', function(next) {
    this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
    next();
  });
}

module.exports = softDeletePlugin;
