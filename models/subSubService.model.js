const mongoose = require('mongoose');

const subSubServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for the sub-sub-service'],
    trim: true,
    maxlength: [100, 'Sub-sub-service name cannot be more than 100 characters']
  },
  subService: {
    type: mongoose.Schema.ObjectId,
    ref: 'SubService',
    required: [true, 'Sub-sub-service must belong to a sub-service']
  },
  mainService: {
    type: mongoose.Schema.ObjectId,
    ref: 'MainService',
    required: [true, 'Sub-sub-service must belong to a main service']
  },
  image: {
    type: String,
    required: [true, 'Please provide an image for the sub-sub-service']
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
subSubServiceSchema.virtual('subSubSubServices', {
  ref: 'SubSubSubService',
  foreignField: 'subSubService',
  localField: '_id'
});

// Create slug from name
subSubServiceSchema.pre('save', function(next) {
  this.slug = this.name.toLowerCase().split(' ').join('-');
  next();
});

// Query middleware to filter out inactive services
subSubServiceSchema.pre(/^find/, function(next) {
  this.find({ isActive: { $ne: false } });
  next();
});

// Indexes for better performance
subSubServiceSchema.index({ subService: 1 });
subSubServiceSchema.index({ mainService: 1 });

// Prevent duplicate sub-sub-services under the same sub-service
subSubServiceSchema.index({ name: 1, subService: 1 }, { unique: true });

module.exports = mongoose.model('SubSubService', subSubServiceSchema);
