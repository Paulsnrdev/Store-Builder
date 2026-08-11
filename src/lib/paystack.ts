import crypto from "node:crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

// Lightweight namespacing for our own transaction references, mirroring the tx_ref
// prefix convention used elsewhere in this project — harmless if the Paystack account
// is dedicated to StoreHike, and keeps refs easy to identify either way.
export const PAYSTACK_TX_PREFIX = "SH-";

type InitializeTransactionInput = {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  /** Enrolls this charge in a Paystack Plan for recurring auto-billing. */
  planCode?: string;
};

type InitializeTransactionResult = { ok: true; paymentLink: string } | { ok: false; error: string };

// Paystack amounts are in the currency's smallest unit (kobo for NGN), unlike
// Flutterwave's major-unit amounts — callers pass major units (Naira) and this
// converts, so the rest of the app never has to think about kobo.
export async function initializeTransaction(input: InitializeTransactionInput): Promise<InitializeTransactionResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "Paystack is not configured yet." };

  const body: Record<string, unknown> = {
    email: input.email,
    amount: Math.round(input.amount * 100),
    currency: input.currency,
    reference: input.reference,
    callback_url: input.callbackUrl,
  };
  if (input.planCode) {
    body.plan = input.planCode;
  }

  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok || !json.status) {
    return { ok: false, error: json.message ?? "Could not start payment. Try again." };
  }

  return { ok: true, paymentLink: json.data.authorization_url };
}

/** Recomputes the HMAC-SHA512 signature Paystack sends in the `x-paystack-signature` header — unlike Flutterwave, no separate dashboard-configured secret is needed, the secret key itself signs the payload. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey || !signature) return false;
  const expected = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

type VerifiedTransaction = { status: string; reference: string; amount: number; currency: string };

/** Re-fetches the transaction from Paystack's API (their documented best practice) to confirm status/amount/currency straight from the source before acting on a webhook. */
export async function verifyTransaction(reference: string): Promise<VerifiedTransaction | null> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return null;

  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const json = await res.json();
  if (!res.ok || !json.status) return null;

  return {
    status: json.data.status,
    reference: json.data.reference,
    // Paystack reports amount in kobo — convert back to major units so callers never
    // have to think about the /100 either.
    amount: json.data.amount / 100,
    currency: json.data.currency,
  };
}

// ---------- Recurring billing (StoreHike plan subscriptions, not buyer orders) ----------

type CreatePaymentPlanInput = { name: string; amount: number; interval: string; currency: string };
type CreatePaymentPlanResult = { ok: true; planCode: string } | { ok: false; error: string };

/** Creates a Paystack "Plan" — initializing a transaction against it (via `plan` in initializeTransaction) auto-enrolls the card for recurring billing on this schedule. */
export async function createPaymentPlan(input: CreatePaymentPlanInput): Promise<CreatePaymentPlanResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "Paystack is not configured yet." };

  const res = await fetch(`${PAYSTACK_BASE_URL}/plan`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: input.name, amount: Math.round(input.amount * 100), interval: input.interval, currency: input.currency }),
  });

  const json = await res.json();
  if (!res.ok || !json.status) {
    return { ok: false, error: json.message ?? "Could not set up this billing plan." };
  }
  return { ok: true, planCode: json.data.plan_code };
}

// Both fields are required by /subscription/disable below — Paystack scopes cancellation
// to the specific email_token issued for that subscription, not just its code.
type PaystackSubscription = { subscription_code: string; email_token: string; customer: { email: string }; status: string };

/** Looks up a customer's active Paystack subscription to a given plan, so we can cancel it. */
export async function findActivePaystackSubscription(planCode: string, email: string): Promise<PaystackSubscription | null> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return null;

  const res = await fetch(`${PAYSTACK_BASE_URL}/subscription?plan=${encodeURIComponent(planCode)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const json = await res.json();
  if (!res.ok || !json.status || !Array.isArray(json.data)) return null;

  const match = (json.data as PaystackSubscription[]).find(
    (s) => s.customer?.email?.toLowerCase() === email.toLowerCase() && s.status === "active"
  );
  return match ?? null;
}

/** Stops future auto-charges for a Paystack subscription. Does not affect the current, already-paid-for period. */
export async function cancelPaystackSubscription(subscriptionCode: string, emailToken: string): Promise<boolean> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return false;

  const res = await fetch(`${PAYSTACK_BASE_URL}/subscription/disable`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
  });
  return res.ok;
}
