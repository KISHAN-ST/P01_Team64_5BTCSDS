const mongoose = require('mongoose');
const slugify = require('slugify');

/**
 * Hierarchy is modelled as a self-reference (parent -> null for a top-level
 * category). Two levels are used by the UI, but the schema does not limit depth.
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: 60,
    },
    slug: { type: String, unique: true, index: true },
    description: { type: String, trim: true, default: '' },
    icon: { type: String, default: 'bi-tag' }, // Bootstrap Icons class
    image: { type: String, default: '' },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

categorySchema.index({ parent: 1, isActive: 1 });

categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent',
});

categorySchema.pre('validate', function makeSlug(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
