const TaxConfig = require('../models/TaxConfig.model');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// @desc    Get active tax configuration (Public)
// @route   GET /api/v1/taxconfig
// @access  Public
exports.getActiveTaxConfig = catchAsync(async (req, res, next) => {
  const taxConfig = await TaxConfig.findOne({ isActive: true, isDeleted: false });

  if (!taxConfig) {
    return next(new AppError('No active tax configuration found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      taxConfig: {
        id: taxConfig._id,
        visitationFee: taxConfig.visitationFee,
        taxesPercentage: taxConfig.taxesPercentage,
      },
    },
  });
});

// @desc    Create new tax configuration (Admin)
// @route   POST /api/v1/admin/taxconfig
// @access  Private/Admin
exports.createTaxConfig = catchAsync(async (req, res, next) => {
  const { visitationFee, taxesPercentage } = req.body;

  // Deactivate any other active configs
  await TaxConfig.updateMany(
    { isActive: true, isDeleted: false },
    { $set: { isActive: false } }
  );

  const newTaxConfig = await TaxConfig.create({
    visitationFee,
    taxesPercentage,
    createdBy: req.user.id,
  });

  res.status(201).json({
    status: 'success',
    data: {
      taxConfig: newTaxConfig,
    },
  });
});

// @desc    Update tax configuration (Admin)
// @route   PUT /api/v1/admin/taxconfig/:id
// @access  Private/Admin
exports.updateTaxConfig = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { visitationFee, taxesPercentage, isActive } = req.body;

  const taxConfig = await TaxConfig.findById(id);

  if (!taxConfig || taxConfig.isDeleted) {
    return next(new AppError('No tax configuration found with that ID', 404));
  }

  // If activating this config, deactivate all others
  if (isActive === true) {
    await TaxConfig.updateMany(
      { _id: { $ne: id }, isActive: true, isDeleted: false },
      { $set: { isActive: false } }
    );
  }

  taxConfig.visitationFee = visitationFee ?? taxConfig.visitationFee;
  taxConfig.taxesPercentage = taxesPercentage ?? taxConfig.taxesPercentage;
  taxConfig.isActive = isActive ?? taxConfig.isActive;
  
  await taxConfig.save();

  res.status(200).json({
    status: 'success',
    data: {
      taxConfig,
    },
  });
});

// @desc    Delete tax configuration (Admin - soft delete)
// @route   DELETE /api/v1/admin/taxconfig/:id
// @access  Private/Admin
exports.deleteTaxConfig = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const taxConfig = await TaxConfig.findByIdAndUpdate(
    id,
    { isDeleted: true, isActive: false },
    { new: true }
  );

  if (!taxConfig) {
    return next(new AppError('No tax configuration found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// @desc    Get all tax configurations (Admin)
// @route   GET /api/v1/admin/taxconfig
// @access  Private/Admin
exports.getAllTaxConfigs = catchAsync(async (req, res, next) => {
  const { isActive } = req.query;
  
  const filter = { isDeleted: false };
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  const taxConfigs = await TaxConfig.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: taxConfigs.length,
    data: {
      taxConfigs,
    },
  });
});
