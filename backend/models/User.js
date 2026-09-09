const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES, RULES } = require('../config/constants');

/**
 * Addresses are EMBEDDED: they are always read with the user, are small, and
 * are never queried independently.
 */
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: 'Home' },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true, default: '' },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: 60,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never leaves the database unless explicitly asked for
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CUSTOMER,
    },
    phone: { type: String, trim: true, default: '' },
    avatar: { type: String, default: '' },
    addresses: [addressSchema],

    // Only meaningful when role === 'seller'
    sellerProfile: {
      shopName: { type: String, trim: true, default: '' },
      description: { type: String, trim: true, default: '' },
      isApproved: { type: Boolean, default: true },
    },

    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Frequently queried field -> index. `unique` already creates one for email.
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

/**
 * Hash on the way in. The isModified guard is what stops a profile update from
 * re-hashing an already-hashed password.
 */
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(RULES.saltRounds);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function matchPassword(plain) {
  return bcrypt.compare(plain, this.password);
};

/** Strip sensitive fields from every serialised user. */
userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  delete obj.__v;
  delete obj.id;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
