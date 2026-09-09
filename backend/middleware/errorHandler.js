const ApiError = require('../utils/ApiError');

/** Anything that reaches here did not match a route. */
const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Centralised error handler. Translates the handful of Mongo/Mongoose/JWT
 * error shapes into proper status codes so nothing leaks out as a raw 500.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong.';
  let errors = err.details;
  let errorCode = err.errorCode;

  // Bad ObjectId that slipped past validateObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value '${err.value}' for field '${err.path}'.`;
    errorCode = ApiError.CODES.VALIDATION_ERROR;
  }

  // Mongoose schema validation
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed.';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    errorCode = ApiError.CODES.VALIDATION_ERROR;
  }

  // Unique index violation
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists.`;
    errorCode = ApiError.CODES.CONFLICT;
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
    errorCode = ApiError.CODES.UNAUTHENTICATED;
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Session expired. Please log in again.';
    errorCode = ApiError.CODES.UNAUTHENTICATED;
  }

  // Unexpected failures are logged in full; clients never see the stack.
  if (statusCode >= 500) {
    console.error('[ERROR]', err);
  }

  // Every error response carries a stable machine-readable code alongside the
  // human message, so clients branch on the code and never on wording.
  const body = {
    success: false,
    message,
    errorCode:
      errorCode || ApiError.CODE_BY_STATUS[statusCode] || ApiError.CODES.INTERNAL_ERROR,
  };
  if (errors) body.errors = errors;
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

module.exports = { notFound, errorHandler };
