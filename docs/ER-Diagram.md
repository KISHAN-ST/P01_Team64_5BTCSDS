# ShopVerse — Database Design (ER Diagram)

MongoDB, 7 collections. The diagram below renders directly on GitHub and in VS Code's Markdown preview.

> **For your report:** open this file in VS Code (`Ctrl+Shift+V`), or paste the Mermaid block into <https://mermaid.live>, and export a **PNG at 2× scale** to `docs/ER-Diagram.png`.

---

## Entity relationship diagram

```mermaid
erDiagram
    USERS ||--o{ PRODUCTS : "sells"
    USERS ||--|| CARTS : "owns"
    USERS ||--o{ ORDERS : "places"
    USERS ||--o{ REVIEWS : "writes"
    USERS ||--o{ COUPONS : "creates (admin)"

    CATEGORIES ||--o{ CATEGORIES : "parent of"
    CATEGORIES ||--o{ PRODUCTS : "classifies"

    PRODUCTS ||--o{ REVIEWS : "receives"
    PRODUCTS ||--o{ CART_ITEMS : "referenced by"
    PRODUCTS ||--o{ ORDER_ITEMS : "snapshotted into"

    CARTS ||--o{ CART_ITEMS : "EMBEDS"
    ORDERS ||--o{ ORDER_ITEMS : "EMBEDS"
    USERS ||--o{ ADDRESSES : "EMBEDS"

    COUPONS ||--o{ ORDERS : "discounts"
    ORDERS ||--o{ REVIEWS : "entitles"

    USERS {
        ObjectId _id PK
        string name "required, 2-60"
        string email UK "required, unique, lowercase"
        string password "required, bcrypt, select false"
        string role "customer | seller | admin"
        string phone
        string avatar
        array addresses "EMBEDDED subdocuments"
        object sellerProfile "shopName, description, isApproved"
        boolean isActive "default true"
        date lastLoginAt
        date createdAt
        date updatedAt
    }

    ADDRESSES {
        ObjectId _id PK
        string label "Home | Office"
        string fullName "required"
        string phone "required"
        string line1 "required"
        string line2
        string city "required"
        string state
        string pincode "required, 6 digits"
        boolean isDefault
    }

    CATEGORIES {
        ObjectId _id PK
        string name "required"
        string slug UK "unique, auto-generated"
        string description
        string icon "Bootstrap Icons class"
        string image
        ObjectId parent FK "-> categories._id, null = top level"
        boolean isActive
        date createdAt
    }

    PRODUCTS {
        ObjectId _id PK
        string name "required, TEXT INDEX"
        string slug
        string description "required, min 20, TEXT INDEX"
        string brand "TEXT INDEX"
        number price "required, min 1"
        number mrp "raised to price if lower"
        ObjectId category FK "-> categories._id"
        ObjectId seller FK "-> users._id"
        array images "required, min 1"
        number stock "required, min 0"
        string sku
        array specifications "EMBEDDED key/value pairs"
        number ratingAverage "DENORMALISED from reviews"
        number ratingCount "DENORMALISED from reviews"
        number numSold "DENORMALISED from orders"
        boolean isActive "false = delisted"
        date createdAt
    }

    CARTS {
        ObjectId _id PK
        ObjectId user FK-UK "-> users._id, UNIQUE (one cart per user)"
        array items "EMBEDDED cart items"
        object appliedCoupon "code, discount"
        date updatedAt
    }

    CART_ITEMS {
        ObjectId _id PK
        ObjectId product FK "-> products._id"
        number quantity "min 1"
        number priceAtAdd "detects price drift"
    }

    ORDERS {
        ObjectId _id PK
        string orderNumber UK "unique, SV+yymmdd+random"
        ObjectId user FK "-> users._id"
        array items "EMBEDDED order items (snapshot)"
        object shippingAddress "EMBEDDED, copied at checkout"
        number itemsTotal
        number discount
        number deliveryCharge
        number totalAmount
        object coupon "code, discountValue"
        string paymentMode "UPI | Card | NetBanking | COD"
        string paymentStatus "Pending | Paid | Failed | Refunded"
        string paymentReference
        date paidAt
        string status "Placed | Confirmed | Shipped | Delivered | Cancelled"
        array statusHistory "EMBEDDED audit trail"
        date cancelledAt
        string cancelReason
        date deliveredAt
        date expectedDeliveryAt
        date createdAt
    }

    ORDER_ITEMS {
        ObjectId _id PK
        ObjectId product FK "-> products._id"
        ObjectId seller FK "-> users._id"
        string name "SNAPSHOT at checkout"
        string image "SNAPSHOT at checkout"
        number price "SNAPSHOT at checkout"
        number quantity
        number subtotal
    }

    COUPONS {
        ObjectId _id PK
        string code UK "unique, uppercase"
        string description
        string type "percentage | flat"
        number value
        number maxDiscount "caps a percentage coupon"
        number minOrderValue
        date startsAt
        date expiresAt "required"
        number usageLimit "0 = unlimited"
        number usedCount
        number perUserLimit
        array usedBy "EMBEDDED {user, usedAt}"
        boolean isActive
        ObjectId createdBy FK "-> users._id"
    }

    REVIEWS {
        ObjectId _id PK
        ObjectId product FK "-> products._id"
        ObjectId user FK "-> users._id"
        ObjectId order FK "-> orders._id, the delivered order"
        number rating "required, 1-5"
        string title
        string comment "required, 5-1000"
        array images
        boolean isVerifiedPurchase
        number helpfulCount
        date createdAt
    }
```

---

