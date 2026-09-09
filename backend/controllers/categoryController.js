const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');

/** GET /api/categories - flat list (optionally only top-level via ?parent=null) */
const listCategories = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.parent === 'null') filter.parent = null;
  else if (req.query.parent) filter.parent = req.query.parent;

  const categories = await Category.find(filter)
    .populate('parent', 'name slug')
    .sort({ name: 1 });

  return ok(res, { message: 'Categories fetched.', data: categories });
});

/**
 * GET /api/categories/tree
 * Parents with their children nested - what the storefront navigation needs.
 */
const getCategoryTree = asyncHandler(async (req, res) => {
  const all = await Category.find({ isActive: true }).sort({ name: 1 }).lean();

  const parents = all.filter((c) => !c.parent);
  const tree = parents.map((p) => ({
    ...p,
    children: all.filter((c) => c.parent && c.parent.toString() === p._id.toString()),
  }));

  return ok(res, { message: 'Category tree fetched.', data: tree });
});

/** GET /api/categories/:id */
const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).populate('parent', 'name slug');
  if (!category) throw ApiError.notFound('Category not found.');

  const children = await Category.find({ parent: category._id, isActive: true });
  const productCount = await Product.countDocuments({
    category: category._id,
    isActive: true,
  });

  return ok(res, {
    message: 'Category fetched.',
    data: { ...category.toObject(), children, productCount },
  });
});

/** POST /api/categories - admin only */
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, icon, image, parent } = req.body;

  if (parent) {
    const parentDoc = await Category.findById(parent);
    if (!parentDoc) throw ApiError.badRequest('Parent category does not exist.');
  }

  const exists = await Category.findOne({ name: new RegExp(`^${name}$`, 'i'), parent: parent || null });
  if (exists) throw ApiError.conflict('A category with this name already exists here.');

  const category = await Category.create({
    name,
    description,
    icon,
    image,
    parent: parent || null,
  });

  return created(res, { message: 'Category created.', data: category });
});

/** PUT /api/categories/:id - admin only */
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found.');

  const { name, description, icon, image, parent, isActive } = req.body;

  // A category cannot be its own parent, directly or otherwise.
  if (parent && parent.toString() === category._id.toString()) {
    throw ApiError.badRequest('A category cannot be its own parent.');
  }

  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (icon !== undefined) category.icon = icon;
  if (image !== undefined) category.image = image;
  if (parent !== undefined) category.parent = parent || null;
  if (isActive !== undefined) category.isActive = isActive;

  await category.save();
  return ok(res, { message: 'Category updated.', data: category });
});

/**
 * DELETE /api/categories/:id - admin only.
 * Refuses while products or sub-categories still reference it, so the catalog
 * can never end up with orphaned references.
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found.');

  const childCount = await Category.countDocuments({ parent: category._id });
  if (childCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete: ${childCount} sub-categorie(s) still belong to this category.`
    );
  }

  const productCount = await Product.countDocuments({ category: category._id });
  if (productCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete: ${productCount} product(s) still belong to this category.`
    );
  }

  await category.deleteOne();
  return ok(res, { message: 'Category deleted.' });
});

module.exports = {
  listCategories,
  getCategoryTree,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
