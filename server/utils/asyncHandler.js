// Wraps an async route handler so any thrown error or rejected promise
// is passed to next(err) and reaches the error-handling middleware.
// (Express 4 does not do this for async functions on its own.)
module.exports = function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
