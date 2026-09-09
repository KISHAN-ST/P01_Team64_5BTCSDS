const { validationResult, param } = require('express-validator');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

/**
 * Collects express-validator results into a single 400 response.
 * Mounted as the last entry of every validation chain.
 */
const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({
    field: e.path || e.param,
    message: e.msg,
  }));

  return next(ApiError.badRequest('Validation failed.', errors));
};

/**
 * Guards :id params. Without this, `/api/products/abc` reaches Mongoose and
 * throws a CastError, which is a 500 unless it is caught first.
 */
const validateObjectId =
  (paramName = 'id') =>
  (req, res, next) => {
    const value = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(value)) {
      return next(ApiError.badRequest(`'${value}' is not a valid ID.`));
    }
    next();
  };

const objectIdParam = (name = 'id') =>
  param(name).custom((v) => mongoose.Types.ObjectId.isValid(v)).withMessage('Invalid ID format');

module.exports = { validate, validateObjectId, objectIdParam };
