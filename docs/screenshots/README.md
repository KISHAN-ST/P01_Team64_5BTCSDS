# ShopVerse — Screenshot Index

27 screenshots captured from the running application against the live MongoDB Atlas database.
Desktop shots are **1440×900 @2×**; mobile shots are **390×844 @3×**.

---

## Customer journey

| # | File | Screen | Shows |
|---|---|---|---|
| 01 | `01-home.png` | Home / landing | Hero, category circles, Deals of the Day with live countdown, featured grid, trust bar |
| 02 | `02-login.png` | Login | Split-screen brand panel, password toggle, one-click demo-account chips |
| 03 | `03-register.png` | Register | Role selector as radio **cards**, password strength meter, conditional shop-name field |
| 04 | `04-products.png` | Product listing | Filter accordions, **active-filter chip row**, dual-handle price slider, rating filter, sort, grid/list toggle |
| 05 | `05-product.png` | Product detail | Image gallery + thumbnail rail, stock badge, quantity stepper, tabs, related products |
| 06 | `06-cart.png` | Shopping cart | Line items, quantity steppers, sticky order summary, **`WELCOME10` coupon applied** |
| 07 | `07-checkout.png` | Checkout — address | 3-step progress bar, saved address cards, pincode auto-fill |
| 08 | `08-payment.png` | Checkout — payment | Payment methods **expanding inline** (UPI VPA field visible) |
| 08b | `08b-review.png` | Checkout — review | Order review before placing, with editable back-links |
| 09 | `09-success.png` | Order confirmed | Success tick, order number, amount, payment reference, expected delivery |
| 10 | `10-tracking.png` | Order tracking | Status timeline with animated fill, delivery estimate, item + address panels |
| 10b | `10b-my-orders.png` | My orders | Status filter chips, per-order actions, cancel button only where permitted |

## Seller

| # | File | Shows |
|---|---|---|
| 11 | `11-seller.png` | KPI cards **with trend deltas**, Chart.js sales area chart, **Low Stock Alert panel**, recent orders, top products |
| 11b | `11b-seller-products.png` | Own catalog with stock status, ratings, units sold, CRUD actions |
| 11c | `11c-seller-orders.png` | Order queue with status-advance buttons (only the seller's own line items) |

## Admin

| # | File | Shows |
|---|---|---|
| 12 | `12-admin.png` | Platform KPIs with trends, sales bar chart, **user-growth line chart**, top products, orders-by-status doughnut |
| 12b | `12b-admin-reports.png` | Sales / growth / inventory reports with date-range selector |
| 12c | `12c-admin-users.png` | User management — role badges, search, activate/deactivate |

## Reviews & extras

| # | File | Shows |
|---|---|---|
| 13 | `13-reviews.png` | Rating histogram, filter chips, verified-purchase badges, review list |
| 14 | `14-dark-mode.png` | Full dark theme — same token sheet, no duplicated CSS |
| 15 | `15-404.png` | Custom 404 page |
| 16 | `16-mobile-home.png` | Responsive home at 390 px |
| 17 | `17-mobile-product.png` | Responsive product page with sticky buy bar |

---

## Test & security evidence

| # | File | Shows |
|---|---|---|
| 18 | `18-newman-report.png` | Newman HTML report — **104 requests, 326 assertions, 0 failures** |
| 19 | `19-api-negative-tests.png` | Live 401 / 403 / 400 / 404 responses proving every business rule is enforced, and that **nothing returns 500** |
| 20 | `20-db-users-bcrypt.png` | `users` collection from Atlas — every `password` is a **bcrypt `$2a$10$` hash**, never plaintext |
| 21 | `21-db-order-embedded.png` | `orders` document — **embedded item snapshot** (name/image/price copied at checkout) and the `statusHistory` audit trail |

The full interactive Newman report is at [`../reports/newman-report.html`](../reports/newman-report.html) — open it in a browser to expand every request.

---

## Still to capture by hand

These need GUI applications and cannot be automated:

- [ ] **Postman app** — the collection runner summary, and one 401 + one 403 response in the Postman UI
- [ ] **MongoDB Compass** — the `users` and `orders` collections *(screenshots 20 and 21 already prove the same points from the database itself, so these are optional)*
- [ ] **Terminal** — `npm run dev` showing "MongoDB connected" and "Server running"

---

## Regenerating

Screenshots are produced by driving the real app, so they stay truthful. With the API running on port 5000:

```powershell
cd backend
npm run seed          # deterministic demo data
```

Then re-run the capture scripts. Every image above was taken against the live Atlas database, not mocked.
