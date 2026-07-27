import crypto from "node:crypto";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

type InitializeTransactionInput = {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  subaccountCode?: string | null;
  metadata?: Record<string, unknown>;
};

type InitializeTransactionResult =
  | { ok: true; authorizationUrl: string; accessCode: string }
  | { ok: false; error: string };

export async function initializeTransaction(input: InitializeTransactionInput): Promise<InitializeTransactionResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return { ok: false, error: "Paystack is not configured for this store yet." };

  const body: Record<string, unknown> = {
    email: input.email,
    amount: input.amountKobo,
    reference: input.reference,
    callback_url: input.callbackUrl,
    metadata: input.metadata,
  };
  if (input.subaccountCode) {
    body.subaccount = input.subaccountCode;
    body.bearer = "subaccount";
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

  return { ok: true, authorizationUrl: json.data.authorization_url, accessCode: json.data.access_code };
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey || !signature) return false;
  const hash = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");
  return hash === signature;
}
