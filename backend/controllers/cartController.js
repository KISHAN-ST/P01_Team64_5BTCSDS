const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const { RULES } = require('../config/constants');

/** Fetch (or lazily create) the caller's cart. */
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
};

/**
 * Builds the response shape the cart page needs: live product data, per-line
 * subtotals, and the totals block including delivery and any applied coupon.
 * Lines whose product was deleted or delisted are dropped rather than crashing.
 */
const buildCartResponse = async (cart) => {
  await cart.populate({
    path: 'items.product',
    select: 'name price mrp images stock isActive seller ratingAverage',
    populate: { path: 'seller', select: 'name sellerProfile.shopName' },
  });

  const validItems = cart.items.filter((i) => i.product && i.product.isActive);

  // Drop dead lines from the stored cart too, so this self-heals.
  if (validItems.length !== cart.items.length) {
    cart.items = validItems;
    await cart.save();
  }

  const items = validItems.map((item) => {
    const p = item.product;
    const quantity = Math.min(item.quantity, p.stock); // never quote unavailable stock
    return {
      _id: item._id,
      product: {
        _id: p._id,
        name: p.name,
        price: p.price,
        mrp: p.mrp,
        image: p.images?.[0] || '',
        stock: p.stock,
        seller: p.seller,
      },
      quantity,
      priceAtAdd: item.priceAtAdd,
      priceChanged: item.priceAtAdd !== p.price,
      subtotal: p.price * quantity,
      exceedsStock: item.quantity > p.stock,
    };
  });

  const itemsTotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const discount = cart.appliedCoupon?.discount || 0;
  const afterDiscount = Math.max(0, itemsTotal - discount);
  const deliveryCharge =
    itemsTotal === 0 || afterDiscount >= RULES.freeDeliveryAbove
      ? 0
      : RULES.deliveryCharge;

  return {
    _id: cart._id,
    items,
    coupon: cart.appliedCoupon?.code
      ? { code: cart.appliedCoupon.code, discount }
      : null,
    summary: {
      itemCount: items.reduce((n, i) => n + i.quantity, 0),
      itemsTotal,
      discount,
      deliveryCharge,
      total: afterDiscount + deliveryCharge,
      freeDeliveryAbove: RULES.freeDeliveryAbove,
    },
  };
};

/** GET /api/cart */
const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  return ok(res, { message: 'Cart fetched.', data: await buildCartResponse(cart) });
});

/**
 * POST /api/cart
 * Adds a product, or increases the quantity if it is already in the cart.
 * The requested total quantity is validated against live stock.
 */
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) throw ApiError.notFound('Product not found.');
  if (product.stock === 0) {
    throw ApiError.businessRule(`'${product.name}' is currently out of stock.`);
  }

  const cart = await getOrCreateCart(req.user._id);
  const existing = cart.items.find((i) => i.product.toString() === productId);
  const desired = existing ? existing.quantity + Number(quantity) : Number(quantity);

  if (desired > product.stock) {
    throw ApiError.businessRule(
      `Only ${product.stock} unit(s) of '${product.name}' are available.`
    );
  }
  if (desired > RULES.maxCartQtyPerItem) {
    throw ApiError.businessRule(
      `You can order at most ${RULES.maxCartQtyPerItem} units of a single product.`
    );
  }

  if (existing) {
    existing.quantity = desired;
    existing.priceAtAdd = product.price;
  } else {
    cart.items.push({
      product: product._id,
      quantity: desired,
      priceAtAdd: product.price,
    });
  }

  await cart.save();
  return ok(res, {
    message: `'${product.name}' added to cart.`,
    data: await buildCartResponse(cart),
  });
});

/** PUT /api/cart/:itemId - set an absolute quantity. */
const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;

  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(req.params.itemId);
  if (!item) throw ApiError.notFound('This item is not in your cart.');

  const product = await Product.findById(item.product);
  if (!product || !product.isActive) {
    item.deleteOne();
    await cart.save();
    throw ApiError.businessRule('That product is no longer available and was removed.');
  }

  if (quantity > product.stock) {
    throw ApiError.businessRule(
      `Only ${product.stock} unit(s) of '${product.name}' are available.`
    );
  }
  if (quantity > RULES.maxCartQtyPerItem) {
    throw ApiError.businessRule(
      `You can order at most ${RULES.maxCartQtyPerItem} units of a single product.`
    );
  }

  item.quantity = quantity;
  await cart.save();

  return ok(res, { message: 'Cart updated.', data: await buildCartResponse(cart) });
});

/** DELETE /api/cart/:itemId */
const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(req.params.itemId);
  if (!item) throw ApiError.notFound('This item is not in your cart.');

  item.deleteOne();

  // A coupon validated against a bigger cart must be re-checked at checkout.
  if (cart.items.length === 0) {
    cart.appliedCoupon = { code: null, discount: 0 };
  }

  await cart.save();
  return ok(res, {
    message: 'Item removed from cart.',
    data: await buildCartResponse(cart),
  });
});

/** DELETE /api/cart */
const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  cart.appliedCoupon = { code: null, discount: 0 };
  await cart.save();

  return ok(res, { message: 'Cart cleared.', data: await buildCartResponse(cart) });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  getOrCreateCart,
  buildCartResponse,
};
