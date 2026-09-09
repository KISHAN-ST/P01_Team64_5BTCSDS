const mongoose = require('mongoose');

/**
 * Cart items are EMBEDDED: a cart is only ever read as a whole, belongs to one
 * user, and is short-lived. One cart per user, enforced by a unique index.
 */
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    // Price when the item was added, used to detect price drift at checkout.
    priceAtAdd: { type: Number, required: true, min: 0 },
  },
  { _id: true, timestamps: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    appliedCoupon: {
      code: { type: String, default: null },
      discount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', cartSchema);
