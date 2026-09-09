const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');
const { PAYMENT_STATUS, ORDER_STATUS } = require('../config/constants');

/**
 * Mock payment gateway.
 *
 * Real gateway integration is out of scope for this project, so this module
 * models the same two-step flow a real one uses - initiate, then verify - with
 * a deterministic outcome driven by PAYMENT_SUCCESS_RATE. Swapping in Razorpay
 * or Stripe means replacing the body of these two functions, nothing else.
 */

const makeReference = () =>
  `PAY${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;

const loadOwnOrder = async (orderId, user) => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found.');
  if (order.user.toString() !== user._id.toString()) {
    throw ApiError.forbidden('You can only pay for your own orders.');
  }
  return order;
};

/** POST /api/payments/initiate - returns a reference the client then verifies. */
const initiatePayment = asyncHandler(async (req, res) => {
  const order = await loadOwnOrder(req.body.orderId, req.user);

  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    throw ApiError.businessRule('This order has already been paid for.');
  }
  if (order.status === ORDER_STATUS.CANCELLED) {
    throw ApiError.businessRule('This order has been cancelled.');
  }
  if (order.paymentMode === 'COD') {
    throw ApiError.badRequest(
      'This is a Cash on Delivery order. Payment is collected at delivery.'
    );
  }

  const reference = makeReference();
  order.paymentReference = reference;
  await order.save();

  return ok(res, {
    message: 'Payment initiated.',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      paymentMode: order.paymentMode,
      reference,
      gateway: 'mock',
    },
  });
});

/**
 * POST /api/payments/verify
 * Marks the order paid or failed. Success is deterministic in the default
 * configuration (PAYMENT_SUCCESS_RATE=100) so demos never fail by accident.
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, reference } = req.body;
  const order = await loadOwnOrder(orderId, req.user);

  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    throw ApiError.businessRule('This order has already been paid for.');
  }
  if (reference && order.paymentReference && reference !== order.paymentReference) {
    throw ApiError.badRequest('Payment reference does not match this order.');
  }

  const successRate = Number(process.env.PAYMENT_SUCCESS_RATE ?? 100);
  const succeeded = Math.random() * 100 < successRate;

  if (!succeeded) {
    order.paymentStatus = PAYMENT_STATUS.FAILED;
    await order.save();
    throw ApiError.badRequest('Payment failed. Please try another payment method.');
  }

  order.paymentStatus = PAYMENT_STATUS.PAID;
  order.paidAt = new Date();
  order.statusHistory.push({
    status: order.status,
    at: new Date(),
    note: `Payment of Rs.${order.totalAmount} received via ${order.paymentMode}.`,
    by: req.user._id,
  });
  await order.save();

  return ok(res, {
    message: 'Payment successful.',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      paidAt: order.paidAt,
      reference: order.paymentReference,
    },
  });
});

/** GET /api/payments/:orderId/status */
const getPaymentStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId).select(
    'user orderNumber paymentMode paymentStatus paymentReference paidAt totalAmount'
  );
  if (!order) throw ApiError.notFound('Order not found.');

  if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw ApiError.forbidden('You do not have access to this order.');
  }

  return ok(res, { message: 'Payment status fetched.', data: order });
});

module.exports = { initiatePayment, verifyPayment, getPaymentStatus };
