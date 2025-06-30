const SubSubSubService = require('../models/subSubSubService.model');
const SubSubService = require('../models/subSubService.model');
const SubService = require('../models/subService.model');
const MainService = require('../models/mainService.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const fs = require('fs');
const path = require('path');

// Helper function to delete file
const deleteFile = (filename) => {
  if (filename) {
    const filePath = path.join(__dirname, '../public/uploads', filename);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Error deleting file ${filename}:`, err);
      });
    }
  }
};

// @desc    Create a new service
// @route   POST /api/v1/services
// @access  Private/Admin
exports.createService = catchAsync(async (req, res, next) => {
  const { 
    name, 
    description, 
    subSubService,
    subService,
    mainService,
    price,
    included,
    notes
  } = req.body;
  
  // Check if parent services exist and are related correctly
  const [subSubServiceDoc, subServiceDoc, mainServiceDoc] = await Promise.all([
    SubSubService.findById(subSubService),
    SubService.findById(subService),
    MainService.findById(mainService)
  ]);

  if (!subSubServiceDoc) {
    return next(new AppError('No sub-sub-service found with that ID', 404));
  }
  
  if (!subServiceDoc) {
    return next(new AppError('No sub-service found with that ID', 404));
  }
  
  if (!mainServiceDoc) {
    return next(new AppError('No main service found with that ID', 404));
  }

  // Validate hierarchy
  if (subSubServiceDoc.subService.toString() !== subService ||
      subServiceDoc.mainService.toString() !== mainService) {
    return next(new AppError('Invalid service hierarchy', 400));
  }

  // Check if image is uploaded
  if (!req.file) {
    return next(new AppError('Please upload a main image for the service', 400));
  }

  // Handle additional images if any
  const additionalImages = [];
  if (req.files && req.files.additionalImages) {
    const files = Array.isArray(req.files.additionalImages) 
      ? req.files.additionalImages 
      : [req.files.additionalImages];
    
    files.forEach(file => {
      additionalImages.push(file.filename);
    });
  }

  const service = await SubSubSubService.create({
    name,
    description,
    subSubService,
    subService,
    mainService,
    price: parseFloat(price),
    included: included ? JSON.parse(included) : [],
    notes: notes || '',
    image: req.file.filename,
    images: additionalImages
  });

  res.status(201).json({
    status: 'success',
    data: {
      service
    }
  });
});

// @desc    Get all services
// @route   GET /api/v1/services
// @access  Public
exports.getAllServices = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(
    SubSubSubService.find()
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

// @desc    Get single service
// @route   GET /api/v1/services/:id
// @access  Public
exports.getService = catchAsync(async (req, res, next) => {
  const service = await SubSubSubService.findById(req.params.id)
    .populate('mainService', 'name')
    .populate('subService', 'name')
    .populate('subSubService', 'name');
  
  if (!service) {
    return next(new AppError('No service found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      service
    }
  });
});

// @desc    Update service
// @route   PATCH /api/v1/services/:id
// @access  Private/Admin
exports.updateService = catchAsync(async (req, res, next) => {
  const { 
    name, 
    description, 
    subSubService,
    subService,
    mainService,
    price,
    included,
    notes
  } = req.body;
  
  const updateData = { 
    name, 
    description,
    price: price ? parseFloat(price) : undefined,
    included: included ? JSON.parse(included) : undefined,
    notes
  };

  // If any parent service is being updated, validate the hierarchy
  if (subSubService || subService || mainService) {
    const [subSubServiceDoc, subServiceDoc, mainServiceDoc] = await Promise.all([
      subSubService ? SubSubService.findById(subSubService) : null,
      subService ? SubService.findById(subService) : null,
      mainService ? MainService.findById(mainService) : null
    ]);

    if (subSubService && !subSubServiceDoc) {
      return next(new AppError('No sub-sub-service found with that ID', 404));
    }
    
    if (subService && !subServiceDoc) {
      return next(new AppError('No sub-service found with that ID', 404));
    }
    
    if (mainService && !mainServiceDoc) {
      return next(new AppError('No main service found with that ID', 404));
    }

    // Update the hierarchy
    if (subSubService) updateData.subSubService = subSubService;
    if (subService) updateData.subService = subService;
    if (mainService) updateData.mainService = mainService;
  }

  // Handle main image update
  if (req.file) {
    // Delete old image if exists
    const oldService = await SubSubSubService.findById(req.params.id);
    if (oldService && oldService.image) {
      deleteFile(oldService.image);
    }
    updateData.image = req.file.filename;
  }

  // Handle additional images
  if (req.files && req.files.additionalImages) {
    const files = Array.isArray(req.files.additionalImages) 
      ? req.files.additionalImages 
      : [req.files.additionalImages];
    
    const additionalImages = files.map(file => file.filename);
    updateData.$push = { images: { $each: additionalImages } };
  }

  const service = await SubSubSubService.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );

  if (!service) {
    return next(new AppError('No service found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      service
    }
  });
});

// @desc    Delete service
// @route   DELETE /api/v1/services/:id
// @access  Private/Admin
exports.deleteService = catchAsync(async (req, res, next) => {
  const service = await SubSubSubService.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true },
    { new: true }
  );

  if (!service) {
    return next(new AppError('No service found with that ID', 404));
  }

  // Note: We're not deleting the files here to allow for recovery
  // If you want to delete the files, uncomment the following:
  /*
  if (service.image) {
    deleteFile(service.image);
  }
  if (service.images && service.images.length > 0) {
    service.images.forEach(image => deleteFile(image));
  }
  */

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Delete service image
// @route   DELETE /api/v1/services/:id/images/:image
// @access  Private/Admin
exports.deleteServiceImage = catchAsync(async (req, res, next) => {
  const service = await SubSubSubService.findById(req.params.id);
  
  if (!service) {
    return next(new AppError('No service found with that ID', 404));
  }

  const imageIndex = service.images.indexOf(req.params.image);
  
  if (imageIndex === -1) {
    return next(new AppError('No image found with that name', 404));
  }

  // Delete the file
  deleteFile(req.params.image);
  
  // Remove from array
  service.images.splice(imageIndex, 1);
  await service.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      service
    }
  });
});
