const express = require('express');
const taxConfigController = require('../controllers/taxConfig.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const router = express.Router();

// Public route - Get active tax config
router.get('/', taxConfigController.getActiveTaxConfig);

// Admin routes - Protected and restricted to admin
router.use(protect);
router.use(restrictTo('admin'));

router
  .route('/')
  .get(taxConfigController.getAllTaxConfigs)
  .post(taxConfigController.createTaxConfig);

router
  .route('/:id')
  .put(taxConfigController.updateTaxConfig)
  .delete(taxConfigController.deleteTaxConfig);

module.exports = router;
