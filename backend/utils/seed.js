/**
 * Database seeder.
 *
 *   npm run seed           wipe + repopulate
 *   npm run seed:destroy   wipe only
 *
 * The data is deliberately shaped for the demo:
 *   - a few products sit below the low-stock threshold, one is at zero
 *   - coupons cover the happy path AND the two rejection paths (expired, min-order)
 *   - orders exist in every status and are backdated across 90 days so the
 *     admin sales chart shows a real curve
 */
require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Review = require('../models/Review');
const { ROLES, ORDER_STATUS, PAYMENT_STATUS } = require('../config/constants');

/**
 * Keyword-matched product photography.
 *
 * loremflickr returns a real Flickr photo tagged with the keyword, so a pair of
 * headphones actually looks like headphones - picsum would return an unrelated
 * random image. `lock` makes the choice deterministic, so re-seeding does not
 * reshuffle every picture.
 *
 * Every keyword below was verified to return a genuine match; keywords that fell
 * back to loremflickr's generic placeholder were replaced.
 */
const IMG = (keyword, lock = 1) =>
  `https://loremflickr.com/800/800/${encodeURIComponent(keyword)}?lock=${lock}`;

/**
 * Verified lock values per keyword.
 *
 * loremflickr serves a generic placeholder when a keyword+lock pair has no
 * matching photo, and whether it does so depends on BOTH values. Each lock
 * below was probed and confirmed to return a real, on-topic photograph, so
 * the catalog never renders a mismatched image.
 */
const LOCKS = {
  'backpack': [1, 2, 3],
  'bamboo': [1, 2, 3],
  'blocks': [1, 3, 4],
  'books': [1, 2, 3],
  'candle': [1, 2, 3],
  'ceramic,pot': [1, 2, 3],
  'chess': [3, 4, 6],
  'earbuds': [1, 2, 3],
  'gym': [1, 3, 4],
  'hair,oil': [1, 2, 3],
  'headphones': [1, 2, 3],
  'hiking,backpack': [1, 2, 3],
  'kitchen': [1, 3, 4],
  'laptop': [1, 2, 3],
  'laptop,gaming': [1, 3, 4],
  'perfume': [1, 2, 3],
  'planter': [2, 3, 7],
  'saree': [1, 2, 3],
  'serum': [1, 2, 3],
  'shirt': [1, 2, 3],
  'smartphone': [1, 2, 3],
  'smartwatch': [1, 2, 3],
  'sneakers': [1, 2, 3],
  'teddy,bear': [1, 4, 6],
  'textbook': [2, 3, 9],
  'tshirt': [1, 2, 3],
  'wooden,desk': [1, 2, 3],
  'wristwatch': [1, 2, 3],
  'yoga': [1, 2, 3],
};

/** Three on-topic images per product, rotated so products sharing a keyword
    do not all lead with the same photograph. */
const productImages = (keyword, index) => {
  const locks = LOCKS[keyword] || [1, 2, 3];
  return [0, 1, 2].map((n) => IMG(keyword, locks[(index + n) % locks.length]));
};
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/* ------------------------------- categories ------------------------------- */

const CATEGORY_IMAGE = {
  'Electronics': 'laptop',
  'Fashion': 'shirt',
  'Home & Living': 'kitchen',
  'Beauty': 'perfume',
  'Sports': 'gym',
  'Books': 'books',
  'Toys': 'blocks',
};

const CATEGORY_TREE = [
  { name: 'Electronics', icon: 'bi-laptop', children: ['Headphones', 'Smart Watches', 'Laptops', 'Mobiles'] },
  { name: 'Fashion', icon: 'bi-bag', children: ['Men', 'Women', 'Footwear', 'Accessories'] },
  { name: 'Home & Living', icon: 'bi-house-door', children: ['Decor', 'Kitchen', 'Furniture', 'Plants'] },
  { name: 'Beauty', icon: 'bi-flower1', children: ['Skincare', 'Haircare', 'Fragrance'] },
  { name: 'Sports', icon: 'bi-bicycle', children: ['Fitness', 'Outdoor', 'Sportswear'] },
  { name: 'Books', icon: 'bi-book', children: ['Fiction', 'Non-Fiction', 'Academic'] },
  { name: 'Toys', icon: 'bi-puzzle', children: ['Educational', 'Soft Toys', 'Games'] },
];

/* -------------------------------- products -------------------------------- */
/* stock is set deliberately: values 1-8 feed the low-stock alert, 0 proves the
   out-of-stock rule, everything else is comfortably in stock.                 */

