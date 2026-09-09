# ShopVerse — Manual Work Manual

**Project:** Full-Stack Role-Based E-Commerce Management Platform
**Stack:** Node.js · Express · MongoDB · Mongoose · JWT · bcrypt · HTML/CSS/JS/Bootstrap (MVC)
**Working folder:** `c:\Users\stkis\OneDrive\Desktop\5BTCSDS\lntproject`
**Owner:** Kishan
**Last updated:** 09 Sep 2026

---

## 0. Read this first

**The code is written and verified.** The backend, the frontend, the seed data, the README, the API documentation, the ER diagram and the Postman collection all exist in this folder.

What remains is the work only you can do: creating your own accounts, supplying your own secrets, capturing screenshots, building the presentation, and rehearsing the demo.

| Marker | Meaning |
|---|---|
| ☐ | A task you tick off |
| 🔴 | Blocker — nothing downstream works until this is done |
| 🟡 | Do it before you demo/submit |
| 🟢 | Polish — improves marks, not required to run |
| 💾 | Produces a file you must keep for submission |
| ✅ | **Already done for you** — verify, don't rebuild |

**Golden rule:** never commit `.env`, never show real passwords in screenshots, never push `node_modules`.

---

## What is already built

| Deliverable | Status | Where |
|---|---|---|
| Backend API — 66 routes, 10 controllers, 7 models | ✅ | `backend/` |
| Security — bcrypt, JWT, RBAC, validation, error handling, rate limiting | ✅ | `backend/middleware/` |
| Business rules — atomic stock, status graph, coupon engine, review gating | ✅ | `backend/controllers/`, `backend/config/constants.js` |
| Frontend — 13 pages, design tokens, dark mode, charts | ✅ | `frontend/` |
| Seed data — 9 users, 31 categories, 33 products, 5 coupons, 31 orders, 30 reviews | ✅ | `backend/utils/seed.js` |
| README with API reference | ✅ | `README.md` |
| API documentation | ✅ | `docs/API-Documentation.md` |
| ER diagram + index/design rationale | ✅ | `docs/ER-Diagram.md` |
| Demo credentials + demo script | ✅ | `docs/DEMO-CREDENTIALS.md` |
| Postman collection — 104 requests, 326 assertions | ✅ | `postman/` |
| **`.env` with your own secrets** | ☐ **You** | Part C |
| **MongoDB Atlas account** | ☐ **You** | Part B |
| **GitHub repository** | ☐ **You** | Part B |
| Screenshots (27) | ✅ | `docs/screenshots/` |
| **ER diagram PNG export** | ☐ **You** | Part G |
| Presentation — 28 slides | ✅ | `docs/ShopVerse-Presentation.pptx` |
| Project report — 33 pages | ✅ | `docs/ShopVerse-Report.pdf` |
| Code screenshots (22) | ✅ | `docs/code-screenshots/` |
| GitHub guide | ✅ | `docs/GITHUB-GUIDE.md` |
| **Fill in names + register numbers** | ☐ **You** | PPT slide 2, report page 1 |
| **Demo rehearsal** | ☐ **You** | Part G |

### Verification status

The API has been run end to end against a seeded database:

```
Postman/Newman:  104 requests · 326 assertions · 0 failures
Direct API suite: 79 assertions (happy path + all 18 negative tests) · passing
Route table:      66 routes mounted
Frontend:         13 pages, all JS parses, all 68 internal links resolve
```

Two assertions run after **every** request in the collection: the response must be JSON, and the status must be below 500.

---

# PART A — Machine Setup (one time, ~30 min)

## A1. 🔴 Install Node.js

☐ Download **Node.js LTS (22.x)** from https://nodejs.org → "LTS" → Windows Installer (.msi)
☐ Tick **"Automatically install the necessary tools"**; leave everything else default
☐ Restart VS Code and all terminals afterwards
☐ Verify:

```powershell
node -v      # expect v22.x.x
npm -v       # expect 10.x or 11.x
```

