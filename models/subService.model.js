const mongoose = require('mongoose');

const subServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for the sub-service'],
    trim: true,
    maxlength: [100, 'Sub-service name cannot be more than 100 characters']
  },
  mainService: {
    type: mongoose.Schema.ObjectId,
    ref: 'MainService',
    required: [true, 'Sub-service must belong to a main service']
  },
  image: {
    type: String,
    required: [true, 'Please provide an image for the sub-service']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
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

// Virtual populate
subServiceSchema.virtual('subSubServices', {
  ref: 'SubSubService',
  foreignField: 'subService',
  localField: '_id'
});

// Create slug from name
subServiceSchema.pre('save', function(next) {
  this.slug = this.name.toLowerCase().split(' ').join('-');
  next();
});

// Query middleware to filter out inactive services
subServiceSchema.pre(/^find/, function(next) {
  this.find({ isActive: { $ne: false } });
  next();
});

// Index for better performance
subServiceSchema.index({ mainService: 1 });

// Prevent duplicate sub-services under the same main service
subServiceSchema.index({ name: 1, mainService: 1 }, { unique: true });

module.exports = mongoose.model('SubService', subServiceSchema);
