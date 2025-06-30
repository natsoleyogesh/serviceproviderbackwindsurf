const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const serviceProviderSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    validate: {
      validator: function (v) {
        return /^[0-9]{10}$/.test(v);
      },
      message: 'Please provide a valid 10-digit phone number'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },

  // Business Information
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true
  },
  businessType: {
    type: String,
    required: [true, 'Business type is required'],
    trim: true
  },
  experience: {
    type: Number,
    min: [0, 'Experience cannot be negative']
  },
  skills: [{
    type: String,
    trim: true
  }],

  // Service References
  mainServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MainService'
  }],
  subServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubService'
  }],
  subSubServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubSubService'
  }],
  subSubSubServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubSubSubService'
  }],

  // Availability
  availability: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required for availability'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s(AM|PM)$/, 'Please provide time in 12-hour format (e.g., 09:00 AM)']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required for availability'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s(AM|PM)$/, 'Please provide time in 12-hour format (e.g., 06:00 PM)']
    }
  }],
  role: {
    type: String,
    enum: ['serviceProvider'],
    default: 'serviceProvider'
  },

  // Documents
  documents: [{
    type: {
      type: String,
      enum: ['license', 'certificate', 'id_proof'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    rejectionReason: String
  }],

  // Status and Approvals
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'inactive'
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvalDate: Date,
  rejectionReason: String,

  // Authentication and Verification
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  profilePicture: {
    type: String,
    default: 'default.jpg'
  },
  otp: String,
  otpExpiry: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  // Ratings and Reviews
  rating: {
    type: Number,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot be more than 5'],
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },

  // Timestamps
  lastLogin: {
    type: Date,
    default: Date.now
  },
  addresses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
serviceProviderSchema.index({ email: 1 });
serviceProviderSchema.index({ phone: 1 });
serviceProviderSchema.index({ businessName: 'text' });
serviceProviderSchema.index({ approvalStatus: 1 });

// Hash password before saving
serviceProviderSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to check password
serviceProviderSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Generate and hash password reset token
serviceProviderSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

// Generate OTP
serviceProviderSchema.methods.createOtp = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

// Virtual for full name
serviceProviderSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

const ServiceProvider = mongoose.model('ServiceProvider', serviceProviderSchema);

module.exports = ServiceProvider;
