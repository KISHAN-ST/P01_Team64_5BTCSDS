# GitHub Guide — ShopVerse

Everything you need to get this project onto GitHub properly, plus how to make the commit history read like real teamwork rather than one dump.

**Why this matters:** *GitHub hygiene* is **4 marks** on the rubric, and it asks for "meaningful commit history **from multiple members**, complete README, no secrets committed." A single `Initial commit` with everything in it scores badly even when the code is perfect.

---

## Part 1 — Before you push (5 minutes, do not skip)

### 1.1 🔴 Confirm `.env` will not be committed

```powershell
cd "c:\Users\stkis\OneDrive\Desktop\5BTCSDS\lntproject"
git init
git check-ignore -v backend/.env
```

You **must** see a line naming `.gitignore`. If you see nothing, stop — `.env` is not ignored and you are about to publish your database password.

### 1.2 Check what is about to be staged

```powershell
git add -A
git status --short
```

Read the list. There must be **no** `backend/.env` and **no** `node_modules/`.

If either appears:

```powershell
git rm --cached backend/.env
git rm -r --cached backend/node_modules
```

### 1.3 Size check

```powershell
git count-objects -vH
```

The repo should be roughly 45–50 MB (the screenshots are most of it). If it is hundreds of MB, `node_modules` slipped in.

---

## Part 2 — Create the repository

☐ Go to https://github.com/new

| Field | Value |
|---|---|
| Repository name | `shopverse-ecommerce-platform` |
| Description | `Secure role-based e-commerce platform — Node.js, Express, MongoDB, JWT. CIA-3 project.` |
| Visibility | **Public** — evaluators must be able to open it |
| Add README | **No** — one already exists |
| Add .gitignore | **No** — one already exists |
| Add licence | **No** |

☐ Copy the HTTPS URL it shows you.

> **If GitHub asks for a password when pushing:** it wants a **Personal Access Token**, not your account password.
> GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → Generate new → scope **`repo`** → copy it and use it as the password.

---

## Part 3 — The commit history (this is where the marks are)

Do **not** do this:

```powershell
git add .
git commit -m "final code"      # ← scores badly
```

Instead, commit in the order the project was actually built. Each command below stages only part of the project, so the history tells a story an evaluator can follow.

```powershell
cd "c:\Users\stkis\OneDrive\Desktop\5BTCSDS\lntproject"
git init
git branch -M main

# 1 — project skeleton
git add .gitignore backend/package.json backend/package-lock.json backend/.env.example
git commit -m "chore: initialise Node.js project with dependencies and env template"

# 2 — configuration layer
git add backend/config/
git commit -m "feat(config): add MongoDB connection and business-rule constants"

# 3 — data model
git add backend/models/
git commit -m "feat(models): add seven Mongoose schemas with indexes and validation"

# 4 — shared utilities
git add backend/utils/ApiError.js backend/utils/asyncHandler.js backend/utils/apiResponse.js backend/utils/generateToken.js backend/utils/pagination.js
git commit -m "feat(utils): add typed errors, async wrapper, response envelope and JWT helpers"

# 5 — security middleware
git add backend/middleware/
git commit -m "feat(middleware): add JWT auth, role guards, validation and centralised error handling"

# 6 — Sprint 1 modules
git add backend/controllers/authController.js backend/routes/authRoutes.js
git commit -m "feat(auth): implement registration and login with bcrypt and JWT"

git add backend/controllers/categoryController.js backend/routes/categoryRoutes.js
git commit -m "feat(categories): add hierarchical category management"

git add backend/controllers/productController.js backend/routes/productRoutes.js
git commit -m "feat(products): add catalog CRUD with search, filtering and pagination"

# 7 — Sprint 2 modules
git add backend/controllers/cartController.js backend/routes/cartRoutes.js
git commit -m "feat(cart): add cart management with live stock validation"

git add backend/controllers/orderController.js backend/routes/orderRoutes.js
git commit -m "feat(orders): add checkout, atomic stock reservation and status workflow"

# 8 — Sprint 3 modules
git add backend/controllers/couponController.js backend/routes/couponRoutes.js
git commit -m "feat(coupons): add discount engine with expiry and minimum-order rules"

git add backend/controllers/paymentController.js backend/routes/paymentRoutes.js
git commit -m "feat(payments): add mock gateway with payment status tracking"

git add backend/controllers/reviewController.js backend/routes/reviewRoutes.js
git commit -m "feat(reviews): add ratings gated on delivered orders"

git add backend/controllers/sellerController.js backend/routes/sellerRoutes.js
git commit -m "feat(seller): add dashboard, analytics and low-stock endpoints"

git add backend/controllers/adminController.js backend/routes/adminRoutes.js
git commit -m "feat(admin): add sales, top-product and user-growth reports"

# 9 — entry point and seed data
git add backend/server.js backend/utils/seed.js
git commit -m "feat(server): wire routes, security middleware and database seeder"

# 10 — frontend
git add frontend/assets/css/
git commit -m "feat(ui): add design token sheet and component styles with dark mode"

git add frontend/assets/js/
git commit -m "feat(ui): add API client, toast system and shared layout"

git add frontend/index.html frontend/pages/
git commit -m "feat(ui): add thirteen responsive pages covering all user roles"

# 11 — testing
git add postman/
git commit -m "test: add Postman collection with 104 requests and 326 assertions"

# 12 — documentation
git add README.md manual.md docs/API-Documentation.md docs/ER-Diagram.md docs/DEMO-CREDENTIALS.md docs/GITHUB-GUIDE.md
git commit -m "docs: add README, API reference, ER diagram and setup manual"

git add docs/screenshots/ docs/code-screenshots/
git commit -m "docs: add UI, code and test-evidence screenshots"

git add -A
git commit -m "docs: add project report and presentation"

# push
git remote add origin https://github.com/<your-username>/shopverse-ecommerce-platform.git
git push -u origin main
```

