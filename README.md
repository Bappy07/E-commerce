# MARKETLY

MARKETLY is a full-stack, multi-vendor marketplace with three distinct roles: **buyer**, **seller**, and **admin**. It combines a public storefront with role-specific dashboards, server-enforced authorization, real MongoDB persistence, Better Auth sessions, server-side pricing and commission logic, Cloudinary uploads, and SSLCommerz sandbox payments.

> **Status:** the codebase builds and the automated unit checks pass. Live database, image-upload, and payment-gateway verification require your own credentials (see [Verification status](#verification-status)).

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
- Checkout with **Cash on Delivery (COD)** or **SSLCommerz sandbox** online payment.
- Payment success/fail/cancel result pages and public, validated gateway IPN handling.
- Contact form and newsletter subscription.

### Buyer dashboard

- Order history and order details with per-item status.
- Address book, wishlist, reviews, notifications, and profile settings.

### Seller dashboard

- Private store profile management.
- Product CRUD, inventory updates, and image uploads.
- Seller-scoped orders: a seller can only see and update items belonging to their own store.
- Earnings and commission views derived from database records.

### Admin dashboard

- Platform overview, analytics, revenue chart data, and commission reports.
- User and seller management.
- Seller application review/approval workflow.
- Category management.
- Product moderation.
- Order management, payment list, and refund recording.
- Review deletion and marketplace settings.

### Security and correctness

- Better Auth email/password authentication with HTTP-only cookie sessions.
- Public registration is always `buyer`; elevated roles cannot be self-assigned.
- Backend role checks on every protected endpoint (`requireAuth`, `requireSeller`, `requireActiveSeller`, `requireAdmin`, `requireBuyer`).
- Zod request validation and centralized error handling.
- Server-side price recalculation, stock checks, commission calculation, and transactional order creation.
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
| Payments | SSLCommerz sandbox, COD |
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
│   │   └── payment/result/
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
│   │   ├── services/           # Marketplace pricing/commission helpers
│   │   ├── utils/              # API responses, serialization, helpers
│   │   ├── validators.js       # Zod schemas
│   │   └── scripts/            # seed.js, smoke.js
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
- Optional: SSLCommerz **sandbox** credentials for online payment testing.

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
| `SSLCOMMERZ_STORE_ID` | For online pay | SSLCommerz sandbox store ID |
| `SSLCOMMERZ_STORE_PASSWORD` | For online pay | SSLCommerz sandbox store password |
| `SSLCOMMERZ_SANDBOX` | No | `true` for sandbox |
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
| `npm test` | Run server unit tests |
| `npm start` | Start both apps in production mode |

From `server/`:

| Command | Description |
| --- | --- |
| `npm run smoke` | Run the live API smoke test against a running API |

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
| POST | `/api/orders` | Checkout (COD or online init) |
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
| PATCH | `/api/orders/:id/items/:itemId` | Update own order item status |
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
| GET/POST | `/api/admin/payments` | Payments and refunds |
| GET | `/api/admin/commissions`, `/api/admin/analytics` | Reports |
| GET/PUT | `/api/admin/settings` | Marketplace settings |
| DELETE | `/api/admin/reviews/:id` | Remove review |

### Payments

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/payments/sslcommerz/init` | Initialize SSLCommerz session |
| GET | `/api/payments/sslcommerz/success` | Verified buyer return callback |
| GET | `/api/payments/sslcommerz/fail` | Failed payment callback |
| GET | `/api/payments/sslcommerz/cancel` | Cancelled payment callback |
| ALL | `/api/payments/sslcommerz/ipn` | Verified server-to-server IPN |
| GET | `/api/payments/:orderId` | Payment record for an order |

Gateway callbacks are public because SSLCommerz calls them server-to-server, but they are verified with the SSLCommerz validation API and guarded against duplicate processing.

---

## Authorization and business rules

- A user's `role` is a **seller-owned Better Auth additional field** with `input: false`; clients cannot set it during registration.
- New accounts are `buyer` until an admin approves a seller application.
- Sellers must have an active approved seller profile to access seller APIs and uploads.
- Admin-only endpoints use `requireAdmin`; seller endpoints use `requireActiveSeller`; buyer/cart operations use `requireAuth`/`requireBuyer`.
- Checkout re-reads product prices from the database; client-supplied prices are ignored.
- Cart quantities are validated against available stock.
- Successful order creation decrements stock atomically in a MongoDB transaction where supported.
- Order cancellation restores stock for unpaid/cancellable orders.
- Platform commission is calculated server-side from configured settings.
- Seller order queries filter by the seller's own store ID; cross-seller order items are never returned or editable.
- Admin refunds record refund state and reason rather than calling a gateway refund API.

---

## Database model

Main Mongoose collections:

- `users` (Better Auth user + marketplace role)
- `sessions`, `accounts`, `verifications` (Better Auth)
- `categories`
- `stores` / `sellerprofiles`
- `products`
- `carts`
- `orders` with embedded order items
- `payments`
- `reviews`
- `addresses`
- `wishlists`
- `notifications`
- `sellerapplications`
- `commissions`
- `settings`
- `newsletters`, `contactmessages`

Indexes and unique slugs/emails are defined in the model files. MongoDB Atlas is recommended so multi-document transactions work for checkout and stock updates.

---

## Testing

```powershell
npm test                     # Server unit tests (node --test)
npm run build                # Server syntax check + production client build
npm run smoke                # Live API smoke test (API + seeded DB must be running)
npm run workflow             # Full live workflow test (API + seeded DB must be running)
```

The smoke test verifies health, catalog aggregation, product listing/detail, role-based sign-in, buyer→admin denial (403), seller isolation, and admin statistics from the database.

The workflow test verifies the full transactional path against the live database: cart pricing, COD checkout, commission records, stock decrement and restoration, seller order isolation, cross-seller update denial, admin order management, the seller-application approval lifecycle, seller product CRUD, and cancellation/payment state.

Manual checks still recommended:

1. Upload a seller product image (requires Cloudinary credentials).
2. Initialize a sandbox online payment and exercise success/fail/cancel/IPN callbacks (requires SSLCommerz sandbox credentials).
3. Submit a review and verify admin deletion.
4. Update marketplace settings and verify commission/shipping changes affect new orders.

---

## Deployment notes

- Serve the Express API and Next.js app over HTTPS in production.
- Set `NODE_ENV=production`, strong `BETTER_AUTH_SECRET`, and exact `BETTER_AUTH_URL`, `CLIENT_URL`, and `CORS_ORIGIN` values.
- Use Atlas IP allowlisting and a least-privilege database user.
- Keep Cloudinary and SSLCommerz secrets in the hosting provider's secret manager; do not commit `.env` files.
- Configure SSLCommerz callback/IPN URLs to your public API domain (`/api/payments/sslcommerz/...`).
- For horizontal scaling, use a shared MongoDB Atlas cluster (sessions and carts are database-backed).
- Replace demo seed accounts and credentials before exposing the app publicly.

---

## Verification status

Completed:

- Server syntax check passed.
- Server unit tests passed (7/7).
- Client production build passed.
- MongoDB Atlas connection and demo seeding passed.
- API smoke test passed (11/11 checks).
- Full live workflow test passed (28/28 checks), including cart, checkout, stock, commission, seller isolation, admin operations, seller approval, product CRUD, and cancellation.
- Catalog verified at 66 products; the 54 local SVG placeholders serve correctly through the Next.js image optimizer.

Pending live verification (requires credentials you have not supplied):

- Cloudinary image upload.
- SSLCommerz sandbox init and callback/IPN flow.
- Replacing the local SVG placeholders with hosted AI-generated product photography.

No real MongoDB, Cloudinary, or SSLCommerz credentials are included in this repository.
