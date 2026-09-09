const express = require('express');
const { body } = require('express-validator');

const ctrl = require('../controllers/couponController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { validate, validateObjectId } = require('../middleware/validate');
const { ROLES, COUPON_TYPES } = require('../config/constants');

const router = express.Router();

const couponRules = [
  body('code')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Code must be 3-20 characters')
    .matches(/^[A-Za-z0-9]+$/)
    .withMessage('Code may contain letters and numbers only'),
  body('type')
    .isIn(Object.values(COUPON_TYPES))
    .withMessage("Type must be 'percentage' or 'flat'"),
  body('value').isFloat({ min: 1 }).withMessage('Value must be greater than 0'),
  body('minOrderValue').optional().isFloat({ min: 0 }),
  body('maxDiscount').optional().isFloat({ min: 0 }),
  body('expiresAt').isISO8601().withMessage('A valid expiry date is required'),
];

router.use(protect);

// '/apply' is declared before '/:id' so the literal path is never treated as an id.
router.post(
  '/apply',
  authorize(ROLES.CUSTOMER),
  [body('code').trim().notEmpty().withMessage('Coupon code is required')],
  validate,
  ctrl.applyCoupon
);
router.delete('/apply', authorize(ROLES.CUSTOMER), ctrl.removeCoupon);

router.get('/', ctrl.listCoupons);

router.post('/', authorize(ROLES.ADMIN), couponRules, validate, ctrl.createCoupon);
router.put('/:id', authorize(ROLES.ADMIN), validateObjectId(), ctrl.updateCoupon);
router.delete('/:id', authorize(ROLES.ADMIN), validateObjectId(), ctrl.deleteCoupon);

module.exports = router;
