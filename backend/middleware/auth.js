const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/generateToken');

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
};

/**
 * Rejects the request with 401 unless a valid token maps to an active user.
 * The fresh database read is deliberate: a deactivated user must lose access
 * immediately, not when their token happens to expire.
 */
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw ApiError.unauthorized('Not authenticated. No token provided.');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    const msg =
      err.name === 'TokenExpiredError'
        ? 'Session expired. Please log in again.'
        : 'Invalid authentication token.';
    throw ApiError.unauthorized(msg);
  }

  const user = await User.findById(payload.id);
  if (!user) throw ApiError.unauthorized('The user for this token no longer exists.');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated.');

  req.user = user;
  next();
});

/**
 * Populates req.user when a token is present, but never rejects. Used by
 * endpoints that return extra data for logged-in users (e.g. "canReview").
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.id);
    if (user && user.isActive) req.user = user;
  } catch (_) {
    /* an invalid token is simply treated as anonymous here */
  }
  next();
});

module.exports = { protect, optionalAuth };
