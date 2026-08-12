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

// ---------- Pooled bank-transfer checkout (sellers without their own Paystack account) ----------

type CreateOrderVirtualAccountResult =
  | { ok: true; accountNumber: string; bankName: string; customerCode: string; accountId: string }
  | { ok: false; error: string };

/**
 * Creates a fresh Paystack customer + Dedicated Virtual Account for a single order, so it
 * can be given a real 30-minute expiry (see the cron sweep) instead of being a permanent,
 * reusable account. Uses the two-step customer-then-account flow rather than the
 * `/dedicated_account/assign` convenience endpoint, because assign is asynchronous (the
 * account number only arrives later via webhook) and checkout needs it immediately.
 *
 * NOTE: written from Paystack's documented API shape but not exercised against a live
 * account from this environment (their docs site blocks automated fetching) — verify against
 * a real test transaction before trusting this with real orders. Store-name branding on the
 * account (their B2B2C custom-naming feature, via a `subaccount` param) is deliberately not
 * wired up here — it needs a bank-code-resolved Paystack subaccount per store, which nothing
 * in this codebase does yet, so accounts created here show the platform's own name.
 */
/**
 * Paystack's customer API rejects local Nigerian numbers (e.g. "07069094959") as invalid —
 * it needs international format. Buyers only ever enter the local form at checkout, so this
 * converts 0XXXXXXXXXX -> +234XXXXXXXXXX. Leaves anything already in +234/234 form untouched.
 */
function toInternationalNigerianPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  return `+234${digits}`;
}

export async function createOrderVirtualAccount(input: { email: string; name: string; phone: string }): Promise<CreateOrderVirtualAccountResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "Paystack is not configured yet." };

  const [firstName, ...rest] = input.name.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName;

  const customerRes = await fetch(`${PAYSTACK_BASE_URL}/customer`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: input.email, first_name: firstName, last_name: lastName, phone: toInternationalNigerianPhone(input.phone) }),
  });
  const customerJson = await customerRes.json();
  if (!customerRes.ok || !customerJson.status) {
    return { ok: false, error: customerJson.message ?? "Could not start bank transfer." };
  }
  const customerCode: string = customerJson.data.customer_code;

  const accountRes = await fetch(`${PAYSTACK_BASE_URL}/dedicated_account`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ customer: customerCode, preferred_bank: "titan-paystack" }),
  });
  const accountJson = await accountRes.json();
  if (!accountRes.ok || !accountJson.status) {
    return { ok: false, error: accountJson.message ?? "Could not generate a transfer account." };
  }

  return {
    ok: true,
    accountNumber: accountJson.data.account_number,
    bankName: accountJson.data.bank?.name ?? "Paystack-Titan",
    customerCode,
    accountId: String(accountJson.data.id),
  };
}

/**
 * Deactivates a Dedicated Virtual Account once its order is paid or its 30-minute window
 * expires, so it can't keep collecting money against a no-longer-open order. Never throws —
 * a failed deactivation leaves an orphaned (but harmless) account rather than blocking the
 * order status update that called it.
 *
 * NOTE: unverified against Paystack's live API from this environment — confirm the endpoint
 * path/method against a real test account before relying on it.
 */
export async function deactivateDedicatedVirtualAccount(accountId: string): Promise<void> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return;

  try {
    const res = await fetch(`${PAYSTACK_BASE_URL}/dedicated_account/${accountId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (!res.ok) console.error(`deactivateDedicatedVirtualAccount: Paystack returned ${res.status} for account ${accountId}`);
  } catch (err) {
    console.error("deactivateDedicatedVirtualAccount: failed", err);
  }
}