const PRODUCTS = [
  // --- Electronics / Headphones (seller 0)
  { n: 'Wireless Noise-Cancelling Headphones', c: 'Headphones', s: 0, p: 2999, m: 4999, st: 45, b: 'SoundCore', r: 4.5, k: 'headphones',
    d: 'Premium over-ear wireless headphones with hybrid active noise cancellation, 40 hours of battery life on a single charge, and plush memory-foam earcups. Crystal-clear call quality with dual beamforming microphones makes them equally at home on a commute, in an office, or on a long flight.' },
  { n: 'True Wireless Earbuds Pro', c: 'Headphones', s: 0, p: 1899, m: 2999, st: 60, b: 'SoundCore', r: 4.3, k: 'earbuds',
    d: 'Compact true-wireless earbuds with adaptive noise cancellation and a transparency mode that lets ambient sound back in with a single tap. IPX5 water resistance handles workouts and rain, and the charging case adds three full recharges on the move.' },
  { n: 'Studio Monitor Headphones', c: 'Headphones', s: 0, p: 4499, m: 5999, st: 6, b: 'AudioLab', r: 4.7, k: 'headphones',
    d: 'Closed-back studio reference headphones tuned for a flat, uncoloured frequency response, built for mixing and mastering rather than casual listening. The detachable coiled cable and replaceable velour pads make them serviceable for years of daily studio use.' },

  // --- Electronics / Smart Watches
  { n: 'Smart Watch Series 7', c: 'Smart Watches', s: 0, p: 4999, m: 7999, st: 32, b: 'TechWear', r: 4.3, k: 'smartwatch',
    d: 'A 1.9-inch AMOLED smartwatch with continuous heart-rate tracking, blood-oxygen monitoring, sleep staging and over 100 sport modes. Bluetooth calling, a seven-day battery and 5ATM water resistance cover everything from meetings to open-water swims.' },
  { n: 'Fitness Band Lite', c: 'Smart Watches', s: 1, p: 1299, m: 1999, st: 78, b: 'FitPulse', r: 4.0, k: 'smartwatch',
    d: 'A lightweight fitness band with a colour touch display, automatic workout detection and a fourteen-day battery. Tracks steps, calories, heart rate and sleep quality, and pushes call and message alerts straight to the wrist without draining your phone.' },

  // --- Electronics / Laptops
  { n: 'UltraBook 14 Thin & Light Laptop', c: 'Laptops', s: 0, p: 49999, m: 59999, st: 12, b: 'NovaTech', r: 4.6, k: 'laptop',
    d: 'A 14-inch aluminium ultrabook weighing just 1.2kg, with a 2.8K display, 16GB of memory and a 512GB NVMe drive. The fanless thermal design keeps it silent under everyday load while still delivering a full working day of battery life.' },
  { n: 'Gaming Laptop 16 RTX Edition', c: 'Laptops', s: 0, p: 89999, m: 109999, st: 4, b: 'NovaTech', r: 4.4, k: 'laptop,gaming',
    d: 'A 16-inch gaming laptop with a 165Hz QHD panel, dedicated RTX graphics and a vapour-chamber cooling system that holds sustained clocks under load. Per-key RGB, a full-size keyboard and generous port selection make it a genuine desktop replacement.' },

  // --- Electronics / Mobiles
  { n: 'Smartphone Nova 5G', c: 'Mobiles', s: 0, p: 18999, m: 22999, st: 40, b: 'Nova', r: 4.2, k: 'smartphone',
    d: 'A 6.7-inch AMOLED 5G smartphone with a 120Hz refresh rate, a 50MP optically stabilised main camera and a 5000mAh battery with 67W fast charging. Three years of guaranteed software updates keep it current well beyond the first year.' },
  { n: 'Budget Smartphone Lite 4G', c: 'Mobiles', s: 1, p: 8999, m: 11999, st: 55, b: 'Nova', r: 3.9, k: 'smartphone',
    d: 'An affordable everyday smartphone with a 6.5-inch display, a clean near-stock Android build and a two-day battery. Expandable storage and a dedicated dual-SIM tray make it a practical choice as a primary or secondary handset.' },

  // --- Fashion
  { n: 'Classic White Sneakers', c: 'Footwear', s: 2, p: 2499, m: 3499, st: 38, b: 'UrbanStep', r: 4.4, k: 'sneakers',
    d: 'Minimal low-top sneakers in full-grain leather with a cushioned ortholite footbed and a vulcanised rubber sole. Neutral enough for office wear, sturdy enough for daily walking, and designed to crease gracefully rather than crack.' },
  { n: 'Running Shoes AirFlex', c: 'Footwear', s: 2, p: 3299, m: 4499, st: 25, b: 'UrbanStep', r: 4.5, k: 'sneakers',
    d: 'Neutral running shoes with a responsive foam midsole, an engineered knit upper for breathability and a segmented outsole that flexes naturally with your stride. Reflective detailing improves visibility for early-morning and evening runs.' },
  { n: 'Minimal Everyday Backpack', c: 'Accessories', s: 2, p: 1799, m: 2499, st: 50, b: 'CarryWell', r: 4.6, k: 'backpack',
    d: 'A 22-litre water-resistant backpack with a padded 15-inch laptop sleeve, a hidden anti-theft pocket and a luggage pass-through strap. The clean silhouette works for a commute, a lecture hall or a weekend away with equal ease.' },
  { n: 'Cotton Casual Shirt', c: 'Men', s: 2, p: 1199, m: 1799, st: 70, b: 'ThreadCo', r: 4.1, k: 'shirt',
    d: 'A regular-fit shirt in breathable 100% combed cotton with a soft-washed finish that needs no ironing after a tumble dry. Reinforced side seams and horn-effect buttons hold up to repeated wear and washing.' },
  { n: 'Womens Kurta Set', c: 'Women', s: 2, p: 1599, m: 2499, st: 3, b: 'ThreadCo', r: 4.4, k: 'saree',
    d: 'A hand-block printed cotton kurta with matching palazzo trousers and a lightweight dupatta. The breathable weave and relaxed cut are built for long, warm days, and the natural dyes soften attractively with each wash.' },
  { n: 'Leather Analog Wristwatch', c: 'Accessories', s: 2, p: 2799, m: 3999, st: 20, b: 'Chrono', r: 4.2, k: 'wristwatch',
    d: 'A slim analog wristwatch with a sapphire-coated mineral crystal, a genuine leather strap and 50-metre water resistance. The clean two-hand dial reads instantly and pairs as well with formalwear as with everyday clothes.' },

  // --- Home & Living
  { n: 'Ceramic Planter Pot Set', c: 'Plants', s: 1, p: 499, m: 799, st: 90, b: 'GreenNest', r: 4.6, k: 'ceramic,pot',
    d: 'A set of three matte-glazed stoneware planters in graduated sizes, each with a drainage hole and a matching saucer. Suited to succulents, herbs and small foliage plants, and heavy enough not to topple as the plant grows.' },
  { n: 'Scented Soy Candle - Vanilla Amber', c: 'Decor', s: 1, p: 699, m: 999, st: 65, b: 'GreenNest', r: 4.7, k: 'candle',
    d: 'A hand-poured natural soy wax candle with a lead-free cotton wick and a 45-hour burn time. The vanilla and amber blend is warm without being cloying, and the reusable amber glass jar makes a good desk tidy afterwards.' },
  { n: 'Bamboo Kitchen Organiser', c: 'Kitchen', s: 1, p: 1299, m: 1899, st: 30, b: 'GreenNest', r: 4.3, k: 'bamboo',
    d: 'A sustainably sourced bamboo countertop organiser with adjustable dividers for cutlery, utensils and spice jars. The sealed surface wipes clean in seconds and resists the humidity swings of a working kitchen.' },
  { n: 'Solid Wood Study Table', c: 'Furniture', s: 1, p: 8999, m: 12999, st: 8, b: 'TimberCraft', r: 4.5, k: 'wooden,desk',
    d: 'A solid sheesham wood study desk with a cable management channel, two soft-close drawers and a matte lacquer finish. It arrives largely pre-assembled and needs only the four legs fitted, with all hardware included.' },
  { n: 'Indoor Snake Plant', c: 'Plants', s: 1, p: 399, m: 599, st: 0, b: 'GreenNest', r: 4.8, k: 'planter',
    d: 'A hardy Sansevieria in a nursery pot, one of the few houseplants that genuinely tolerates low light and irregular watering. It filters indoor air overnight, which makes it a sensible plant for a bedroom or a study.' },

  // --- Beauty
  { n: 'Vitamin C Face Serum', c: 'Skincare', s: 1, p: 899, m: 1299, st: 48, b: 'GlowLab', r: 4.4, k: 'serum',
    d: 'A stabilised 15% vitamin C serum with hyaluronic acid and vitamin E, formulated at a pH that stays effective without stinging. Used each morning it visibly evens tone over several weeks and layers cleanly under sunscreen.' },
  { n: 'Argan Oil Hair Repair Mask', c: 'Haircare', s: 1, p: 649, m: 999, st: 7, b: 'GlowLab', r: 4.2, k: 'hair,oil',
    d: 'A deep-conditioning hair mask with cold-pressed argan oil, shea butter and keratin peptides. Ten minutes a week noticeably reduces breakage on chemically treated or heat-styled hair without weighing down the roots.' },
  { n: 'Eau de Parfum - Citrus Woods', c: 'Fragrance', s: 1, p: 2199, m: 3199, st: 22, b: 'Aurele', r: 4.5, k: 'perfume',
    d: 'A unisex eau de parfum opening on bergamot and pink pepper, settling into a cedar and vetiver base. At 18% concentration it holds for a full working day without the sharpness that thinner citrus fragrances develop.' },

  // --- Sports
  { n: 'Adjustable Dumbbell Set 20kg', c: 'Fitness', s: 2, p: 4999, m: 6999, st: 15, b: 'IronCore', r: 4.4, k: 'gym',
    d: 'A pair of adjustable dumbbells covering 2.5kg to 10kg each through cast-iron plates and a secure star-lock collar. The knurled chrome handle gives a confident grip and the set replaces an entire rack of fixed weights.' },
  { n: 'Yoga Mat Pro 6mm', c: 'Fitness', s: 2, p: 1099, m: 1599, st: 42, b: 'ZenFlow', r: 4.6, k: 'yoga',
    d: 'A 6mm TPE yoga mat with a closed-cell surface that resists sweat absorption and an alignment print to guide posture. It grips reliably on both wooden and tiled floors and rolls up with a carry strap included.' },
  { n: 'Trekking Backpack 45L', c: 'Outdoor', s: 2, p: 3499, m: 4999, st: 5, b: 'TrailMax', r: 4.3, k: 'hiking,backpack',
    d: 'A 45-litre trekking pack with a ventilated back panel, a padded hip belt that carries load off the shoulders, and a detachable rain cover. Multiple access points mean you can reach the base of the pack without unloading it.' },
  { n: 'Quick-Dry Sports T-Shirt', c: 'Sportswear', s: 2, p: 799, m: 1199, st: 85, b: 'ZenFlow', r: 4.1, k: 'tshirt',
    d: 'A moisture-wicking training tee in a lightweight recycled polyester knit with flatlock seams to prevent chafing. It dries within minutes after a wash and holds its shape through repeated high-intensity sessions.' },

  // --- Books
  { n: 'The Silent Library - Fiction', c: 'Fiction', s: 0, p: 399, m: 599, st: 55, b: 'PageTurner', r: 4.5, k: 'books',
    d: 'A literary mystery set across two timelines in a crumbling coastal library, where a missing manuscript connects a present-day archivist to a disappearance eighty years earlier. Paperback, 384 pages, with a reading-group guide.' },
  { n: 'Atomic Productivity - Non-Fiction', c: 'Non-Fiction', s: 0, p: 549, m: 799, st: 40, b: 'PageTurner', r: 4.7, k: 'books',
    d: 'A practical guide to building durable work habits, drawing on behavioural research rather than motivation. Each chapter closes with a concrete exercise, making it usable as a workbook instead of a one-time read.' },
  { n: 'Data Structures & Algorithms', c: 'Academic', s: 0, p: 899, m: 1299, st: 28, b: 'AcadPress', r: 4.6, k: 'textbook',
    d: 'A university-level textbook covering arrays through graphs and dynamic programming, with worked complexity analysis and implementations in both C++ and Java. Includes over 300 exercises with solutions to the odd-numbered problems.' },

  // --- Toys
  { n: 'Wooden Building Blocks Set', c: 'Educational', s: 1, p: 1199, m: 1799, st: 35, b: 'PlayWood', r: 4.7, k: 'blocks',
    d: 'A 100-piece set of solid beechwood blocks finished with non-toxic water-based dyes and sanded smooth on every edge. Open-ended enough to hold a child from stacking towers at two to building structures at seven.' },
  { n: 'Plush Teddy Bear 40cm', c: 'Soft Toys', s: 1, p: 899, m: 1299, st: 44, b: 'CuddleCo', r: 4.5, k: 'teddy,bear',
    d: 'A 40cm teddy bear in hypoallergenic ultra-soft plush with securely embroidered eyes rather than plastic parts, making it safe from birth. Machine washable on a cold cycle and holds its shape after drying.' },
  { n: 'Strategy Board Game - Settlers', c: 'Games', s: 1, p: 1999, m: 2799, st: 18, b: 'PlayWood', r: 4.8, k: 'chess',
    d: 'A resource-trading strategy board game for three to four players, running about ninety minutes per session. The modular hex board changes the map every game, which is what keeps it on the table long after the first few plays.' },
];

