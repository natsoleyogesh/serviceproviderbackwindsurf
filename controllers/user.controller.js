const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Address = require('../models/Address.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');
const { createSendToken } = require('../middleware/auth.middleware');

// Helper function to filter object fields
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// @desc    Register a new user
// @route   POST /api/v1/users/register
// @access  Public
exports.register = catchAsync(async (req, res, next) => {
  const { firstname, lastname, email, phone, password, passwordConfirm } = req.body;

  // 1) Check if user already exists
  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    return next(new AppError('User with this email or phone already exists', 400));
  }

  // 2) Create new user
  const newUser = await User.create({
    firstname,
    lastname,
    email,
    phone,
    password,
    passwordConfirm,
    role: 'user'
  });

  // 3) Generate OTP and send verification email
  const otp = newUser.createOtp();
  await newUser.save({ validateBeforeSave: false });

  try {
    // 4) Send welcome email with OTP
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/verify-email/${otp}`;
    await new Email(newUser, resetURL).sendWelcome();

    // 5) Create and send token
    createSendToken(newUser, 201, req, res);
  } catch (err) {
    // If email sending fails, delete the user
    await User.findByIdAndDelete(newUser._id);
    return next(
      new AppError('There was an error sending the email. Please try again later!', 500)
    );
  }
});

// @desc    Login user
// @route   POST /api/v1/users/login
// @access  Public
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) Check if email is verified
  if (!user.isEmailVerified) {
    return next(
      new AppError('Please verify your email address to login', 401)
    );
  }

  // 4) If everything ok, send token to client
  createSendToken(user, 200, req, res);
});

// @desc    Logout user
// @route   GET /api/v1/users/logout
// @access  Private
exports.logout = (req, res) => {
  res.cookie('token', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

// @desc    Get current user profile
// @route   GET /api/v1/users/me
// @access  Private
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate('addresses');

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// @desc    Update user profile
// @route   PATCH /api/v1/users/update-me
// @access  Private
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /update-password.',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(
    req.body,
    'firstname',
    'lastname',
    'email',
    'phone',
    'profilePicture'
  );

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// @desc    Delete user account
// @route   DELETE /api/v1/users/delete-me
// @access  Private
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// @desc    Forgot password
// @route   POST /api/v1/users/forgot-password
// @access  Public
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    // 3) Send it to user's email
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/reset-password/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

// @desc    Reset password
// @route   PATCH /api/v1/users/reset-password/:token
// @access  Public
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

// @desc    Update password
// @route   PATCH /api/v1/users/update-password
// @access  Private
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, req, res);
});

// @desc    Add address
// @route   POST /api/v1/users/addresses
// @access  Private
exports.addAddress = catchAsync(async (req, res, next) => {
  // 1) Create address
  const address = await Address.create({
    ...req.body,
    userId: req.user.id,
    userModel: 'User'
  });

  // 2) Add address to user's addresses array
  await User.findByIdAndUpdate(
    req.user.id,
    { $push: { addresses: address._id } },
    { new: true, runValidators: true }
  );

  res.status(201).json({
    status: 'success',
    data: {
      address,
    },
  });
});

// @desc    Update address
// @route   PATCH /api/v1/users/addresses/:id
// @access  Private
exports.updateAddress = catchAsync(async (req, res, next) => {
  const address = await Address.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!address) {
    return next(new AppError('No address found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      address,
    },
  });
});

// @desc    Delete address
// @route   DELETE /api/v1/users/addresses/:id
// @access  Private
exports.deleteAddress = catchAsync(async (req, res, next) => {
  // 1) Find and delete address
  const address = await Address.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!address) {
    return next(new AppError('No address found with that ID', 404));
  }

  // 2) Remove address from user's addresses array
  await User.findByIdAndUpdate(
    req.user.id,
    { $pull: { addresses: address._id } },
    { new: true }
  );

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// @desc    Verify email
// @route   GET /api/v1/users/verify-email/:otp
// @access  Public
exports.verifyEmail = catchAsync(async (req, res, next) => {
  // 1) Get user based on the OTP
  const user = await User.findOne({
    otp: req.params.otp,
    otpExpiry: { $gt: Date.now() },
  });

  // 2) If OTP has not expired, and there is user, verify the email
  if (!user) {
    return next(new AppError('OTP is invalid or has expired', 400));
  }

  // 3) Update user's email verification status
  user.isEmailVerified = true;
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  // 4) Send welcome email
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(user, url).sendWelcome();

  // 5) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

// @desc    Resend verification email
// @route   POST /api/v1/users/resend-verification
// @access  Public
exports.resendVerification = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }

  // 2) Check if user is already verified
  if (user.isEmailVerified) {
    return next(new AppError('Email is already verified', 400));
  }

  // 3) Generate new OTP
  const otp = user.createOtp();
  await user.save({ validateBeforeSave: false });

  // 4) Send verification email
  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/verify-email/${otp}`;
    await new Email(user, resetURL).sendWelcome();

    res.status(200).json({
      status: 'success',
      message: 'Verification email sent!',
    });
  } catch (err) {
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});
