const { check, param } = require('express-validator');

exports.createCityValidator = [
  check('name')
    .notEmpty().withMessage('City name is required')
    .isLength({ max: 100 }).withMessage('City name cannot be longer than 100 characters')
    .trim()
    .escape(),

  check('description')
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 500 }).withMessage('Description cannot be longer than 500 characters')
    .trim()
    .escape(),

  check('location.lat')
    .optional({ checkFalsy: true })
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90')
    .toFloat(),

  check('location.lng')
    .optional({ checkFalsy: true })
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180')
    .toFloat()
];

exports.updateCityValidator = [
  param('id')
    .isMongoId().withMessage('Invalid city ID'),

  check('name')
    .optional()
    .isLength({ max: 100 }).withMessage('City name cannot be longer than 100 characters')
    .trim()
    .escape(),

  check('description')
    .optional()
    .isLength({ max: 500 }).withMessage('Description cannot be longer than 500 characters')
    .trim()
    .escape(),

  check('location.lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90')
    .toFloat(),

  check('location.lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180')
    .toFloat()
];

exports.cityIdValidator = [
  param('id')
    .isMongoId().withMessage('Invalid city ID')
];