If `node` is "not recognized", PATH hasn't refreshed — close **all** terminals and reopen, or restart Windows.

## A2. 🔴 Install Git

☐ Download from https://git-scm.com/download/win
☐ Installer choices that matter:
- Default editor → **Use Visual Studio Code**
- Adjusting PATH → **Git from the command line and also from 3rd-party software**
- Line endings → **Checkout Windows-style, commit Unix-style**
☐ Verify: `git --version`
☐ Set your identity once — this is what appears on every commit:

```powershell
git config --global user.name "Kishan"
git config --global user.email "stkishan45@gmail.com"
```

## A3. 🔴 Install MongoDB Compass

☐ https://www.mongodb.com/try/download/compass
☐ You will use it to take the database screenshots that prove passwords are hashed.

## A4. 🔴 Install Postman

☐ https://www.postman.com/downloads/ → Windows 64-bit
☐ Create a free account (needed to save and export collections)
☐ Create a **Workspace** named `ShopVerse`

## A5. 🟡 VS Code extensions

`Ctrl+Shift+X` → install:

☐ **Live Server** — serves the frontend (required)
☐ **MongoDB for VS Code**
☐ **DotENV** — syntax highlighting for `.env`
☐ **Prettier** and **ESLint**

☐ Enable format-on-save: `Ctrl+,` → search `format on save` → tick it

## A6. 🟢 Terminal notes (Windows PowerShell)

- `&&` does **not** work in Windows PowerShell 5.1 — use `;` or `if ($?) { ... }`
- Use `$env:VAR = "value"`, not `set VAR=value`
- Any tutorial command using `&&` must be split into two lines

---

# PART B — Accounts You Must Create

| # | Service | Why | Priority |
|---|---|---|---|
| B1 | **MongoDB Atlas** | The database | 🔴 |
| B2 | **GitHub** | Source repo — a graded deliverable | 🔴 |
| B3 | **Render / Railway** | Live backend URL (bonus) | 🟢 |
| B4 | **Netlify / Vercel** | Live frontend URL (bonus) | 🟢 |

## B1. 🔴 MongoDB Atlas

☐ Sign up at https://www.mongodb.com/cloud/atlas/register
☐ Create a project named **ShopVerse**
☐ Build a cluster → **M0 Free** → Provider **AWS** → Region **Mumbai (ap-south-1)** → name `shopverse-cluster`
☐ **Database Access → Add New Database User**
- Authentication: Password
- Username: `shopverse_admin`
- Password: click **Autogenerate Secure Password** → **copy it to a notepad now**, you cannot see it again
- Role: **Read and write to any database**
☐ **Network Access → Add IP Address → Allow Access From Anywhere (0.0.0.0/0)**
- Fine for an academic project. Mention in your report that production would whitelist specific IPs.
☐ **Connect → Drivers → Node.js** → copy the connection string:
`mongodb+srv://shopverse_admin:<db_password>@shopverse-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority`
☐ Replace `<db_password>` with the real password and insert the DB name before the `?`:
`...mongodb.net/shopverse?retryWrites=true&w=majority`
☐ 💾 **Save this final string — it becomes `MONGO_URI` in Part C.**

> **Password gotcha:** if the generated password contains `@ : / ? # [ ] %` you must URL-encode it (`@` → `%40`, `#` → `%23`, `/` → `%2F`). Easiest fix: regenerate until it is alphanumeric only.

**Local alternative (only if you cannot use Atlas):** install MongoDB Community Server, tick *Install as a Service*, verify with `Get-Service MongoDB`, and use `mongodb://127.0.0.1:27017/shopverse`.

## B2. 🔴 GitHub repository

☐ https://github.com → **New repository**
- Name: `shopverse-ecommerce-platform`
- Description: `Secure role-based full-stack e-commerce platform — Node.js, Express, MongoDB, JWT`
- Visibility: **Public** (examiners must be able to open it)
- Add a README: **No** (one already exists in this folder)
- Add .gitignore: **No** (one already exists)
- License: **No** (MIT is already stated in the README)

