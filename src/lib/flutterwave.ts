import crypto from "node:crypto";

const FLUTTERWAVE_BASE_URL = "https://api.flutterwave.com/v3";

// This Flutterwave account is shared across multiple projects, all sitting behind one
// webhook router (github.com/Paulsnrdev/flutterwave-router) that forwards each event to
// the right project by matching this prefix at the start of tx_ref. Every tx_ref StoreHike
// sends to Flutterwave — orders and subscriptions alike — must start with this.
export const FLUTTERWAVE_TX_PREFIX = "SH-";

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
  /** Enrolls this charge in a Flutterwave Payment Plan for recurring auto-billing. */
  paymentPlanId?: string;
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
  if (input.paymentPlanId) {
    body.payment_plan = input.paymentPlanId;
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

// ---------- Recurring billing (StoreHike plan subscriptions, not buyer orders) ----------

type CreatePaymentPlanInput = { name: string; amount: number; interval: string; currency: string };
type CreatePaymentPlanResult = { ok: true; planId: string } | { ok: false; error: string };

/** Creates a Flutterwave "Payment Plan" — charging a transaction against it auto-enrolls the card for recurring billing on this schedule. */
export async function createPaymentPlan(input: CreatePaymentPlanInput): Promise<CreatePaymentPlanResult> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "Flutterwave is not configured yet." };

  const res = await fetch(`${FLUTTERWAVE_BASE_URL}/payment-plans`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: input.amount, name: input.name, interval: input.interval, currency: input.currency }),
  });

  const json = await res.json();
  if (!res.ok || json.status !== "success") {
    return { ok: false, error: json.message ?? "Could not set up this billing plan." };
  }
  return { ok: true, planId: json.data.id.toString() };
}

// Field names confirmed against developer.flutterwave.com/v3.0/reference/get-all-subscriptions —
// the email is nested under `customer.customer_email`, not a top-level `email` field.
type FlutterwaveSubscription = { id: number; customer: { customer_email: string }; amount: number; status: string };

/** Looks up a customer's active Flutterwave subscription to a given payment plan, so we can cancel it. */
export async function findActiveFlutterwaveSubscription(flutterwavePlanId: string, email: string): Promise<FlutterwaveSubscription | null> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) return null;

  const res = await fetch(`${FLUTTERWAVE_BASE_URL}/subscriptions?plan=${flutterwavePlanId}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const json = await res.json();
  if (!res.ok || json.status !== "success" || !Array.isArray(json.data)) return null;

  const match = (json.data as FlutterwaveSubscription[]).find(
    (s) => s.customer?.customer_email?.toLowerCase() === email.toLowerCase() && s.status === "active"
  );
  return match ?? null;
}

/** Stops future auto-charges for a Flutterwave subscription. Does not affect the current, already-paid-for period. */
export async function cancelFlutterwaveSubscription(flutterwaveSubscriptionId: number): Promise<boolean> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) return false;

  const res = await fetch(`${FLUTTERWAVE_BASE_URL}/subscriptions/${flutterwaveSubscriptionId}/cancel`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  return res.ok;
}
