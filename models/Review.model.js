const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!'],
      trim: true,
      maxlength: [500, 'A review must have less or equal than 500 characters']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'A review must have a rating']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    serviceProvider: {
      type: mongoose.Schema.ObjectId,
      ref: 'ServiceProvider',
      required: [true, 'Review must belong to a service provider']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Prevent duplicate reviews
reviewSchema.index({ serviceProvider: 1, user: 1 }, { unique: true });

// Populate user and service provider data when querying
reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'firstname lastname photo'
  });
  next();
});

// Static method to calculate average rating
reviewSchema.statics.calcAverageRatings = async function(serviceProviderId) {
  const stats = await this.aggregate([
    {
      $match: { serviceProvider: serviceProviderId }
    },
    {
      $group: {
        _id: '$serviceProvider',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await this.model('ServiceProvider').findByIdAndUpdate(serviceProviderId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await this.model('ServiceProvider').findByIdAndUpdate(serviceProviderId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5 // Default value
    });
  }
};

// Update service provider ratings after saving a review
reviewSchema.post('save', function() {
  // this points to current review
  this.constructor.calcAverageRatings(this.serviceProvider);
});

// Update service provider ratings after updating or deleting a review
reviewSchema.post(/^findOneAnd/, async function(doc) {
  if (doc) {
    await doc.constructor.calcAverageRatings(doc.serviceProvider);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
