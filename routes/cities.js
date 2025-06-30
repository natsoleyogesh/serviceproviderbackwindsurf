const express = require('express');
const {
  getCities,
  getCity,
  createCity,
  updateCity,
  deleteCity
} = require('../controllers/cities');

const City = require('../models/City');
const advancedResults = require('../middleware/advancedResults');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { apiLimiter } = require('../middleware/rateLimiter');
const { 
  createCityValidator, 
  updateCityValidator,
  cityIdValidator 
} = require('../validators/cities');

const router = express.Router();

// Apply API rate limiting to all routes
router.use(apiLimiter);

router.route('/')
  .get(advancedResults(City, 'User', 'name email'), getCities);

router.route('/:id')
  .get(validate(cityIdValidator), getCity);

// Protected routes (require authentication and admin role)
router.use(protect, authorize('admin'));

router.route('/')
  .post(validate(createCityValidator), createCity);

router.route('/:id')
  .put(validate(updateCityValidator), updateCity);

router.route('/:id')
  .delete(validate(cityIdValidator), deleteCity);

module.exports = router;
