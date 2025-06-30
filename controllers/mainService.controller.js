const MainService = require('../models/mainService.model');
// const City = require('../models/cities');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// @desc    Create a new main service
// @route   POST /api/v1/services/main
// @access  Private/Admin
exports.createMainService = catchAsync(async (req, res, next) => {
  const { name, description, cities, isAvailableNationwide } = req.body;

  // Check if image is uploaded
  if (!req.file) {
    return next(new AppError('Please upload an image for the service', 400));
  }

  // Validate cities if not available nationwide
  if (!isAvailableNationwide && (!cities || !cities.length)) {
    return next(new AppError('Please provide at least one city where the service is available', 400));
  }

  // // Check if all cities exist
  // if (cities && cities.length > 0) {
  //   const citiesCount = await City.countDocuments({ _id: { $in: cities } });
  //   if (citiesCount !== cities.length) {
  //     return next(new AppError('One or more cities not found', 404));
  //   }
  // }

  const image = req.file.filename;

  const mainService = await MainService.create({
    name,
    description,
    image,
    cities: isAvailableNationwide ? [] : cities,
    isAvailableNationwide: isAvailableNationwide || false
  });

  res.status(201).json({
    status: 'success',
    data: {
      mainService
    }
  });
});

// @desc    Get all main services
// @route   GET /api/v1/services/main
// @access  Public
exports.getAllMainServices = catchAsync(async (req, res, next) => {
  // Extract query parameters
  const { city, available, ...otherQuery } = req.query;

  // Build base query
  let query = MainService.find();

  // Filter by city if provided
  if (city) {
    query = query.or([
      { cities: city },
      { isAvailableNationwide: true }
    ]);
  }

  // Filter by availability
  if (available === 'true') {
    query = query.find({ isActive: true });
  }

  // Execute query with features
  const features = new APIFeatures(query, otherQuery)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const mainServices = await features.query;

  // Send response
  res.status(200).json({
    status: 'success',
    results: mainServices.length,
    data: {
      mainServices
    }
  });
});

// @desc    Get single main service
// @route   GET /api/v1/services/main/:id
// @access  Public
exports.getMainService = catchAsync(async (req, res, next) => {
  const mainService = await MainService.findById(req.params.id);

  if (!mainService) {
    return next(new AppError('No main service found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      mainService
    }
  });
});

// @desc    Update main service
// @route   PATCH /api/v1/services/main/:id
// @access  Private/Admin
exports.updateMainService = catchAsync(async (req, res, next) => {
  const { name, description, cities, isAvailableNationwide } = req.body;
  const updateData = { name, description };

  // If there's a new image, add it to the update data
  if (req.file) {
    updateData.image = req.file.filename;
  }

  // Update cities if provided
  if (cities !== undefined) {
    if (isAvailableNationwide) {
      updateData.cities = [];
      updateData.isAvailableNationwide = true;
    } else {
      // // Check if all cities exist
      // if (cities && cities.length > 0) {
      //   const citiesCount = await City.countDocuments({ _id: { $in: cities } });
      //   if (citiesCount !== cities.length) {
      //     return next(new AppError('One or more cities not found', 404));
      //   }
      // }
      updateData.cities = cities;
      updateData.isAvailableNationwide = false;
    }
  } else if (isAvailableNationwide !== undefined) {
    updateData.isAvailableNationwide = isAvailableNationwide;
    if (isAvailableNationwide) {
      updateData.cities = [];
    }
  }

  const mainService = await MainService.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );

  if (!mainService) {
    return next(new AppError('No main service found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      mainService
    }
  });
});

