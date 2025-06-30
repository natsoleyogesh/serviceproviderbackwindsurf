const SubSubService = require('../models/subSubService.model');
const SubService = require('../models/subService.model');
const MainService = require('../models/mainService.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// @desc    Create a new sub-sub-service
// @route   POST /api/v1/services/sub-sub
// @access  Private/Admin
exports.createSubSubService = catchAsync(async (req, res, next) => {
  const { name, description, subService, mainService } = req.body;
  
  // Check if parent services exist
  const [subServiceDoc, mainServiceDoc] = await Promise.all([
    SubService.findById(subService),
    MainService.findById(mainService)
  ]);

  if (!subServiceDoc) {
    return next(new AppError('No sub-service found with that ID', 404));
  }
  
  if (!mainServiceDoc) {
    return next(new AppError('No main service found with that ID', 404));
  }

  // Check if sub-service belongs to the main service
  if (subServiceDoc.mainService.toString() !== mainService) {
    return next(new AppError('The sub-service does not belong to the specified main service', 400));
  }

  // Check if image is uploaded
  if (!req.file) {
    return next(new AppError('Please upload an image for the service', 400));
  }

  const subSubService = await SubSubService.create({
    name,
    description,
    subService,
    mainService,
    image: req.file.filename
  });

  res.status(201).json({
    status: 'success',
    data: {
      subSubService
    }
  });
});

// @desc    Get all sub-sub-services
// @route   GET /api/v1/services/sub-sub
// @access  Public
exports.getAllSubSubServices = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    SubSubService.find()
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

// @desc    Get single sub-sub-service
// @route   GET /api/v1/services/sub-sub/:id
// @access  Public
exports.getSubSubService = catchAsync(async (req, res, next) => {
  const subSubService = await SubSubService.findById(req.params.id)
    .populate('mainService', 'name')
    .populate('subService', 'name');
  
  if (!subSubService) {
    return next(new AppError('No sub-sub-service found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      subSubService
    }
  });
});

// @desc    Update sub-sub-service
// @route   PATCH /api/v1/services/sub-sub/:id
// @access  Private/Admin
exports.updateSubSubService = catchAsync(async (req, res, next) => {
  const { name, description, subService, mainService } = req.body;
  const updateData = { name, description };
  
  if (subService || mainService) {
    // Check if parent services exist and are valid
    const [subServiceDoc, mainServiceDoc] = await Promise.all([
      subService ? SubService.findById(subService) : null,
      mainService ? MainService.findById(mainService) : null
    ]);

    if (subService && !subServiceDoc) {
      return next(new AppError('No sub-service found with that ID', 404));
    }
    
    if (mainService && !mainServiceDoc) {
      return next(new AppError('No main service found with that ID', 404));
    }

    if (subService) updateData.subService = subService;
    if (mainService) updateData.mainService = mainService;
  }

  // If there's a new image, add it to the update data
  if (req.file) {
    updateData.image = req.file.filename;
  }

  const subSubService = await SubSubService.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );

  if (!subSubService) {
    return next(new AppError('No sub-sub-service found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      subSubService
    }
  });
});

// @desc    Delete sub-sub-service
// @route   DELETE /api/v1/services/sub-sub/:id
// @access  Private/Admin
exports.deleteSubSubService = catchAsync(async (req, res, next) => {
  // Check if there are any sub-sub-sub-services under this sub-sub-service
  const SubSubSubService = require('./subSubSubService.model');
  const hasSubSubSubServices = await SubSubSubService.findOne({ subSubService: req.params.id });
  
  if (hasSubSubSubServices) {
    return next(
      new AppError('Cannot delete sub-sub-service with existing services. Please delete the services first.', 400)
    );
  }

  const subSubService = await SubSubService.findByIdAndDelete(req.params.id);

  if (!subSubService) {
    return next(new AppError('No sub-sub-service found with that ID', 404));
  }

  // TODO: Delete the associated image from the file system

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Get services for a sub-sub-service
// @route   GET /api/v1/services/sub-sub/:subSubServiceId/services
// @access  Public
exports.getServicesBySubSubService = catchAsync(async (req, res, next) => {
  const SubSubSubService = require('./subSubSubService.model');
  
  const features = new APIFeatures(
    SubSubSubService.find({ subSubService: req.params.subSubServiceId })
      .populate('mainService', 'name')
      .populate('subService', 'name')
      .populate('subSubService', 'name'),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();
  
  const services = await features.query;

  res.status(200).json({
    status: 'success',
    results: services.length,
    data: {
      services
    }
  });
});
