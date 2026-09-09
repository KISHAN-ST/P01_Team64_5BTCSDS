# ShopVerse — API Documentation

**Base URL:** `http://localhost:5000/api`
**Auth header:** `Authorization: Bearer <token>`
**Content type:** `application/json`

---

## Response envelope

Every endpoint returns the same shape.

**Success**
```json
{
  "success": true,
  "message": "Products fetched.",
  "data": [ ... ],
  "meta": { "page": 1, "limit": 12, "total": 33, "totalPages": 3, "hasNextPage": true, "hasPrevPage": false }
}
```

**Failure**
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [ { "field": "password", "message": "Password must be at least 6 characters" } ]
}
```

`meta` appears only on list endpoints. `errors` appears only when field-level detail exists.

## Status codes

| Code | Meaning in this API |
|---|---|
| `200` | Request succeeded |
| `201` | Resource created |
| `400` | Validation failure or a broken business rule (bad transition, expired coupon, insufficient stock) |
| `401` | No token, or an invalid/expired one |
| `403` | Authenticated, but the role or ownership check failed |
| `404` | Resource does not exist |
| `409` | Conflict — duplicate email, duplicate review |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error — **no documented flow returns this** |

## Roles

| Role | How it is obtained |
|---|---|
| `customer` | Self-registration (default) |
| `seller` | Self-registration with `"role": "seller"` |
| `admin` | Seed script only — never self-assignable |

---

# 1. Authentication

### `POST /auth/register`
Public. Creates a customer or seller. Customers also get an empty cart.

**Body**
```json
{
  "name": "Priya Sharma",
  "email": "priya@example.com",
  "password": "Secure123",
  "phone": "9876543210",
  "role": "customer",
  "shopName": "Only used when role is seller"
}
```

**Rules**
- `name` 2–60 characters
- `email` valid and not already registered → otherwise **409**
- `password` at least 6 characters **and** must contain a digit
- `role` may only be `customer` or `seller`; anything else silently becomes `customer`

**201**
```json
{
  "success": true,
  "message": "Registration successful.",
  "data": {
    "user": { "_id": "…", "name": "Priya Sharma", "email": "priya@example.com", "role": "customer", "isActive": true },
    "token": "eyJhbGciOi…",
    "refreshToken": "eyJhbGciOi…"
  }
}
```

The `password` field is never present in any response.

---

### `POST /auth/login`
Public. Rate limited.

**Body** — `{ "email": "…", "password": "…" }`

**200** — same `data` shape as register.

**401** — `"Invalid email or password."` The message is identical for a wrong email and a wrong password, so the endpoint cannot be used to discover which accounts exist.

**403** — the account has been deactivated by an admin.

---

### Other auth endpoints

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| `POST` | `/auth/logout` | — | Clears the optional cookie; the client discards its token |
| `GET` | `/auth/me` | Any | Own profile |
| `PUT` | `/auth/me` | Any | `name`, `phone`, `avatar`; sellers may also send `shopName`, `shopDescription` |
| `PUT` | `/auth/password` | Any | `{ currentPassword, newPassword }` — **400** if the current password is wrong |
| `GET` | `/auth/addresses` | Any | List |
| `POST` | `/auth/addresses` | Any | The first address saved automatically becomes the default |
| `DELETE` | `/auth/addresses/:addressId` | Any | Deleting the default promotes another address |

**Address body**
```json
{
  "label": "Home",
  "fullName": "Priya Sharma",
  "phone": "9876500021",
  "line1": "123, MG Road",
  "line2": "Near Metro Station",
  "city": "Bengaluru",
  "state": "Karnataka",
  "pincode": "560001",
  "isDefault": true
}
```
`pincode` must be exactly 6 digits.

---

# 2. Categories

| Method | Endpoint | Auth |
|---|---|---|
| `GET` | `/categories` | Public |
| `GET` | `/categories/tree` | Public |
| `GET` | `/categories/:id` | Public |
| `POST` | `/categories` | **Admin** |
| `PUT` | `/categories/:id` | **Admin** |
| `DELETE` | `/categories/:id` | **Admin** |

`GET /categories` accepts `?parent=null` for top-level only, or `?parent=<id>` for one parent's children.

`GET /categories/tree` returns parents with a nested `children` array — this is what the storefront navigation consumes.

`GET /categories/:id` additionally returns `children` and `productCount`.

**`POST /categories` body** — `{ "name": "Gaming", "parent": null, "icon": "bi-controller", "description": "…" }`

**Deletion rules** — refused with **400** while any sub-category or product still references the category. This is what keeps the catalog free of orphaned references.

---

# 3. Products

### `GET /products`
Public. Search, filter, sort and paginate in one call.

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Full-text over name, description and brand |
| `category` | ObjectId | Includes the category's sub-categories automatically |
| `brand` | string | Case-insensitive match |
| `minPrice`, `maxPrice` | number | Inclusive bounds |
| `minRating` | 1–5 | Average rating at or above |
| `inStock` | `true` | Only products with stock above zero |
| `seller` | ObjectId | One seller's catalog |
| `sort` | enum | `featured` (default) · `newest` · `price-asc` · `price-desc` · `rating` · `popular` |
| `page`, `limit` | number | `limit` defaults to 12, capped at 100 |

All parameters combine. Response `data` is an array of products; `meta` carries the pagination block.

Each product includes the virtuals `discountPercent`, `inStock` and `isLowStock`.

---

### `GET /products/:id`
Public, but reads the token when present.

Returns the product plus:
- `related` — up to 4 products from the same category
- `canReview` — `true` only when the caller has a **Delivered** order containing this product. The UI uses this to disable the review button rather than letting the user hit a 403.

**400** for a malformed id, **404** for a well-formed id that matches nothing.

---

### Product writes

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| `GET` | `/products/meta/brands` | Public | Distinct brand list for filters |
| `GET` | `/products/meta/low-stock` | Seller / Admin | At or below `LOW_STOCK_THRESHOLD`; a seller sees only their own |
| `POST` | `/products` | Seller / Admin | The seller is taken from the token, never from the body |
| `PUT` | `/products/:id` | Owner / Admin | **403** for another seller's product |
| `PATCH` | `/products/:id/stock` | Owner / Admin | `{ "stock": 60 }` |
| `DELETE` | `/products/:id` | Owner / Admin | Delists instead of deleting when the product appears on past orders |

**Create body**
```json
{
  "name": "Wireless Headphones",
  "description": "At least 20 characters of real description.",
  "brand": "SoundCore",
  "price": 2999,
  "mrp": 4999,
  "category": "<categoryId>",
  "stock": 45,
  "images": ["https://…/image.jpg"],
  "specifications": [{ "key": "Warranty", "value": "1 Year" }]
}
```

**Rules** — `name` 3–140 chars · `description` ≥ 20 chars · `price` > 0 · `stock` ≥ 0 · at least one image · `category` must exist. `mrp` below `price` is raised to `price` automatically.

---

# 4. Cart

All cart routes are **customer-only** — a seller or admin receives **403**.

| Method | Endpoint | Body |
|---|---|---|
| `GET` | `/cart` | — |
| `POST` | `/cart` | `{ "productId": "…", "quantity": 2 }` |
| `PUT` | `/cart/:itemId` | `{ "quantity": 3 }` (absolute, not a delta) |
| `DELETE` | `/cart/:itemId` | — |
| `DELETE` | `/cart` | — |

**Response**
```json
{
  "data": {
    "items": [{
      "_id": "…", "quantity": 2, "subtotal": 5998,
      "priceChanged": false, "exceedsStock": false,
      "product": { "_id": "…", "name": "…", "price": 2999, "stock": 45, "image": "…", "seller": { … } }
    }],
    "coupon": { "code": "WELCOME10", "discount": 500 },
    "summary": {
      "itemCount": 2, "itemsTotal": 5998, "discount": 500,
      "deliveryCharge": 0, "total": 5498, "freeDeliveryAbove": 500
    }
  }
}
```

**Rules**
- Adding an existing product **increases** its quantity; the combined total is validated against live stock
- Requesting more than available → **400** `"Only N unit(s) of 'X' are available."`
- A product with zero stock → **400**
- Above `MAX_CART_QTY_PER_ITEM` → **400**
- Lines whose product was deleted or delisted are dropped from the cart automatically
- `priceChanged` flags a price that moved since the item was added; `exceedsStock` flags a line that stock has fallen below

---

# 5. Coupons

| Method | Endpoint | Auth |
|---|---|---|
| `GET` | `/coupons` | Any — customers see live coupons, admins see all |
| `POST` | `/coupons/apply` | Customer |
| `DELETE` | `/coupons/apply` | Customer |
| `POST` | `/coupons` | **Admin** |
| `PUT` | `/coupons/:id` | **Admin** |
| `DELETE` | `/coupons/:id` | **Admin** |

**`POST /coupons/apply`** — `{ "code": "WELCOME10" }`

Validation runs in this order, and the response message names the exact reason:

| Condition | Message |
|---|---|
| Code does not exist | **404** `"Coupon 'X' does not exist."` |
| Coupon disabled | `"This coupon is no longer active."` |
| Not started yet | `"This coupon is not active yet."` |
| Past `expiresAt` | `"Coupon has expired."` |
| Below `minOrderValue` | `"Minimum order value of Rs.N required to use this coupon."` |
| `usedCount` ≥ `usageLimit` | `"This coupon has reached its usage limit."` |
| Per-user limit reached | `"You have already used this coupon."` |
| Empty cart | `"Your cart is empty."` |

All rejections are **400** except a missing code (**404**).

**Discount calculation**
- `percentage` → `cartTotal × value / 100`, then capped at `maxDiscount` when that is set
- `flat` → `value`
- Always capped at the cart total, so a discount can never exceed what is being bought

**Create body**
```json
{
  "code": "WELCOME10",
  "type": "percentage",
  "value": 10,
  "maxDiscount": 500,
  "minOrderValue": 500,
  "expiresAt": "2027-12-31T23:59:59.000Z",
  "usageLimit": 0,
  "perUserLimit": 1,
  "description": "10% off orders above Rs.500"
}
```
`code` is alphanumeric, 3–20 characters, stored uppercase. A percentage above 100 is rejected. `usageLimit: 0` means unlimited.

---

# 6. Orders

### `POST /orders` — checkout
Customer only. Converts the cart into an order.

**Body**
```json
{
  "shippingAddress": {
    "fullName": "Priya Sharma", "phone": "9876500021",
    "line1": "123, MG Road", "line2": "Near Metro Station",
    "city": "Bengaluru", "state": "Karnataka", "pincode": "560001"
  },
  "paymentMode": "UPI",
  "couponCode": "WELCOME10"
}
```

`paymentMode` ∈ `UPI` · `Card` · `NetBanking` · `COD`. `couponCode` is optional — the coupon already on the cart is used when omitted.

**What the server does, in order**
1. Rebuilds the cart from live product data
2. Rejects an empty cart, or any line whose quantity now exceeds stock → **400**
3. **Re-validates the coupon** against the current total (the cart may have changed since it was applied) → **400** with the specific reason
4. Recomputes every total server-side — client-supplied amounts are ignored entirely
5. Snapshots each line's `name`, `image` and `price` into the order
6. Reserves stock atomically per item; a partial failure rolls back everything already reserved
7. Creates the order, increments the coupon usage, clears the cart

**201** returns the full order, including `orderNumber` (e.g. `SV2609084F2A1C`), `status: "Placed"` and `expectedDeliveryAt`.

---

### Order reads and transitions

| Method | Endpoint | Auth |
|---|---|---|
| `GET` | `/orders` | Customer — own orders, `?status=` filter |
| `GET` | `/orders/:id` | Owner · seller with a line on it · admin |
| `GET` | `/orders/:id/track` | Same as above |
| `PUT` | `/orders/:id/status` | Seller (own lines) / Admin |
| `PUT` | `/orders/:id/cancel` | Customer (owner) |

**`PUT /orders/:id/status`** — `{ "status": "Confirmed", "note": "optional" }`

The transition graph is the only authority:

```
Placed ──▶ Confirmed ──▶ Shipped ──▶ Delivered
   │            │
   └────────────┴──▶ Cancelled
