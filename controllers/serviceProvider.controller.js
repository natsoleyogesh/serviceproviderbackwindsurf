const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const ServiceProvider = require('../models/ServiceProvider.model');
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

// @desc    Register a new service provider
// @route   POST /api/v1/service-providers/register
// @access  Public
exports.register = catchAsync(async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    password,
    passwordConfirm,
    businessName,
    businessType
  } = req.body;

  // 1) Check if service provider already exists
  const existingProvider = await ServiceProvider.findOne({ $or: [{ email }, { phone }] });
  if (existingProvider) {
    return next(new AppError('Service provider with this email or phone already exists', 400));
  }

  // 2) Create new service provider
  const newProvider = await ServiceProvider.create({
    firstName,
    lastName,
    email,
    phone,
    password,
    passwordConfirm,
    businessName,
    businessType,
    status: 'inactive',
    approvalStatus: 'pending',
    role: 'serviceProvider'
  });

  // 3) Generate OTP and send verification email
  const otp = newProvider.createOtp();
  await newProvider.save({ validateBeforeSave: false });

  try {
    // 4) Send welcome email with OTP
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/service-providers/verify-email/${otp}`;
    await new Email(newProvider, resetURL).sendWelcome();

    // 5) Create and send token
    createSendToken(newProvider, 201, req, res);
  } catch (err) {
    // If email sending fails, delete the service provider
    await ServiceProvider.findByIdAndDelete(newProvider._id);
    return next(
      new AppError('There was an error sending the email. Please try again later!', 500)
    );
  }
});

// @desc    Login service provider
// @route   POST /api/v1/service-providers/login
// @access  Public
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if service provider exists && password is correct
  const serviceProvider = await ServiceProvider.findOne({ email }).select('+password');

  if (!serviceProvider || !(await serviceProvider.correctPassword(password, serviceProvider.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) Check if email is verified
  if (!serviceProvider.isEmailVerified) {
    return next(
      new AppError('Please verify your email address to login', 401)
    );
  }

  // 4) Check if account is approved
  if (serviceProvider.approvalStatus !== 'approved') {
    return next(
      new AppError('Your account is pending approval. Please wait for admin approval.', 401)
    );
  }

  // 5) If everything ok, send token to client
  createSendToken(serviceProvider, 200, req, res);
});

// @desc    Get current service provider profile
// @route   GET /api/v1/service-providers/me
// @access  Private
exports.getMe = catchAsync(async (req, res, next) => {
  const serviceProvider = await ServiceProvider.findById(req.user.id)
    .populate('addresses')
    .populate('mainServices')
    .populate('subServices')
    .populate('subSubServices')
    .populate('subSubSubServices');

  res.status(200).json({
    status: 'success',
    data: {
      serviceProvider,
    },
  });
});

// @desc    Update service provider profile
// @route   PATCH /api/v1/service-providers/update-me
// @access  Private
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if service provider POSTs password data
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
    'firstName',
    'lastName',
    'email',
    'phone',
    'profilePicture',
    'businessName',
    'businessType',
    'experience',
    'skills',
    'availability'
  );

  // 3) Update service provider document
  const updatedProvider = await ServiceProvider.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      serviceProvider: updatedProvider,
    },
  });
});

// @desc    Add service to service provider
// @route   PATCH /api/v1/service-providers/add-service
// @access  Private
exports.addService = catchAsync(async (req, res, next) => {
  const { serviceType, serviceId } = req.body;

  // Validate service type
  const validServiceTypes = ['mainServices', 'subServices', 'subSubServices', 'subSubSubServices'];
  if (!validServiceTypes.includes(serviceType)) {
    return next(new AppError('Invalid service type', 400));
  }

  // Update service provider with new service
  const update = { $addToSet: { [serviceType]: serviceId } };
  const serviceProvider = await ServiceProvider.findByIdAndUpdate(
    req.user.id,
    update,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      serviceProvider,
    },
  });
});

// @desc    Remove service from service provider
// @route   PATCH /api/v1/service-providers/remove-service
// @access  Private
exports.removeService = catchAsync(async (req, res, next) => {
  const { serviceType, serviceId } = req.body;

  // Validate service type
  const validServiceTypes = ['mainServices', 'subServices', 'subSubServices', 'subSubSubServices'];
  if (!validServiceTypes.includes(serviceType)) {
    return next(new AppError('Invalid service type', 400));
  }

  // Update service provider to remove service
  const update = { $pull: { [serviceType]: serviceId } };
  const serviceProvider = await ServiceProvider.findByIdAndUpdate(
    req.user.id,
    update,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      serviceProvider,
    },
  });
});

// @desc    Add document
// @route   POST /api/v1/service-providers/documents
// @access  Private
exports.addDocument = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a file', 400));
  }

  const { type } = req.body;

  // Validate document type
  const validDocumentTypes = ['license', 'certificate', 'id_proof'];
  if (!validDocumentTypes.includes(type)) {
    return next(new AppError('Invalid document type', 400));
  }

  // Add document to service provider
  const document = {
    type,
    url: req.file.path,
    status: 'pending'
  };

  const serviceProvider = await ServiceProvider.findByIdAndUpdate(
    req.user.id,
    { $push: { documents: document } },
    { new: true, runValidators: true }
  );

  res.status(201).json({
    status: 'success',
    data: {
      document: serviceProvider.documents[serviceProvider.documents.length - 1],
    },
  });
});

// @desc    Delete document
// @route   DELETE /api/v1/service-providers/documents/:id
// @access  Private
exports.deleteDocument = catchAsync(async (req, res, next) => {
  const serviceProvider = await ServiceProvider.findById(req.user.id);

  // Find the document
  const docIndex = serviceProvider.documents.findIndex(
    doc => doc._id.toString() === req.params.id
  );

  if (docIndex === -1) {
    return next(new AppError('No document found with that ID', 404));
  }

  // Remove document from array
  serviceProvider.documents.splice(docIndex, 1);
  await serviceProvider.save();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// @desc    Add address
// @route   POST /api/v1/service-providers/addresses
// @access  Private
exports.addAddress = catchAsync(async (req, res, next) => {
  // 1) Create address
  const address = await Address.create({
    ...req.body,
    userId: req.user.id,
    userModel: 'ServiceProvider'
  });

  // 2) Add address to service provider's addresses array
  await ServiceProvider.findByIdAndUpdate(
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
// @route   PATCH /api/v1/service-providers/addresses/:id
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
// @route   DELETE /api/v1/service-providers/addresses/:id
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

  // 2) Remove address from service provider's addresses array
  await ServiceProvider.findByIdAndUpdate(
    req.user.id,
    { $pull: { addresses: address._id } },
    { new: true }
  );

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// @desc    Forgot password
// @route   POST /api/v1/service-providers/forgot-password
// @access  Public
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get service provider based on POSTed email
  const serviceProvider = await ServiceProvider.findOne({ email: req.body.email });
  if (!serviceProvider) {
    return next(new AppError('There is no service provider with that email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = serviceProvider.createPasswordResetToken();
  await serviceProvider.save({ validateBeforeSave: false });

  try {
    // 3) Send it to service provider's email
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/service-providers/reset-password/${resetToken}`;

    await new Email(serviceProvider, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    serviceProvider.passwordResetToken = undefined;
    serviceProvider.passwordResetExpires = undefined;
    await serviceProvider.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

// @desc    Reset password
// @route   PATCH /api/v1/service-providers/reset-password/:token
// @access  Public
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get service provider based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const serviceProvider = await ServiceProvider.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is service provider, set the new password
  if (!serviceProvider) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  serviceProvider.password = req.body.password;
  serviceProvider.passwordConfirm = req.body.passwordConfirm;
  serviceProvider.passwordResetToken = undefined;
  serviceProvider.passwordResetExpires = undefined;
  await serviceProvider.save();

  // 3) Update changedPasswordAt property for the service provider
  // 4) Log the service provider in, send JWT
  createSendToken(serviceProvider, 200, req, res);
});

