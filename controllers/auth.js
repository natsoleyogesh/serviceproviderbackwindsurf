const Admin = require('../models/Admin');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Register admin
// @route   POST /api/v1/auth/admin/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { username, email, password } = req.body;

  // Check if admin already exists
  const existingAdmin = await Admin.findOne({
    $or: [
      { email },
      { username: username.toLowerCase() }
    ]
  });

  if (existingAdmin) {
    return next(
      new ErrorResponse('Admin with this email or username already exists', 400)
    );
  }

  // Create admin
  const admin = await Admin.create({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    role: 'admin'
  });

  sendTokenResponse(admin, 200, res);
});

// @desc    Login admin
// @route   POST /api/v1/auth/admin/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;

  // Validate email & password
  if (!username || !password) {
    return next(new ErrorResponse('Please provide an username and password', 400));
  }

  // Check for admin
  const admin = await Admin.findOne({
    $or: [
      { email: username.toLowerCase() },
      { username: username.toLowerCase() }
    ]
  }).select('+password');

  if (!admin) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Check if admin is active
  if (!admin.isActive) {
    return next(new ErrorResponse('Account has been deactivated', 401));
  }

  // Check if password matches
  const isMatch = await admin.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Update last login
  admin.lastLogin = Date.now();
  await admin.save({ validateBeforeSave: false });

  sendTokenResponse(admin, 200, res);
});

// @desc    Get current logged in admin
// @route   GET /api/v1/auth/admin/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const admin = await Admin.findById(req.admin.id).select('-password');

  res.status(200).json({
    success: true,
    data: admin
  });
});

// @desc    Update admin details
// @route   PUT /api/v1/auth/admin/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    username: req.body.username,
    email: req.body.email
  };

  const admin = await Admin.findByIdAndUpdate(req.admin.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: admin
  });
});

// @desc    Update password
// @route   PUT /api/v1/auth/admin/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const admin = await Admin.findById(req.admin.id).select('+password');

  // Check current password
  if (!(await admin.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  admin.password = req.body.newPassword;
  await admin.save();

  sendTokenResponse(admin, 200, res);
});

// @desc    Logout admin / clear cookie
// @route   GET /api/v1/auth/admin/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (admin, statusCode, res) => {
  // Create token
  const token = admin.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      role: admin.role
    });
};
