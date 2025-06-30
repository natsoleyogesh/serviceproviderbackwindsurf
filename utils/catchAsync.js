/**
 * Wraps an async function to catch any errors and pass them to the next middleware
 * @param {Function} fn - The async function to wrap
 * @returns {Function} - The wrapped function
 */
module.exports = (fn) => {
  return (req, res, next) => {
    // Resolve the promise returned by the async function
    // If it rejects, catch the error and pass it to Express's error handler
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
};
