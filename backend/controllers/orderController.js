const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { getOrCreateCart, buildCartResponse } = require('./cartController');
const {
  ROLES,
  ORDER_STATUS,
  ORDER_TRANSITIONS,
  CUSTOMER_CANCELLABLE,
  PAYMENT_STATUS,
  RULES,
} = require('../config/constants');

/**
 * Decrement stock atomically. The `stock: { $gte: qty }` guard is what makes
 * this safe: if two checkouts race for the last unit, exactly one matches and
 * the other gets null back, so stock can never go negative.
 * Returns the list of products that were successfully reserved.
 */
const reserveStock = async (items) => {
  const reserved = [];
  for (const item of items) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.product, stock: { $gte: item.quantity }, isActive: true },
      { $inc: { stock: -item.quantity, numSold: item.quantity } },
      { new: true }
    );

    if (!updated) {
      // Roll back everything already taken, then report which item failed.
      await releaseStock(reserved);
      const p = await Product.findById(item.product).select('name stock');
      throw ApiError.businessRule(
        p
          ? `Only ${p.stock} unit(s) of '${p.name}' are available.`
          : 'One of the products in your cart is no longer available.'
      );
    }
    reserved.push(item);
  }
  return reserved;
};

/** Put stock back - used on rollback and on cancellation. */
const releaseStock = async (items) => {
  await Promise.all(
    items.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity, numSold: -item.quantity },
      })
    )
  );
};

/**
 * POST /api/orders
 * Converts the caller's cart into an order: re-validates the cart, re-validates
 * the coupon against the live total, reserves stock atomically, then clears the
 * cart. Totals are recomputed server-side and never taken from the client.
 */
const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMode, couponCode } = req.body;

  const cart = await getOrCreateCart(req.user._id);
  const snapshot = await buildCartResponse(cart);

  if (snapshot.items.length === 0) {
    throw ApiError.businessRule('Your cart is empty. Add items before checking out.');
  }

  const overStock = snapshot.items.filter((i) => i.exceedsStock);
  if (overStock.length > 0) {
    throw ApiError.businessRule(
      `Not enough stock for: ${overStock.map((i) => i.product.name).join(', ')}.`
    );
  }

  const itemsTotal = snapshot.summary.itemsTotal;

  // Re-validate the coupon here; the cart may have changed since it was applied.
  let discount = 0;
  let couponDoc = null;
  const codeToUse = couponCode || cart.appliedCoupon?.code;

  if (codeToUse) {
    couponDoc = await Coupon.findOne({ code: String(codeToUse).toUpperCase() });
    if (!couponDoc) throw ApiError.businessRule(`Coupon '${codeToUse}' does not exist.`);

    const result = couponDoc.evaluate(itemsTotal, req.user._id);
    if (!result.valid) throw ApiError.businessRule(result.reason);
    discount = result.discount;
  }

  const afterDiscount = Math.max(0, itemsTotal - discount);
  const deliveryCharge =
    afterDiscount >= RULES.freeDeliveryAbove ? 0 : RULES.deliveryCharge;
  const totalAmount = afterDiscount + deliveryCharge;

  // Snapshot each line so the order stays readable if a product changes later.
  const orderItems = snapshot.items.map((i) => ({
    product: i.product._id,
    seller: i.product.seller?._id || i.product.seller,
    name: i.product.name,
    image: i.product.image,
    price: i.product.price,
    quantity: i.quantity,
    subtotal: i.subtotal,
  }));

  await reserveStock(orderItems);

  let order;
  try {
    const expected = new Date();
    expected.setDate(expected.getDate() + 5);

    order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      itemsTotal,
      discount,
      deliveryCharge,
      totalAmount,
      coupon: couponDoc ? { code: couponDoc.code, discountValue: discount } : undefined,
      paymentMode,
      paymentStatus: PAYMENT_STATUS.PENDING,
      status: ORDER_STATUS.PLACED,
      expectedDeliveryAt: expected,
      statusHistory: [
        {
          status: ORDER_STATUS.PLACED,
          at: new Date(),
          note: 'Your order has been placed successfully.',
          by: req.user._id,
        },
      ],
    });
  } catch (err) {
    // The order failed to save, so the stock we took must go back.
    await releaseStock(orderItems);
    throw err;
  }

  if (couponDoc) {
    couponDoc.usedCount += 1;
    couponDoc.usedBy.push({ user: req.user._id, usedAt: new Date() });
    await couponDoc.save();
  }

  cart.items = [];
  cart.appliedCoupon = { code: null, discount: 0 };
  await cart.save();

  return created(res, { message: 'Order placed successfully.', data: order });
});

/** GET /api/orders - the caller's own orders. */
const getMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { user: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  return ok(res, {
    message: 'Orders fetched.',
    data: orders,
    meta: buildMeta({ page, limit, total }),
  });
});

