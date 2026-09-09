const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /** The delivered order that entitles this user to review this product. */
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },

    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be between 1 and 5'],
      max: [5, 'Rating must be between 1 and 5'],
    },
    title: { type: String, trim: true, maxlength: 100, default: '' },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
      minlength: [5, 'Comment must be at least 5 characters'],
      maxlength: 1000,
    },
    images: [String],
    isVerifiedPurchase: { type: Boolean, default: true },
    helpfulCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One review per user per product - enforced by the database, not just code.
reviewSchema.index({ user: 1, product: 1 }, { unique: true });
reviewSchema.index({ product: 1, createdAt: -1 });

/**
 * Recompute the denormalised rating aggregate on the product. Called after any
 * write so products.ratingAverage never drifts from the reviews collection.
 */
reviewSchema.statics.syncProductRating = async function syncProductRating(productId) {
  const [stats] = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: '$product',
        ratingAverage: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  await mongoose.model('Product').findByIdAndUpdate(productId, {
    ratingAverage: stats ? Math.round(stats.ratingAverage * 10) / 10 : 0,
    ratingCount: stats ? stats.ratingCount : 0,
  });
};

reviewSchema.post('save', function afterSave() {
  this.constructor.syncProductRating(this.product);
});

reviewSchema.post('findOneAndDelete', function afterDelete(doc) {
  if (doc) doc.constructor.syncProductRating(doc.product);
});

reviewSchema.post('findOneAndUpdate', function afterUpdate(doc) {
  if (doc) doc.constructor.syncProductRating(doc.product);
});

module.exports = mongoose.model('Review', reviewSchema);
