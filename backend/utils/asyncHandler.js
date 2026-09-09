/**
 * Express 4 does not forward rejected promises from async route handlers to the
 * error middleware, so every async controller is wrapped in this.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
