const ApiError = require('../utils/ApiError');
const { ROLES } = require('../config/constants');

/**
 * Route-level role gate. Always mounted AFTER `protect`, so an unauthenticated
 * request produces 401 (from protect) and an authenticated-but-wrong-role
 * request produces 403 (from here).
 */
const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. This action requires one of: ${allowedRoles.join(', ')}.`
        )
      );
    }
    next();
  };

/**
 * Ownership check for seller-owned resources. An admin bypasses it; a seller
 * may only touch their own documents.
 */
const ownsOrAdmin = (getOwnerId) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role === ROLES.ADMIN) return next();

  const ownerId = getOwnerId(req);
  if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
    return next(ApiError.forbidden('You can only modify your own resources.'));
  }
  next();
};

module.exports = { authorize, ownsOrAdmin };