/**
 * GET /api/orders/:id
 * A customer sees only their own order; a seller sees an order containing one
 * of their products; an admin sees any.
 */
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('items.product', 'name images slug');

  if (!order) throw ApiError.notFound('Order not found.');

  const isOwner = order.user._id.toString() === req.user._id.toString();
  const isSellerOnOrder =
    req.user.role === ROLES.SELLER &&
    order.items.some((i) => i.seller.toString() === req.user._id.toString());

  if (!isOwner && !isSellerOnOrder && req.user.role !== ROLES.ADMIN) {
    throw ApiError.forbidden('You do not have access to this order.');
  }

  return ok(res, { message: 'Order fetched.', data: order });
});

/**
 * PUT /api/orders/:id/status - seller or admin.
 * The transition graph in config/constants.js is the only authority on what is
 * allowed; anything else is a 400, not a silent database write.
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found.');

  if (req.user.role === ROLES.SELLER) {
    const sellsOnOrder = order.items.some(
      (i) => i.seller.toString() === req.user._id.toString()
    );
    if (!sellsOnOrder) {
      throw ApiError.forbidden('This order does not contain any of your products.');
    }
  }

  const allowed = ORDER_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    throw ApiError.businessRule(
      allowed.length === 0
        ? `Order is already '${order.status}' and cannot change further.`
        : `Invalid status transition: '${order.status}' -> '${status}'. Allowed: ${allowed.join(
            ', '
          )}.`
    );
  }

  if (status === ORDER_STATUS.CANCELLED) {
    await releaseStock(order.items);
    order.cancelledAt = new Date();
    order.cancelReason = note || 'Cancelled by seller/admin.';
    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      order.paymentStatus = PAYMENT_STATUS.REFUNDED;
    }
  }

  if (status === ORDER_STATUS.DELIVERED) {
    order.deliveredAt = new Date();
    // Cash on delivery is settled the moment the parcel is handed over.
    if (order.paymentMode === 'COD') {
      order.paymentStatus = PAYMENT_STATUS.PAID;
      order.paidAt = new Date();
    }
  }

  order.status = status;
  order.statusHistory.push({
    status,
    at: new Date(),
    note: note || `Order ${status.toLowerCase()}.`,
    by: req.user._id,
  });

  await order.save();
  return ok(res, { message: `Order marked as ${status}.`, data: order });
});

/**
 * PUT /api/orders/:id/cancel - customer self-service cancellation.
 * Only allowed while the parcel has not shipped.
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found.');

  if (order.user.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only cancel your own orders.');
  }

  if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
    throw ApiError.businessRule(
      `An order that is already '${order.status}' cannot be cancelled. Please raise a return request instead.`
    );
  }

  await releaseStock(order.items);

  order.status = ORDER_STATUS.CANCELLED;
  order.cancelledAt = new Date();
  order.cancelReason = req.body.reason || 'Cancelled by customer.';
  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    order.paymentStatus = PAYMENT_STATUS.REFUNDED;
  }
  order.statusHistory.push({
    status: ORDER_STATUS.CANCELLED,
    at: new Date(),
    note: order.cancelReason,
    by: req.user._id,
  });

  await order.save();
  return ok(res, { message: 'Order cancelled. Stock has been restored.', data: order });
});

/** GET /api/orders/:id/track - the timeline the tracking page renders. */
const trackOrder = asyncHandler(async (req, res) => {
  // `user` must be selected, otherwise the ownership check below silently passes.
  const order = await Order.findById(req.params.id).select(
    'user orderNumber status statusHistory createdAt expectedDeliveryAt deliveredAt items totalAmount'
  );
  if (!order) throw ApiError.notFound('Order not found.');

  const isOwner = order.user.toString() === req.user._id.toString();
  const isSellerOnOrder =
    req.user.role === ROLES.SELLER &&
    order.items.some((i) => i.seller.toString() === req.user._id.toString());

  if (!isOwner && !isSellerOnOrder && req.user.role !== ROLES.ADMIN) {
    throw ApiError.forbidden('You do not have access to this order.');
  }

  const flow = [
    ORDER_STATUS.PLACED,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.DELIVERED,
  ];
  const reached = new Set(order.statusHistory.map((h) => h.status));

  const timeline = flow.map((stage) => {
    const event = order.statusHistory.find((h) => h.status === stage);
    return {
      status: stage,
      done: reached.has(stage),
      at: event?.at || null,
      note: event?.note || '',
    };
  });

  return ok(res, {
    message: 'Tracking fetched.',
    data: {
      orderNumber: order.orderNumber,
      status: order.status,
      isCancelled: order.status === ORDER_STATUS.CANCELLED,
      expectedDeliveryAt: order.expectedDeliveryAt,
      timeline,
    },
  });
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  trackOrder,
  releaseStock,
};
