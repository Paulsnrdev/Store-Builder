import { prisma } from "@/lib/prisma";

type CreditResult = { ok: true } | { ok: false; error: string };

/**
 * Credits a store's ledger for a pooled-collection payment — only used when the platform's
 * own Paystack account collected the money on a seller's behalf (they have no Paystack
 * account of their own). Idempotent on `reference` so a replayed webhook delivery can't
 * double-credit the same payment.
 */
export async function creditStoreLedger(input: {
  storeId: string;
  orderId?: string;
  amount: number;
  reference: string;
}): Promise<CreditResult> {
  const existing = await prisma.ledgerEntry.findUnique({ where: { reference: input.reference } });
  if (existing) return { ok: true };

  try {
    await prisma.$transaction([
      prisma.ledgerEntry.create({
        data: {
          storeId: input.storeId,
          orderId: input.orderId,
          type: "CREDIT",
          reason: "ORDER_PAYMENT",
          status: "COMPLETED",
          amount: input.amount,
          reference: input.reference,
        },
      }),
      prisma.store.update({
        where: { id: input.storeId },
        data: { ledgerBalance: { increment: input.amount } },
      }),
    ]);
  } catch (err) {
    console.error("creditStoreLedger: failed to credit", err);
    return { ok: false, error: "Could not credit store ledger." };
  }

  return { ok: true };
}