// @desc    Update password
// @route   PATCH /api/v1/service-providers/update-password
// @access  Private
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get service provider from collection
  const serviceProvider = await ServiceProvider.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await serviceProvider.correctPassword(req.body.passwordCurrent, serviceProvider.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  serviceProvider.password = req.body.password;
  serviceProvider.passwordConfirm = req.body.passwordConfirm;
  await serviceProvider.save();

  // 4) Log service provider in, send JWT
  createSendToken(serviceProvider, 200, req, res);
});

// @desc    Verify email
// @route   GET /api/v1/service-providers/verify-email/:otp
// @access  Public
exports.verifyEmail = catchAsync(async (req, res, next) => {
  // 1) Get service provider based on the OTP
  const serviceProvider = await ServiceProvider.findOne({
    otp: req.params.otp,
    otpExpiry: { $gt: Date.now() },
  });

  // 2) If OTP has not expired, and there is service provider, verify the email
  if (!serviceProvider) {
    return next(new AppError('OTP is invalid or has expired', 400));
  }

  // 3) Update service provider's email verification status
  serviceProvider.isEmailVerified = true;
  serviceProvider.otp = undefined;
  serviceProvider.otpExpiry = undefined;
  await serviceProvider.save({ validateBeforeSave: false });

  // 4) Send welcome email
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(serviceProvider, url).sendWelcome();

  // 5) Log the service provider in, send JWT
  createSendToken(serviceProvider, 200, req, res);
});

