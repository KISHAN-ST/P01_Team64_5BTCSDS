const mongoose = require('mongoose');
const {
  ORDER_STATUS,
  PAYMENT_MODES,
  PAYMENT_STATUS,
} = require('../config/constants');

/**
 * Order items are EMBEDDED and are a SNAPSHOT, not a live join. Name, image and
 * price are copied at checkout so a later price change or a deleted product can
 * never rewrite history on a past order.
 */
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, default: '' },
    pincode: { type: String, required: true },
  },
  { _id: false }
);

const statusEventSchema = new mongoose.Schema(
  {
    status: { type: String, enum: Object.values(ORDER_STATUS), required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, default: '' },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, index: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'An order must contain at least one item',
      },
    },
    shippingAddress: { type: shippingAddressSchema, required: true },

    itemsTotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    coupon: {
      code: { type: String, default: null },
      discountValue: { type: Number, default: 0 },
    },

    paymentMode: { type: String, enum: PAYMENT_MODES, required: true },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    paymentReference: { type: String, default: '' },
    paidAt: { type: Date },

    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PLACED,
    },
    statusHistory: [statusEventSchema],

    cancelledAt: { type: Date },
    cancelReason: { type: String, default: '' },
    deliveredAt: { type: Date },
    expectedDeliveryAt: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'items.seller': 1 });
orderSchema.index({ createdAt: -1 });

/** SV + yymmdd + 6 random chars, e.g. SV2609084F2A1C */
orderSchema.pre('validate', function makeOrderNumber(next) {
  if (!this.orderNumber) {
    const d = new Date();
    const stamp =
      String(d.getFullYear()).slice(-2) +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    this.orderNumber = `SV${stamp}${rand}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
