# Store Builder

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
- `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` — checkout, subaccounts, and splits. Point a Paystack webhook at `/api/webhooks/paystack` (events: `charge.success`).

## Accounts to create

| Service | What for |
|---|---|
| [Supabase](https://supabase.com) | Postgres database |
| [Cloudinary](https://cloudinary.com) | Product images |
| [Resend](https://resend.com) | Transactional email |
| [Paystack](https://paystack.com) | Checkout, subaccounts, splits |
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
ts=$(date +%Y%m%d%H%M%S) && dir="prisma/migrations/${ts}_your_migration_name" && mkdir -p "$dir"
npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "$DIRECT_URL" --script > "$dir/migration.sql"   # generates SQL, no live DB needed
npx prisma db execute --file "$dir/migration.sql" --url "$DIRECT_URL"   # applies it
npx prisma migrate resolve --applied "${ts}_your_migration_name"        # records it as applied
```

Set `CHECKPOINT_DISABLE=1` on any `prisma` command — its update-check network call can hang on some networks.

## Testing

```bash
npm test
```

`tests/order-pricing.test.ts` is pure unit tests (server-side re-pricing of the cart — a client can never inject its own prices). `tests/inventory.test.ts` runs against the real dev database, exercising the atomic stock-reservation `UPDATE ... WHERE stockQuantity >= ?` that prevents overselling under concurrent checkouts.

## Storefront and checkout notes

- Public storefront: `/shop/[slug]` (home, `/category/[slug]`, `/product/[slug]`, `/cart`, `/checkout`, `/order/[orderNumber]`). Cart is client-side (localStorage), scoped per store.
- **Stock is reserved atomically at order creation**, not at payment confirmation as a literal reading of "decrement on payment confirmation" might suggest. Two buyers racing for the last unit both create PENDING orders, but only one atomic `UPDATE` wins — the other fails immediately with a clear "out of stock" error instead of both appearing to succeed and one getting cancelled later. Payment confirmation (webhook) only flips order status; it never touches stock, which also keeps webhook replays naturally idempotent.
- Paystack payment status is confirmed **only** via the `/api/webhooks/paystack` webhook (signature-verified), never trusted from the client-side redirect back to `/order/[orderNumber]`.
- A seller's Paystack subaccount `percentage_charge` (set on Paystack's dashboard when the subaccount is created) governs the platform-fee split — there's no separate fee field in this app yet. That lands with subscription plan billing in a later phase.

The demo store (`chunkz`) seeds 12 products across 3 categories (some with size/colour variants), 3 shipping zones, a discount code, a customer, and a paid order. Demo login: `demo@storebuilder.ng` / `password123`.
