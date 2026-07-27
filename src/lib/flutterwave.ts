import crypto from "node:crypto";

const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";

type InitializeTransactionInput = {
  email: string;
  name: string;
  phone: string;
  amount: number;
  currency: string;
  txRef: string;
  redirectUrl: string;
  subaccountId?: string | null;
  storeName: string;
};

type InitializeTransactionResult = { ok: true; paymentLink: string } | { ok: false; error: string };

// Flutterwave amounts are in the currency's major unit (e.g. Naira), unlike
// Paystack's kobo/lowest-denomination amounts — do not multiply by 100 here.
export async function initializeTransaction(input: InitializeTransactionInput): Promise<InitializeTransactionResult> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "Flutterwave is not configured for this store yet." };

  const body: Record<string, unknown> = {
    tx_ref: input.txRef,
    amount: input.amount,
    currency: input.currency,
    redirect_url: input.redirectUrl,
    customer: { email: input.email, phonenumber: input.phone, name: input.name },
    customizations: { title: input.storeName },
  };
  if (input.subaccountId) {
    body.subaccounts = [{ id: input.subaccountId }];
  }

  const res = await fetch(`${FLUTTERWAVE_BASE_URL}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok || json.status !== "success") {
    return { ok: false, error: json.message ?? "Could not start payment. Try again." };
  }

  return { ok: true, paymentLink: json.data.link };
}

/** Compares the `verif-hash` header against the dashboard-configured secret hash. */
export function verifyWebhookSignature(signature: string | null): boolean {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
  if (!secretHash || !signature) return false;
  const a = Buffer.from(signature);
  const b = Buffer.from(secretHash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

type VerifiedTransaction = { status: string; txRef: string; amount: number; currency: string };

// Flutterwave's webhook hash is a static shared secret, not a per-payload HMAC like
// Paystack's — it authenticates the sender but doesn't cryptographically bind to the
// body. Re-fetching the transaction from Flutterwave's API (their documented best
// practice) confirms status/amount/currency straight from the source before we act on it.
export async function verifyTransaction(transactionId: string): Promise<VerifiedTransaction | null> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) return null;

  const res = await fetch(`${FLUTTERWAVE_BASE_URL}/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const json = await res.json();
  if (!res.ok || json.status !== "success") return null;

  return {
    status: json.data.status,
    txRef: json.data.tx_ref,
    amount: json.data.amount,
    currency: json.data.currency,
  };
}
