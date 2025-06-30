const { check } = require('express-validator');

exports.registerValidator = [
  check('username')
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .trim()
    .escape(),

  check('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please include a valid email')
    .normalizeEmail(),

  check('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/\d/).withMessage('Password must contain a number')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
];

exports.loginValidator = [
  check('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please include a valid email')
    .normalizeEmail(),

  check('password')
    .notEmpty().withMessage('Password is required')
];
