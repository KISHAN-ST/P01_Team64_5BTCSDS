const express = require('express');
const { body } = require('express-validator');

const ctrl = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { validate, validateObjectId } = require('../middleware/validate');
const { ROLES } = require('../config/constants');

const router = express.Router();

// Admin only, without exception.
router.use(protect, authorize(ROLES.ADMIN));

router.get('/dashboard', ctrl.getDashboard);
router.get('/stats/overview', ctrl.getOverview);

router.get('/reports/sales', ctrl.getSalesReport);
router.get('/reports/top-products', ctrl.getTopProducts);
router.get('/reports/user-growth', ctrl.getUserGrowth);
router.get('/reports/inventory', ctrl.getInventoryReport);

router.get('/users', ctrl.listUsers);
router.patch(
  '/users/:id/status',
  validateObjectId(),
  [body('isActive').isBoolean().withMessage('isActive must be true or false')],
  validate,
  ctrl.setUserStatus
);

router.get('/orders', ctrl.listOrders);

module.exports = router;
