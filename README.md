# Store Builder

An e-commerce store builder for sellers currently doing business in Instagram or Whatsapp DMs. Sellers get a hosted storefront with products, cart, Flutterwave checkout, order management, and WhatsApp for customer communication.

Stack: Next.js 15 (App Router), TypeScript, Tailwind CSS, Prisma, PostgreSQL (Supabase), Auth.js, Flutterwave, Cloudinary, Vercel.

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
- `FLUTTERWAVE_SECRET_KEY` — checkout and subaccount splits (server-to-server only; the redirect-based flow used here needs no public/client key). `FLUTTERWAVE_SECRET_HASH` — a secret string you set yourself in the Flutterwave dashboard's webhook settings; the webhook handler checks the `verif-hash` header against it. Point a Flutterwave webhook at `/api/webhooks/flutterwave` (events: `charge.completed`).

## Accounts to create

| Service | What for |
|---|---|
| [Supabase](https://supabase.com) | Postgres database |
| [Cloudinary](https://cloudinary.com) | Product images |
| [Resend](https://resend.com) | Transactional email |
| [Flutterwave](https://flutterwave.com) | Checkout, subaccounts, splits |
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
- Flutterwave payment status is confirmed **only** via the `/api/webhooks/flutterwave` webhook, never trusted from the client-side redirect back to `/order/[orderNumber]`. Flutterwave's webhook `verif-hash` header is a static shared secret, not a per-payload signature like Paystack's HMAC — so on top of checking it, the webhook handler re-fetches the transaction from Flutterwave's `/v3/transactions/{id}/verify` API and confirms status/amount/currency/reference before trusting it (see `src/lib/flutterwave.ts`).
- **Flutterwave amounts are in the currency's major unit** (e.g. Naira), not kobo/lowest-denomination like Paystack — `initializeTransaction` passes `total` directly, not `total * 100`. Getting this wrong would under/overcharge by 100x, so it's called out explicitly here.
- A seller's Flutterwave subaccount split percentage (set on Flutterwave's dashboard when the subaccount is created) governs the platform-fee split — there's no separate fee field in this app yet. That lands with subscription plan billing in a later phase.

The demo store (`chunkz`) seeds 12 products across 3 categories (some with size/colour variants), 3 shipping zones, a discount code, a customer, and a paid order. Demo login: `demo@storebuilder.ng` / `password123`.

## Order management

- `/dashboard/orders` — list with search (order number, customer name/phone) and filters (status, payment method); `/dashboard/orders/[id]` — detail view with a status timeline, seller actions, and a print-friendly invoice at `/dashboard/orders/[id]/print`.
- Status transitions are guarded server-side (`src/lib/actions/order-management.ts`), not just hidden in the UI: e.g. "Mark as paid" only applies to `PENDING` bank-transfer/COD orders (Flutterwave orders are confirmed exclusively by the webhook), "Mark as shipped" only applies from `PAID`/`PROCESSING`, and cancel/refund restore reserved stock via the same `restoreStock` used elsewhere.
- `/dashboard/customers` and `/dashboard/customers/[id]` compute order count and total spent live from the `Order` table (summing non-pending, non-cancelled, non-refunded orders) rather than from `Customer.totalOrders`/`totalSpent`, which are unused legacy columns nothing currently writes to.
- Dashboard home (`/dashboard`) shows today's orders, revenue this month, orders needing action, low-stock alerts, and a 30-day revenue chart. The chart buckets `paidAt` by local calendar day on both sides (a helper, not `Date#toISOString`, which is UTC and silently misaligns "today" for any server timezone ahead of UTC — this broke revenue-chart lookups for Nigeria-based deployments during testing and is documented here so it doesn't regress).
