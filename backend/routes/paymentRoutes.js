const express = require('express');
const { body } = require('express-validator');

const ctrl = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { validate, validateObjectId } = require('../middleware/validate');
const { ROLES } = require('../config/constants');

const router = express.Router();

router.use(protect, authorize(ROLES.CUSTOMER, ROLES.ADMIN));

router.post(
  '/initiate',
  [body('orderId').isMongoId().withMessage('A valid order id is required')],
  validate,
  ctrl.initiatePayment
);

router.post(
  '/verify',
  [body('orderId').isMongoId().withMessage('A valid order id is required')],
  validate,
  ctrl.verifyPayment
);

router.get('/:orderId/status', validateObjectId('orderId'), ctrl.getPaymentStatus);

module.exports = router;
