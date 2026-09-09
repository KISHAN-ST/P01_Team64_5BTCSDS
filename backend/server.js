require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const couponRoutes = require('./routes/couponRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Fail fast on missing configuration rather than at the first request.
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy backend/.env.example to backend/.env and fill it in.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

/* ------------------------------ core middleware ------------------------------ */

// crossOriginResourcePolicy is relaxed so a separately-served frontend can load assets.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

/**
 * Allow the configured client origin plus the usual local dev origins.
 * Note that 127.0.0.1 and localhost are different origins to the browser, so
 * both are listed explicitly.
 */
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Requests with no Origin header (Postman, curl, server-to-server) are allowed.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin '${origin}' is not allowed.`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Blanket rate limit; the auth routes add a stricter one of their own.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please slow down.' },
  })
);

/* --------------------------------- routes --------------------------------- */

app.get('/api/health', (req, res) =>
  res.json({
    success: true,
    status: 'ok',
    service: 'ShopVerse API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) =>
  res.json({
    success: true,
    message: 'ShopVerse API is running. See /api/health for status.',
    docs: '/api/health',
  })
);

/* ----------------------------- error handling ----------------------------- */

app.use(notFound);
app.use(errorHandler);

/* --------------------------------- start ---------------------------------- */

const start = async () => {
  await connectDB();
  const server = app.listen(PORT, () =>
    console.log(
      `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
    )
  );

  // Never leave the process in a half-dead state after an unhandled rejection.
  process.on('unhandledRejection', (err) => {
    console.error(`Unhandled rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });
};

if (require.main === module) start();

module.exports = app;
