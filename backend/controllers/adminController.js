const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { ROLES, ORDER_STATUS, PAYMENT_STATUS, RULES } = require('../config/constants');

/** GET /api/admin/dashboard - platform-wide KPI block. */
const getDashboard = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 30;
  const now = new Date();
  const periodStart = new Date(now.getTime() - days * 86400000);
  const prevStart = new Date(now.getTime() - days * 2 * 86400000);

  const salesBetween = async (from, to) => {
    const [row] = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lt: to },
          status: { $ne: ORDER_STATUS.CANCELLED },
        },
      },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]);
    return row || { revenue: 0, count: 0 };
  };

  const [
    current,
    previous,
    totalUsers,
    newUsers,
    totalOrders,
    totalProducts,
    ratingRow,
    statusRows,
  ] = await Promise.all([
    salesBetween(periodStart, now),
    salesBetween(prevStart, periodStart),
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: periodStart } }),
    Order.countDocuments(),
    Product.countDocuments({ isActive: true }),
    Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const delta = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const ordersByStatus = Object.values(ORDER_STATUS).reduce((acc, s) => {
    acc[s] = statusRows.find((r) => r._id === s)?.count || 0;
    return acc;
  }, {});

  return ok(res, {
    message: 'Admin dashboard fetched.',
    data: {
      periodDays: days,
      totalUsers,
      newUsers,
      totalOrders,
      totalProducts,
      totalSales: current.revenue,
      totalSalesTrend: delta(current.revenue, previous.revenue),
      periodOrders: current.count,
      periodOrdersTrend: delta(current.count, previous.count),
      averageRating: ratingRow[0] ? Math.round(ratingRow[0].avg * 10) / 10 : 0,
      totalReviews: ratingRow[0]?.count || 0,
      ordersByStatus,
    },
  });
});

/**
 * GET /api/admin/reports/sales?days=30&groupBy=day
 * Revenue and order count over time, zero-filled so the chart has no gaps.
 */
const getSalesReport = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 30;
  const groupBy = req.query.groupBy === 'month' ? 'month' : 'day';
  const from = new Date(Date.now() - days * 86400000);

  const format = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';

  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: from }, status: { $ne: ORDER_STATUS.CANCELLED } } },
    {
      $group: {
        _id: { $dateToString: { format, date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
        discountGiven: { $sum: '$discount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  let series = rows.map((r) => ({
    period: r._id,
    revenue: r.revenue,
    orders: r.orders,
    discountGiven: r.discountGiven,
  }));

  if (groupBy === 'day') {
    const byDate = new Map(series.map((r) => [r.period, r]));
    series = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const row = byDate.get(d);
      series.push({
        period: d,
        revenue: row?.revenue || 0,
        orders: row?.orders || 0,
        discountGiven: row?.discountGiven || 0,
      });
    }
  }

  const totals = series.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      orders: acc.orders + r.orders,
      discountGiven: acc.discountGiven + r.discountGiven,
    }),
    { revenue: 0, orders: 0, discountGiven: 0 }
  );

  return ok(res, {
    message: 'Sales report generated.',
    data: series,
    meta: {
      ...totals,
      averageOrderValue: totals.orders ? Math.round(totals.revenue / totals.orders) : 0,
      days,
      groupBy,
    },
  });
});

/** GET /api/admin/reports/top-products */
const getTopProducts = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 10;

  const rows = await Order.aggregate([
    { $match: { status: { $ne: ORDER_STATUS.CANCELLED } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        image: { $first: '$items.image' },
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
      },
    },
    { $sort: { unitsSold: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    {
      $addFields: {
        stock: { $ifNull: [{ $arrayElemAt: ['$product.stock', 0] }, 0] },
        ratingAverage: { $ifNull: [{ $arrayElemAt: ['$product.ratingAverage', 0] }, 0] },
      },
    },
    { $project: { product: 0 } },
  ]);

  return ok(res, { message: 'Top products report generated.', data: rows });
});

