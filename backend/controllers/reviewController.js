const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { ROLES, ORDER_STATUS } = require('../config/constants');

/** GET /api/products/:productId/reviews - public, with a rating histogram. */
const listProductReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { product: req.params.productId };

  if (req.query.rating) filter.rating = Number(req.query.rating);
  if (req.query.withPhotos === 'true') filter['images.0'] = { $exists: true };

  const sort =
    req.query.sort === 'helpful'
      ? { helpfulCount: -1, createdAt: -1 }
      : req.query.sort === 'highest'
      ? { rating: -1, createdAt: -1 }
      : req.query.sort === 'lowest'
      ? { rating: 1, createdAt: -1 }
      : { createdAt: -1 };

  const [reviews, total, histogram] = await Promise.all([
    Review.find(filter)
      .populate('user', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Review.countDocuments(filter),
    Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(req.params.productId) } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
  ]);

  const breakdown = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: histogram.find((h) => h._id === stars)?.count || 0,
  }));
  const totalAll = breakdown.reduce((s, b) => s + b.count, 0);
  breakdown.forEach((b) => {
    b.percent = totalAll ? Math.round((b.count / totalAll) * 100) : 0;
  });

  return ok(res, {
    message: 'Reviews fetched.',
    data: reviews,
    meta: { ...buildMeta({ page, limit, total }), breakdown, totalReviews: totalAll },
  });
});

/**
 * POST /api/products/:productId/reviews - customers only.
 *
 * Business rule: a review requires a DELIVERED order from this user that
 * contains this product, and only one review per user per product. The unique
 * compound index is the real guard; the explicit check exists to return a clean
 * 409 instead of a raw duplicate-key error.
 */
const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, title, comment, images } = req.body;

  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found.');

  const deliveredOrder = await Order.findOne({
    user: req.user._id,
    status: ORDER_STATUS.DELIVERED,
    'items.product': product._id,
  }).select('_id');

  if (!deliveredOrder) {
    throw ApiError.forbidden(
      'You can only review a product after your order for it has been delivered.'
    );
  }

  const existing = await Review.findOne({ user: req.user._id, product: product._id });
  if (existing) {
    throw ApiError.conflict(
      'You have already reviewed this product. Edit your existing review instead.'
    );
  }

  const review = await Review.create({
    product: product._id,
    user: req.user._id,
    order: deliveredOrder._id,
    rating,
    title,
    comment,
    images: images || [],
    isVerifiedPurchase: true,
  });

  await review.populate('user', 'name avatar');
  return created(res, { message: 'Review submitted. Thank you!', data: review });
});

/** PUT /api/reviews/:id - author only. */
const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found.');

  if (review.user.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only edit your own review.');
  }

  const { rating, title, comment, images } = req.body;
  if (rating !== undefined) review.rating = rating;
  if (title !== undefined) review.title = title;
  if (comment !== undefined) review.comment = comment;
  if (images !== undefined) review.images = images;

  await review.save(); // post-save hook re-syncs the product rating
  return ok(res, { message: 'Review updated.', data: review });
});

/** DELETE /api/reviews/:id - author or admin. */
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found.');

  if (
    review.user.toString() !== req.user._id.toString() &&
    req.user.role !== ROLES.ADMIN
  ) {
    throw ApiError.forbidden('You can only delete your own review.');
  }

  const productId = review.product;
  await Review.findByIdAndDelete(review._id);
  await Review.syncProductRating(productId);

  return ok(res, { message: 'Review deleted.' });
});

/** POST /api/reviews/:id/helpful */
const markHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { $inc: { helpfulCount: 1 } },
    { new: true }
  );
  if (!review) throw ApiError.notFound('Review not found.');

  return ok(res, {
    message: 'Marked as helpful.',
    data: { helpfulCount: review.helpfulCount },
  });
});

/** GET /api/reviews/mine - the caller's own reviews. */
const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ user: req.user._id })
    .populate('product', 'name images price')
    .sort({ createdAt: -1 });

  return ok(res, { message: 'Your reviews fetched.', data: reviews });
});

module.exports = {
  listProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  getMyReviews,
};
