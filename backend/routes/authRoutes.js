const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, validateObjectId } = require('../middleware/validate');
const { ROLES } = require('../config/constants');

const router = express.Router();

/**
 * Brute-force guard on the credential endpoints only.
 *
 * The limit is generous in development because a full Postman/Newman run makes
 * a dozen or more login calls in a few seconds; production tightens it to 20.
 * Override with AUTH_RATE_LIMIT if needed.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:
    Number(process.env.AUTH_RATE_LIMIT) ||
    (process.env.NODE_ENV === 'production' ? 20 : 200),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts from this IP. Please try again in 15 minutes.',
  },
});

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('role')
    .optional()
    .isIn([ROLES.CUSTOMER, ROLES.SELLER])
    .withMessage('Role must be either customer or seller'),
  body('phone').optional().trim().isLength({ min: 6, max: 15 }).withMessage('Invalid phone number'),
];

const loginRules = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const addressRules = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('line1').trim().notEmpty().withMessage('Address line 1 is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('pincode')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be 6 digits'),
];

router.post('/register', authLimiter, registerRules, validate, ctrl.register);
router.post('/login', authLimiter, loginRules, validate, ctrl.login);
router.post('/logout', ctrl.logout);

router.get('/me', protect, ctrl.getMe);
router.put('/me', protect, ctrl.updateMe);

router.put(
  '/password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  validate,
  ctrl.changePassword
);

router.get('/addresses', protect, ctrl.getAddresses);
router.post('/addresses', protect, addressRules, validate, ctrl.addAddress);
router.delete(
  '/addresses/:addressId',
  protect,
  validateObjectId('addressId'),
  ctrl.deleteAddress
);

module.exports = router;
