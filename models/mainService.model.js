const mongoose = require('mongoose');

const mainServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for the main service'],
    trim: true,
    unique: true,
    maxlength: [100, 'Main service name cannot be more than 100 characters']
  },
  image: {
    type: String,
    required: [true, 'Please provide an image for the main service']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  cities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    required: [true, 'Please provide at least one city where service is available']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  slug: String,
  isAvailableNationwide: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate
mainServiceSchema.virtual('subServices', {
  ref: 'SubService',
  foreignField: 'mainService',
  localField: '_id'
});

// Create slug from name
mainServiceSchema.pre('save', function(next) {
  this.slug = this.name.toLowerCase().split(' ').join('-');
  next();
});

// Query middleware to filter out inactive services
mainServiceSchema.pre(/^find/, function(next) {
  this.find({ isActive: { $ne: false } });
  this.populate({
    path: 'cities',
    select: 'name state' // Only include city name and state in the response
  });
  next();
});

// Index for better query performance
mainServiceSchema.index({ name: 'text', description: 'text' });
mainServiceSchema.index({ cities: 1 });
mainServiceSchema.index({ isAvailableNationwide: 1 });

const MainService = mongoose.model('MainService', mainServiceSchema);

module.exports = MainService;
