const mongoose = require('mongoose');
const { COUPON_TYPES } = require('../config/constants');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    description: { type: String, trim: true, default: '' },
    type: {
      type: String,
      enum: Object.values(COUPON_TYPES),
      required: true,
    },
    /** Percentage (1-100) when type=percentage, rupee amount when type=flat. */
    value: { type: Number, required: true, min: 1 },
    /** Only used for percentage coupons: caps the rupee discount. */
    maxDiscount: { type: Number, default: 0, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },

    startsAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: [true, 'Expiry date is required'] },

    usageLimit: { type: Number, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    usedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        usedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

couponSchema.index({ expiresAt: 1, isActive: 1 });

couponSchema.virtual('isExpired').get(function expired() {
  return this.expiresAt < new Date();
});

/**
 * Single source of truth for coupon eligibility. Returns
 * { valid, reason, discount } so the caller can surface the exact reason.
 */
couponSchema.methods.evaluate = function evaluate(cartTotal, userId) {
  const now = new Date();

  if (!this.isActive) return { valid: false, reason: 'This coupon is no longer active.' };
  if (this.startsAt > now)
    return { valid: false, reason: 'This coupon is not active yet.' };
  if (this.expiresAt < now) return { valid: false, reason: 'Coupon has expired.' };

  if (cartTotal < this.minOrderValue) {
    return {
      valid: false,
      reason: `Minimum order value of Rs.${this.minOrderValue} required to use this coupon.`,
    };
  }

  if (this.usageLimit > 0 && this.usedCount >= this.usageLimit) {
    return { valid: false, reason: 'This coupon has reached its usage limit.' };
  }

  if (userId && this.perUserLimit > 0) {
    const timesUsed = this.usedBy.filter(
      (u) => u.user && u.user.toString() === userId.toString()
    ).length;
    if (timesUsed >= this.perUserLimit) {
      return { valid: false, reason: 'You have already used this coupon.' };
    }
  }

  let discount =
    this.type === COUPON_TYPES.PERCENTAGE
      ? (cartTotal * this.value) / 100
      : this.value;

  if (this.type === COUPON_TYPES.PERCENTAGE && this.maxDiscount > 0) {
    discount = Math.min(discount, this.maxDiscount);
  }

  // A discount can never exceed the cart itself.
  discount = Math.min(Math.round(discount), cartTotal);

  return { valid: true, reason: null, discount };
};

module.exports = mongoose.model('Coupon', couponSchema);