☐ ✅ `.gitignore` is already written and already excludes `.env`, `node_modules/` and logs. **Open it and confirm before your first commit.**

☐ First push:

```powershell
cd "c:\Users\stkis\OneDrive\Desktop\5BTCSDS\lntproject"
git init
git branch -M main
git remote add origin https://github.com/<your-username>/shopverse-ecommerce-platform.git
git add .
git commit -m "feat: ShopVerse e-commerce platform"
git push -u origin main
```

☐ 🔴 **Verify:** open the repo in a browser and confirm `.env` is **not** listed and `node_modules/` is **not** listed. If either is there, see Part H11 — and rotate your Atlas password and JWT secrets immediately.

> **Marks tip:** one giant "final code" commit looks bad. Before pushing, consider committing in stages (`feat: models`, `feat: auth`, `feat: cart and orders`, `feat: frontend`, `docs: readme`) so the history tells a story.

## B3. 🟢 Deploy the backend on Render

☐ https://render.com → sign up with GitHub
☐ **New → Web Service** → connect `shopverse-ecommerce-platform`
☐ Settings:
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Instance Type: **Free**
☐ **Environment → Add Environment Variable** — add every key from Part C **by hand**; Render does not read your `.env`
☐ Set `NODE_ENV=production` there (this also makes the seeder refuse to run, by design)
☐ Deploy → wait for "Live" → 💾 save the URL
☐ ⚠️ Free instances sleep after 15 min idle — **open the URL 2 minutes before your demo**

## B4. 🟢 Deploy the frontend on Netlify

☐ https://app.netlify.com → **Add new site → Import from Git**
☐ Publish directory: `frontend`
☐ Edit `frontend/assets/js/api.js` line ~8 — change `API_BASE` to your Render URL + `/api`
☐ Redeploy, then 💾 save the frontend URL

---

# PART C — Configuration (🔴 the one code-adjacent thing left)

`backend/.env.example` ✅ already exists and documents every key. You must create the real `.env` with your own values — it is deliberately not in the repo.

## C1. Create `backend/.env`

```powershell
cd "c:\Users\stkis\OneDrive\Desktop\5BTCSDS\lntproject\backend"
Copy-Item .env.example .env
```

## C2. 🔴 Generate two real JWT secrets

Run this **twice** and paste each output:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

☐ First output → `JWT_SECRET`
☐ Second output → `JWT_REFRESH_SECRET`
☐ They must be **different**. Using `secret123` costs you security marks.

## C3. Fill in the rest

☐ `MONGO_URI` — the Atlas string from Part B1
☐ `CLIENT_URL` — leave as `http://127.0.0.1:5500` unless Live Server uses a different port

Reference for every key:

| Variable | Purpose | Value to use |
|---|---|---|
| `NODE_ENV` | Runtime mode | `development` |
| `PORT` | API port | `5000` |
| `MONGO_URI` | Atlas connection string | **yours from B1** |
| `JWT_SECRET` | Access-token key | **generate** |
| `JWT_EXPIRES_IN` | Access-token lifetime | `7d` |
| `JWT_REFRESH_SECRET` | Refresh-token key | **generate, different** |
| `JWT_REFRESH_EXPIRES_IN` | Refresh lifetime | `30d` |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost | `10` |
| `AUTH_RATE_LIMIT` | Login attempts / 15 min / IP | `200` dev, `20` prod |
| `CLIENT_URL` | Allowed CORS origin | `http://127.0.0.1:5500` |
| `LOW_STOCK_THRESHOLD` | Drives low-stock alerts | `10` |
| `FREE_DELIVERY_ABOVE` | Free-delivery threshold | `500` |
| `DELIVERY_CHARGE` | Flat delivery fee | `49` |
| `MAX_CART_QTY_PER_ITEM` | Per-product cart cap | `10` |
| `PAYMENT_SUCCESS_RATE` | Mock gateway success % | `100` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeded admin | `admin@shopverse.com` / `Admin@12345` |

