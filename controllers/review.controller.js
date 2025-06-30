const Review = require('../models/Review.model');
const ServiceProvider = require('../models/ServiceProvider.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// @desc    Create a review
// @route   POST /api/v1/service-providers/:serviceProviderId/reviews
// @access  Private
const createReview = catchAsync(async (req, res, next) => {
  // Allow nested routes
  if (!req.body.serviceProvider) req.body.serviceProvider = req.params.serviceProviderId;
  if (!req.body.user) req.body.user = req.user.id;

  const serviceProvider = await ServiceProvider.findById(req.params.serviceProviderId);
  
  if (!serviceProvider) {
    return next(new AppError('No service provider found with that ID', 404));
  }

  // Check if user already reviewed this service provider
  const existingReview = await Review.findOne({
    serviceProvider: req.params.serviceProviderId,
    user: req.user.id
  });

  if (existingReview) {
    return next(new AppError('You have already reviewed this service provider', 400));
  }

  const review = await Review.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      review
    }
  });
});

// @desc    Get all reviews for a service provider
// @route   GET /api/v1/service-providers/:serviceProviderId/reviews
// @access  Public
const getServiceProviderReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ serviceProvider: req.params.serviceProviderId });

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews
    }
  });
});

// @desc    Get all reviews (Admin)
// @route   GET /api/v1/reviews
// @access  Private/Admin
const getAllReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find();

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews
    }
  });
});

// @desc    Get single review
// @route   GET /api/v1/reviews/:id
// @access  Public
const getReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      review
    }
  });
});

// @desc    Update review
// @route   PATCH /api/v1/reviews/:id
// @access  Private
const updateReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }

  // Check if the review belongs to the user or if user is admin
  if (review.user.id !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to update this review', 403));
  }

  const updatedReview = await Review.findByIdAndUpdate(
    req.params.id,
    { review: req.body.review, rating: req.body.rating },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      review: updatedReview
    }
  });
});

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
// @access  Private
const deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }

  // Check if the review belongs to the user or if user is admin
  if (review.user.id !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Not authorized to delete this review', 403));
  }

  await Review.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

module.exports = {
  createReview,
  getServiceProviderReviews,
  getAllReviews,
  getReview,
  updateReview,
  deleteReview
};
