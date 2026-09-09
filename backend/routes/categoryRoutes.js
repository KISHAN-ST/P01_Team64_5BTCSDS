const express = require('express');
const { body } = require('express-validator');

const ctrl = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { validate, validateObjectId } = require('../middleware/validate');
const { ROLES } = require('../config/constants');

const router = express.Router();

const categoryRules = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
  body('parent').optional({ nullable: true }).isMongoId().withMessage('Invalid parent category id'),
];

// Public reads
router.get('/', ctrl.listCategories);
router.get('/tree', ctrl.getCategoryTree);
router.get('/:id', validateObjectId(), ctrl.getCategory);

// Admin writes
router.post('/', protect, authorize(ROLES.ADMIN), categoryRules, validate, ctrl.createCategory);
router.put('/:id', protect, authorize(ROLES.ADMIN), validateObjectId(), ctrl.updateCategory);
router.delete('/:id', protect, authorize(ROLES.ADMIN), validateObjectId(), ctrl.deleteCategory);

module.exports = router;
