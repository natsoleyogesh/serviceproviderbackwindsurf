const express = require('express');
const reviewController = require('../controllers/review.controller');
const authController = require('../controllers/auth.controller');
const setServiceProviderId = require('../middleware/setServiceProviderId');

const router = express.Router({ mergeParams: true });

// Protect all routes after this middleware
router.use(authController.protect);

// Routes for service provider reviews
router
  .route('/')
  .get(reviewController.getServiceProviderReviews)
  .post(
    authController.restrictTo('user'),
    setServiceProviderId,
    reviewController.createReview
  );

// Routes for all reviews (admin only)
router
  .route('/all')
  .get(
    authController.restrictTo('admin'),
    reviewController.getAllReviews
  );

// Routes for a specific review
router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;
