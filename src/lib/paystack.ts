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

// ---------- Seller bank verification + subaccount (for DVA custom naming) ----------

type Bank = { name: string; code: string };

/** Full list of Nigerian banks Paystack supports, for the settings-form bank picker. */
export async function listNigerianBanks(): Promise<Bank[]> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return [];

  const res = await fetch(`${PAYSTACK_BASE_URL}/bank?country=nigeria&currency=NGN`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const json = await res.json();
  if (!res.ok || !json.status) return [];

  return (json.data as { name: string; code: string }[]).map((b) => ({ name: b.name, code: b.code }));
}

type ResolveBankAccountResult = { ok: true; accountName: string } | { ok: false; error: string };

/** Confirms an account number is real and returns the bank-registered account holder name — never trust a seller-typed name. */
export async function resolveBankAccount(accountNumber: string, bankCode: string): Promise<ResolveBankAccountResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "Paystack is not configured yet." };

  const res = await fetch(`${PAYSTACK_BASE_URL}/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const json = await res.json();
  if (!res.ok || !json.status) {
    return { ok: false, error: json.message ?? "Could not verify this account number." };
  }
  return { ok: true, accountName: json.data.account_name };
}

type CreateSubaccountResult = { ok: true; subaccountCode: string } | { ok: false; error: string };

/**
 * Creates a Paystack subaccount for a store, purely so pooled Dedicated Virtual Accounts can
 * be branded with the store's name (see createOrderVirtualAccount). percentage_charge: 100
 * means the platform's main account keeps 100% of every split — see the note above
 * createOrderVirtualAccount on why this specific combination still needs live verification.
 */
export async function createSubaccount(input: { businessName: string; bankCode: string; accountNumber: string }): Promise<CreateSubaccountResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "Paystack is not configured yet." };

  const res = await fetch(`${PAYSTACK_BASE_URL}/subaccount`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      business_name: input.businessName,
      settlement_bank: input.bankCode,
      account_number: input.accountNumber,
      percentage_charge: 100,
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.status) {
    console.error("createSubaccount: failed", { businessName: input.businessName, status: res.status, response: json });
    return { ok: false, error: json.message ?? "Could not set up store branding for transfers." };
  }
  return { ok: true, subaccountCode: json.data.subaccount_code };
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
 * Exercised against a live Paystack account and fixed twice against real failures: the
 * customer step needs an international-format phone (+234...), and — despite not being in
 * Paystack's own docs, which this environment can't fetch — the /dedicated_account step
 * independently validates `phone` on its own body even when `customer` already points at a
 * customer record that has one.
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

export async function createOrderVirtualAccount(
  input: { email: string; name: string; phone: string; subaccountCode?: string | null }
): Promise<CreateOrderVirtualAccountResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "Paystack is not configured yet." };

  const [firstName, ...rest] = input.name.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName;

  const customerBody = { email: input.email, first_name: firstName, last_name: lastName, phone: toInternationalNigerianPhone(input.phone) };
  const customerRes = await fetch(`${PAYSTACK_BASE_URL}/customer`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(customerBody),
  });
  const customerJson = await customerRes.json();
  if (!customerRes.ok || !customerJson.status) {
    console.error("createOrderVirtualAccount: customer creation failed", {
      sentBody: customerBody,
      status: customerRes.status,
      response: customerJson,
    });
    return { ok: false, error: customerJson.message ?? "Could not start bank transfer." };
  }
  const customerCode: string = customerJson.data.customer_code;

  // Passing `subaccount` here is what makes the account show the store's own name instead of
  // the platform's — but it also has a real money side effect: Paystack automatically splits
  // settlement to the subaccount's bank per its percentage_charge. createSubaccount below sets
  // percentage_charge: 100 (everything stays with the platform's pooled account) specifically
  // to prevent that, but this exact combination (subaccount + DVA, not subaccount + a normal
  // transaction charge) has not been confirmed against a live Paystack transfer from this
  // environment — verify with a real small transfer, checking the money lands fully in the
  // platform's balance and nothing auto-settles to the seller's bank, before trusting this.
  // Confirmed via a live failure: /dedicated_account validates `phone` on its own request
  // body even when `customer` already references a customer record that has one — omitting
  // it here was the actual root cause of every prior "Customer phone number is required"
  // failure, not the customer-creation step (which was succeeding the whole time).
  const accountBody: Record<string, unknown> = {
    customer: customerCode,
    preferred_bank: "titan-paystack",
    phone: toInternationalNigerianPhone(input.phone),
  };
  if (input.subaccountCode) accountBody.subaccount = input.subaccountCode;

  const accountRes = await fetch(`${PAYSTACK_BASE_URL}/dedicated_account`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(accountBody),
  });
  const accountJson = await accountRes.json();
  if (!accountRes.ok || !accountJson.status) {
    console.error("createOrderVirtualAccount: dedicated account creation failed", {
      sentBody: accountBody,
      status: accountRes.status,
      response: accountJson,
    });
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
