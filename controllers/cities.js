const City = require('../models/City');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all cities
// @route   GET /api/cities
// @access  Public
exports.getCities = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single city
// @route   GET /api/cities/:id
// @access  Public
exports.getCity = asyncHandler(async (req, res, next) => {
  const city = await City.findById(req.params.id);

  if (!city) {
    return next(
      new ErrorResponse(`City not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: city
  });
});

// @desc    Create new city
// @route   POST /api/cities
// @access  Private/Admin
exports.createCity = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.admin.id;

  const city = await City.create(req.body);

  res.status(201).json({
    success: true,
    data: city
  });
});

// @desc    Update city
// @route   PUT /api/cities/:id
// @access  Private/Admin
exports.updateCity = asyncHandler(async (req, res, next) => {
  let city = await City.findById(req.params.id);

  if (!city) {
    return next(
      new ErrorResponse(`City not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is city owner or admin
  if (city.user.toString() !== req.admin.id && req.admin.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.admin.id} is not authorized to update this city`,
        401
      )
    );
  }

  city = await City.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: city
  });
});

// @desc    Delete city
// @route   DELETE /api/cities/:id
// @access  Private/Admin
exports.deleteCity = asyncHandler(async (req, res, next) => {
  const city = await City.findById(req.params.id);

  if (!city) {
    return next(
      new ErrorResponse(`City not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is city owner or admin
  if (city.user.toString() !== req.admin.id && req.admin.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.admin.id} is not authorized to delete this city`,
        401
      )
    );
  }

  await city.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});
