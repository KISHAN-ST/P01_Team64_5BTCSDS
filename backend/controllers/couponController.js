const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const { getOrCreateCart, buildCartResponse } = require('./cartController');

/** GET /api/coupons - admin sees everything, customers see live coupons only. */
const listCoupons = asyncHandler(async (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const filter = isAdmin
    ? {}
    : { isActive: true, expiresAt: { $gt: new Date() } };

  const coupons = await Coupon.find(filter).sort({ createdAt: -1 });
  return ok(res, { message: 'Coupons fetched.', data: coupons });
});

/** POST /api/coupons - admin only */
const createCoupon = asyncHandler(async (req, res) => {
  const code = String(req.body.code).toUpperCase().trim();

  const exists = await Coupon.findOne({ code });
  if (exists) throw ApiError.conflict('A coupon with this code already exists.');

  if (req.body.type === 'percentage' && req.body.value > 100) {
    throw ApiError.badRequest('A percentage coupon cannot exceed 100%.');
  }

  const coupon = await Coupon.create({
    ...req.body,
    code,
    createdBy: req.user._id,
  });

  return created(res, { message: 'Coupon created.', data: coupon });
});

/** PUT /api/coupons/:id - admin only */
const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found.');

  const editable = [
    'description',
    'type',
    'value',
    'maxDiscount',
    'minOrderValue',
    'startsAt',
    'expiresAt',
    'usageLimit',
    'perUserLimit',
    'isActive',
  ];
  editable.forEach((f) => {
    if (req.body[f] !== undefined) coupon[f] = req.body[f];
  });

  await coupon.save();
  return ok(res, { message: 'Coupon updated.', data: coupon });
});

/** DELETE /api/coupons/:id - admin only */
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found.');
  return ok(res, { message: 'Coupon deleted.' });
});

/**
 * POST /api/coupons/apply
 * Validates the coupon against the caller's live cart total and stores the
 * result on the cart. Every rejection reason is explicit so the UI can show it.
 */
const applyCoupon = asyncHandler(async (req, res) => {
  const code = String(req.body.code).toUpperCase().trim();

  const cart = await getOrCreateCart(req.user._id);
  const snapshot = await buildCartResponse(cart);

  if (snapshot.items.length === 0) {
    throw ApiError.businessRule('Your cart is empty.');
  }

  const coupon = await Coupon.findOne({ code });
  if (!coupon) throw ApiError.notFound(`Coupon '${code}' does not exist.`);

  const result = coupon.evaluate(snapshot.summary.itemsTotal, req.user._id);
  if (!result.valid) throw ApiError.businessRule(result.reason);

  cart.appliedCoupon = { code: coupon.code, discount: result.discount };
  await cart.save();

  return ok(res, {
    message: `Coupon '${coupon.code}' applied. You saved Rs.${result.discount}.`,
    data: await buildCartResponse(cart),
  });
});

/** DELETE /api/coupons/apply - remove the coupon currently on the cart. */
const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.appliedCoupon = { code: null, discount: 0 };
  await cart.save();

  return ok(res, {
    message: 'Coupon removed.',
    data: await buildCartResponse(cart),
  });
});

module.exports = {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
  removeCoupon,
};