```

| From | Allowed next |
|---|---|
| `Placed` | `Confirmed`, `Cancelled` |
| `Confirmed` | `Shipped`, `Cancelled` |
| `Shipped` | `Delivered` |
| `Delivered` | *(terminal)* |
| `Cancelled` | *(terminal)* |

Anything else → **400** `"Invalid status transition: 'X' -> 'Y'. Allowed: …"`, or `"Order is already 'X' and cannot change further."` for a terminal state.

Side effects:
- `Cancelled` → stock returned to every product; a `Paid` order becomes `Refunded`
- `Delivered` → sets `deliveredAt`; a `COD` order becomes `Paid`
- A seller attempting to touch an order with none of their products → **403**

**`PUT /orders/:id/cancel`** — `{ "reason": "…" }`. Allowed only from `Placed` or `Confirmed`; otherwise **400**. Restores stock.

**`GET /orders/:id/track`** returns a four-stage timeline:
```json
{
  "data": {
    "orderNumber": "SV2609084F2A1C",
    "status": "Shipped",
    "isCancelled": false,
    "expectedDeliveryAt": "2026-09-13T…",
    "timeline": [
      { "status": "Placed",    "done": true,  "at": "…", "note": "…" },
      { "status": "Confirmed", "done": true,  "at": "…", "note": "…" },
      { "status": "Shipped",   "done": true,  "at": "…", "note": "…" },
      { "status": "Delivered", "done": false, "at": null, "note": "" }
    ]
  }
}
```

---

# 7. Payments (mock gateway)

Real gateway integration is out of scope, so this models the same two-step flow a real one uses. Swapping in Razorpay or Stripe means replacing the body of two functions and nothing else.

| Method | Endpoint | Body |
|---|---|---|
| `POST` | `/payments/initiate` | `{ "orderId": "…" }` |
| `POST` | `/payments/verify` | `{ "orderId": "…", "reference": "…" }` |
| `GET` | `/payments/:orderId/status` | — |

**`initiate`** returns `{ orderId, orderNumber, amount, paymentMode, reference, gateway: "mock" }`.

**400** when the order is already paid, cancelled, or is a COD order (COD is settled at delivery).

**`verify`** succeeds according to `PAYMENT_SUCCESS_RATE` (default 100, so demos never fail by accident). Success sets `paymentStatus: "Paid"` and `paidAt`, and appends a payment note to the status history. Failure sets `Failed` and returns **400**.

Paying for someone else's order → **403**.

---

# 8. Reviews

| Method | Endpoint | Auth |
|---|---|---|
| `GET` | `/products/:productId/reviews` | Public |
| `POST` | `/products/:productId/reviews` | **Customer** |
| `GET` | `/reviews/mine` | Any |
| `PUT` | `/reviews/:id` | Author |
| `DELETE` | `/reviews/:id` | Author or Admin |
| `POST` | `/reviews/:id/helpful` | Any |

**`GET`** supports `?rating=5`, `?withPhotos=true`, `?sort=newest|helpful|highest|lowest`, `?page`, `?limit`. `meta` carries the rating histogram:
```json
"meta": {
  "breakdown": [
    { "stars": 5, "count": 8, "percent": 62 },
    { "stars": 4, "count": 3, "percent": 23 }
  ],
  "totalReviews": 13
}
```

**`POST` body** — `{ "rating": 5, "title": "optional", "comment": "at least 5 characters", "images": [] }`

**Rules**
- Requires a **Delivered** order from this user containing this product → otherwise **403** `"You can only review a product after your order for it has been delivered."`
- One review per user per product → **409**. A unique compound index enforces this at the database level; the explicit check exists only to return a clean message instead of a raw duplicate-key error.
- `rating` 1–5, `comment` 5–1000 characters
- Every accepted review re-syncs `product.ratingAverage` and `product.ratingCount`

---

# 9. Seller endpoints

All require the `seller` role (admins are allowed through for support).

| Method | Endpoint | Returns |
|---|---|---|
| `GET` | `/seller/dashboard?days=30` | Revenue, orders, units, product count, low-stock and out-of-stock counts, average rating, pending orders — each headline figure with a `…Trend` percentage against the previous period |
| `GET` | `/seller/analytics/sales?days=30` | Daily `{ date, revenue, units }`, zero-filled so the chart has no gaps |
| `GET` | `/seller/products` | Own catalog; `?search=`, `?stock=low\|out`, paginated |
| `GET` | `/seller/products/performance` | Top 10 own products by revenue |
| `GET` | `/seller/orders` | Orders containing own products, **with other sellers' lines stripped out**, plus `myItemsTotal` |
| `GET` | `/seller/reviews` | Reviews left on own products |

Revenue counts only this seller's line items, never the whole order total — an order can span several sellers.

---

# 10. Admin endpoints

All require the `admin` role.

| Method | Endpoint | Returns |
|---|---|---|
| `GET` | `/admin/dashboard?days=30` | Platform KPIs with trends, plus `ordersByStatus` |
| `GET` | `/admin/stats/overview` | Raw counts for the small widgets |
| `GET` | `/admin/reports/sales?days=90&groupBy=day\|month` | `{ period, revenue, orders, discountGiven }` plus totals and average order value |
| `GET` | `/admin/reports/top-products?limit=10` | Units sold, revenue, current stock and rating |
| `GET` | `/admin/reports/user-growth?days=90` | Daily new signups by role plus a cumulative total; `meta.byRole` gives the split |
| `GET` | `/admin/reports/inventory` | Total products, stock units, inventory value, low-stock and out-of-stock counts, plus the 20 most critical items |
| `GET` | `/admin/users` | `?role=`, `?isActive=`, `?search=`, paginated |
| `PATCH` | `/admin/users/:id/status` | `{ "isActive": false }` — **400** if an admin targets their own account |
| `GET` | `/admin/orders` | Every order; `?status=`, `?paymentStatus=`, `?orderNumber=` |

Cancelled orders are excluded from every revenue figure.

---

# Rate limiting

| Scope | Limit |
|---|---|
| `/api/auth/login`, `/api/auth/register` | `AUTH_RATE_LIMIT` per 15 min per IP (200 in development, 20 in production) |
| All `/api/*` | 1000 requests per 15 min per IP |

Exceeding either returns **429**.

---

# Testing

Import `postman/ShopVerse.postman_collection.json` and `postman/ShopVerse.postman_environment.json`, select the **ShopVerse Local** environment, and run the collection.

Run the **00 Setup** folder first — it logs in every role and discovers the product ids the rest of the collection needs, so the whole thing runs start to finish with no manual variable entry.

The **99 Negative Tests** folder asserts the failure modes documented above. Two collection-level assertions run after *every* request: the response must be JSON, and the status must be below 500.

Current status: **104 requests, 326 assertions, 0 failures.**