☐ 🔴 Save the file. Confirm it is **not** tracked: `git status` must not list `backend/.env`.

## C4. 🔴 Install and seed

```powershell
cd "c:\Users\stkis\OneDrive\Desktop\5BTCSDS\lntproject\backend"
npm install
npm run seed
```

Expected output:

```
MongoDB connected: shopverse-cluster.../shopverse
Seeding ShopVerse...
  cleared all collections
  users: 1 admin, 3 sellers, 5 customers
  categories: 31 (7 parents)
  products: 33 (6 low stock, 1 out of stock)
  coupons: 5 (1 expired, 1 high-minimum - both intentional)
  orders: 31 across all five statuses
  reviews: 30 (verified purchases only)
```

If it fails, go to Part H.

☐ 💾 Open Compass, connect with the same string, and screenshot the collections. That is a report deliverable.

---

# PART D — Running It

## D1. Daily startup

```powershell
# Terminal 1 — backend
cd "c:\Users\stkis\OneDrive\Desktop\5BTCSDS\lntproject\backend"
npm run dev
```

Expect:

```
MongoDB connected: ...
Server running in development mode on port 5000
```

☐ Frontend: right-click `frontend/index.html` in VS Code → **Open with Live Server** → `http://127.0.0.1:5500`

☐ 🔴 `CLIENT_URL` must **exactly** match the Live Server origin. To a browser, `127.0.0.1` and `localhost` are different origins.

## D2. Smoke test

☐ `http://localhost:5000/api/health` → `{"success":true,"status":"ok",...}`
☐ Home page renders products
☐ Log in as `customer1@gmail.com` / `Customer@12345`
☐ Cart badge appears in the header

## D3. Useful commands

```
npm run dev            start with auto-reload
npm start              start without auto-reload
npm run seed           wipe and repopulate
npm run seed:destroy   wipe only
```

---

# PART E — What Was Built From Your Reference Image

✅ **All implemented.** This section is here so you can *talk about it* in the viva — these were deliberate improvements on the mockup, not accidents.

## E1. The design token sheet

Everything lives in `frontend/assets/css/tokens.css`. No other stylesheet hard-codes a colour.

**Colour — the key change.** Your mockup used one green for everything. It is now a five-step ramp plus a semantic set:

| Token | Value | Use |
|---|---|---|
| `--brand-900` | `#0F2E1F` | Header, footer |
| `--brand-700` | `#1B4332` | Primary buttons, active nav |
| `--brand-500` | `#2D6A4F` | Hover, links |
| `--brand-200` | `#B7E4C7` | Badges, chips |
| `--brand-50` | `#F1F8F4` | Section tints |
| `--canvas` | `#FAF9F6` | Page background (warm, not pure white) |
| `--accent-amber` | `#F0A202` | Star ratings |
| `--success` / `--warning` / `--danger` / `--info` | | Order statuses |

**Why it matters:** with one green, every order status looked identical. With a semantic set, `Placed` `Confirmed` `Shipped` `Delivered` `Cancelled` are readable at a glance — see `.status-*` in `main.css`.

**Other tokens:** 4px spacing scale · four radii · three shadow levels (rest at 1, lift to 2 on hover) · Plus Jakarta Sans headings + Inter body · **`tabular-nums` on every price**, so cart totals don't jitter as quantities change.

## E2. Screen-by-screen — what changed vs. the mockup

