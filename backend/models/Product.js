const mongoose = require('mongoose');
const slugify = require('slugify');
const { RULES } = require('../config/constants');

const specSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: 140,
    },
    slug: { type: String, index: true },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      minlength: [20, 'Description must be at least 20 characters'],
    },
    brand: { type: String, trim: true, default: 'Generic' },

    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [1, 'Price must be greater than 0'],
    },
    mrp: { type: Number, min: 0, default: 0 },

    // Referenced: categories and sellers are shared entities updated independently.
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    images: {
      type: [String],
      validate: {
        validator: (v) => v.length > 0,
        message: 'At least one product image is required',
      },
    },

    stock: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    sku: { type: String, trim: true, default: '' },
    specifications: [specSchema],

    // Denormalised review aggregates so the listing page needs no join.
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    numSold: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Text index powers keyword search; the rest cover the listing filters.
productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ price: 1 });
productSchema.index({ ratingAverage: -1 });
productSchema.index({ createdAt: -1 });

productSchema.virtual('discountPercent').get(function discount() {
  if (!this.mrp || this.mrp <= this.price) return 0;
  return Math.round(((this.mrp - this.price) / this.mrp) * 100);
});

productSchema.virtual('inStock').get(function inStock() {
  return this.stock > 0;
});

productSchema.virtual('isLowStock').get(function low() {
  return this.stock > 0 && this.stock <= RULES.lowStockThreshold;
});

productSchema.pre('validate', function makeSlug(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = `${slugify(this.name, { lower: true, strict: true })}-${this._id
      .toString()
      .slice(-6)}`;
  }
  if (!this.mrp || this.mrp < this.price) this.mrp = this.price;
  next();
});

module.exports = mongoose.model('Product', productSchema);
