const express = require('express');
const { body } = require('express-validator');

const ctrl = require('../controllers/productController');
const reviewCtrl = require('../controllers/reviewController');
const { protect, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { validate, validateObjectId } = require('../middleware/validate');
const { ROLES } = require('../config/constants');

const router = express.Router();

const productRules = [
  body('name').trim().isLength({ min: 3, max: 140 }).withMessage('Name must be 3-140 characters'),
  body('description')
    .trim()
    .isLength({ min: 20 })
    .withMessage('Description must be at least 20 characters'),
  body('price').isFloat({ min: 1 }).withMessage('Price must be greater than 0'),
  body('mrp').optional().isFloat({ min: 0 }).withMessage('MRP must be a positive number'),
  body('category').isMongoId().withMessage('A valid category is required'),
  body('stock').isInt({ min: 0 }).withMessage('Stock cannot be negative'),
  body('images').isArray({ min: 1 }).withMessage('At least one image URL is required'),
];

const reviewRules = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment')
    .trim()
    .isLength({ min: 5, max: 1000 })
    .withMessage('Comment must be 5-1000 characters'),
];

// --- Meta routes must be declared before '/:id' so they are not swallowed by it.
router.get('/meta/brands', ctrl.listBrands);
router.get(
  '/meta/low-stock',
  protect,
  authorize(ROLES.SELLER, ROLES.ADMIN),
  ctrl.lowStockProducts
);

// --- Public catalog
router.get('/', ctrl.listProducts);
router.get('/:id', validateObjectId(), optionalAuth, ctrl.getProduct);

// --- Reviews nested under a product
router.get('/:productId/reviews', validateObjectId('productId'), reviewCtrl.listProductReviews);
router.post(
  '/:productId/reviews',
  protect,
  authorize(ROLES.CUSTOMER),
  validateObjectId('productId'),
  reviewRules,
  validate,
  reviewCtrl.createReview
);

// --- Seller / admin writes
router.post(
  '/',
  protect,
  authorize(ROLES.SELLER, ROLES.ADMIN),
  productRules,
  validate,
  ctrl.createProduct
);
router.put(
  '/:id',
  protect,
  authorize(ROLES.SELLER, ROLES.ADMIN),
  validateObjectId(),
  ctrl.updateProduct
);
router.patch(
  '/:id/stock',
  protect,
  authorize(ROLES.SELLER, ROLES.ADMIN),
  validateObjectId(),
  [body('stock').isInt({ min: 0 }).withMessage('Stock cannot be negative')],
  validate,
  ctrl.updateStock
);
router.delete(
  '/:id',
  protect,
  authorize(ROLES.SELLER, ROLES.ADMIN),
  validateObjectId(),
  ctrl.deleteProduct
);

module.exports = router;
