const express = require('express');
const { body } = require('express-validator');

const ctrl = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { validate, validateObjectId } = require('../middleware/validate');
const { ROLES, ORDER_STATUS, PAYMENT_MODES } = require('../config/constants');

const router = express.Router();

router.use(protect);

const checkoutRules = [
  body('shippingAddress.fullName').trim().notEmpty().withMessage('Full name is required'),
  body('shippingAddress.phone').trim().notEmpty().withMessage('Phone number is required'),
  body('shippingAddress.line1').trim().notEmpty().withMessage('Address is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.pincode')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be 6 digits'),
  body('paymentMode')
    .isIn(PAYMENT_MODES)
    .withMessage(`Payment mode must be one of: ${PAYMENT_MODES.join(', ')}`),
];

router.post('/', authorize(ROLES.CUSTOMER), checkoutRules, validate, ctrl.createOrder);
router.get('/', authorize(ROLES.CUSTOMER), ctrl.getMyOrders);

router.get('/:id', validateObjectId(), ctrl.getOrder);
router.get('/:id/track', validateObjectId(), ctrl.trackOrder);

router.put(
  '/:id/status',
  authorize(ROLES.SELLER, ROLES.ADMIN),
  validateObjectId(),
  [
    body('status')
      .isIn(Object.values(ORDER_STATUS))
      .withMessage(`Status must be one of: ${Object.values(ORDER_STATUS).join(', ')}`),
  ],
  validate,
  ctrl.updateOrderStatus
);

router.put('/:id/cancel', authorize(ROLES.CUSTOMER), validateObjectId(), ctrl.cancelOrder);

module.exports = router;
