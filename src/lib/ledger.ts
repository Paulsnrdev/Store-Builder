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

/**
 * Resolves a PENDING withdrawal once Paystack's transfer webhook reports its final state.
 * On failure/reversal, the balance is credited back — the debit happened when the seller
 * requested the withdrawal, but if the transfer didn't actually go through, that money never
 * left the platform's account and shouldn't stay deducted from their ledger. A no-op if the
 * entry isn't PENDING (already resolved, or this is a replayed webhook delivery).
 */
export async function resolveWithdrawal(reference: string, outcome: "success" | "failed"): Promise<void> {
  const entry = await prisma.ledgerEntry.findUnique({ where: { reference } });
  if (!entry || entry.reason !== "WITHDRAWAL" || entry.status !== "PENDING") return;

  const newStatus = outcome === "success" ? "COMPLETED" : "FAILED";

  await prisma.$transaction([
    prisma.ledgerEntry.update({ where: { id: entry.id }, data: { status: newStatus } }),
    ...(outcome === "failed"
      ? [prisma.store.update({ where: { id: entry.storeId }, data: { ledgerBalance: { increment: Number(entry.amount) } } })]
      : []),
  ]);
}
