# StoreHike

An e-commerce store builder for sellers currently doing business in Instagram or Whatsapp DMs. Sellers get a hosted storefront with products, cart, Paystack checkout, order management, and WhatsApp for customer communication.

Stack: Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma, PostgreSQL (Supabase), Auth.js, Paystack, Cloudinary, Vercel.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env` and fill in real values. See "Accounts to create" below for where each one comes from.

- `DATABASE_URL` / `DIRECT_URL` — Postgres connection strings (pooled / direct). Prisma migrations use `DIRECT_URL`; the app uses `DATABASE_URL`.
- `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL` — Auth.js + Google sign-in.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — product images.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — order emails. Without a verified sending domain, use the `onboarding@resend.dev` default.
- `PAYSTACK_SECRET_KEY` — StoreHike's own Paystack account, used only for its own subscription billing (never for buyer orders — those are charged directly against each seller's own Paystack account via a public key they add in store settings). Unlike Flutterwave, Paystack needs no separate dashboard-configured webhook secret — the same secret key both authenticates API calls and signs webhook payloads (HMAC-SHA512, checked against the `x-paystack-signature` header). Point a Paystack webhook at `/api/webhooks/paystack` (events: `charge.success`, `invoice.payment_failed`, `subscription.disable`) on StoreHike's own account for subscription billing only.
- `NEXT_PUBLIC_APP_URL` — the site's own base URL (e.g. `https://yourdomain.com` in production). Used to build Paystack callback URLs and canonical/Open Graph URLs. Defaults to `http://localhost:3000` if unset.

## Accounts to create

