const mongoose = require('mongoose');

const taxConfigSchema = new mongoose.Schema(
  {
    visitationFee: {
      type: Number,
      required: [true, 'Visitation fee is required'],
      min: [0, 'Visitation fee must be a positive number'],
    },
    taxesPercentage: {
      type: Number,
      required: [true, 'Taxes percentage is required'],
      min: [0, 'Taxes percentage must be a positive number'],
      max: [100, 'Taxes percentage cannot exceed 100%'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for active configurations
// taxConfigSchema.index({ isActive: 1, isDeleted: 1 });

const TaxConfig = mongoose.model('TaxConfig', taxConfigSchema);

module.exports = TaxConfig;