// @desc    Resend verification email
// @route   POST /api/v1/service-providers/resend-verification
// @access  Public
exports.resendVerification = catchAsync(async (req, res, next) => {
  // 1) Get service provider based on POSTed email
  const serviceProvider = await ServiceProvider.findOne({ email: req.body.email });
  if (!serviceProvider) {
    return next(new AppError('There is no service provider with that email address.', 404));
  }

  // 2) Check if service provider is already verified
  if (serviceProvider.isEmailVerified) {
    return next(new AppError('Email is already verified', 400));
  }

  // 3) Generate new OTP
  const otp = serviceProvider.createOtp();
  await serviceProvider.save({ validateBeforeSave: false });

  // 4) Send verification email
  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/service-providers/verify-email/${otp}`;
    await new Email(serviceProvider, resetURL).sendWelcome();

    res.status(200).json({
      status: 'success',
      message: 'Verification email sent!',
    });
  } catch (err) {
    serviceProvider.otp = undefined;
    serviceProvider.otpExpiry = undefined;
    await serviceProvider.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

// @desc    Update service provider status (Admin only)
// @route   PATCH /api/v1/service-providers/:id/status
// @access  Private/Admin
exports.updateStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  // Validate status
  const validStatuses = ['active', 'inactive', 'suspended'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  const serviceProvider = await ServiceProvider.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!serviceProvider) {
    return next(new AppError('No service provider found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      serviceProvider,
    },
  });
});

// @desc    Approve/Reject service provider (Admin only)
// @route   PATCH /api/v1/service-providers/:id/approval
// @access  Private/Admin
exports.updateApproval = catchAsync(async (req, res, next) => {
  const { status, rejectionReason } = req.body;

  // Validate status
  const validStatuses = ['approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  const update = {
    approvalStatus: status,
    approvalDate: Date.now(),
    approvedBy: req.user.id
  };

  if (status === 'rejected') {
    update.rejectionReason = rejectionReason || 'No reason provided';
  }

  const serviceProvider = await ServiceProvider.findByIdAndUpdate(
    req.params.id,
    update,
    { new: true, runValidators: true }
  );

  if (!serviceProvider) {
    return next(new AppError('No service provider found with that ID', 404));
  }

  // Send approval/rejection email
  try {
    const url = `${req.protocol}://${req.get('host')}/login`;
    if (status === 'approved') {
      await new Email(serviceProvider, url).sendApprovalNotification();
    } else {
      await new Email(serviceProvider, url).sendRejectionNotification(rejectionReason);
    }
  } catch (err) {
    console.error('Error sending email notification:', err);
    // Don't fail the request if email fails
  }

  res.status(200).json({
    status: 'success',
    data: {
      serviceProvider,
    },
  });
});

// @desc    Get all service providers (Admin only)
// @route   GET /api/v1/service-providers
// @access  Private/Admin
exports.getAllServiceProviders = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    ServiceProvider.find()
      .populate('mainServices')
      .populate('subServices')
      .populate('subSubServices')
      .populate('subSubSubServices'),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const serviceProviders = await features.query;

  res.status(200).json({
    status: 'success',
    results: serviceProviders.length,
    data: {
      serviceProviders,
    },
  });
});

// @desc    Get a single service provider (Admin only)
// @route   GET /api/v1/service-providers/:id
// @access  Private/Admin
exports.getServiceProvider = catchAsync(async (req, res, next) => {
  const serviceProvider = await ServiceProvider.findById(req.params.id)
    .populate('mainServices')
    .populate('subServices')
    .populate('subSubServices')
    .populate('subSubSubServices')
    .populate('addresses');

  if (!serviceProvider) {
    return next(new AppError('No service provider found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      serviceProvider,
    },
  });
});
