const express = require('express');
const { upload } = require('../utils/upload');
const { protect } = require('../middleware/auth');

// Import controllers
const mainServiceController = require('../controllers/mainService.controller');
const subServiceController = require('../controllers/subService.controller');
const subSubServiceController = require('../controllers/subSubService.controller');
const subSubSubServiceController = require('../controllers/subSubSubService.controller');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Configure multer for multiple file uploads
const serviceImageUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'additionalImages', maxCount: 10 }
]);

// =====================
// Main Service Routes
// =====================
router.route('/main')
  .get(mainServiceController.getAllMainServices)
  .post(upload.single('image'), mainServiceController.createMainService);

router.route('/main/:id')
  .get(mainServiceController.getMainService)
  .patch(upload.single('image'), mainServiceController.updateMainService)
  .delete(mainServiceController.deleteMainService);

router.get('/main/:mainServiceId/sub-services', mainServiceController.getSubServicesByMainService);

// City management for main services
router.route('/main/:id/cities')
  .patch(mainServiceController.addCitiesToService)
  .delete(mainServiceController.removeCitiesFromService);

router.patch('/main/:id/toggle-nationwide', mainServiceController.toggleNationwideAvailability);
router.get('/main/:id/availability', mainServiceController.getServiceAvailability);

// =====================
// Sub-Service Routes
// =====================
router.route('/sub')
  .get(subServiceController.getAllSubServices)
  .post(upload.single('image'), subServiceController.createSubService);

router.route('/sub/:id')
  .get(subServiceController.getSubService)
  .patch(upload.single('image'), subServiceController.updateSubService)
  .delete(subServiceController.deleteSubService);

router.get('/sub/:subServiceId/sub-sub-services', subServiceController.getSubSubServicesBySubService);

// =====================
// Sub-Sub-Service Routes
// =====================
router.route('/sub-sub')
  .get(subSubServiceController.getAllSubSubServices)
  .post(upload.single('image'), subSubServiceController.createSubSubService);

router.route('/sub-sub/:id')
  .get(subSubServiceController.getSubSubService)
  .patch(upload.single('image'), subSubServiceController.updateSubSubService)
  .delete(subSubServiceController.deleteSubSubService);

router.get('/sub-sub/:subSubServiceId/services', subSubServiceController.getServicesBySubSubService);

// =====================
// Service (Leaf Node) Routes
// =====================
router.route('/')
  .get(subSubSubServiceController.getAllServices)
  .post(serviceImageUpload, subSubSubServiceController.createService);

router.route('/:id')
  .get(subSubSubServiceController.getService)
  .patch(serviceImageUpload, subSubSubServiceController.updateService)
  .delete(subSubSubServiceController.deleteService);

router.delete('/:id/images/:image', subSubSubServiceController.deleteServiceImage);

// =====================
// Public Routes (No Authentication Required)
// =====================
const publicRouter = express.Router();

// Main Services
publicRouter.get('/public/main', mainServiceController.getAllMainServices);
publicRouter.get('/public/main/:id', mainServiceController.getMainService);

// Sub-Services
publicRouter.get('/public/sub', subServiceController.getAllSubServices);
publicRouter.get('/public/sub/:id', subServiceController.getSubService);

// Sub-Sub-Services
publicRouter.get('/public/sub-sub', subSubServiceController.getAllSubSubServices);
publicRouter.get('/public/sub-sub/:id', subSubServiceController.getSubSubService);

// Services
publicRouter.get('/public/services', subSubSubServiceController.getAllServices);
publicRouter.get('/public/services/:id', subSubSubServiceController.getService);

// Mount public routes
router.use(publicRouter);

module.exports = router;