## Embed vs. reference — the design decision

This is the part your evaluation asks about explicitly, so it is stated rather than implied.

| Relationship | Strategy | Why |
|---|---|---|
| `users.addresses` | **Embedded** | Always read together with the user, bounded in size, never queried on its own |
| `carts.items` | **Embedded** | A cart is only ever read as a whole, belongs to exactly one user, and is short-lived |
| `orders.items` | **Embedded snapshot** | An order is a **historical record**. `name`, `image` and `price` are *copied* at checkout, so a later price change — or a deleted product — can never rewrite a past order |
| `orders.shippingAddress` | **Embedded snapshot** | The address as it was at purchase time, not as the user has since edited it |
| `orders.statusHistory` | **Embedded** | An append-only audit trail read only with its order |
| `products.category` | **Reference** | Categories are shared across many products and are updated independently |
| `products.seller` | **Reference** | Users are shared entities with their own lifecycle |
| `reviews.product` / `reviews.user` | **Reference** | Reviews are queried on their own (by product, by user) and grow without bound |
| `categories.parent` | **Self-reference** | Models the hierarchy without hard-coding its depth |

**The rule applied throughout:** embed what is read together and bounded; reference what is shared, unbounded, or independently queried. Order items are the interesting case — they *look* like a reference relationship, but correctness requires a snapshot.

---

## Indexes

| Collection | Index | Type | Purpose |
|---|---|---|---|
| `users` | `email` | Unique | Login lookup; makes duplicate registration a database-level guarantee |
| `users` | `role` | Single | Admin filtering |
| `users` | `createdAt` | Single | User-growth report |
| `categories` | `slug` | Unique | Clean URLs |
| `categories` | `parent, isActive` | Compound | Tree building |
| `products` | `name, description, brand` | **Text** | Keyword search |
| `products` | `category, isActive` | Compound | The main listing filter |
| `products` | `seller` | Single | Seller dashboard |
| `products` | `price` | Single | Price-range filter and price sort |
| `products` | `ratingAverage` | Single | Rating filter and sort |
| `products` | `createdAt` | Single | Newest-first sort |
| `carts` | `user` | Unique | Enforces one cart per user |
| `orders` | `user, createdAt` | Compound | Order history, newest first |
| `orders` | `status` | Single | Status filters and reports |
| `orders` | `items.seller` | Multikey | The seller's order queue |
| `orders` | `orderNumber` | Unique | Lookup by order number |
| `reviews` | `user, product` | **Unique compound** | One review per user per product |
| `reviews` | `product, createdAt` | Compound | Product review feed |
| `coupons` | `code` | Unique | Coupon lookup |
| `coupons` | `expiresAt, isActive` | Compound | Live-coupon listing |

---

## Denormalisation

Three fields on `products` are maintained on write rather than computed on read:

| Field | Maintained by | Why |
|---|---|---|
| `ratingAverage` | `Review.syncProductRating()` after every review write | The listing page shows ratings for 12+ products at once; a join per card would be wasteful |
| `ratingCount` | Same | Same |
| `numSold` | `$inc` at checkout | Powers the "best selling" sort without aggregating orders on every request |

The trade-off is accepted deliberately: writes are comparatively rare, reads are constant, and the sync happens inside the same code path that changes the underlying data.

---

## Field naming vs. the project brief

The brief lists *suggested* field names. This implementation uses idiomatic Mongoose naming instead, because Mongoose already conveys the relationship through `ref` and the `Id`/`Hash` suffixes become noise. The mapping is one-to-one:

| Brief suggests | This project uses | Why |
|---|---|---|
| `passwordHash` | `password` | The field is `select: false` and is hashed by a `pre('save')` hook — it is never anything *but* a hash. The schema, not the name, is the guarantee. |
| `categoryId` | `category` | Declared as `{ type: ObjectId, ref: 'Category' }`. After `.populate('category')` the same field holds the document, so an `Id` suffix would be actively misleading. |
| `sellerId` | `seller` | Same reason. |
| `parentCategoryId` | `parent` | Self-reference on `categories`; `parent` reads better in a tree. |
| `userId` | `user` | Same `ref` reasoning, used on `carts`, `orders` and `reviews`. |
| `productId` | `product` | Same, on cart items, order items and reviews. |
| `ratingAvg` | `ratingAverage` | Spelled out; paired with `ratingCount`. |
| `validTill` | `expiresAt` | Matches the `startsAt` / `expiresAt` pair and the `-At` convention used across the codebase (`paidAt`, `deliveredAt`, `cancelledAt`). |
| `discountType` | `type` | Already namespaced by the `coupons` collection. |
| `value` | `value` | Unchanged. |

Every collection, relationship and index required by the brief is present — only the labels differ. The suggested indexes map across directly:

| Brief's suggested index | Implemented as |
|---|---|
| `users { email: 1 }` | `unique: true` on `email` (creates the index) |
| `products { categoryId: 1 }` | `{ category: 1, isActive: 1 }` — compound, and the `category` prefix serves the same queries |
| `categories { parentCategoryId: 1 }` | `{ parent: 1, isActive: 1 }` |
| `carts { userId: 1 }` | `unique: true` on `user` (one cart per user) |
| `orders { userId: 1 }` | `{ user: 1, createdAt: -1 }` — the listing is always newest-first |

Additional indexes beyond the brief: a **text index** on `products` for keyword search, `products.seller`, `products.price`, `products.ratingAverage`, `orders.status`, `orders.items.seller`, and a **compound unique** `reviews { user, product }` that makes "one review per product per customer" a database guarantee rather than a code check.
