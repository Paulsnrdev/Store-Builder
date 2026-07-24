# Store Builder

An e-commerce store builder for Nigerian sellers currently doing business in Instagram DMs. Sellers get a hosted storefront with products, cart, Paystack checkout, order management, and WhatsApp for customer communication.

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
- `RESEND_API_KEY` — login and order confirmation emails.
- `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` — checkout, subaccounts, and splits.

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

**Note on Supabase + Prisma:** the pooled connection (port 6543, PgBouncer transaction mode) doesn't support the prepared statements Prisma's schema engine uses for `migrate dev`/`migrate status`/`migrate resolve`. `DIRECT_URL` (port 5432, session mode) is configured in both `prisma/schema.prisma` and `prisma.config.ts` specifically so those commands bypass the pooler. If `migrate dev` hangs or errors with `prepared statement "s1" already exists`, that's this issue — set `CHECKPOINT_DISABLE=1` to skip Prisma's update-check network call (it can hang on some networks) and confirm the command is using the direct URL.

The demo store (`chunkz`) seeds 12 products across 3 categories (some with size/colour variants), 3 shipping zones, a discount code, a customer, and a paid order. Demo login: `demo@storebuilder.ng` / `password123`.
