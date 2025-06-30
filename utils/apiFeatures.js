class APIFeatures {
  /**
   * Create APIFeatures
   * @param {Query} query - Mongoose query object
   * @param {Object} queryString - Request query parameters
   */
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  /**
   * Filter the query based on query parameters
   * @returns {APIFeatures} - The current instance for chaining
   */
  filter() {
    // 1A) Filtering
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // 1B) Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  /**
   * Sort the query results
   * @returns {APIFeatures} - The current instance for chaining
   */
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  /**
   * Limit the fields to return
   * @returns {APIFeatures} - The current instance for chaining
   */
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  /**
   * Paginate the results
   * @returns {APIFeatures} - The current instance for chaining
   */
  paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }

  /**
   * Populate referenced fields
   * @param {Object|string} options - Populate options or path
   * @returns {APIFeatures} - The current instance for chaining
   */
  populate(options) {
    this.query = this.query.populate(options);
    return this;
  }
}

module.exports = APIFeatures;
