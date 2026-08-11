"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStoreOwner } from "@/lib/store";

type WithdrawResult = { ok: true } | { ok: false; error: string };

/**
 * Reserves funds against the store's ledger balance for a withdrawal. Starts PENDING —
 * this only stops the seller from requesting the same money twice; actually paying it out
 * to their bank account is a separate step (Paystack Transfers), not wired up yet.
 */
export async function requestWithdrawal(amount: number): Promise<WithdrawResult> {
  const store = await requireStoreOwner();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.store.findUniqueOrThrow({ where: { id: store.id }, select: { ledgerBalance: true } });
      if (Number(current.ledgerBalance) < amount) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      await tx.ledgerEntry.create({
        data: {
          storeId: store.id,
          type: "DEBIT",
          reason: "WITHDRAWAL",
          status: "PENDING",
          amount,
          reference: `WD-${crypto.randomUUID()}`,
        },
      });

      await tx.store.update({
        where: { id: store.id },
        data: { ledgerBalance: { decrement: amount } },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      return { ok: false, error: "Withdrawal amount exceeds your available balance." };
    }
    console.error("requestWithdrawal: failed", err);
    return { ok: false, error: "Could not process withdrawal request." };
  }

  revalidatePath("/dashboard/balance");
  return { ok: true };
}