/** GET /api/admin/reports/user-growth?days=90 */
const getUserGrowth = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 90;
  const from = new Date(Date.now() - days * 86400000);

  const rows = await User.aggregate([
    { $match: { createdAt: { $gte: from } } },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          role: '$role',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': 1 } },
  ]);

  const baseline = await User.countDocuments({ createdAt: { $lt: from } });

  const byDate = new Map();
  rows.forEach((r) => {
    const entry = byDate.get(r._id.date) || { customers: 0, sellers: 0, admins: 0 };
    if (r._id.role === ROLES.CUSTOMER) entry.customers += r.count;
    if (r._id.role === ROLES.SELLER) entry.sellers += r.count;
    if (r._id.role === ROLES.ADMIN) entry.admins += r.count;
    byDate.set(r._id.date, entry);
  });

  let cumulative = baseline;
  const series = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const e = byDate.get(d) || { customers: 0, sellers: 0, admins: 0 };
    const newUsers = e.customers + e.sellers + e.admins;
    cumulative += newUsers;
    series.push({ date: d, newUsers, cumulative, ...e });
  }

  const [byRole] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
  ]);

  return ok(res, {
    message: 'User growth report generated.',
    data: series,
    meta: {
      days,
      totalUsers: cumulative,
      byRole: byRole.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
    },
  });
});

/** GET /api/admin/reports/inventory - stock health across the whole catalog. */
const getInventoryReport = asyncHandler(async (req, res) => {
  const [summary] = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalStockUnits: { $sum: '$stock' },
        inventoryValue: { $sum: { $multiply: ['$stock', '$price'] } },
        outOfStock: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } },
        lowStock: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ['$stock', 0] },
                  { $lte: ['$stock', RULES.lowStockThreshold] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const critical = await Product.find({
    isActive: true,
    stock: { $lte: RULES.lowStockThreshold },
  })
    .populate('seller', 'name sellerProfile.shopName')
    .select('name stock price images seller')
    .sort({ stock: 1 })
    .limit(20);

  return ok(res, {
    message: 'Inventory report generated.',
    data: {
      summary: summary || {
        totalProducts: 0,
        totalStockUnits: 0,
        inventoryValue: 0,
        outOfStock: 0,
        lowStock: 0,
      },
      critical,
    },
    meta: { threshold: RULES.lowStockThreshold },
  });
});

/** GET /api/admin/users */
const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.search) {
    filter.$or = [
      { name: new RegExp(req.query.search, 'i') },
      { email: new RegExp(req.query.search, 'i') },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return ok(res, {
    message: 'Users fetched.',
    data: users.map((u) => u.toSafeJSON()),
    meta: buildMeta({ page, limit, total }),
  });
});

/** PATCH /api/admin/users/:id/status - activate or deactivate an account. */
const setUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  if (req.params.id === req.user._id.toString()) {
    throw ApiError.badRequest('You cannot deactivate your own admin account.');
  }

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found.');

  user.isActive = isActive;
  await user.save({ validateBeforeSave: false });

  return ok(res, {
    message: `User ${isActive ? 'activated' : 'deactivated'}.`,
    data: user.toSafeJSON(),
  });
});

/** GET /api/admin/orders - every order on the platform. */
const listOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.orderNumber) filter.orderNumber = new RegExp(req.query.orderNumber, 'i');

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  return ok(res, {
    message: 'Orders fetched.',
    data: orders,
    meta: buildMeta({ page, limit, total }),
  });
});

/** GET /api/admin/stats/overview - small counts used by several admin widgets. */
const getOverview = asyncHandler(async (req, res) => {
  const [users, sellers, products, categories, orders, pendingPayments] = await Promise.all([
    User.countDocuments({ role: ROLES.CUSTOMER }),
    User.countDocuments({ role: ROLES.SELLER }),
    Product.countDocuments({ isActive: true }),
    Category.countDocuments({ isActive: true }),
    Order.countDocuments(),
    Order.countDocuments({ paymentStatus: PAYMENT_STATUS.PENDING }),
  ]);

  return ok(res, {
    message: 'Overview fetched.',
    data: { customers: users, sellers, products, categories, orders, pendingPayments },
  });
});

module.exports = {
  getDashboard,
  getSalesReport,
  getTopProducts,
  getUserGrowth,
  getInventoryReport,
  listUsers,
  setUserStatus,
  listOrders,
  getOverview,
};
