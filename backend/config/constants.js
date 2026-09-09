/**
 * Central place for enums and business-rule constants so controllers, models
 * and validators can never drift apart on spelling.
 */

const ROLES = {
  CUSTOMER: 'customer',
  SELLER: 'seller',
  ADMIN: 'admin',
};

const ORDER_STATUS = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

/**
 * The order lifecycle, expressed as an explicit transition graph.
 * Anything not listed here is an invalid transition and is rejected with 400.
 */
const ORDER_TRANSITIONS = {
  [ORDER_STATUS.PLACED]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

/** Statuses a customer is still allowed to cancel from. */
const CUSTOMER_CANCELLABLE = [ORDER_STATUS.PLACED, ORDER_STATUS.CONFIRMED];

/** Stock is returned to inventory when an order leaves the pipeline. */
const RESTOCK_ON = [ORDER_STATUS.CANCELLED];

const PAYMENT_MODES = ['UPI', 'Card', 'NetBanking', 'COD'];

const PAYMENT_STATUS = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

const COUPON_TYPES = { PERCENTAGE: 'percentage', FLAT: 'flat' };

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Tunable business rules, read from .env with safe defaults. */
const RULES = {
  get lowStockThreshold() {
    return num(process.env.LOW_STOCK_THRESHOLD, 10);
  },
  get freeDeliveryAbove() {
    return num(process.env.FREE_DELIVERY_ABOVE, 500);
  },
  get deliveryCharge() {
    return num(process.env.DELIVERY_CHARGE, 49);
  },
  get maxCartQtyPerItem() {
    return num(process.env.MAX_CART_QTY_PER_ITEM, 10);
  },
  get saltRounds() {
    return num(process.env.BCRYPT_SALT_ROUNDS, 10);
  },
};

module.exports = {
  ROLES,
  ORDER_STATUS,
  ORDER_TRANSITIONS,
  CUSTOMER_CANCELLABLE,
  RESTOCK_ON,
  PAYMENT_MODES,
  PAYMENT_STATUS,
  COUPON_TYPES,
  RULES,
};
