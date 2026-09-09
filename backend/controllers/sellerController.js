const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { ORDER_STATUS, RULES } = require('../config/constants');

const oid = (id) => new mongoose.Types.ObjectId(id);

/**
 * GET /api/seller/dashboard
 * The KPI block, including the previous-period comparison the UI shows as a
 * trend delta. Revenue counts only order lines belonging to THIS seller, not
 * the whole order total, since an order can span multiple sellers.
 */
const getDashboard = asyncHandler(async (req, res) => {
  const sellerId = oid(req.user._id);
  const days = Number(req.query.days) || 30;

  const now = new Date();
  const periodStart = new Date(now.getTime() - days * 86400000);
  const prevStart = new Date(now.getTime() - days * 2 * 86400000);

  const revenueFor = async (from, to) => {
    const [row] = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lt: to }, status: { $ne: ORDER_STATUS.CANCELLED } } },
      { $unwind: '$items' },
      { $match: { 'items.seller': sellerId } },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$items.subtotal' },
          units: { $sum: '$items.quantity' },
          orders: { $addToSet: '$_id' },
        },
      },
      {
        $project: {
          revenue: 1,
          units: 1,
          orderCount: { $size: '$orders' },
        },
      },
    ]);
    return row || { revenue: 0, units: 0, orderCount: 0 };
  };

  const [current, previous, productCount, lowStockCount, outOfStockCount, ratingRow, pendingCount] =
    await Promise.all([
      revenueFor(periodStart, now),
      revenueFor(prevStart, periodStart),
      Product.countDocuments({ seller: sellerId, isActive: true }),
      Product.countDocuments({
        seller: sellerId,
        isActive: true,
        stock: { $gt: 0, $lte: RULES.lowStockThreshold },
      }),
      Product.countDocuments({ seller: sellerId, isActive: true, stock: 0 }),
      Product.aggregate([
        { $match: { seller: sellerId, isActive: true, ratingCount: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$ratingAverage' }, count: { $sum: '$ratingCount' } } },
      ]),
      Order.countDocuments({
        'items.seller': sellerId,
        status: { $in: [ORDER_STATUS.PLACED, ORDER_STATUS.CONFIRMED] },
      }),
    ]);

  const delta = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  return ok(res, {
    message: 'Seller dashboard fetched.',
    data: {
      periodDays: days,
      totalSales: current.revenue,
      totalSalesTrend: delta(current.revenue, previous.revenue),
      orderCount: current.orderCount,
      orderCountTrend: delta(current.orderCount, previous.orderCount),
      unitsSold: current.units,
      productCount,
      lowStockCount,
      outOfStockCount,
      pendingOrders: pendingCount,
      averageRating: ratingRow[0] ? Math.round(ratingRow[0].avg * 10) / 10 : 0,
      totalReviews: ratingRow[0]?.count || 0,
    },
  });
});

/**
 * GET /api/seller/analytics/sales?days=30
 * A daily revenue series for the dashboard chart. Days with no orders are
 * filled with zero so the line does not skip dates.
 */
const getSalesAnalytics = asyncHandler(async (req, res) => {
  const sellerId = oid(req.user._id);
  const days = Number(req.query.days) || 30;
  const from = new Date(Date.now() - days * 86400000);

  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: from }, status: { $ne: ORDER_STATUS.CANCELLED } } },
    { $unwind: '$items' },
    { $match: { 'items.seller': sellerId } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$items.subtotal' },
        units: { $sum: '$items.quantity' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const byDate = new Map(rows.map((r) => [r._id, r]));
  const series = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const row = byDate.get(d);
    series.push({ date: d, revenue: row?.revenue || 0, units: row?.units || 0 });
  }

  return ok(res, { message: 'Sales analytics fetched.', data: series });
});

/** GET /api/seller/products - the seller's own catalog, including delisted items. */
const getMyProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { seller: req.user._id };

  if (req.query.search) filter.name = new RegExp(req.query.search, 'i');
  if (req.query.stock === 'low') {
    filter.stock = { $gt: 0, $lte: RULES.lowStockThreshold };
  } else if (req.query.stock === 'out') {
    filter.stock = 0;
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return ok(res, {
    message: 'Your products fetched.',
    data: products,
    meta: buildMeta({ page, limit, total }),
  });
});

/**
 * GET /api/seller/orders
 * Orders containing at least one of this seller's products, with the other
 * sellers' lines stripped out so a seller never sees a competitor's items.
 */
const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sellerId = req.user._id;

  const filter = { 'items.seller': sellerId };
  if (req.query.status) filter.status = req.query.status;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  const scoped = orders.map((o) => {
    const mine = o.items.filter((i) => i.seller.toString() === sellerId.toString());
    return {
      ...o,
      items: mine,
      myItemsTotal: mine.reduce((s, i) => s + i.subtotal, 0),
    };
  });

  return ok(res, {
    message: 'Your orders fetched.',
    data: scoped,
    meta: buildMeta({ page, limit, total }),
  });
});

/** GET /api/seller/products/performance - best sellers by revenue. */
const getProductPerformance = asyncHandler(async (req, res) => {
  const sellerId = oid(req.user._id);

  const rows = await Order.aggregate([
    { $match: { status: { $ne: ORDER_STATUS.CANCELLED } } },
    { $unwind: '$items' },
    { $match: { 'items.seller': sellerId } },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        image: { $first: '$items.image' },
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
  ]);

  return ok(res, { message: 'Product performance fetched.', data: rows });
});

/** GET /api/seller/reviews - reviews left on this seller's products. */
const getMyReviews = asyncHandler(async (req, res) => {
  const productIds = await Product.find({ seller: req.user._id }).distinct('_id');

  const reviews = await Review.find({ product: { $in: productIds } })
    .populate('user', 'name avatar')
    .populate('product', 'name images')
    .sort({ createdAt: -1 })
    .limit(50);

  return ok(res, { message: 'Reviews on your products fetched.', data: reviews });
});

module.exports = {
  getDashboard,
  getSalesAnalytics,
  getMyProducts,
  getMyOrders,
  getProductPerformance,
  getMyReviews,
};
