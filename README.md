# MARKETLY

MARKETLY is a full-stack, multi-vendor marketplace with three distinct roles: **buyer**, **seller**, and **admin**. It combines a public storefront with role-specific dashboards, server-enforced authorization, real MongoDB persistence, Better Auth sessions, server-side pricing and commission logic, Cloudinary uploads, and a **portfolio-mode payment system** that works locally without any paid gateway account.

> **Status:** the full app builds and passes unit, smoke, workflow, payment, and production-configuration checks locally. Online payments use a clearly-labelled simulated provider by default. SSLCommerz remains an optional adapter and needs sandbox credentials only if you want to test it (see [Verification status](#verification-status)).

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Demo accounts](#demo-accounts)
- [Scripts](#scripts)
- [API overview](#api-overview)
- [Authorization and business rules](#authorization-and-business-rules)
- [Database model](#database-model)
- [Testing](#testing)
- [Deployment notes](#deployment-notes)
- [Render deployment](#render-deployment)
- [Verification status](#verification-status)

---

## Features

### Public storefront

- Responsive home page with trending products, categories, and featured stores.
- Product browsing, filtering, sorting, search, and detailed product pages with related items.
- 66 seeded products across six categories, with local SVG placeholders ready to be swapped for hosted photography.
- Category and store pages.
- Cart with server-calculated prices, shipping, and totals.
- Wishlist, addresses, reviews, notifications, and account profile.
- Checkout with **Cash on Delivery (COD)** or a fully simulated online provider (success / failure / cancellation scenarios).
- Clearly labelled simulated transactions; no card details or real money are involved.
- Buyer payment history, admin payment dashboard, refund simulation, and order↔payment linkage.
- Seller finance ledger with commissions, balances, pending/completed simulated payouts.
- Optional SSLCommerz sandbox adapter and validated gateway IPN handling when credentials are supplied.
- Contact form and newsletter subscription.

### Buyer dashboard

- Order history and order details with per-item status.
- Payment history with status, mode, and transaction references.
- Address book, wishlist, reviews, notifications, and profile settings.

### Seller dashboard

- Private store profile management.
- Product CRUD, inventory updates, and image uploads.
- Seller-scoped orders: a seller can only see and update items belonging to their own store.
- Earnings and commission views derived from the seller's own line items only.
- Server-owned finance ledger: earnings, available balance, pending payouts, paid-out total, refunds.
- COD cash collection confirmation per order item (settles the order when all sellers confirm).

### Admin dashboard

- Platform overview, analytics, revenue chart data, and commission reports.
- User and seller management.
- Seller application review/approval workflow.
- Category management.
- Product moderation.
- Order delivery tracking and COD cash collection updates.
- Payment dashboard, refund simulation, marketplace finance overview.
- Manual simulated payout requests and completion/cancellation.
- Review deletion and marketplace settings.

### Security and correctness

- Better Auth email/password authentication with HTTP-only cookie sessions.
- Public registration is always `buyer`; elevated roles cannot be self-assigned.
- Backend role checks on every protected endpoint (`requireAuth`, `requireSeller`, `requireActiveSeller`, `requireAdmin`, `requireBuyer`).
- Zod request validation and centralized error handling.
- Server-side price recalculation, stock checks, commission calculation, and transactional order creation.
- Payment status is always decided by the backend; the result page verifies with the API and never trusts URL parameters.
- Unique transaction IDs, checkout tokens, duplicate init/verify protection, and order-total revalidation before settlement.
- Idempotent refund and COD collection handling; seller earnings credited/reversed per seller line item.
- Duplicate payment callback protection and gateway validation for SSLCommerz callbacks.
- Rate limiting and security headers via `express-rate-limit` and `helmet`.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| UI | shadcn/ui-style primitives built with Radix, CVA, Lucide icons |
| Forms | React Hook Form + Zod, Sonner toasts |
| Charts | Recharts |
| HTTP client | Axios |
| Backend | Express 5, Node.js 20+ |
| Auth | Better Auth with MongoDB adapter |
| Database | MongoDB / MongoDB Atlas, Mongoose 9 |
| Validation | Zod |
| Uploads | Multer + Cloudinary |
| Payments | Portfolio-mode simulated provider, COD, optional SSLCommerz sandbox |
| Dev tooling | Nodemon, concurrently |

---

## Project structure

```text
E:\E-Commerce
├── client/                     # Next.js storefront + dashboards
│   ├── app/
│   │   ├── page.jsx            # Home
│   │   ├── shop/               # Catalog
│   │   ├── products/[slug]/    # Product detail
│   │   ├── cart/ checkout/ wishlist/
│   │   ├── stores/ categories/ search/
│   │   ├── login/ register/
│   │   ├── dashboard/[role]/[[...section]]/  # buyer | seller | admin dashboards
│   │   ├── payment/checkout/       # Simulated provider checkout scenarios
│   │   └── payment/result/         # Backend-verified payment result
│   ├── components/             # UI primitives and feature components
│   ├── services/               # Axios API layer
│   └── .env.example
├── server/                     # Express API
│   ├── src/
│   │   ├── app.js / server.js
│   │   ├── config/             # env, db, auth, Cloudinary
│   │   ├── controllers/        # Request handlers
│   │   ├── middleware/         # auth, validation, upload, errors
│   │   ├── models/             # Mongoose schemas
│   │   ├── routes/             # REST routes
│   │   ├── services/           # Marketplace pricing, payments, and finance helpers
│   │   ├── utils/              # API responses, serialization, payment helpers
│   │   ├── validators.js       # Zod schemas
│   │   └── scripts/            # seed, smoke, workflow, and verification scripts
│   └── .env.example
├── package.json                # Root convenience scripts
└── README.md
```

---

## Prerequisites

- **Node.js 20+** (developed and verified with Node 22).
- npm 10+.
- A MongoDB database. MongoDB Atlas is recommended for replicaset/transaction support.
- Optional: Cloudinary credentials for seller image uploads.
- Optional: SSLCommerz **sandbox** credentials. Not needed — simulated checkout works out of the box.

---

## Quick start

```powershell
# 1. Install root tooling and both workspaces
npm run install:all

# 2. Create local env files (never commit real values)
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env.local

# 3. Edit server\.env and set at minimum:
#    MONGODB_URI, BETTER_AUTH_SECRET, BETTER_AUTH_URL, CLIENT_URL, CORS_ORIGIN

# 4. Seed demo categories, stores, users, and products
npm run seed

# 5. Start API + web app together
npm run dev
```

- Web app: `http://localhost:3000`
- API: `http://localhost:5000/api`
- Health: `http://localhost:5000/api/health`

To stop both processes, press `Ctrl+C` in the terminal running `npm run dev`.

---

## Environment variables

### `server/.env`

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | API port, defaults to `5000` |
| `NODE_ENV` | No | `development` by default |
| `MONGODB_URI` | **Yes** | MongoDB Atlas connection string |
| `DB_NAME` | No | Database name, defaults to `marketly` |
| `BETTER_AUTH_SECRET` | **Yes** | Random secret for session/cookie signing |
| `BETTER_AUTH_URL` | **Yes** | Public API origin, e.g. `http://localhost:5000` |
| `CLIENT_URL` | **Yes** | Web origin, e.g. `http://localhost:3000` |
| `CORS_ORIGIN` | **Yes** | Allowed browser origin |
| `CLOUDINARY_CLOUD_NAME` | For uploads | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | For uploads | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | For uploads | Cloudinary API secret |
| `SSLCOMMERZ_STORE_ID` | Optional | SSLCommerz sandbox store ID. Only needed for the optional adapter. |
| `SSLCOMMERZ_STORE_PASSWORD` | Optional | SSLCommerz sandbox store password. Only needed for the optional adapter. |
| `SSLCOMMERZ_SANDBOX` | No | `true` for sandbox. Without credentials, the API returns a clear 503 and the UI offers simulated methods. |
| `COMMISSION_PERCENT` | No | Platform commission %, default `10` |
| `FLAT_SHIPPING_FEE` | No | Flat shipping fee, default `60` |
| `FREE_SHIPPING_OVER` | No | Free shipping threshold, default `5000` |
| `SEED_*` | For seeding | Demo account emails/passwords |

Generate a `BETTER_AUTH_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### `client/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For deployment, point these at your real public API and web origins. Never expose server secrets in `client/.env.local`.

### Portfolio payment mode

No paid gateway registration is required. The API advertises available methods at `GET /api/payments/methods`:

| Method | Mode | Description |
| --- | --- | --- |
| `cod` | `offline` | Order stays unpaid until cash collection is confirmed by an authorized admin or seller. |
| `mock` | `simulated` | Demo card / mobile banking / bank transfer checkout with success, failure and cancel scenarios. |
| `sslcommerz` | `simulated` (sandbox) or `live` | Optional adapter. Hidden from checkout when credentials are absent. |

Key rules:

- The `outcome` sent from the checkout UI is only a **scenario selector**. The backend maps it to `paid` / `failed` / `cancelled`.
- Payment amounts are re-read from the order in the database and compared before settlement.
- Each simulated transaction has a unique `SIM-…` reference and a server-issued checkout token; verifying twice returns the original result.
- The result page calls the API for the authoritative status — `?status=success` in a URL proves nothing.
- COD transactions use `COD-…` references. The whole order settles only when every seller item is collected, or when an admin forcibly confirms collection.
- Payouts and refunds are **simulations** recorded in a seller ledger. No bank transfer or gateway refund API is invoked.
- Simulated records are labelled in every dashboard (`simulated: true`, mode `simulated` / `offline`).

---

## Demo accounts

Created by `npm run seed`:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@marketly.test` | `Admin@12345` |
| Seller | `seller@marketly.test` | `Seller@12345` |
| Buyer | `buyer@marketly.test` | `Buyer@12345` |
| Seller | `studio@marketly.test` | `Studio@12345` |
| Seller | `living@marketly.test` | `Living@12345` |

Change the `SEED_*` values in `server/.env` before seeding if you do not want the defaults. Never use these accounts in production.

---

## Scripts

Run from the repository root:

| Command | Description |
| --- | --- |
| `npm run install:all` | Install root, server, and client dependencies |
| `npm run dev` | Start API and web app with hot reload |
| `npm run build` | Syntax-check the server and build the Next.js client |
| `npm run seed` | Seed demo data and all 66 products into MongoDB |
| `npm run seed:products` | Upsert only the 54 catalog additions |
| `npm run placeholders` | Regenerate the 54 local SVG product images |
| `npm run smoke` | Run the live API smoke test |
| `npm run workflow` | Run the full live buyer/seller/admin workflow test |
| `npm run verify:payments` | Run the live payment lifecycle verification (mock success/failure/cancel, COD, refunds, payouts) |
| `npm run verify:production` | Verify local production configuration, CORS, and `/api/health` |
| `npm test` | Run server unit tests (including payment utility math) |
| `npm start` | Start both apps in production mode |

From `server/`:

| Command | Description |
| --- | --- |
| `npm run smoke` | Run the live API smoke test against a running API |
| `npm run workflow` | Run the full live buyer/seller/admin workflow test |
| `npm run verify:payments` | Run the live payment lifecycle verification |
| `npm run verify:production` | Verify production env, CORS, and health checks |
| `npm test` | Run server unit tests |

From `client/`:

| Command | Description |
| --- | --- |
| `npm run lint` | Lint the Next.js app |

---

## API overview

All endpoints are prefixed with `/api`. Responses use a consistent shape such as `{ success: true, data, meta }` or `{ success: false, error }`.

### Public

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| GET | `/api/catalog/home` | Homepage aggregations |
| GET | `/api/catalog/categories` | Category list |
| GET | `/api/catalog/products` | Product list with filtering, sorting, pagination |
| GET | `/api/catalog/products/:slug` | Product detail and related products |
| GET | `/api/catalog/stores` | Store list |
| GET | `/api/catalog/stores/:slug` | Store detail |
| POST | `/api/catalog/newsletter` | Newsletter subscription |
| POST | `/api/catalog/contact` | Contact message |
| GET | `/api/reviews/:productId` | Product reviews |

### Better Auth

Handled by Better Auth at `/api/auth/*`: sign-up, sign-in, sign-out, sessions, and cookie management. Public sign-up defaults to `buyer`.

### Buyer / authenticated user

| Method | Endpoint | Description |
| --- | --- | --- |
| GET/PATCH | `/api/users/me` | Profile |
| POST | `/api/users/seller-application` | Apply to become a seller |
| GET | `/api/users/seller-application/me` | My application |
| GET/POST/PATCH/DELETE | `/api/users/addresses` | Address book |
| GET | `/api/users/wishlist` | Wishlist |
| POST/DELETE | `/api/users/wishlist/:productId` | Toggle wishlist item |
| GET | `/api/users/reviews` | My reviews |
| GET/PATCH | `/api/users/notifications` | Notifications |
| GET/POST/PATCH/DELETE | `/api/cart` | Cart |
| POST | `/api/orders` | Checkout (`cod`, `mock` or `sslcommerz`) |
| GET | `/api/orders`, `/api/orders/:id` | My orders |
| POST | `/api/orders/:id/cancel` | Cancel order |
| POST | `/api/reviews` | Create review |
| DELETE | `/api/reviews/:id` | Delete own review |

### Seller

| Method | Endpoint | Description |
| --- | --- | --- |
| GET/PATCH | `/api/sellers/me` | Store profile |
| GET/POST | `/api/sellers/me/products` | Own products |
| GET/PUT/DELETE | `/api/sellers/me/products/:id` | Own product management |
| PATCH | `/api/sellers/me/inventory/:id` | Inventory update |
| GET | `/api/sellers/me/orders` | Orders containing this seller's items |
| GET | `/api/sellers/me/earnings` | Earnings |
| GET | `/api/sellers/me/commissions` | Commission records |
| GET | `/api/sellers/me/finance`, `/api/sellers/me/payouts` | Seller ledger and payout history |
| PATCH | `/api/orders/:id/items/:itemId` | Update own order item status (including COD cash collection) |
| POST | `/api/upload/product-images` | Cloudinary product image upload |

### Admin

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/admin/overview` | Dashboard statistics |
| GET/PATCH | `/api/admin/users` | User management |
| GET/PATCH | `/api/admin/sellers` | Seller management |
| GET/PATCH | `/api/admin/applications` | Seller application decisions |
| GET/POST/PUT/DELETE | `/api/admin/categories` | Category management |
| GET/PATCH/DELETE | `/api/admin/products` | Product moderation |
| GET/PATCH | `/api/admin/orders` | Order management |
| PATCH | `/api/admin/orders/:id/delivery` | Delivery status and forced COD cash collection |
| GET/POST | `/api/admin/payments` | Payments and refunds |
| GET | `/api/admin/finance` | Marketplace finance overview |
| GET/POST/PATCH | `/api/admin/payouts` | Simulated payout lifecycle |
| GET | `/api/admin/commissions`, `/api/admin/analytics` | Reports |
| GET/PUT | `/api/admin/settings` | Marketplace settings |
| DELETE | `/api/admin/reviews/:id` | Remove review |

### Payments

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/payments/methods` | Discover available methods (`cod`, `mock`, optional `sslcommerz`) |
| GET | `/api/payments/history` | Buyer payment history |
| GET | `/api/payments/mock/session` | Authoritative details for a simulated checkout token |
| POST | `/api/payments/mock/init` | Start a simulated checkout session |
| POST | `/api/payments/mock/verify` | Apply a backend-mapped success/failure/cancel scenario |
| POST | `/api/payments/sslcommerz/init` | Initialize SSLCommerz session (optional adapter) |
| GET | `/api/payments/sslcommerz/success` | Verified buyer return callback |
| GET | `/api/payments/sslcommerz/fail` | Failed payment callback |
| GET | `/api/payments/sslcommerz/cancel` | Cancelled payment callback |
| ALL | `/api/payments/sslcommerz/ipn` | Verified server-to-server IPN |
| GET | `/api/payments/:orderId` | Payment record for an order |

Mock checkout is available without any credentials. Gateway callbacks are public because SSLCommerz calls them server-to-server, but they are verified with the SSLCommerz validation API and guarded against duplicate processing.

---

## Authorization and business rules

- A user's `role` is a **server-owned Better Auth additional field** with `input: false`; clients cannot set it during registration.
- New accounts are `buyer` until an admin approves a seller application.
- Sellers must have an active approved seller profile to access seller APIs and uploads.
- Admin-only endpoints use `requireAdmin`; seller endpoints use `requireActiveSeller`; buyer/cart operations use `requireAuth`/`requireBuyer`.
- Checkout re-reads product prices from the database; client-supplied prices are ignored.
- Cart quantities are validated against available stock.
- Successful order creation decrements stock atomically in a MongoDB transaction where supported.
- Order cancellation restores stock for unpaid/cancellable orders and cancels pending payments.
- Platform commission and seller earnings are calculated server-side from configured settings.
- Seller order queries filter by the seller's own store ID; cross-seller order items are never returned or editable.
- Payment status is **backend-owned**. The simulated `outcome` is only a scenario selector; the API maps it to `paid`, `failed`, or `cancelled`.
- Payment amounts are re-read from the order and compared before settlement. Unique IDs, checkout tokens, and idempotency keys prevent duplicate processing.
- The result page verifies the payment with the API; `?status=success` in a URL cannot mark an order as paid.
- COD orders stay `pending` until cash collection is confirmed. An admin can settle the whole order; a seller can confirm only their own items, and the order settles when every seller item is collected.
- Refunds go through the payment record, couple order state, and reverse the seller ledger. Admin cannot set `refunded` directly on an order.
- Payouts are manual ledger simulations with pending → completed/cancelled states. No bank transfer or gateway refund API is called.
- SSLCommerz is optional: without credentials, init returns a clear `503` and checkout offers simulated methods instead.

---

## Database model

Main Mongoose collections:

- `users` (Better Auth user + marketplace role)
- `sessions`, `accounts`, `verifications` (Better Auth)
- `categories`
- `stores` / `sellerprofiles` (store settings, stats, server-owned finance ledger)
- `products`
- `carts`
- `orders` with embedded order items, delivery tracking, and payment snapshots
- `payments` with gateway/mode, transaction references, checkout tokens, timeline, and refund details
- `payouts` with simulated lifecycle references and seller ledger effects
- `reviews`
- `addresses`
- `wishlists`
- `notifications`
- `sellerapplications`
- `commissions`
- `settings`
- `newsletters`, `contactmessages`

Indexes and unique slugs/emails are defined in the model files. Payment transaction IDs, checkout tokens, payout references, and pending payment-per-order are uniquely indexed. MongoDB Atlas is recommended so multi-document transactions work for checkout, settlement, refunds, and stock updates.

---

## Testing

```powershell
npm test                     # Server unit tests, including payment utility math
npm run build                # Server syntax check + production client build
npm run smoke                # Live API smoke test (API + seeded DB must be running)
npm run workflow             # Full live workflow test (API + seeded DB must be running)
npm run verify:payments      # Live payment lifecycle verification (API + seeded DB must be running)
npm run verify:production    # Production env, CORS, and /api/health checks
```

The smoke test verifies health, catalog aggregation, product listing/detail, role-based sign-in, buyer→admin denial (403), seller isolation, and admin statistics from the database.

The workflow test verifies the full transactional path against the live database: cart pricing, COD checkout, commission records, stock decrement and restoration, seller order isolation, cross-seller update denial, admin order management, the seller-application approval lifecycle, seller product CRUD, and cancellation/payment state.

The payment verification covers simulated success, failure and cancel scenarios, server-generated checkout tokens, amount revalidation, duplicate verification, buyer history, COD collection by admin and seller, admin finance, payout request/completion, refund simulation, ledger reversal, and role denials. It needs no gateway credentials.

Manual checks still recommended:

1. Upload a seller product image (requires Cloudinary credentials).
2. Exercise optional SSLCommerz sandbox init and callback/IPN flow (requires SSLCommerz sandbox credentials; simulated checkout works without them).
3. Submit a review and verify admin deletion.
4. Update marketplace settings and verify commission/shipping changes affect new orders.
5. With two active sellers, partially collect a mixed-store COD order and confirm it settles only after the last seller confirms.

---

## Deployment notes

- Serve the Express API and Next.js app over HTTPS in production.
- Set `NODE_ENV=production`, strong `BETTER_AUTH_SECRET`, and exact `BETTER_AUTH_URL`, `CLIENT_URL`, and `CORS_ORIGIN` values.
- Leave `ALLOW_VERCEL_PREVIEWS=false` unless you intentionally want any `*.vercel.app` preview origin to call the API.
- Use Atlas IP allowlisting and a least-privilege database user.
- Keep Cloudinary and SSLCommerz secrets in the hosting provider's secret manager; do not commit `.env` files.
- Simulated checkout, COD tracking, refunds, and payouts work without any gateway or bank credentials.
- If you enable the optional SSLCommerz adapter, configure its callback/IPN URLs to your public API domain (`/api/payments/sslcommerz/...`).
- For horizontal scaling, use a shared MongoDB Atlas cluster (sessions and carts are database-backed).
- Replace demo seed accounts and credentials before exposing the app publicly.

---

## Render deployment

Deploy only the **Express backend** to Render; the Next.js frontend is deployed separately on Vercel.

The server is production-ready: it binds to `0.0.0.0`, listens on `process.env.PORT` (fallback `5000`), validates required environment variables at startup, uses an explicit CORS allow-list for the Vercel origin, and exposes `/api/health` for Render health checks.

### Build and start commands

Create a **Web Service** on Render pointing at this repository. Two valid configurations:

**Option A — Root Directory is the repository root (recommended):**

| Setting | Value |
| --- | --- |
| Root Directory | leave as repo root (`.`) |
| Runtime | Node |
| Build Command | `npm install && npm install --prefix server` |
| Start Command | `npm --prefix server start` |

**Option B — Root Directory is `server`:**

| Setting | Value |
| --- | --- |
| Root Directory | `server` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |

Do **not** use `npm run dev` or a process manager wrapper as the start command. The `start` script runs `node src/server.js` directly.

### Production environment variables (set in the Render dashboard)

Never commit a `.env` file. Add these as secret environment variables on the Render service.

| Variable | Example / value | Required | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | `production` | Yes | Enables strict startup validation and production Mongo pool settings. |
| `HOST` | `0.0.0.0` | Recommended | Default is already `0.0.0.0`. |
| `PORT` | set by Render | Auto | Render injects this; the app falls back to `5000` locally. |
| `MONGODB_URI` | Atlas SRV connection string | Yes | Use a least-privilege Atlas user; allowlist `0.0.0.0/0` only if Render's egress IPs are not pinned, otherwise add Render's static outbound IPs. |
| `DB_NAME` | `marketly` | Recommended | Atlas database name. |
| `BETTER_AUTH_SECRET` | unique random string, 32+ chars | Yes | Generate with `openssl rand -base64 32`; never reuse the demo value. |
| `BETTER_AUTH_URL` | `https://<your-api>.onrender.com` | Yes | Exact public Render URL of this API. |
| `CLIENT_URL` | `https://<your-app>.vercel.app` | Yes | Exact public Vercel frontend origin. |
| `CORS_ORIGIN` | `https://<your-app>.vercel.app` | Yes | Must match the deployed Vercel origin exactly (no trailing slash). |
| `ALLOW_VERCEL_PREVIEWS` | `false` | Optional | Set `true` only if you need `*.vercel.app` preview deployments to call the API. |
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary | Optional | Required for product image upload. |
| `CLOUDINARY_API_KEY` | from Cloudinary | Optional | Required for product image upload. |
| `CLOUDINARY_API_SECRET` | from Cloudinary | Optional | Required for product image upload. |
| `SSLCOMMERZ_STORE_ID` | from SSLCommerz | Optional | Only needed for the optional SSLCommerz adapter; simulated checkout works when blank. |
| `SSLCOMMERZ_STORE_PASSWORD` | from SSLCommerz | Optional | Only needed for the optional SSLCommerz adapter. |
| `SSLCOMMERZ_SANDBOX` | `false` in production | Optional | Defaults to `true`; set to `false` only for live gateway mode. |
| `COMMISSION_PERCENT` | `10` | Optional | Server-side marketplace commission. |
| `FLAT_SHIPPING_FEE` | `60` | Optional | Flat shipping fee. |
| `FREE_SHIPPING_OVER` | `5000` | Optional | Free-shipping threshold. |

### Verify before and after deploying

Locally (uses the repository `.env` for the Atlas URI and auth secret, plus placeholder public URLs):

```bash
npm run verify:production
```

This checks: production env validation, Atlas connection, `0.0.0.0` bind, `process.env.PORT`, `/api/health`, Vercel origin allowed, credentials allowed, and unknown origins rejected.

After Render finishes deploying, verify the real deployment:

```bash
curl https://<your-api>.onrender.com/api/health
curl -I -X OPTIONS https://<your-api>.onrender.com/api/health \
  -H "Origin: https://<your-app>.vercel.app" \
  -H "Access-Control-Request-Method: GET"
```

Confirm the health response shows `"db": "connected"` and the preflight returns `access-control-allow-origin: https://<your-app>.vercel.app`. Then sign in from the deployed frontend to confirm cookies/sessions work across the two domains. A successful Render deployment is only claimed after these live checks pass.

---

## Verification status

Completed locally:

- Server syntax check passed.
- Server unit tests passed (11/11, including payment utility math).
- Client production build passed with the simulated checkout and result routes included.
- MongoDB Atlas connection and demo seeding passed.
- API smoke test passed (11/11 checks).
- Full live workflow test passed (28/28 checks), including cart, checkout, stock, commission, seller isolation, admin operations, seller approval, product CRUD, and cancellation.
- Portfolio payment verification passed (`npm run verify:payments`): simulated success/failure/cancel, idempotency, amount revalidation, COD collection, admin finance, payouts, refunds, ledger reversal, and role denials.
- Catalog verified at 66 products; the 54 local SVG placeholders serve correctly through the Next.js image optimizer.
- Local production configuration verified (`npm run verify:production`): Atlas connection, `0.0.0.0` bind, `process.env.PORT`, `/api/health`, Vercel origin CORS allow/reject.

Pending optional or external verification:

- Cloudinary image upload (requires Cloudinary credentials).
- SSLCommerz sandbox init and callback/IPN flow (optional adapter; requires sandbox credentials).
- Replacing the local SVG placeholders with hosted product photography.
- Render deployment and its live `/api/health`, CORS preflight, and cross-domain session checks.

No real MongoDB, Cloudinary, or SSLCommerz credentials are included in this repository. Simulated checkout needs no paid gateway account.
