const User = require('../models/User');
const Cart = require('../models/Cart');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/apiResponse');
const { signAccessToken, signRefreshToken } = require('../utils/generateToken');
const { ROLES } = require('../config/constants');

/**
 * POST /api/auth/register
 * Public. Customers and sellers may self-register; the admin role is never
 * self-assignable and can only be created by the seed script or another admin.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, shopName } = req.body;

  const requestedRole = role === ROLES.SELLER ? ROLES.SELLER : ROLES.CUSTOMER;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists.');
  }

  const user = await User.create({
    name,
    email,
    password,
    phone: phone || '',
    role: requestedRole,
    sellerProfile:
      requestedRole === ROLES.SELLER
        ? { shopName: shopName || `${name}'s Store`, isApproved: true }
        : undefined,
  });

  // Every customer gets an empty cart up front so cart routes never 404.
  if (user.role === ROLES.CUSTOMER) {
    await Cart.create({ user: user._id, items: [] });
  }

  return created(res, {
    message: 'Registration successful.',
    data: {
      user: user.toSafeJSON(),
      token: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    },
  });
});

/**
 * POST /api/auth/login
 * Public. The same generic message is returned for a wrong email and a wrong
 * password so the endpoint cannot be used to enumerate accounts.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw ApiError.unauthorized('Invalid email or password.');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated. Contact support.');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  return ok(res, {
    message: 'Login successful.',
    data: {
      user: user.toSafeJSON(),
      token: signAccessToken(user),
      refreshToken: signRefreshToken(user),
    },
  });
});

/** GET /api/auth/me - returns the caller's own profile. */
const getMe = asyncHandler(async (req, res) =>
  ok(res, { message: 'Profile fetched.', data: req.user.toSafeJSON() })
);

/** PUT /api/auth/me - update own name/phone/avatar/shop details. */
const updateMe = asyncHandler(async (req, res) => {
  const { name, phone, avatar, shopName, shopDescription } = req.body;
  const user = req.user;

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (avatar !== undefined) user.avatar = avatar;
  if (user.role === ROLES.SELLER) {
    if (shopName !== undefined) user.sellerProfile.shopName = shopName;
    if (shopDescription !== undefined) user.sellerProfile.description = shopDescription;
  }

  await user.save();
  return ok(res, { message: 'Profile updated.', data: user.toSafeJSON() });
});

/** PUT /api/auth/password - change own password. */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect.');
  }

  user.password = newPassword; // the pre-save hook hashes it
  await user.save();

  return ok(res, { message: 'Password changed successfully.' });
});

/** GET /api/auth/addresses */
const getAddresses = asyncHandler(async (req, res) =>
  ok(res, { message: 'Addresses fetched.', data: req.user.addresses })
);

/** POST /api/auth/addresses */
const addAddress = asyncHandler(async (req, res) => {
  const user = req.user;
  const address = req.body;

  // First address is the default; an explicit default demotes the others.
  if (address.isDefault || user.addresses.length === 0) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
    address.isDefault = true;
  }

  user.addresses.push(address);
  await user.save();

  return created(res, { message: 'Address added.', data: user.addresses });
});

/** DELETE /api/auth/addresses/:addressId */
const deleteAddress = asyncHandler(async (req, res) => {
  const user = req.user;
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found.');

  const wasDefault = address.isDefault;
  address.deleteOne();

  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();
  return ok(res, { message: 'Address removed.', data: user.addresses });
});

/**
 * POST /api/auth/logout
 * The API is stateless, so logout only clears the optional cookie; the client
 * is responsible for discarding its stored token.
 */
const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token');
  return ok(res, { message: 'Logged out successfully.' });
});

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  getAddresses,
  addAddress,
  deleteAddress,
  logout,
};