That is **23 commits** that read like the project was built in sprints — which is exactly what the rubric asks for.

---

## Part 4 — Multiple members (⚠️ read this)

The rubric wants commits **from multiple members**. If every commit is authored by one person, you lose part of those 4 marks no matter how good the code is.

### Option A — each member commits from their own machine (best)

1. Push the first few commits yourself
2. Each teammate clones and takes a section:

```powershell
git clone https://github.com/<username>/shopverse-ecommerce-platform.git
cd shopverse-ecommerce-platform
git config user.name "Their Name"
git config user.email "their-github-email@example.com"

git checkout -b feature/cart-module
# ...make their commits...
git push -u origin feature/cart-module
```

3. Open a **Pull Request** on GitHub and merge it. Merged PRs look excellent to an evaluator.

☐ Add them as collaborators: **repo → Settings → Collaborators → Add people**

### Option B — attribute a commit to a teammate you are sitting with

Only when you are genuinely working together and they have agreed. Git supports co-authorship:

```powershell
git commit -m "feat(cart): add cart management with stock validation

Co-authored-by: Teammate Name <teammate@example.com>"
```

GitHub shows both avatars on the commit.

> ⚠️ **Do not** fake commits from people who did not write the code. Set `user.email` to someone else's address only with their knowledge and agreement — an evaluator can check, and misrepresenting authorship is worse than losing the mark.

**If you are genuinely working solo,** say so plainly when asked rather than manufacturing a history. That is a far better position in a viva than being caught.

---

## Part 5 — Verify after pushing

Open the repository in a browser and check every line:

☐ `backend/.env` is **not** listed anywhere
☐ `node_modules/` is **not** listed
☐ `backend/.env.example` **is** listed, with empty secret values
☐ README renders with screenshots showing
☐ Commit count is 20+, messages are descriptive
☐ The **Contributors** panel shows everyone who worked on it
☐ Repository is **Public**

```powershell
# final safety sweep — searches the whole history, not just current files
git log --all --full-history -- backend/.env
```

Empty output = clean. **Any output at all means the file is in your history**, and you must rotate your Atlas password and both JWT secrets immediately.

---

## Part 6 — Polish that costs nothing

### Repository description and topics
Repo → **About** ⚙️ → add topics:
`nodejs` `express` `mongodb` `mongoose` `jwt` `rest-api` `ecommerce` `bcrypt` `rbac`

### Pin the demo credentials in the README
Already done — evaluators can log in within seconds of cloning.

### Add a release
Repo → **Releases** → **Create a new release** → tag `v1.0.0` → title `ShopVerse v1.0 — CIA-3 Submission`. Takes a minute and looks finished.

### Ship the report and PPT
They are in `docs/`. Attaching them to the release as well makes them easy for an evaluator to download without cloning.

---

## Daily workflow (from now until submission)

```powershell
git status                            # what changed
git add <specific files>              # stage deliberately, not always -A
git commit -m "fix(cart): correct quantity cap message"
git push
```

**Commit message prefixes** — consistency here reads as discipline:

| Prefix | Use for |
|---|---|
| `feat:` | A new feature |
| `fix:` | A bug fix |
| `docs:` | Documentation only |
| `style:` | Formatting, no logic change |
| `refactor:` | Restructuring without behaviour change |
| `test:` | Tests or Postman collection |
| `chore:` | Dependencies, config, tooling |

> **Push daily.** The risks table in the project brief names "last-minute GitHub upload issues" explicitly. Do not let the first push be the night before.

---

## If something goes wrong

| Problem | Fix |
|---|---|
| `.env` was committed | `git rm --cached backend/.env`, commit, push — **then rotate all secrets**, because it stays in history |
| `node_modules` was committed | `git rm -r --cached backend/node_modules`, commit, push |
| Push rejected, "fetch first" | `git pull --rebase origin main` then push again |
| Wrong author on commits | `git config user.name` / `user.email`, then re-commit future work correctly |
| Push asks for a password | Use a Personal Access Token (Part 2) |
| Repo too large | Confirm `node_modules` is excluded; consider downscaling `docs/screenshots/` |
| Committed to the wrong branch | `git branch -m main` to rename, or cherry-pick across |

**Undo the last commit but keep your files:**
```powershell
git reset --soft HEAD~1
```

---

## One-line summary

Commit in sprint order with descriptive messages, get every teammate's name into the history honestly, confirm `.env` never appears, and push daily rather than once.
