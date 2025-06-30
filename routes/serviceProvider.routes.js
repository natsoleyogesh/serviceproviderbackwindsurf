const express = require('express');
const serviceProviderController = require('../controllers/serviceProvider.controller');
const authController = require('../controllers/auth.controller');
const { upload, uploadSingle } = require('../utils/multer');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.post('/register', serviceProviderController.register);
router.post('/login', serviceProviderController.login);
router.post('/forgot-password', serviceProviderController.forgotPassword);
router.patch('/reset-password/:token', serviceProviderController.resetPassword);
router.get('/verify-email/:otp', serviceProviderController.verifyEmail);
router.post('/resend-verification', serviceProviderController.resendVerification);

// Protected routes (require authentication)
router.use(protect);

// Service Provider profile routes
router.get('/me', serviceProviderController.getMe);
router.patch('/update-me', serviceProviderController.updateMe);
router.patch('/update-password', serviceProviderController.updatePassword);

// Service management routes
router.patch('/add-service', serviceProviderController.addService);
router.patch('/remove-service', serviceProviderController.removeService);

// Document management routes
router.post(
  '/documents',
  uploadSingle('document'),
  serviceProviderController.addDocument
);
router.delete('/documents/:id', serviceProviderController.deleteDocument);

// Address management routes
router.post('/addresses', serviceProviderController.addAddress);
router.patch('/addresses/:id', serviceProviderController.updateAddress);
router.delete('/addresses/:id', serviceProviderController.deleteAddress);

// Admin-only routes
router.use(restrictTo('admin'));

// Admin routes for service provider management
router.get('/', serviceProviderController.getAllServiceProviders);
router.get('/:id', serviceProviderController.getServiceProvider);
router.patch('/:id/status', serviceProviderController.updateStatus);
router.patch('/:id/approval', serviceProviderController.updateApproval);

module.exports = router;
