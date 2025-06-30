const User = require('../models/User.model');
const ServiceProvider = require('../models/ServiceProvider.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

// @desc    Get all users (Admin only)
// @route   GET /api/v1/admin/users
// @access  Private/Admin
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    User.find().select('-password -passwordChangedAt'),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const users = await features.query;

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

// @desc    Get single user (Admin only)
// @route   GET /api/v1/admin/users/:id
// @access  Private/Admin
exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password -passwordChangedAt');

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// @desc    Create new user (Admin only)
// @route   POST /api/v1/admin/users
// @access  Private/Admin
exports.createUser = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    phone: req.body.phone,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
  });

  // Remove password from output
  newUser.password = undefined;

  res.status(201).json({
    status: 'success',
    data: {
      user: newUser,
    },
  });
});

// @desc    Update user (Admin only)
// @route   PATCH /api/v1/admin/users/:id
// @access  Private/Admin
exports.updateUser = catchAsync(async (req, res, next) => {
  // 1) Filter out unwanted fields that are not allowed to be updated
  const filteredBody = {};
  const allowedFields = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'role',
    'isEmailVerified',
    'status',
  ];

  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {
      filteredBody[key] = req.body[key];
    }
  });

  // 2) Update user document
  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  ).select('-password -passwordChangedAt');

  if (!updatedUser) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// @desc    Delete user (Admin only)
// @route   DELETE /api/v1/admin/users/:id
// @access  Private/Admin
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// @desc    Update user status (Admin only)
// @route   PATCH /api/v1/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  // Validate status
  const validStatuses = ['active', 'inactive', 'suspended'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status },
    {
      new: true,
      runValidators: true,
    }
  ).select('-password -passwordChangedAt');

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// @desc    Get all service providers (Admin only)
// @route   GET /api/v1/admin/service-providers
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

// @desc    Get single service provider (Admin only)
// @route   GET /api/v1/admin/service-providers/:id
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

// @desc    Update service provider status (Admin only)
// @route   PATCH /api/v1/admin/service-providers/:id/status
// @access  Private/Admin
exports.updateServiceProviderStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  // Validate status
  const validStatuses = ['active', 'inactive', 'suspended'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  const serviceProvider = await ServiceProvider.findByIdAndUpdate(
    req.params.id,
    { status },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate('mainServices')
    .populate('subServices')
    .populate('subSubServices')
    .populate('subSubSubServices');

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
// @route   PATCH /api/v1/admin/service-providers/:id/approval
// @access  Private/Admin
exports.updateServiceProviderApproval = catchAsync(async (req, res, next) => {
  const { status, rejectionReason } = req.body;

  // Validate status
  const validStatuses = ['pending', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  const update = {
    approvalStatus: status,
    approvalDate: Date.now(),
    approvedBy: req.user.id,
  };

  if (status === 'rejected') {
    update.rejectionReason = rejectionReason || 'No reason provided';
  }

  const serviceProvider = await ServiceProvider.findByIdAndUpdate(
    req.params.id,
    update,
    {
      new: true,
      runValidators: true,
    }
  )
    .populate('mainServices')
    .populate('subServices')
    .populate('subSubServices')
    .populate('subSubSubServices');

  if (!serviceProvider) {
    return next(new AppError('No service provider found with that ID', 404));
  }

  // TODO: Send email notification to service provider

  res.status(200).json({
    status: 'success',
    data: {
      serviceProvider,
    },
  });
});

// @desc    Get service provider documents (Admin only)
// @route   GET /api/v1/admin/service-providers/:id/documents
// @access  Private/Admin
exports.getServiceProviderDocuments = catchAsync(async (req, res, next) => {
  const serviceProvider = await ServiceProvider.findById(req.params.id).select('documents');

  if (!serviceProvider) {
    return next(new AppError('No service provider found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    results: serviceProvider.documents.length,
    data: {
      documents: serviceProvider.documents,
    },
  });
});

// @desc    Update document status (Admin only)
// @route   PATCH /api/v1/admin/service-providers/:id/documents/:docId
// @access  Private/Admin
exports.updateDocumentStatus = catchAsync(async (req, res, next) => {
  const { status, rejectionReason } = req.body;

  // Validate status
  const validStatuses = ['pending', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  const serviceProvider = await ServiceProvider.findById(req.params.id);
  
  if (!serviceProvider) {
    return next(new AppError('No service provider found with that ID', 404));
  }

  // Find the document
  const docIndex = serviceProvider.documents.findIndex(
    doc => doc._id.toString() === req.params.docId
  );

  if (docIndex === -1) {
    return next(new AppError('No document found with that ID', 404));
  }

  // Update document status
  serviceProvider.documents[docIndex].status = status;
  serviceProvider.documents[docIndex].verifiedAt = Date.now();
  
  if (status === 'rejected') {
    serviceProvider.documents[docIndex].rejectionReason = rejectionReason || 'No reason provided';
  }

  await serviceProvider.save({ validateBeforeSave: false });

  // TODO: Send email notification to service provider about document status

  res.status(200).json({
    status: 'success',
    data: {
      document: serviceProvider.documents[docIndex],
    },
  });
});

// @desc    Get dashboard stats (Admin only)
// @route   GET /api/v1/admin/dashboard-stats
// @access  Private/Admin
exports.getDashboardStats = catchAsync(async (req, res, next) => {
  // Get user counts by status
  const userStats = await User.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  // Get service provider counts by approval status
  const serviceProviderStats = await ServiceProvider.aggregate([
    {
      $group: {
        _id: '$approvalStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  // Get total counts
  const totalUsers = await User.countDocuments();
  const totalServiceProviders = await ServiceProvider.countDocuments();
  const activeServiceProviders = await ServiceProvider.countDocuments({ 
    status: 'active',
    approvalStatus: 'approved' 
  });

  // Format the response
  const stats = {
    users: {
      total: totalUsers,
      byStatus: userStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
    },
    serviceProviders: {
      total: totalServiceProviders,
      active: activeServiceProviders,
      byApprovalStatus: serviceProviderStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
    },
  };

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});