// @desc    Delete main service
// @route   DELETE /api/v1/services/main/:id
// @access  Private/Admin
exports.deleteMainService = catchAsync(async (req, res, next) => {
  // Check if there are any sub-services under this main service
  const SubService = require('./subService.model');
  const hasSubServices = await SubService.findOne({ mainService: req.params.id });

  if (hasSubServices) {
    return next(
      new AppError('Cannot delete main service with existing sub-services. Please delete sub-services first.', 400)
    );
  }

  const mainService = await MainService.findByIdAndDelete(req.params.id);

  if (!mainService) {
    return next(new AppError('No main service found with that ID', 404));
  }

  // TODO: Delete the associated image from the file system

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Add cities to a main service
// @route   PATCH /api/v1/services/main/:id/cities
// @access  Private/Admin
exports.addCitiesToService = catchAsync(async (req, res, next) => {
  const { cities } = req.body;

  if (!cities || !Array.isArray(cities) || cities.length === 0) {
    return next(new AppError('Please provide an array of city IDs to add', 400));
  }

  const mainService = await MainService.findById(req.params.id);

  if (!mainService) {
    return next(new AppError('No main service found with that ID', 404));
  }

  if (mainService.isAvailableNationwide) {
    return next(new AppError('Cannot add cities to a nationwide service', 400));
  }

  // Add new cities, avoiding duplicates
  const newCities = [...new Set([...mainService.cities, ...cities])];
  mainService.cities = newCities;
  
  await mainService.save({ validateBeforeSave: true });

  res.status(200).json({
    status: 'success',
    data: {
      mainService
    }
  });
});

// @desc    Remove cities from a main service
// @route   DELETE /api/v1/services/main/:id/cities
// @access  Private/Admin
exports.removeCitiesFromService = catchAsync(async (req, res, next) => {
  const { cities } = req.body;

  if (!cities || !Array.isArray(cities) || cities.length === 0) {
    return next(new AppError('Please provide an array of city IDs to remove', 400));
  }

  const mainService = await MainService.findById(req.params.id);

  if (!mainService) {
    return next(new AppError('No main service found with that ID', 404));
  }

  // Filter out the cities to be removed
  mainService.cities = mainService.cities.filter(
    cityId => !cities.includes(cityId.toString())
  );
  
  await mainService.save({ validateBeforeSave: true });

  res.status(200).json({
    status: 'success',
    data: {
      mainService
    }
  });
});

// @desc    Check service availability in a city
// @route   GET /api/v1/services/main/:id/availability
// @access  Public
exports.getServiceAvailability = catchAsync(async (req, res, next) => {
  const { cityId } = req.query;

  if (!cityId) {
    return next(new AppError('Please provide a cityId query parameter', 400));
  }

  const mainService = await MainService.findById(req.params.id);

  if (!mainService) {
    return next(new AppError('No main service found with that ID', 404));
  }

  const isAvailable = mainService.isAvailableNationwide || 
                    mainService.cities.some(city => city.toString() === cityId);

  res.status(200).json({
    status: 'success',
    data: {
      isAvailable,
      serviceId: mainService._id,
      serviceName: mainService.name,
      isNationwide: mainService.isAvailableNationwide
    }
  });
});

// @desc    Toggle nationwide availability for a main service
// @route   PATCH /api/v1/services/main/:id/toggle-nationwide
// @access  Private/Admin
exports.toggleNationwideAvailability = catchAsync(async (req, res, next) => {
  const mainService = await MainService.findById(req.params.id);

  if (!mainService) {
    return next(new AppError('No main service found with that ID', 404));
  }

  // Toggle the nationwide availability
  mainService.isAvailableNationwide = !mainService.isAvailableNationwide;
  
  // If making available nationwide, clear the cities array
  if (mainService.isAvailableNationwide) {
    mainService.cities = [];
  }

  await mainService.save({ validateBeforeSave: true });

  res.status(200).json({
    status: 'success',
    data: {
      mainService
    }
  });
});

// @desc    Get sub-services for a main service
// @route   GET /api/v1/services/main/:mainServiceId/sub-services
// @access  Public
exports.getSubServicesByMainService = catchAsync(async (req, res, next) => {
  const SubService = require('./subService.model');

  const features = new APIFeatures(
    SubService.find({ mainService: req.params.mainServiceId }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const subServices = await features.query;

  res.status(200).json({
    status: 'success',
    results: subServices.length,
    data: {
      subServices
    }
  });
});