/* --------------------------------- coupons -------------------------------- */

const COUPONS = [
  { code: 'WELCOME10', type: 'percentage', value: 10, minOrderValue: 500, maxDiscount: 500, days: 60,
    description: '10% off your order above Rs.500' },
  { code: 'FLAT350', type: 'flat', value: 350, minOrderValue: 2000, days: 45,
    description: 'Flat Rs.350 off on orders above Rs.2000' },
  { code: 'MEGA50', type: 'percentage', value: 50, minOrderValue: 5000, maxDiscount: 1000, days: 30,
    description: '50% off up to Rs.1000 on orders above Rs.5000' },
  // Deliberately invalid - these two exist to demonstrate rejection paths.
  { code: 'EXPIRED20', type: 'percentage', value: 20, minOrderValue: 100, days: -10,
    description: 'Expired coupon (demo: expiry validation)' },
  { code: 'BIGONLY', type: 'flat', value: 500, minOrderValue: 10000, days: 40,
    description: 'Rs.500 off above Rs.10000 (demo: minimum order validation)' },
];

/* --------------------------------- reviews -------------------------------- */

const REVIEW_TEXT = [
  { r: 5, t: 'Exceeded expectations', c: 'Genuinely impressed with the build quality. Arrived two days early and the packaging was solid. Would order from this seller again without hesitation.' },
  { r: 4, t: 'Very good, minor niggles', c: 'Does what it promises and feels well made for the price. Knocking off a star only because the instructions were thin, but nothing a quick search did not solve.' },
  { r: 5, t: 'Worth every rupee', c: 'Been using it daily for three weeks now and it has held up perfectly. Exactly as described in the listing, and the photos are accurate for once.' },
  { r: 4, t: 'Good value for money', c: 'Solid product at this price point. Delivery was quick and the item was well packed. Happy with the purchase overall.' },
  { r: 3, t: 'Decent but not outstanding', c: 'Works fine and nothing is actually wrong with it, but it feels a little more ordinary than the listing suggests. Fair for the money, not remarkable.' },
  { r: 5, t: 'Highly recommended', c: 'Second one I have bought, first was a gift. Quality is consistent across both, which says a lot. Shipping was fast and tracking was accurate throughout.' },
];

