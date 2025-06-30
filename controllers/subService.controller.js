const SubService = require('../models/subService.model');
const MainService = require('../models/mainService.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// @desc    Create a new sub-service
// @route   POST /api/v1/services/sub
// @access  Private/Admin
exports.createSubService = catchAsync(async (req, res, next) => {
  const { name, description, mainService } = req.body;
  
  // Check if main service exists
  const mainServiceExists = await MainService.findById(mainService);
  if (!mainServiceExists) {
    return next(new AppError('No main service found with that ID', 404));
  }

  // Check if image is uploaded
  if (!req.file) {
    return next(new AppError('Please upload an image for the service', 400));
  }

  const subService = await SubService.create({
    name,
    description,
    mainService,
    image: req.file.filename
  });

  res.status(201).json({
    status: 'success',
    data: {
      subService
    }
  });
});

// @desc    Get all sub-services
// @route   GET /api/v1/services/sub
// @access  Public
exports.getAllSubServices = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(SubService.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate()
    .populate('mainService', 'name');
  
  const subServices = await features.query;

  res.status(200).json({
    status: 'success',
    results: subServices.length,
    data: {
      subServices
    }
  });
});

// @desc    Get single sub-service
// @route   GET /api/v1/services/sub/:id
// @access  Public
exports.getSubService = catchAsync(async (req, res, next) => {
  const subService = await SubService.findById(req.params.id).populate('mainService', 'name');
  
  if (!subService) {
    return next(new AppError('No sub-service found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      subService
    }
  });
});

// @desc    Update sub-service
// @route   PATCH /api/v1/services/sub/:id
// @access  Private/Admin
exports.updateSubService = catchAsync(async (req, res, next) => {
  const { name, description, mainService } = req.body;
  const updateData = { name, description };
  
  if (mainService) {
    // Check if main service exists
    const mainServiceExists = await MainService.findById(mainService);
    if (!mainServiceExists) {
      return next(new AppError('No main service found with that ID', 404));
    }
    updateData.mainService = mainService;
  }

  // If there's a new image, add it to the update data
  if (req.file) {
    updateData.image = req.file.filename;
  }

  const subService = await SubService.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );

  if (!subService) {
    return next(new AppError('No sub-service found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      subService
    }
  });
});

// @desc    Delete sub-service
// @route   DELETE /api/v1/services/sub/:id
// @access  Private/Admin
exports.deleteSubService = catchAsync(async (req, res, next) => {
  // Check if there are any sub-sub-services under this sub-service
  const SubSubService = require('./subSubService.model');
  const hasSubSubServices = await SubSubService.findOne({ subService: req.params.id });
  
  if (hasSubSubServices) {
    return next(
      new AppError('Cannot delete sub-service with existing sub-sub-services. Please delete sub-sub-services first.', 400)
    );
  }

  const subService = await SubService.findByIdAndDelete(req.params.id);

  if (!subService) {
    return next(new AppError('No sub-service found with that ID', 404));
  }

  // TODO: Delete the associated image from the file system

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Get sub-sub-services for a sub-service
// @route   GET /api/v1/services/sub/:subServiceId/sub-sub-services
// @access  Public
exports.getSubSubServicesBySubService = catchAsync(async (req, res, next) => {
  const SubSubService = require('./subSubService.model');
  
  const features = new APIFeatures(
    SubSubService.find({ subService: req.params.subServiceId })
      .populate('mainService', 'name')
      .populate('subService', 'name'),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  const subSubServices = await features.query;

  res.status(200).json({
    status: 'success',
    results: subSubServices.length,
    data: {
      subSubServices
    }
  });
});
