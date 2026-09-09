const express = require('express');
const { body } = require('express-validator');

const ctrl = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { validate, validateObjectId } = require('../middleware/validate');

const router = express.Router();

/**
 * Creating a review is nested under its product (see productRoutes); this
 * router covers the operations that address a review directly.
 */
router.get('/mine', protect, ctrl.getMyReviews);

router.put(
  '/:id',
  protect,
  validateObjectId(),
  [
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
    body('comment')
      .optional()
      .trim()
      .isLength({ min: 5, max: 1000 })
      .withMessage('Comment must be 5-1000 characters'),
  ],
  validate,
  ctrl.updateReview
);

router.delete('/:id', protect, validateObjectId(), ctrl.deleteReview);
router.post('/:id/helpful', protect, validateObjectId(), ctrl.markHelpful);

module.exports = router;
