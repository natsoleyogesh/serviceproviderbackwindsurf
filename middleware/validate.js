const { validationResult } = require('express-validator');
const ErrorResponse = require('../utils/errorResponse');

// Middleware to handle validation errors
exports.validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const errorMessages = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));

    return next(new ErrorResponse('Validation Error', 400, errorMessages));
  };
};
