/**
 * Custom error class for operational errors (errors that we can predict and handle)
 * @extends Error
 */
class AppError extends Error {
  /**
   * Create an AppError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Capture the stack trace, excluding the constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
