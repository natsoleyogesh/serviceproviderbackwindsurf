const express = require('express');
const adminController = require('../controllers/admin.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);
router.use(restrictTo('admin'));

// Dashboard Stats
router.get('/dashboard-stats', adminController.getDashboardStats);

// User Management Routes
router.route('/users')
  .get(adminController.getAllUsers)
  .post(adminController.createUser);

router.route('/users/:id')
  .get(adminController.getUser)
  .patch(adminController.updateUser)
  .delete(adminController.deleteUser);

router.patch('/users/:id/status', adminController.updateUserStatus);

// Service Provider Management Routes
router.route('/service-providers')
  .get(adminController.getAllServiceProviders);

router.route('/service-providers/:id')
  .get(adminController.getServiceProvider);

router.patch('/service-providers/:id/status', adminController.updateServiceProviderStatus);
router.patch('/service-providers/:id/approval', adminController.updateServiceProviderApproval);

// Document Management Routes
router.get('/service-providers/:id/documents', adminController.getServiceProviderDocuments);
router.patch('/service-providers/:id/documents/:docId', adminController.updateDocumentStatus);

module.exports = router;
