const mongoose = require('mongoose');

const subSubSubServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for the service'],
    trim: true,
    maxlength: [100, 'Service name cannot be more than 100 characters']
  },
  subSubService: {
    type: mongoose.Schema.ObjectId,
    ref: 'SubSubService',
    required: [true, 'Service must belong to a sub-sub-service']
  },
  subService: {
    type: mongoose.Schema.ObjectId,
    ref: 'SubService',
    required: [true, 'Service must belong to a sub-service']
  },
  mainService: {
    type: mongoose.Schema.ObjectId,
    ref: 'MainService',
    required: [true, 'Service must belong to a main service']
  },
  image: {
    type: String,
    required: [true, 'Please provide a main image for the service']
  },
  images: [{
    type: String
  }],
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please provide a price for the service'],
    min: [0, 'Price must be a positive number']
  },
  included: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    select: false
  },
  slug: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true
});

// Create slug from name
subSubSubServiceSchema.pre('save', function(next) {
  this.slug = this.name.toLowerCase().split(' ').join('-');
  next();
});

// Query middleware to filter out inactive and deleted services
subSubSubServiceSchema.pre(/^find/, function(next) {
  this.find({ isActive: { $ne: false }, isDeleted: { $ne: true } });
  next();
});

// Indexes for better performance
subSubSubServiceSchema.index({ subSubService: 1 });
subSubSubServiceSchema.index({ subService: 1 });
subSubSubServiceSchema.index({ mainService: 1 });

// Prevent duplicate services under the same sub-sub-service
subSubSubServiceSchema.index({ name: 1, subSubService: 1 }, { unique: true });

module.exports = mongoose.model('SubSubSubService', subSubSubServiceSchema);
