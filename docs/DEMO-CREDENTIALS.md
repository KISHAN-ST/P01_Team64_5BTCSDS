# ShopVerse — Demo Credentials

> Created by `npm run seed`. Keep this open during your viva.

## Logins

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@shopverse.com` | `Admin@12345` |
| **Seller** (TechWorld) | `seller1@shopverse.com` | `Seller@12345` |
| **Seller** (GreenLiving) | `seller2@shopverse.com` | `Seller@12345` |
| **Seller** (UrbanStyle) | `seller3@shopverse.com` | `Seller@12345` |
| **Customer** (has delivered orders) | `customer1@gmail.com` | `Customer@12345` |
| **Customer** | `customer2@gmail.com` | `Customer@12345` |
| **Customer** | `customer3@gmail.com` | `Customer@12345` |
| **Customer** | `customer4@gmail.com` | `Customer@12345` |
| **Customer** (newest signup) | `customer5@gmail.com` | `Customer@12345` |

The login page has one-click chips that fill these in — no typing during the demo.

## Coupons

| Code | Effect | Use in the demo |
|---|---|---|
| `WELCOME10` | 10% off above Rs.500, capped at Rs.500 | **Works** — show the discount land |
| `FLAT350` | Flat Rs.350 off above Rs.2,000 | **Works** — flat-value path |
| `MEGA50` | 50% off above Rs.5,000, capped at Rs.1,000 | **Works** — shows the cap |
| `EXPIRED20` | 20% off | **Fails on purpose** → "Coupon has expired." |
| `BIGONLY` | Rs.500 off above Rs.10,000 | **Fails on purpose** → "Minimum order value of Rs.10000 required." |

Apply the two failing codes on camera. Visible negative testing is worth marks.

## Fixtures worth knowing

| Fixture | Why it exists |
|---|---|
| 6 products at or below 10 stock | Feeds the **Low Stock Alert** panel on the seller dashboard |
| 1 product at 0 stock (*Indoor Snake Plant*) | Proves the out-of-stock rule at add-to-cart |
| Orders in all 5 statuses | Lets you demo the workflow without setting it up first |
| Orders backdated across 90 days | Gives the admin sales chart a real curve, not one spike |
| 30 reviews, all from delivered orders | The seed obeys the same rule the API enforces |

## Demo order of operations

1. Home → categories and products loading from the live API
2. Register a new customer → show the network response
3. Log in → show the JWT in DevTools → Application → Local Storage
4. Search + filter (category + price + rating together)
5. Product detail → add to cart → try a quantity above stock (**blocked**)
6. Cart → apply `WELCOME10` (works) → apply `EXPIRED20` (**fails visibly**)
7. Checkout → address → mock payment → confirmation
8. Order tracking → status `Placed`
9. Log in as Seller → dashboard → **Low Stock Alert** → advance the order `Placed → Confirmed → Shipped`
10. Log in as Admin → sales report, top products, user-growth chart
11. Back as Customer → order `Delivered` → write a review (**allowed**) → try reviewing a product never purchased (**blocked**)
12. Postman → show the 401 and 403 responses
13. Compass → show the bcrypt hash in the `users` collection

## Reset

```powershell
cd backend
npm run seed          # wipe and repopulate
npm run seed:destroy  # wipe only
```

The seeder refuses to run when `NODE_ENV=production`.
