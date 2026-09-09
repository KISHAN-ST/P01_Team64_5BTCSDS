/**
 * An error that carries an intended HTTP status code and a stable machine-readable
 * error code. Anything thrown that is NOT an ApiError is treated by the error
 * handler as an unexpected 500.
 *
 * `errorCode` is what a client should branch on - the human `message` is free to
 * change wording without breaking anyone.
 */

/** Stable codes returned in every error response. */
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',       // 400 - malformed or missing input
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION', // 400 - input valid, rule says no
  UNAUTHENTICATED: 'UNAUTHENTICATED',         // 401 - no/!valid token
  FORBIDDEN: 'FORBIDDEN',                     // 403 - authenticated, wrong role/owner
  NOT_FOUND: 'NOT_FOUND',                     // 404
  CONFLICT: 'CONFLICT',                       // 409 - duplicate/already exists
  RATE_LIMITED: 'RATE_LIMITED',               // 429
  INTERNAL_ERROR: 'INTERNAL_ERROR',           // 500
};

/** Fallback used when an error carries a status but no explicit code. */
const CODE_BY_STATUS = {
  400: ERROR_CODES.VALIDATION_ERROR,
  401: ERROR_CODES.UNAUTHENTICATED,
  403: ERROR_CODES.FORBIDDEN,
  404: ERROR_CODES.NOT_FOUND,
  409: ERROR_CODES.CONFLICT,
  429: ERROR_CODES.RATE_LIMITED,
};

class ApiError extends Error {
  constructor(statusCode, message, details = undefined, errorCode = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.errorCode = errorCode || CODE_BY_STATUS[statusCode] || ERROR_CODES.INTERNAL_ERROR;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  /** 400 - the request itself was malformed. */
  static badRequest(msg, details) {
    return new ApiError(400, msg, details, ERROR_CODES.VALIDATION_ERROR);
  }

  /**
   * 400 - the request was well-formed but a business rule rejected it
   * (insufficient stock, expired coupon, illegal status transition).
   * Separated from badRequest so clients can tell "you typed it wrong" apart
   * from "the system says no".
   */
  static businessRule(msg, details) {
    return new ApiError(400, msg, details, ERROR_CODES.BUSINESS_RULE_VIOLATION);
  }

  static unauthorized(msg = 'Not authenticated. Please log in.') {
    return new ApiError(401, msg, undefined, ERROR_CODES.UNAUTHENTICATED);
  }

  static forbidden(msg = 'You do not have permission to perform this action.') {
    return new ApiError(403, msg, undefined, ERROR_CODES.FORBIDDEN);
  }

  static notFound(msg = 'Resource not found.') {
    return new ApiError(404, msg, undefined, ERROR_CODES.NOT_FOUND);
  }

  static conflict(msg) {
    return new ApiError(409, msg, undefined, ERROR_CODES.CONFLICT);
  }
}

ApiError.CODES = ERROR_CODES;
ApiError.CODE_BY_STATUS = CODE_BY_STATUS;

module.exports = ApiError;