| Screen | Improvements shipped |
|---|---|
| **Home** | Two-column hero with scroll fade-in; category circles with hover lift; **Deals of the Day scroller with a live countdown**; trust bar moved above the footer so it stops competing with the category row |
| **Login** | Password show/hide; inline validation on blur; **one-click demo-account chips**; split-screen brand panel kept (the mockup's strongest element) |
| **Register** | **Role selector as two large radio cards**, not a dropdown; live password strength meter; conditional shop-name field for sellers |
| **Listing** | Collapsible filter accordions; **active-filter chip row** with individual ✕; **dual-handle price slider**; **skeleton loaders**; **empty state with "clear filters"**; grid/list toggle; filters encoded in the URL so views are shareable |
| **Detail** | Thumbnail rail + **hover-zoom**; **sticky buy bar on mobile**; "Only N left" urgency badge; rating histogram inline; "You may also like" row |
| **Cart** | **Sticky order summary**; `+` disables at available stock and says why; **undo toast on remove**; live coupon hints; empty-cart state |
| **Checkout** | Completed steps are **clickable to go back**; saved-address cards; **pincode auto-fills city/state** and shows a delivery estimate |
| **Payment** | Methods **expand inline** when selected (UPI → VPA field, Card → card fields); **visible processing state**: spinner → tick animation → redirect |
| **Tracking** | Timeline with an **animated fill line**; cancel button appears only while permitted; print-to-PDF invoice |
| **Seller** | KPI cards with **trend deltas** ("▲ 12% vs previous period"); Chart.js area chart with 7/30/90-day range; **Low Stock Alert panel** ← *was missing from your mockup, and is a stated project feature*; product CRUD modal |
| **Admin** | Same KPI treatment; **user-growth line chart** ← *also missing from your mockup, also a stated deliverable*; top-products table; orders-by-status doughnut; date-range filter that drives the API |
| **Reviews** | Histogram; filter chips; star-picker modal with character counter; **button disabled with "available after delivery" when the rule blocks you** |
| **Global** | Toast system (4 variants); skeleton loaders everywhere; **dark mode** via the theme toggle; 404 and 403 pages; `aria-label` on every icon button; responsive at 480/768/1024/1280 |

## E3. 🟢 If you want to customise

☐ **Colours** — edit `tokens.css` only. Every component follows automatically.
☐ **Product images** — currently `picsum.photos` seeds. Swap the `IMG()` helper in `backend/utils/seed.js` for real URLs (https://unsplash.com), or add a Cloudinary account.
☐ **Logo/favicon** — make a wordmark at https://www.figma.com and a favicon at https://favicon.io, then replace the `bi-bag-heart-fill` icon in `ui.js`.
☐ **Business rules** — `LOW_STOCK_THRESHOLD`, `FREE_DELIVERY_ABOVE`, `DELIVERY_CHARGE`, `MAX_CART_QTY_PER_ITEM` are all `.env` values; no code change needed.

---

# PART F — Testing (🟡 do this, it is graded)

## F1. Import the collection

☐ Postman → **Import** → drag in both files from `postman/`:
- `ShopVerse.postman_collection.json`
- `ShopVerse.postman_environment.json`
☐ Select **ShopVerse Local** in the environment dropdown (top right)
☐ Confirm `baseUrl` is `http://localhost:5000/api`

## F2. 🔴 Run the whole collection

☐ Collection **···** → **Run** → **Run ShopVerse API**
☐ Expected: **104 requests, 326 assertions, 0 failures**
☐ 💾 **Screenshot the green summary.** This is your single best piece of report evidence.

Run the **00 Setup** folder first if you run folders individually — it logs in every role and discovers the product ids everything else depends on. Running the whole collection does this automatically.

## F3. ✅ The negative tests — know what they prove

The `99 Negative Tests` folder is the part that earns marks. Be ready to explain any of these in the viva:

| # | Test | Expected | The rule it proves |
|---|---|---|---|
| 1 | No token | **401** | Authentication is required |
| 2 | Malformed token | **401** | Tokens are verified, not trusted |
| 3 | Customer creates a product | **403** | Role-based access control |
| 4 | Seller reads an admin report | **403** | RBAC across roles |
| 5 | Seller edits another seller's product | **403** | Per-resource ownership |
| 6 | Duplicate email | **409** | Unique index on `users.email` |
| 7 | Weak password | **400** | Server-side validation |
| 8 | Quantity above stock | **400** | Stock validation |
| 9 | Out-of-stock product | **400** | Stock validation |
| 10 | `EXPIRED20` | **400** | Coupon expiry |
| 11 | `BIGONLY` on a small cart | **400** | Minimum order value |
| 12 | Checkout with an empty cart | **400** | Order precondition |
| 13 | `Delivered` → `Shipped` | **400** | Status transition graph |
| 14 | Cancel a delivered order | **400** | Cancellation window |
| 15 | Review without purchase | **403** | Review gating |
| 16 | Duplicate review | **409** | Unique compound index |
| 17 | Invalid ObjectId | **400** | Guarded before Mongoose |
| 18 | Nonexistent id | **404** | Correct not-found handling |

Plus: unknown route → 404, seller adding to cart → 403, deleting an in-use category → 400.

☐ 🔴 **The point to make:** *none of these returns 500.* Every failure mode is handled deliberately.

## F4. 🟢 Publish the docs

☐ Collection → **View Documentation** → **Publish** → 💾 link the public URL from your README.

---

# PART G — Deliverables You Must Produce

## G1. ✅ Screenshots — DONE (27 captured)

All screenshots have been captured automatically by driving the real app against your live Atlas database. They are in `docs/screenshots/`, with an index at `docs/screenshots/README.md`.

**Customer journey (12):** home · login · register · listing with filters · product detail · cart with coupon · checkout · payment · review · order confirmed · tracking · my orders

**Seller (3):** dashboard with Low Stock Alert · products · order queue

**Admin (3):** dashboard with user-growth chart · reports · user management

**Extras (5):** reviews · dark mode · 404 · mobile home · mobile product

**Evidence (4):**
- `18-newman-report.png` — Newman report, 104 requests / 326 assertions / **0 failures**
- `19-api-negative-tests.png` — live 401/403/400/404 responses, proving nothing returns 500
- `20-db-users-bcrypt.png` — `users` collection showing `$2a$10$` bcrypt hashes
- `21-db-order-embedded.png` — order document showing the embedded item snapshot

The full interactive test report is at `docs/reports/newman-report.html`.

### ☐ Three still need your hands (GUI apps)

These can't be automated. They're **optional** — screenshots 18–21 already prove the same points — but capture them if your rubric explicitly names Postman or Compass:

☐ **Postman runner summary** — open Postman, run the collection, screenshot the green result
☐ **Postman 401 + 403** — screenshot two negative-test responses in the Postman UI
☐ **Terminal** — `npm run dev` showing "MongoDB connected" and "Server running"

Save them as `22-postman-runner.png`, `23-postman-401.png`, `24-terminal.png`.

## G2. 🟡 ER diagram PNG (💾 `docs/ER-Diagram.png`)

✅ The diagram, all indexes and the full embed-vs-reference rationale are already written in `docs/ER-Diagram.md`.

☐ Open it in VS Code and press `Ctrl+Shift+V` — the Mermaid diagram renders
☐ Or paste the Mermaid block into https://mermaid.live
☐ 💾 Export **PNG at 2× scale** → `docs/ER-Diagram.png` (readable when printed)
☐ 🟡 For the report, be ready to explain **why order items are embedded snapshots**: an order is a historical record, so name/image/price are copied at checkout and a later price change cannot rewrite a past order. That single answer covers most of the data-modelling marks.

## G3. ✅ Presentation & Report — DONE

**`docs/ShopVerse-Presentation.pptx`** — 28 slides, 16:9, brand-themed, with all screenshots embedded.
**`docs/ShopVerse-Report.pdf`** — 33 pages, A4, page 1 is the required Team Details page.
**`docs/ShopVerse-Report-HighRes.pdf`** — same report at full image resolution, for printing.

### ☐ The one thing you must do: fill in the blanks

Both documents deliberately leave your details empty:

| File | Where | Fields |
|---|---|---|
| PPTX | **Slide 1** | "Submitted by" and "Guide" lines |
| PPTX | **Slide 2** | Name · Register Number · Department · Section (4 rows), Course, Guide, Date |
| PPTX | **Last slide** | GitHub repository URL |
| PDF | **Page 1** | Same team table, plus Course / Guide / GitHub URL / Date |

To edit the report after filling in details: edit `docs/ShopVerse-Report.html`, open it in Chrome, then **Ctrl+P → Save as PDF** (A4, Background graphics on).

☐ 🟡 Rehearse the deck to **under 10 minutes**.

## G4. 🟡 Demo rehearsal

✅ The full 13-step script is in `docs/DEMO-CREDENTIALS.md`. The two beats that matter most:

- **Step 6** — apply `WELCOME10` (works), then `EXPIRED20` (**fails visibly**). Deliberate negative testing in front of the examiner.
- **Step 11** — review a delivered product (allowed), then try one never purchased (**blocked**). Proves the business rule.

☐ Run through it twice
☐ 💾 Record a 5–8 min screen capture (`Win + G`) as a backup in case the live demo breaks

---

# PART H — Troubleshooting

## H1. `MongoServerError: bad auth : authentication failed`
- Wrong password in `MONGO_URI`, or it contains an unencoded special character
- Fix: Atlas → Database Access → Edit user → **Reset password** → generate an alphanumeric-only one → update `.env`
- Confirm the user's role is **readWriteAnyDatabase**

## H2. `MongooseServerSelectionError: connection timed out`
- Your IP isn't whitelisted → Atlas → Network Access → add `0.0.0.0/0`
- Or your network blocks port 27017 → switch to a mobile hotspot
- Changes take ~2 minutes to apply

## H3. `Missing required environment variables: MONGO_URI, JWT_SECRET`
- The server checks these at startup and exits deliberately rather than failing on the first request
- You are missing `backend/.env`, or you created it in the wrong folder — it belongs in `backend/`, not the project root

## H4. `Error: listen EADDRINUSE :::5000`

```powershell
Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

Or change `PORT` in `.env`.

## H5. "blocked by CORS policy"
- `CLIENT_URL` must match the browser origin **exactly**, including protocol and port
- `http://localhost:5500` and `http://127.0.0.1:5500` are **different origins**
- The server already allows both by default — if you use another port, add it to `CLIENT_URL`

## H6. Frontend shows "Cannot reach the server"
- The backend is not running, or is on a different port
- Check `API_BASE` at the top of `frontend/assets/js/api.js`

## H7. `429 Too Many Requests` on login
- The auth rate limiter, working as intended
- Raise `AUTH_RATE_LIMIT` in `.env` (dev default is already 200), or wait 15 minutes

## H8. `jwt malformed` / `invalid signature`
- Header must be `Authorization: Bearer <token>` — one space, `Bearer` capitalised
- You changed `JWT_SECRET` after issuing the token → old tokens are dead, log in again
- In the browser: open DevTools → Application → Local Storage → delete `sv_token` and log in again

## H9. Everything returns 401 after a while
- Tokens expire after `JWT_EXPIRES_IN` (7 days). Log in again.
- Or an admin deactivated the account — the API re-reads the user on every request, so deactivation takes effect immediately by design

## H10. Postman: lots of 403s
- You skipped the **00 Setup** folder, so `{{sellerToken}}` / `{{adminToken}}` are empty
- Run the whole collection, or run 00 Setup first

## H11. Git rejects a push, or `.env` got committed
`.gitignore` doesn't untrack files already committed:

```powershell
git rm -r --cached node_modules
git rm --cached backend/.env
git commit -m "chore: remove tracked files now ignored"
git push
```

☐ 🔴 If `.env` was ever pushed: **rotate the Atlas password and both JWT secrets.** Deleting the file does not remove it from history.

## H12. Render deploys but every request 502s
- Add the environment variables in the Render dashboard — it does not read `.env`
- Free instance is cold; the first request after sleep takes ~50s

## H13. Seeder refuses to run
- `NODE_ENV=production` in `.env`. That guard is intentional. Set it to `development` locally.

---

# PART I — Submission Checklist

## Code
☐ Pushed to GitHub `main`
☐ `.env` **not** in the repo — open the repo on the web and check
☐ `.env.example` **is** in the repo, with empty secret values
☐ `node_modules/` not committed
☐ Repo is **Public**
☐ Commits are meaningful, not one "final code" dump

## Documentation
☐ `README.md` — screenshots uncommented once captured
☐ `docs/ER-Diagram.md` ✅ + `docs/ER-Diagram.png` (you export)
☐ `docs/API-Documentation.md` ✅
☐ `docs/DEMO-CREDENTIALS.md` ✅
☐ `postman/*.json` ✅ (confirm no real tokens in the environment file — it ships blank)
☐ `docs/screenshots/` — 27 images ✅ (+3 optional GUI shots)
☐ `docs/ShopVerse-Presentation.pptx` + a PDF export
☐ `manual.md` ✅

## Verification — the night before
☐ 🔴 `git clone` your own repo into a **fresh folder**, `npm install`, copy `.env.example` → `.env`, fill it, `npm run seed`, `npm run dev` — **it must work with zero extra steps.** This is where projects most often fail.
☐ Import the exported Postman collection into a fresh workspace and run it: 326/326
☐ Frontend works at 375px / 768px / 1440px (DevTools device toolbar)
☐ Lighthouse accessibility ≥ 90 on home and product pages
☐ Deployed URLs awake and responding, if you deployed

## Presentation day
☐ Laptop charged + charger packed
☐ Mobile hotspot ready (never trust campus wifi)
☐ Backup screen recording on a USB drive
☐ PPT exported to **PDF** as well as `.pptx`
☐ Postman collection pre-loaded, environment pre-selected
☐ Backend already running and warmed up before you start speaking
☐ Demo credentials on a sticky note

---

# PART J — Remaining Work, In Order

| Phase | Task | Est. |
|---|---|---|
| 1 | Part A — install Node, Git, Compass, Postman | 30 min |
| 2 | Part B1 — Atlas cluster + connection string | 20 min |
| 3 | Part C — `.env`, `npm install`, `npm run seed` | 15 min |
| 4 | Part D — run it, click through every page | 30 min |
| 5 | Part F — import and run the Postman collection | 20 min |
| 6 | Part B2 — GitHub repo and first push | 20 min |
| ~~7~~ | ~~Part G1 — screenshots~~ ✅ done | — |
| 8 | Part G2 — export the ER diagram PNG | 15 min |
| ~~9~~ | ~~Part G3 — presentation and report~~ ✅ done — just fill in names | 10 min |
| 10 | Part G4 — rehearse the demo, record the backup | 1 hour |
| 11 | Part B3/B4 — deploy (optional) | 45 min |
| 12 | Part I — fresh-clone verification | 30 min |

**Roughly one focused day**, plus the presentation.

---

## Quick Reference Card

```
Start backend      cd backend; npm run dev
Reseed database    cd backend; npm run seed
Frontend           right-click frontend/index.html -> Open with Live Server
API base           http://localhost:5000/api
Frontend base      http://127.0.0.1:5500
Health check       GET /api/health
Generate a secret  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
Free a busy port   Get-NetTCPConnection -LocalPort 5000 | Select OwningProcess
Push               git add . ; git commit -m "feat: ..." ; git push
```

**Demo logins** — full list in `docs/DEMO-CREDENTIALS.md`

```
Admin     admin@shopverse.com    / Admin@12345
Seller    seller1@shopverse.com  / Seller@12345
Customer  customer1@gmail.com    / Customer@12345
```

**Coupons that work:** `WELCOME10` · `FLAT350` · `MEGA50`
**Coupons that fail on purpose:** `EXPIRED20` (expired) · `BIGONLY` (min ₹10,000)

**Never commit:** `.env` · `node_modules/` · real tokens in Postman exports · plaintext passwords anywhere.