| Service | What for |
|---|---|
| [Supabase](https://supabase.com) | Postgres database |
| [Cloudinary](https://cloudinary.com) | Product images |
| [Resend](https://resend.com) | Transactional email |
| [Paystack](https://paystack.com) | Checkout, subscription billing |
| [Google Cloud Console](https://console.cloud.google.com) | Google sign-in (OAuth client) |
| [Vercel](https://vercel.com) | Hosting + custom domains |

## Database

Schema lives in `prisma/schema.prisma`. Migrations are in `prisma/migrations/`.

```bash
npx prisma migrate dev     # create/apply a migration
npx prisma db seed         # seed the demo store
npx prisma studio          # browse data
```

**Note on Supabase + Prisma:** `npx prisma migrate dev` hangs against Supabase's pooled connection — PgBouncer transaction-mode pooling doesn't support the shadow database Prisma's schema engine creates to diff migrations. `DIRECT_URL` (port 5432, session mode) is configured in both `prisma/schema.prisma` and `prisma.config.ts` so `migrate status`/`migrate resolve` at least bypass the pooler, but for *new* migrations use this workaround instead of `migrate dev`:

```bash
# 1. Get the previous schema version (before your edit) from git — diffing
#    two schema FILES needs no shadow database and touches no live DB at all.
git show HEAD:prisma/schema.prisma > /tmp/prev-schema.prisma

# 2. Generate the SQL delta purely from those two files.
ts=$(date +%Y%m%d%H%M%S) && dir="prisma/migrations/${ts}_your_migration_name" && mkdir -p "$dir"
npx prisma migrate diff --from-schema-datamodel /tmp/prev-schema.prisma --to-schema-datamodel prisma/schema.prisma \
  --script > "$dir/migration.sql"

# 3. Apply it and record it as applied.
npx prisma db execute --file "$dir/migration.sql" --url "$DIRECT_URL"
npx prisma migrate resolve --applied "${ts}_your_migration_name"
```

Set `CHECKPOINT_DISABLE=1` on any `prisma` command — its update-check network call can hang on some networks.

**⚠️ Never pass `--shadow-database-url` (or `--from-migrations`, which requires one) pointed at `DIRECT_URL` or `DATABASE_URL`.** Prisma treats the shadow database as disposable scratch space — it wipes it and replays the full migration history into it to compute the diff. Pointing that at the real database wiped all data (schema intact, every row gone) twice during development before this was caught. The file-to-file diff above (`--from-schema-datamodel` on both sides) needs no database connection and cannot do this.

## Testing

```bash
npm test
```

`tests/order-pricing.test.ts` is pure unit tests (server-side re-pricing of the cart — a client can never inject its own prices). `tests/inventory.test.ts` runs against the real dev database, exercising the atomic stock-reservation `UPDATE ... WHERE stockQuantity >= ?` that prevents overselling under concurrent checkouts.

## Storefront and checkout notes

- Public storefront: `/shop/[slug]` (home, `/category/[slug]`, `/product/[slug]`, `/cart`, `/checkout`, `/order/[orderNumber]`). Cart is client-side (localStorage), scoped per store.
- **Stock is reserved atomically at order creation**, not at payment confirmation as a literal reading of "decrement on payment confirmation" might suggest. Two buyers racing for the last unit both create PENDING orders, but only one atomic `UPDATE` wins — the other fails immediately with a clear "out of stock" error instead of both appearing to succeed and one getting cancelled later. Payment confirmation (webhook) only flips order status; it never touches stock, which also keeps webhook replays naturally idempotent.
- Buyer card checkout runs entirely client-side against **the seller's own** Paystack account (their public key, added in store settings, passed straight to the Paystack Popup widget) — StoreHike's server never calls Paystack for buyer orders, and there's no subaccount/split: the seller gets the full amount directly. Payment is confirmed by trusting the widget's client-side callback (`confirmPaystackPayment` in `src/lib/actions/order-status.ts`) — there's no secret key available to re-verify server-side without asking every seller to hand one over, a deliberate trade-off. This is different from StoreHike's *own* subscription billing below, which does use a real secret key and webhook.
- **Paystack amounts are in kobo** (the currency's smallest unit), not major units like Naira — `initializeTransaction`/the checkout widget call multiply by 100 at the API/widget boundary only, so the rest of the app (order totals, prices) always works in plain Naira. Getting this wrong would under/overcharge by 100x, so it's called out explicitly here (see `src/lib/paystack.ts`).
- StoreHike's own subscription billing (`/api/webhooks/paystack`) *is* server-verified: the webhook checks the `x-paystack-signature` HMAC, then re-fetches the transaction from Paystack's `/transaction/verify/{reference}` API before trusting it (see `src/lib/paystack.ts`).

The demo store (`chunkz`) seeds 12 products across 3 categories (some with size/colour variants), 3 shipping zones, a discount code, a customer, and a paid order. Demo login: `demo@storehike.ng` / `password123`.

## Order management

- `/dashboard/orders` — list with search (order number, customer name/phone) and filters (status, payment method); `/dashboard/orders/[id]` — detail view with a status timeline, seller actions, and a print-friendly invoice at `/dashboard/orders/[id]/print`.
- Status transitions are guarded server-side (`src/lib/actions/order-management.ts`), not just hidden in the UI: e.g. "Mark as paid" only applies to `PENDING` bank-transfer/COD orders (Paystack orders are confirmed automatically by the checkout widget's callback), "Mark as shipped" only applies from `PAID`/`PROCESSING`, and cancel/refund restore reserved stock via the same `restoreStock` used elsewhere.
- `/dashboard/customers` and `/dashboard/customers/[id]` compute order count and total spent live from the `Order` table (summing non-pending, non-cancelled, non-refunded orders) rather than from `Customer.totalOrders`/`totalSpent`, which are unused legacy columns nothing currently writes to.
- Dashboard home (`/dashboard`) shows today's orders, revenue this month, orders needing action, low-stock alerts, and a 30-day revenue chart. The chart buckets `paidAt` by local calendar day on both sides (a helper, not `Date#toISOString`, which is UTC and silently misaligns "today" for any server timezone ahead of UTC — this broke revenue-chart lookups for Nigeria-based deployments during testing and is documented here so it doesn't regress).

## Store customization and shipping

- `/dashboard/settings` — branding (logo, banner, accent color, font), announcement bar, social links, about text, contact/bank details, and the publish toggle all live on one page. Accent color and font are applied storefront-wide via CSS custom properties set in `src/app/shop/[slug]/layout.tsx` (`--store-primary`), so primary CTA buttons pick up a seller's brand color without per-component theme plumbing.
- `/dashboard/shipping` — CRUD for shipping zones (name, a set of Nigerian states, a flat rate, an optional free-shipping threshold). A state not covered by any zone ships free by default, matching the existing checkout behavior in `src/lib/actions/orders.ts`.
- The marketing homepage at `/` and storefront pages (`/shop/[slug]`, `/product/[productSlug]`, `/category/[categorySlug]`) carry per-page `<title>`/description metadata and JSON-LD (`Store`/`Product` schema) for SEO and link-preview cards.

## Load handling

Storefront read paths (`getPublishedStore`, and the data fetchers in the home/category/product pages) go through `src/lib/request-cache.ts` — a minimal per-process cache **with in-flight request coalescing**, not just a time-based TTL. This distinction matters: a burst of concurrent *first* requests to a cold cache doesn't get deduplicated by time-based caching alone (each one is a cache miss, so each fires its own query) — coalescing means concurrent callers for the same key share one in-flight query instead of each starting their own.

This was found and fixed via actual load testing (100% would fail below this fix, 100% succeed above it), not guessed at:
- **Before:** 100 concurrent requests to the store home page → 99% failed with Prisma `P2024` ("Timed out fetching a new connection from the connection pool"). Root cause: `DATABASE_URL`'s `connection_limit` (correctly set low for serverless — see the note under Environment variables) means a single process only has a handful of DB connections; without request coalescing, 100 concurrent uncached page renders means ~100 concurrent queries competing for those few connections.
- **After:** the same 100-concurrent burst, a mixed 100-concurrent-session browsing test (300 requests across 3 different pages), and a 500-concurrent burst all succeed at 100%, because a stampede of identical concurrent requests collapses into one real query.
- Next.js's own `unstable_cache` was tried first and didn't coalesce reliably under this exact test — the hand-rolled version is deliberate, not an oversight.

**Caveat:** this cache is process-local — it dedupes whatever concurrent load lands on one server process/instance, but doesn't share state across multiple Vercel serverless instances. It still meaningfully helps in production (it collapses the exact failure mode reproduced above), but hasn't been load-tested against real multi-instance Vercel infrastructure, only locally via `next start` against the real Supabase database. Two knobs worth revisiting if real traffic outgrows this: bump `connection_limit` further (currently `3`, up from the more conservative serverless-standard `1`), and/or move to a shared cache (Redis/Upstash) if instance-local caching stops being enough.

## Launch checklist

Before pointing a seller's domain at this in production:

- [ ] All env vars in `.env.example` are set in Vercel's project settings (Production environment) — `DATABASE_URL`/`DIRECT_URL`, `AUTH_SECRET`/`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`/`AUTH_URL`, `CLOUDINARY_*`, `RESEND_API_KEY`/`RESEND_FROM_EMAIL`, `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_APP_URL` (set to the real production URL, not localhost).
- [ ] `AUTH_URL` matches the production domain exactly (Auth.js redirects break otherwise).
- [ ] Paystack dashboard webhook is pointed at `https://<domain>/api/webhooks/paystack` with the `charge.success`, `invoice.payment_failed`, and `subscription.disable` events — no separate secret to configure, Paystack signs with the same secret key already set as `PAYSTACK_SECRET_KEY`.
- [ ] Resend has a verified sending domain (the `onboarding@resend.dev` default won't deliver to arbitrary recipients).
- [ ] `npx prisma migrate resolve` history is in sync — run `npx prisma migrate status` against `DIRECT_URL` and confirm no pending migrations before deploying.
- [ ] No local build/deploy step runs `prisma migrate dev`, `db push`, or anything touching `--shadow-database-url` against the production database (see the migration workaround above).

No project-specific `vercel.json` is needed — this is a standard Next.js App Router project and Vercel's Next.js preset (build command `next build`, output `.next`) works unmodified. `src/generated/prisma` (the Prisma client output) is gitignored, so a fresh deploy regenerates it via the `postinstall` script (`prisma generate`) before `next build` runs — `DATABASE_URL`/`DIRECT_URL` must be set in Vercel's env vars for that step to succeed.

**Manual test script** (run through this after any change touching checkout, payments, or order status):
1. Browse a published store's storefront on mobile viewport: home → category → product → add to cart → cart.
2. Checkout with **bank transfer**: place the order, confirm the order-confirmation page shows bank details, confirm the seller and customer both receive the "order received" email (if Resend is configured).
3. In the dashboard, find that order and click **Mark as paid**, then **Mark as processing**, **Mark as shipped** (with a tracking note), **Mark as delivered** — confirm the status timeline updates at each step and the tracking note persists.
4. Place a second order and **Cancel** it from PENDING — confirm the reserved stock count goes back up on the product page.
5. Checkout with **Paystack** using a seller's real test-mode public key (added in `/dashboard/settings`): confirm the Paystack Popup opens in-page, complete a test payment, and confirm the order flips to PAID once the popup's callback fires.
6. Try to buy the last unit of a low-stock product from two browser tabs at once — confirm only one checkout succeeds and the other sees a clear "out of stock" error.
7. In `/dashboard/settings`, change the accent color and upload a banner — confirm the storefront's primary buttons and home page hero reflect the change after a refresh.
8. In `/dashboard/shipping`, add a zone covering one state with a flat rate — confirm checkout shows that rate for an address in that state, and free shipping (₦0) for a state not covered by any zone.
