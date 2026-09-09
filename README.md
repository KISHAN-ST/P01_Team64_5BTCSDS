# 🌿 ShopVerse — Role-Based E-Commerce Management Platform

> **Shop smarter, live better.** A secure, full-stack e-commerce platform supporting Customers, Sellers and Administrators across the complete product-to-order lifecycle.

![Node](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT%20%2B%20bcrypt-orange)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## Table of contents

- [Overview](#overview)
- [Features by role](#features-by-role)
- [Tech stack](#tech-stack)
- [Screenshots](#screenshots)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Demo accounts](#demo-accounts)
- [API reference](#api-reference)
- [Database design](#database-design)
- [Business rules](#business-rules)
- [Security](#security)
- [Testing](#testing)
- [Author](#author)

---

## Overview

ShopVerse is a **REST API and web frontend** for a multi-vendor marketplace. It covers authentication, role-based authorization, catalog and category management, product discovery, cart, checkout, the order lifecycle, inventory, coupons, payment tracking, reviews, seller analytics and admin reporting.

The emphasis is on **backend architecture, MongoDB data modelling, security and business-rule enforcement** — the API does not merely expose CRUD, it enforces the rules that make an e-commerce system correct: stock is reserved atomically, order statuses follow a transition graph, coupons are re-validated at checkout, and a review requires a delivered order.

---

## Features by role

### 👤 Customer
- Register, log in, manage profile and multiple saved addresses
- Search products by keyword; filter by category, price range, rating, brand and availability — all combinable
- Sort by featured / newest / price / rating / best-selling, with pagination
- Cart with live stock validation and per-item quantity limits
- Apply coupons (percentage or flat, with caps and minimum-order rules)
- Three-step checkout with a mock payment gateway
- Track orders through a live status timeline; cancel while permitted
- Review and rate products **after delivery**, one review per product

### 🏪 Seller
- Dashboard with revenue, orders, units sold and average rating, each with a period-over-period trend
- Daily sales chart with 7 / 30 / 90-day ranges
- Full product CRUD scoped to own catalog
- **Low-stock alert panel** with one-click restocking
- Order queue showing only own line items, with status advancement
- Reviews left on own products

### 🛡️ Administrator
- Platform KPIs with trend deltas
- **Sales report**, **user-growth report**, **top-products report** and **inventory report**
- Orders-by-status and users-by-role breakdowns
- User management with activate/deactivate
- Category tree management
- Coupon creation and management

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| API framework | Express 4.21 |
| Database | MongoDB 8 |
| ODM | Mongoose 8 |
| Authentication | JSON Web Tokens (`jsonwebtoken`) |
| Password hashing | bcrypt (`bcryptjs`) |
| Validation | `express-validator` + Mongoose schema validation |
| Security | `helmet`, `cors`, `express-rate-limit` |
| Frontend | HTML5, CSS3 (design tokens), vanilla JS, Bootstrap 5 |
| Charts | Chart.js 4 |
| Architecture | MVC (Models · Controllers · Routes · Middleware) |
| API testing | Postman |

> **Express version note:** this project pins **Express 4.x**. Async controller errors do not auto-forward on v4, so every async handler is wrapped in [`utils/asyncHandler.js`](backend/utils/asyncHandler.js).

---

## Screenshots

> 27 screenshots captured from the running app against the live Atlas database — full index in [`docs/screenshots/`](docs/screenshots/README.md).

| Home | Product listing | Product detail |
|---|---|---|
| ![Home](docs/screenshots/01-home.png) | ![Listing](docs/screenshots/04-products.png) | ![Detail](docs/screenshots/05-product.png) |

| Cart + coupon | Checkout | Order tracking |
|---|---|---|
| ![Cart](docs/screenshots/06-cart.png) | ![Checkout](docs/screenshots/07-checkout.png) | ![Tracking](docs/screenshots/10-tracking.png) |

### Seller dashboard
Trend deltas on every KPI, a Chart.js sales curve, and the **Low Stock Alert** panel.

![Seller dashboard](docs/screenshots/11-seller.png)

### Admin dashboard
Platform KPIs, sales analytics, **user-growth chart**, top products and an orders-by-status breakdown.

![Admin dashboard](docs/screenshots/12-admin.png)

### Test & security evidence

| Newman: 326/326 passing | Business rules enforced | bcrypt hashes in the database |
|---|---|---|
| ![Newman report](docs/screenshots/18-newman-report.png) | ![Negative tests](docs/screenshots/19-api-negative-tests.png) | ![bcrypt](docs/screenshots/20-db-users-bcrypt.png) |

### Dark mode &amp; responsive

| Dark mode | Mobile (390px) |
|---|---|
| ![Dark mode](docs/screenshots/14-dark-mode.png) | ![Mobile](docs/screenshots/16-mobile-home.png) |

### Design system

The frontend is built on a token sheet ([`frontend/assets/css/tokens.css`](frontend/assets/css/tokens.css)) — no other stylesheet hard-codes a colour. That single file also drives dark mode.

| Token group | Notes |
|---|---|
| Brand ramp | `--brand-900` → `--brand-50`, five steps rather than one flat green |
| Semantic | `--success` `--warning` `--danger` `--info` — order statuses read at a glance |
| Spacing | 4px base: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`, nothing in between |
| Type | Plus Jakarta Sans for headings, Inter for body, `tabular-nums` on every price |
| Elevation | Rest at `--sh-1`, lift to `--sh-2` on hover |

---

## Project structure

```
lntproject/
├── backend/
│   ├── config/
│   │   ├── constants.js      # roles, statuses, transition graph, tunable rules
│   │   └── db.js             # MongoDB connection
│   ├── controllers/          # business logic (10 controllers)
│   ├── models/               # 7 Mongoose schemas
│   ├── routes/               # 10 Express routers + validation chains
│   ├── middleware/
│   │   ├── auth.js           # JWT verification -> 401
│   │   ├── roles.js          # role + ownership gates -> 403
│   │   ├── validate.js       # express-validator collector, ObjectId guard
│   │   └── errorHandler.js   # centralised error translation
│   ├── utils/
│   │   ├── ApiError.js       # errors that carry an HTTP status
│   │   ├── asyncHandler.js   # async error forwarding for Express 4
│   │   ├── apiResponse.js    # one response envelope for the whole API
│   │   ├── generateToken.js  # JWT signing/verification
│   │   ├── pagination.js     # page/limit normalisation + meta
│   │   └── seed.js           # database seeder
│   ├── .env.example
│   └── server.js
├── frontend/
│   ├── assets/css/
│   │   ├── tokens.css        # the single source of colour/space/type
│   │   └── main.css          # components, built only from tokens
│   ├── assets/js/
│   │   ├── api.js            # fetch client + typed endpoint map
│   │   └── ui.js             # toasts, formatting, guards, shared layout
│   ├── pages/                # 12 pages
│   └── index.html
├── docs/
├── postman/
├── manual.md                 # step-by-step setup & submission manual
└── README.md
```

---

## Getting started

### Prerequisites
- **Node.js 22 LTS** — https://nodejs.org
- **MongoDB** — a free [Atlas](https://www.mongodb.com/cloud/atlas/register) cluster, or a local Community Server
- **Git**

### 1. Clone and install

```bash
git clone https://github.com/<your-username>/shopverse-ecommerce-platform.git
cd shopverse-ecommerce-platform/backend
npm install
```

### 2. Configure the environment

```bash
cp .env.example .env       # Windows PowerShell: Copy-Item .env.example .env
```

Fill in `MONGO_URI`, then generate two different secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the first into `JWT_SECRET` and a second run's output into `JWT_REFRESH_SECRET`.

### 3. Seed the database

```bash
npm run seed
```

This creates 9 users, 31 categories, 33 products, 5 coupons, 31 orders across every status, and 30 verified reviews.

### 4. Run

```bash
npm run dev          # http://localhost:5000
```

Then open `frontend/index.html` with the VS Code **Live Server** extension (serves at `http://127.0.0.1:5500`).

> ⚠️ `CLIENT_URL` in `.env` must match the frontend origin **exactly**. To a browser, `127.0.0.1` and `localhost` are different origins.

Verify with `GET http://localhost:5000/api/health`.

---

## Environment variables

| Variable | Purpose | Example |
|---|---|---|
| `NODE_ENV` | Runtime mode; the seeder refuses to run in `production` | `development` |
| `PORT` | API port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://…/shopverse` |
| `JWT_SECRET` | Access-token signing key (96 hex chars) | *(generate)* |
| `JWT_EXPIRES_IN` | Access-token lifetime | `7d` |
| `JWT_REFRESH_SECRET` | Refresh-token key — **must differ** from `JWT_SECRET` | *(generate)* |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token lifetime | `30d` |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost factor | `10` |
| `CLIENT_URL` | Allowed CORS origin | `http://127.0.0.1:5500` |
| `LOW_STOCK_THRESHOLD` | Drives the low-stock alerts | `10` |
| `FREE_DELIVERY_ABOVE` | Order value that removes the delivery charge | `500` |
| `DELIVERY_CHARGE` | Flat delivery fee below that threshold | `49` |
| `MAX_CART_QTY_PER_ITEM` | Per-product cart cap | `10` |
| `PAYMENT_SUCCESS_RATE` | Mock gateway success percentage | `100` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeded admin credentials | `admin@shopverse.com` |

---

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@shopverse.com` | `Admin@12345` |
| Seller | `seller1@shopverse.com` | `Seller@12345` |
| Seller | `seller2@shopverse.com` | `Seller@12345` |
| Customer | `customer1@gmail.com` | `Customer@12345` |
| Customer | `customer2@gmail.com` | `Customer@12345` |

The login page has one-click buttons that fill these in.

### Demo coupons

| Code | Effect | Purpose |
|---|---|---|
| `WELCOME10` | 10% off above ₹500 (max ₹500) | Happy path |
| `FLAT350` | ₹350 off above ₹2,000 | Flat-value path |
| `MEGA50` | 50% off above ₹5,000, capped at ₹1,000 | Max-discount cap |
| `EXPIRED20` | — | **Fails on purpose**: expiry validation |
| `BIGONLY` | ₹500 off above ₹10,000 | **Fails on purpose**: minimum-order validation |

---

## API reference

Base URL: `http://localhost:5000/api` · Auth header: `Authorization: Bearer <token>`

Every response uses the same envelope:

```jsonc
// success
{ "success": true, "message": "…", "data": {...}, "meta": {...} }
// failure
{ "success": false, "message": "…", "errors": [{ "field": "…", "message": "…" }] }
```

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register as customer or seller |
| POST | `/auth/login` | Public | Log in, receive JWT |
| POST | `/auth/logout` | Public | Clear the auth cookie |
| GET | `/auth/me` | Any | Own profile |
| PUT | `/auth/me` | Any | Update own profile |
| PUT | `/auth/password` | Any | Change own password |
| GET | `/auth/addresses` | Any | List saved addresses |
| POST | `/auth/addresses` | Any | Add an address |
| DELETE | `/auth/addresses/:addressId` | Any | Remove an address |

### Categories
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/categories` | Public | Flat list (`?parent=null` for top level) |
| GET | `/categories/tree` | Public | Parents with nested children |
| GET | `/categories/:id` | Public | One category + product count |
| POST | `/categories` | Admin | Create |
| PUT | `/categories/:id` | Admin | Update |
| DELETE | `/categories/:id` | Admin | Delete (refused if in use) |

### Products
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/products` | Public | Search + filter + sort + paginate |
| GET | `/products/:id` | Public | Detail, related items, `canReview` flag |
| GET | `/products/meta/brands` | Public | Distinct brands |
| GET | `/products/meta/low-stock` | Seller / Admin | Low-stock feed |
| POST | `/products` | Seller / Admin | Create |
| PUT | `/products/:id` | Owner / Admin | Update |
| PATCH | `/products/:id/stock` | Owner / Admin | Set stock |
| DELETE | `/products/:id` | Owner / Admin | Delete, or delist if it has orders |

**Query parameters on `GET /products`:** `search`, `category`, `brand`, `minPrice`, `maxPrice`, `minRating`, `inStock`, `seller`, `sort` (`featured` · `newest` · `price-asc` · `price-desc` · `rating` · `popular`), `page`, `limit`.

### Cart · Coupons · Orders · Payments
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/cart` | Customer | Cart with totals |
| POST | `/cart` | Customer | Add item (validates stock) |
| PUT | `/cart/:itemId` | Customer | Set quantity |
| DELETE | `/cart/:itemId` | Customer | Remove item |
| DELETE | `/cart` | Customer | Clear cart |
| GET | `/coupons` | Any | Live coupons (admin sees all) |
| POST | `/coupons/apply` | Customer | Apply to cart |
| DELETE | `/coupons/apply` | Customer | Remove from cart |
| POST | `/coupons` | Admin | Create |
| PUT / DELETE | `/coupons/:id` | Admin | Update / delete |
| POST | `/orders` | Customer | Checkout |
| GET | `/orders` | Customer | Own orders |
| GET | `/orders/:id` | Owner / Seller-on-order / Admin | One order |
| GET | `/orders/:id/track` | Owner / Seller-on-order / Admin | Status timeline |
| PUT | `/orders/:id/status` | Seller / Admin | Advance status |
| PUT | `/orders/:id/cancel` | Customer | Cancel (restores stock) |
| POST | `/payments/initiate` | Customer | Start mock payment |
| POST | `/payments/verify` | Customer | Complete mock payment |
| GET | `/payments/:orderId/status` | Owner / Admin | Payment state |

### Reviews · Seller · Admin
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/products/:productId/reviews` | Public | Reviews + rating histogram |
| POST | `/products/:productId/reviews` | Customer | Create (delivery required) |
| PUT / DELETE | `/reviews/:id` | Author (delete: or Admin) | Edit / delete |
| POST | `/reviews/:id/helpful` | Any | Mark helpful |
| GET | `/reviews/mine` | Any | Own reviews |
| GET | `/seller/dashboard` | Seller | KPIs with trends |
| GET | `/seller/analytics/sales` | Seller | Daily revenue series |
| GET | `/seller/products` | Seller | Own catalog |
| GET | `/seller/products/performance` | Seller | Best sellers |
| GET | `/seller/orders` | Seller | Own line items only |
| GET | `/seller/reviews` | Seller | Reviews on own products |
| GET | `/admin/dashboard` | Admin | Platform KPIs |
| GET | `/admin/reports/sales` | Admin | Revenue over time |
| GET | `/admin/reports/top-products` | Admin | Best sellers platform-wide |
| GET | `/admin/reports/user-growth` | Admin | Signups + cumulative users |
| GET | `/admin/reports/inventory` | Admin | Stock health |
| GET | `/admin/users` | Admin | User list |
| PATCH | `/admin/users/:id/status` | Admin | Activate / deactivate |
| GET | `/admin/orders` | Admin | All orders |

---

## Database design

Seven collections: `users`, `categories`, `products`, `carts`, `orders`, `coupons`, `reviews`.

**📐 [Full ER diagram, indexes and design rationale → `docs/ER-Diagram.md`](docs/ER-Diagram.md)** — renders on GitHub, and exports to PNG for your report.

```mermaid
erDiagram
    USERS ||--o{ PRODUCTS : "sells"
    USERS ||--|| CARTS : "owns"
    USERS ||--o{ ORDERS : "places"
    USERS ||--o{ REVIEWS : "writes"
    CATEGORIES ||--o{ CATEGORIES : "parent of"
    CATEGORIES ||--o{ PRODUCTS : "classifies"
    PRODUCTS ||--o{ REVIEWS : "receives"
    CARTS ||--o{ CART_ITEMS : "EMBEDS"
    ORDERS ||--o{ ORDER_ITEMS : "EMBEDS (price snapshot)"
    USERS ||--o{ ADDRESSES : "EMBEDS"
    COUPONS ||--o{ ORDERS : "discounts"
    PRODUCTS ||--o{ ORDER_ITEMS : "snapshotted into"
    PRODUCTS ||--o{ CART_ITEMS : "referenced by"
```

### Embed vs. reference — and why

| Relationship | Strategy | Reasoning |
|---|---|---|
| `user.addresses` | **Embedded** | Always read with the user, small, never queried alone |
| `cart.items` | **Embedded** | A cart is only ever read whole and belongs to one user |
| `order.items` | **Embedded snapshot** | An order is a historical record. Name, image and price are **copied at checkout**, so a later price change or a deleted product can never rewrite a past order |
| `product.category` | Reference | Categories are shared and updated independently |
| `product.seller` | Reference | Users are shared entities with their own lifecycle |
| `review.product` / `review.user` | Reference | Reviews are queried independently of both |
| `category.parent` | Self-reference | Models the hierarchy without fixing its depth |

### Indexes

| Collection | Index | Purpose |
|---|---|---|
| `users` | `email` (unique) | Login lookup, duplicate prevention |
| `users` | `role`, `createdAt` | Admin filtering and growth reports |
| `categories` | `slug` (unique), `parent` | Tree building |
| `products` | `name/description/brand` (**text**) | Keyword search |
| `products` | `category`, `seller`, `price`, `ratingAverage`, `createdAt` | Listing filters and sorts |
| `carts` | `user` (unique) | One cart per user, enforced by the database |
| `orders` | `user + createdAt`, `status`, `items.seller` | Order history and seller queues |
| `reviews` | `user + product` (**unique compound**) | One review per user per product |

### Denormalised aggregates

`products.ratingAverage`, `products.ratingCount` and `products.numSold` are maintained on write (see `Review.syncProductRating`) so the listing page needs no join.

---

## Business rules

The API is not a thin CRUD layer. These rules are enforced server-side:

1. **Role separation.** Customers cannot create products; sellers cannot read admin reports; admins are never self-registerable.
2. **Ownership.** A seller may only modify their own products, and sees only their own line items on shared orders.
3. **Stock validation.** Cart quantity is checked against live stock on every add and update, plus a per-product cap.
4. **Atomic stock reservation.** Checkout uses `findOneAndUpdate({ stock: { $gte: qty } }, { $inc: { stock: -qty } })`. If two checkouts race for the last unit, exactly one succeeds — stock can never go negative. A partial failure rolls back every unit already reserved.
5. **Order transition graph.** `Placed → Confirmed → Shipped → Delivered`, with `Cancelled` reachable from `Placed`/`Confirmed`. Anything else is a **400**, not a silent write.
6. **Stock restoration.** Cancelling an order returns every unit to inventory and refunds a paid order.
7. **Coupon validation.** Expiry, start date, minimum order value, usage limit, per-user limit and maximum discount are all checked — and **re-checked at checkout**, because the cart may have changed since the coupon was applied.
8. **Price snapshotting.** Order items store their own price, so totals never drift.
9. **Review gating.** A review requires a **Delivered** order from that user containing that product, and the unique compound index enforces one review per product per user.
10. **Referential safety.** A category cannot be deleted while products or sub-categories reference it; a product with order history is delisted rather than deleted.

---

## Security

| Control | Implementation |
|---|---|
| Password storage | bcrypt with a configurable cost factor; the `isModified` guard prevents double-hashing on profile updates |
| Password exposure | `select: false` on the field — it never leaves the database unless explicitly requested |
| Authentication | JWT bearer tokens; the user is re-read from the database on every request so a deactivated account loses access immediately |
| Authorization | Route-level role gates plus per-resource ownership checks |
| Account enumeration | Login returns one generic message for both a wrong email and a wrong password |
| Input validation | `express-validator` chains on every write route, backed by Mongoose schema validation |
| Invalid IDs | Guarded before they reach Mongoose, so `/api/products/abc` is a **400**, not a 500 |
| Rate limiting | 30 requests / 15 min on credential endpoints, 1000 / 15 min platform-wide |
| Headers | `helmet` |
| CORS | Explicit origin allowlist |
| Error handling | Centralised; stack traces are never sent to clients, and 5xx details stay in the server log |
| Secrets | Environment variables only; `.env` is git-ignored and `.env.example` carries no values |

Unauthenticated requests to protected routes return **401**; authenticated requests without sufficient permission return **403**.

---

## Testing

Import `postman/ShopVerse.postman_collection.json` and `postman/ShopVerse.postman_environment.json` into Postman, select the **ShopVerse Local** environment, and run the collection.

The **`99 Negative Tests`** folder is the important one — it proves the rules above are actually enforced:

| # | Test | Expected |
|---|---|---|
| 1–2 | Missing / malformed token | 401 |
| 3–5 | Wrong role, cross-seller edit | 403 |
| 6 | Duplicate email | 409 |
| 7 | Weak password | 400 |
| 8–9 | Quantity above stock, out-of-stock item | 400 |
| 10–11 | Expired coupon, minimum order not met | 400 |
| 12 | Checkout with an empty cart | 400 |
| 13–14 | Invalid status transition, cancel a delivered order | 400 |
| 15–16 | Review without purchase, duplicate review | 403 / 409 |
| 17–18 | Invalid ObjectId, nonexistent id | 400 / 404 |

**No endpoint in this table returns 500.** The full suite of 79 assertions — happy path plus all 18 negative cases — passes against a seeded database.

---

## Author

**Kishan** · [stkishan45@gmail.com](mailto:stkishan45@gmail.com)

Built as an academic full-stack project. See [`manual.md`](manual.md) for the complete setup, testing and submission manual.

Licensed under the MIT License.
