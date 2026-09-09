const express = require('express');
const { body } = require('express-validator');

const ctrl = require('../controllers/cartController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { validate, validateObjectId } = require('../middleware/validate');
const { ROLES } = require('../config/constants');

const router = express.Router();

// The cart belongs to customers; sellers and admins have no cart.
router.use(protect, authorize(ROLES.CUSTOMER));

router.get('/', ctrl.getCart);

router.post(
  '/',
  [
    body('productId').isMongoId().withMessage('A valid product id is required'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validate,
  ctrl.addToCart
);

router.put(
  '/:itemId',
  validateObjectId('itemId'),
  [body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')],
  validate,
  ctrl.updateCartItem
);

router.delete('/:itemId', validateObjectId('itemId'), ctrl.removeCartItem);
router.delete('/', ctrl.clearCart);

module.exports = router;