/* ------------------------------- the seeder ------------------------------- */

const wipe = async () => {
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Cart.deleteMany({}),
    Order.deleteMany({}),
    Coupon.deleteMany({}),
    Review.deleteMany({}),
  ]);
  console.log('  cleared all collections');
};

const seed = async () => {
  await wipe();

  /* -- users -- */
  const admin = await User.create({
    name: 'Platform Admin',
    email: (process.env.ADMIN_EMAIL || 'admin@shopverse.com').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
    role: ROLES.ADMIN,
    phone: '9876500001',
    createdAt: daysAgo(120),
  });

  const sellers = await User.create([
    { name: 'Rahul Mehta', email: 'seller1@shopverse.com', password: 'Seller@12345', role: ROLES.SELLER,
      phone: '9876500011', sellerProfile: { shopName: 'TechWorld', description: 'Electronics, audio and computing gear.', isApproved: true }, createdAt: daysAgo(110) },
    { name: 'Ananya Iyer', email: 'seller2@shopverse.com', password: 'Seller@12345', role: ROLES.SELLER,
      phone: '9876500012', sellerProfile: { shopName: 'GreenLiving', description: 'Home, decor, beauty and everyday essentials.', isApproved: true }, createdAt: daysAgo(100) },
    { name: 'Vikram Shah', email: 'seller3@shopverse.com', password: 'Seller@12345', role: ROLES.SELLER,
      phone: '9876500013', sellerProfile: { shopName: 'UrbanStyle', description: 'Fashion, footwear and sportswear.', isApproved: true }, createdAt: daysAgo(95) },
  ]);

  const customers = await User.create([
    { name: 'Priya Sharma', email: 'customer1@gmail.com', password: 'Customer@12345', role: ROLES.CUSTOMER, phone: '9876500021', createdAt: daysAgo(80),
      addresses: [{ label: 'Home', fullName: 'Priya Sharma', phone: '9876500021', line1: '123, MG Road', line2: 'Near Metro Station', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', isDefault: true }] },
    { name: 'Arjun Nair', email: 'customer2@gmail.com', password: 'Customer@12345', role: ROLES.CUSTOMER, phone: '9876500022', createdAt: daysAgo(60),
      addresses: [{ label: 'Home', fullName: 'Arjun Nair', phone: '9876500022', line1: '45, Anna Salai', city: 'Chennai', state: 'Tamil Nadu', pincode: '600002', isDefault: true }] },
    { name: 'Sneha Patel', email: 'customer3@gmail.com', password: 'Customer@12345', role: ROLES.CUSTOMER, phone: '9876500023', createdAt: daysAgo(35),
      addresses: [{ label: 'Home', fullName: 'Sneha Patel', phone: '9876500023', line1: '78, CG Road', city: 'Ahmedabad', state: 'Gujarat', pincode: '380009', isDefault: true }] },
    { name: 'Karan Verma', email: 'customer4@gmail.com', password: 'Customer@12345', role: ROLES.CUSTOMER, phone: '9876500024', createdAt: daysAgo(12),
      addresses: [{ label: 'Home', fullName: 'Karan Verma', phone: '9876500024', line1: '9, Park Street', city: 'Kolkata', state: 'West Bengal', pincode: '700016', isDefault: true }] },
    { name: 'Meera Joshi', email: 'customer5@gmail.com', password: 'Customer@12345', role: ROLES.CUSTOMER, phone: '9876500025', createdAt: daysAgo(4) },
  ]);

  await Cart.create(customers.map((c) => ({ user: c._id, items: [] })));
  console.log(`  users: 1 admin, ${sellers.length} sellers, ${customers.length} customers`);

  /* -- categories -- */
  const categoryByName = {};
  for (const parent of CATEGORY_TREE) {
    const parentDoc = await Category.create({
      name: parent.name,
      icon: parent.icon,
      image: productImages(CATEGORY_IMAGE[parent.name] || 'kitchen', 0)[0],
      description: `Shop the best in ${parent.name}.`,
    });
    categoryByName[parent.name] = parentDoc;

    for (const child of parent.children) {
      categoryByName[child] = await Category.create({
        name: child,
        parent: parentDoc._id,
        icon: parent.icon,
        description: `${child} in ${parent.name}.`,
      });
    }
  }
  const categoryCount = Object.keys(categoryByName).length;
  console.log(`  categories: ${categoryCount} (${CATEGORY_TREE.length} parents)`);

  /* -- products -- */
  const products = [];
  for (let i = 0; i < PRODUCTS.length; i += 1) {
    const p = PRODUCTS[i];
    const category = categoryByName[p.c];
    if (!category) throw new Error(`Seed error: unknown category '${p.c}'`);

    products.push(
      await Product.create({
        name: p.n,
        description: p.d,
        brand: p.b,
        price: p.p,
        mrp: p.m,
        category: category._id,
        seller: sellers[p.s]._id,
        images: productImages(p.k, i),
        stock: p.st,
        sku: `SV-${String(i + 1).padStart(4, '0')}`,
        specifications: [
          { key: 'Brand', value: p.b },
          { key: 'Warranty', value: '1 Year Manufacturer Warranty' },
          { key: 'Country of Origin', value: 'India' },
        ],
        createdAt: daysAgo(randInt(30, 90)),
      })
    );
  }

  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  console.log(`  products: ${products.length} (${lowStock} low stock, ${outOfStock} out of stock)`);

  /* -- coupons -- */
  await Coupon.create(
    COUPONS.map((c) => ({
      code: c.code,
      description: c.description,
      type: c.type,
      value: c.value,
      maxDiscount: c.maxDiscount || 0,
      minOrderValue: c.minOrderValue,
      startsAt: daysAgo(30),
      expiresAt: daysAgo(-c.days), // negative days => a future date
      perUserLimit: 5,
      createdBy: admin._id,
    }))
  );
  console.log(`  coupons: ${COUPONS.length} (1 expired, 1 high-minimum - both intentional)`);

  /* -- orders -- */
  // Spread across 90 days so the admin sales chart has a genuine curve.
  const ORDER_PLAN = [
    { status: ORDER_STATUS.DELIVERED, age: 62, cust: 0, items: [0, 16] },
    { status: ORDER_STATUS.DELIVERED, age: 55, cust: 0, items: [10] },
    { status: ORDER_STATUS.DELIVERED, age: 48, cust: 1, items: [3, 25] },
    { status: ORDER_STATUS.DELIVERED, age: 40, cust: 0, items: [17] },
    { status: ORDER_STATUS.DELIVERED, age: 34, cust: 2, items: [20] },
    { status: ORDER_STATUS.DELIVERED, age: 28, cust: 1, items: [11, 27] },
    { status: ORDER_STATUS.DELIVERED, age: 22, cust: 0, items: [30] },
    { status: ORDER_STATUS.CANCELLED, age: 19, cust: 2, items: [5] },
    { status: ORDER_STATUS.DELIVERED, age: 15, cust: 3, items: [24] },
    { status: ORDER_STATUS.SHIPPED, age: 6, cust: 1, items: [1, 12] },
    { status: ORDER_STATUS.SHIPPED, age: 5, cust: 2, items: [28] },
    { status: ORDER_STATUS.CONFIRMED, age: 3, cust: 3, items: [7] },
    { status: ORDER_STATUS.CONFIRMED, age: 2, cust: 0, items: [21] },
    { status: ORDER_STATUS.PLACED, age: 1, cust: 4, items: [15, 22] },
    { status: ORDER_STATUS.PLACED, age: 0, cust: 1, items: [31] },
  ];

  /**
   * Purchase history.
   *
   * The hand-written plan above pins one order to every status so the workflow
   * is demoable. This block then back-fills a DELIVERED order for every product
   * that plan missed, so the catalog carries realistic ratings and the sales,
   * top-product and user-growth reports have a genuine 90-day curve to draw.
   *
   * Every generated order is DELIVERED, which is what makes the reviews below
   * legitimate under the same rule the API enforces.
   */
  const covered = new Set(ORDER_PLAN.flatMap((p) => p.items));
  const backfill = [];
  let seq = 0;

  for (let idx = 0; idx < PRODUCTS.length; idx += 1) {
    if (covered.has(idx)) continue;
    if (PRODUCTS[idx].st === 0) continue; // never "sell" the out-of-stock fixture

    seq += 1;
    backfill.push({
      status: ORDER_STATUS.DELIVERED,
      age: 12 + ((seq * 7) % 76),        // spread across the last ~88 days
      cust: seq % customers.length,
      items: [idx],
    });
  }

  // A few multi-item repeat purchases, so not every order is a single line.
  backfill.push({ status: ORDER_STATUS.DELIVERED, age: 71, cust: 1, items: [0, 3] });
  backfill.push({ status: ORDER_STATUS.DELIVERED, age: 44, cust: 2, items: [9, 26] });
  backfill.push({ status: ORDER_STATUS.DELIVERED, age: 31, cust: 3, items: [16, 20] });
  backfill.push({ status: ORDER_STATUS.DELIVERED, age: 18, cust: 4, items: [11, 24] });

  ORDER_PLAN.push(...backfill);

  const STAGE_ORDER = [
    ORDER_STATUS.PLACED,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.DELIVERED,
  ];

  const createdOrders = [];
  for (const plan of ORDER_PLAN) {
    const customer = customers[plan.cust];
    const placedAt = daysAgo(plan.age);

    const items = plan.items.map((idx) => {
      const prod = products[idx];
      const qty = randInt(1, 2);
      return {
        product: prod._id,
        seller: prod.seller,
        name: prod.name,
        image: prod.images[0],
        price: prod.price,
        quantity: qty,
        subtotal: prod.price * qty,
      };
    });

    const itemsTotal = items.reduce((s, i) => s + i.subtotal, 0);
    const useCoupon = itemsTotal > 2000 && Math.random() > 0.5;
    const discount = useCoupon ? Math.min(350, itemsTotal) : 0;
    const afterDiscount = itemsTotal - discount;
    const deliveryCharge = afterDiscount >= 500 ? 0 : 49;

    // Build the history up to whichever stage this order reached.
    const history = [];
    if (plan.status === ORDER_STATUS.CANCELLED) {
      history.push({ status: ORDER_STATUS.PLACED, at: placedAt, note: 'Your order has been placed successfully.' });
      history.push({ status: ORDER_STATUS.CANCELLED, at: daysAgo(plan.age - 1), note: 'Cancelled by customer.' });
    } else {
      const reachedIndex = STAGE_ORDER.indexOf(plan.status);
      for (let s = 0; s <= reachedIndex; s += 1) {
        history.push({
          status: STAGE_ORDER[s],
          at: daysAgo(Math.max(0, plan.age - s)),
          note: `Order ${STAGE_ORDER[s].toLowerCase()}.`,
        });
      }
    }

    const isPaid =
      plan.status === ORDER_STATUS.DELIVERED ||
      plan.status === ORDER_STATUS.SHIPPED ||
      plan.status === ORDER_STATUS.CONFIRMED;

    const order = await Order.create({
      user: customer._id,
      items,
      shippingAddress: customer.addresses?.[0]
        ? {
            fullName: customer.addresses[0].fullName,
            phone: customer.addresses[0].phone,
            line1: customer.addresses[0].line1,
            line2: customer.addresses[0].line2 || '',
            city: customer.addresses[0].city,
            state: customer.addresses[0].state,
            pincode: customer.addresses[0].pincode,
          }
        : {
            fullName: customer.name,
            phone: customer.phone,
            line1: '221B Demo Street',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
          },
      itemsTotal,
      discount,
      deliveryCharge,
      totalAmount: afterDiscount + deliveryCharge,
      coupon: useCoupon ? { code: 'FLAT350', discountValue: discount } : undefined,
      paymentMode: pick(['UPI', 'Card', 'NetBanking', 'COD']),
      paymentStatus:
        plan.status === ORDER_STATUS.CANCELLED
          ? PAYMENT_STATUS.REFUNDED
          : isPaid
          ? PAYMENT_STATUS.PAID
          : PAYMENT_STATUS.PENDING,
      paidAt: isPaid ? placedAt : undefined,
      status: plan.status,
      statusHistory: history,
      deliveredAt: plan.status === ORDER_STATUS.DELIVERED ? daysAgo(Math.max(0, plan.age - 3)) : undefined,
      cancelledAt: plan.status === ORDER_STATUS.CANCELLED ? daysAgo(plan.age - 1) : undefined,
      cancelReason: plan.status === ORDER_STATUS.CANCELLED ? 'Cancelled by customer.' : '',
      expectedDeliveryAt: daysAgo(plan.age - 5),
      createdAt: placedAt,
      updatedAt: placedAt,
    });

    // Reflect the sale on numSold only. Stock is NOT decremented here: the
    // values in PRODUCTS are the intended current stock levels (a few below the
    // low-stock threshold, one at zero) and these orders are historical.
    if (plan.status !== ORDER_STATUS.CANCELLED) {
      for (const item of items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { numSold: item.quantity },
        });
      }
    }

    createdOrders.push({ order, plan });
  }
  console.log(`  orders: ${createdOrders.length} across all five statuses`);

  /* -- reviews -- */
  // Only from DELIVERED orders, so the seeded data obeys the same rule the API enforces.
  let reviewCount = 0;
  const seen = new Set();

  for (const { order, plan } of createdOrders) {
    if (plan.status !== ORDER_STATUS.DELIVERED) continue;

    for (const item of order.items) {
      const key = `${order.user}-${item.product}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const text = pick(REVIEW_TEXT);
      await Review.create({
        product: item.product,
        user: order.user,
        order: order._id,
        rating: text.r,
        title: text.t,
        comment: text.c,
        isVerifiedPurchase: true,
        helpfulCount: randInt(0, 24),
        createdAt: daysAgo(Math.max(0, plan.age - 5)),
      });
      reviewCount += 1;
    }
  }

  // The post-save hook fires asynchronously, so resync every product explicitly.
  const reviewedIds = await Review.distinct('product');
  for (const id of reviewedIds) {
    await Review.syncProductRating(id);
  }
  console.log(`  reviews: ${reviewCount} (verified purchases only)`);
};

const run = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run the seeder with NODE_ENV=production.');
    process.exit(1);
  }

  await connectDB();
  const destroyOnly = process.argv.includes('--destroy');

  try {
    if (destroyOnly) {
      console.log('Destroying all data...');
      await wipe();
      console.log('Done. All collections are empty.');
    } else {
      console.log('Seeding ShopVerse...');
      await seed();
      console.log('\nSeed complete. Demo logins:');
      console.log(`  Admin     ${process.env.ADMIN_EMAIL || 'admin@shopverse.com'} / ${process.env.ADMIN_PASSWORD || 'Admin@12345'}`);
      console.log('  Seller    seller1@shopverse.com / Seller@12345');
      console.log('  Customer  customer1@gmail.com   / Customer@12345');
    }
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

run();
