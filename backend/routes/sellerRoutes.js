const express = require('express');

const ctrl = require('../controllers/sellerController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { ROLES } = require('../config/constants');

const router = express.Router();

// Every route here is seller-only. An admin is allowed through for support.
router.use(protect, authorize(ROLES.SELLER, ROLES.ADMIN));

router.get('/dashboard', ctrl.getDashboard);
router.get('/analytics/sales', ctrl.getSalesAnalytics);
router.get('/products', ctrl.getMyProducts);
router.get('/products/performance', ctrl.getProductPerformance);
router.get('/orders', ctrl.getMyOrders);
router.get('/reviews', ctrl.getMyReviews);

module.exports = router;
