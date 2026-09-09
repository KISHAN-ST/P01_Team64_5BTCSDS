const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { ROLES, ORDER_STATUS, RULES } = require('../config/constants');

const SORTS = {
  newest: { createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  rating: { ratingAverage: -1, ratingCount: -1 },
  popular: { numSold: -1 },
  featured: { numSold: -1, ratingAverage: -1 },
};

/**
 * GET /api/products
 * Public. Supports keyword search plus category / price / rating / stock
 * filters, sorting and pagination - all combinable in one query.
 */
const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const {
    search,
    category,
    minPrice,
    maxPrice,
    minRating,
    inStock,
    seller,
    brand,
    sort = 'featured',
  } = req.query;

  const filter = { isActive: true };

  if (search) filter.$text = { $search: search };

  // A parent category should also return everything in its sub-categories.
  if (category && mongoose.Types.ObjectId.isValid(category)) {
    const children = await Category.find({ parent: category }).select('_id').lean();
    const ids = [category, ...children.map((c) => c._id)];
    filter.category = { $in: ids };
  }

  if (seller && mongoose.Types.ObjectId.isValid(seller)) filter.seller = seller;
  if (brand) filter.brand = new RegExp(brand, 'i');

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (minRating) filter.ratingAverage = { $gte: Number(minRating) };
  if (inStock === 'true') filter.stock = { $gt: 0 };

  const sortBy = SORTS[sort] || SORTS.featured;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .populate('seller', 'name sellerProfile.shopName')
      .sort(sortBy)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return ok(res, {
    message: 'Products fetched.',
    data: products,
    meta: buildMeta({ page, limit, total }),
  });
});

/**
 * GET /api/products/:id
 * Public. When a token is present, tells the client whether this user is
 * allowed to review the product so the UI can disable the button correctly.
 */
const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name slug parent')
    .populate('seller', 'name sellerProfile.shopName createdAt');

  if (!product || !product.isActive) throw ApiError.notFound('Product not found.');

  const related = await Product.find({
    category: product.category?._id,
    _id: { $ne: product._id },
    isActive: true,
  })
    .limit(4)
    .select('name price mrp images ratingAverage ratingCount stock');

  let canReview = false;
  if (req.user) {
    canReview = Boolean(
      await Order.exists({
        user: req.user._id,
        status: ORDER_STATUS.DELIVERED,
        'items.product': product._id,
      })
    );
  }

  return ok(res, {
    message: 'Product fetched.',
    data: { ...product.toObject({ virtuals: true }), related, canReview },
  });
});

/** POST /api/products - seller or admin. The seller is taken from the token. */
const createProduct = asyncHandler(async (req, res) => {
  const categoryDoc = await Category.findById(req.body.category);
  if (!categoryDoc) throw ApiError.badRequest('The selected category does not exist.');

  const product = await Product.create({
    ...req.body,
    seller: req.user._id, // never trust a seller id from the body
  });

  return created(res, { message: 'Product created.', data: product });
});

/**
 * PUT /api/products/:id
 * A seller may only edit their own products; an admin may edit any.
 */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found.');

  if (
    req.user.role !== ROLES.ADMIN &&
    product.seller.toString() !== req.user._id.toString()
  ) {
    throw ApiError.forbidden('You can only modify your own products.');
  }

  if (req.body.category) {
    const categoryDoc = await Category.findById(req.body.category);
    if (!categoryDoc) throw ApiError.badRequest('The selected category does not exist.');
  }

  const editable = [
    'name',
    'description',
    'brand',
    'price',
    'mrp',
    'category',
    'images',
    'stock',
    'sku',
    'specifications',
    'isActive',
  ];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  });

  await product.save();
  return ok(res, { message: 'Product updated.', data: product });
});

/**
 * DELETE /api/products/:id
 * Soft-deletes when the product appears on past orders, so order history keeps
 * resolving; hard-deletes an untouched product.
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found.');

  if (
    req.user.role !== ROLES.ADMIN &&
    product.seller.toString() !== req.user._id.toString()
  ) {
    throw ApiError.forbidden('You can only delete your own products.');
  }

  const usedInOrders = await Order.exists({ 'items.product': product._id });
  if (usedInOrders) {
    product.isActive = false;
    await product.save();
    return ok(res, {
      message: 'Product has past orders, so it was delisted instead of deleted.',
    });
  }

  await product.deleteOne();
  return ok(res, { message: 'Product deleted.' });
});

/** PATCH /api/products/:id/stock - quick restock action for the seller UI. */
const updateStock = asyncHandler(async (req, res) => {
  const { stock } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found.');

  if (
    req.user.role !== ROLES.ADMIN &&
    product.seller.toString() !== req.user._id.toString()
  ) {
    throw ApiError.forbidden('You can only modify your own products.');
  }

  product.stock = stock;
  await product.save();

  return ok(res, { message: 'Stock updated.', data: product });
});

/** GET /api/products/meta/brands - distinct brand list for the filter sidebar. */
const listBrands = asyncHandler(async (req, res) => {
  const brands = await Product.distinct('brand', { isActive: true });
  return ok(res, { message: 'Brands fetched.', data: brands.sort() });
});

/** GET /api/products/meta/low-stock - seller/admin low-stock alert feed. */
const lowStockProducts = asyncHandler(async (req, res) => {
  const filter = {
    isActive: true,
    stock: { $lte: RULES.lowStockThreshold },
  };
  if (req.user.role === ROLES.SELLER) filter.seller = req.user._id;

  const products = await Product.find(filter)
    .populate('category', 'name')
    .sort({ stock: 1 });

  return ok(res, {
    message: 'Low stock products fetched.',
    data: products,
    meta: { threshold: RULES.lowStockThreshold, count: products.length },
  });
});

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  listBrands,
  lowStockProducts,
};
