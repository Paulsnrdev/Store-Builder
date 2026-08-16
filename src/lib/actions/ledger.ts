"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStoreOwner } from "@/lib/store";
import { createTransferRecipient, initiateTransfer } from "@/lib/paystack";
import type { Store } from "@/generated/prisma/client";

type WithdrawResult = { ok: true; reference: string; status: "COMPLETED" | "PENDING" } | { ok: false; error: string };

/** Lazily creates and caches a Paystack Transfer Recipient for a store's verified bank account. */
async function getOrCreateTransferRecipient(store: Store): Promise<{ ok: true; recipientCode: string } | { ok: false; error: string }> {
  if (store.paystackTransferRecipientCode) return { ok: true, recipientCode: store.paystackTransferRecipientCode };
  if (!store.bankAccountVerified || !store.bankCode || !store.bankAccountNumber) {
    return { ok: false, error: "Verify your bank account in Settings before withdrawing." };
  }

  const result = await createTransferRecipient({
    name: store.bankAccountName ?? store.name,
    accountNumber: store.bankAccountNumber,
    bankCode: store.bankCode,
  });
  if (!result.ok) return result;

  await prisma.store.update({ where: { id: store.id }, data: { paystackTransferRecipientCode: result.recipientCode } });
  return { ok: true, recipientCode: result.recipientCode };
}

/**
 * Sends a seller's requested amount to their verified bank account via Paystack Transfers,
 * then records the debit against their ledger. The transfer call happens BEFORE any DB write
 * — if Paystack rejects it, nothing changes here, so a seller can just retry rather than being
 * left with a stuck reservation. The ledger entry starts COMPLETED if Paystack confirms
 * immediately, or PENDING if settlement is still in progress (see the webhook handler for how
 * PENDING gets resolved to COMPLETED/FAILED).
 */
export async function requestWithdrawal(amount: number): Promise<WithdrawResult> {
  const store = await requireStoreOwner();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }
  if (Number(store.ledgerBalance) < amount) {
    return { ok: false, error: "Withdrawal amount exceeds your available balance." };
  }

  const recipient = await getOrCreateTransferRecipient(store);
  if (!recipient.ok) return recipient;

  const reference = `WD-${crypto.randomUUID()}`;
  const transfer = await initiateTransfer({
    amount,
    recipientCode: recipient.recipientCode,
    reason: `${store.name} withdrawal`,
    reference,
  });
  if (!transfer.ok) return { ok: false, error: transfer.error };

  const status = transfer.status === "success" ? "COMPLETED" : "PENDING";

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.store.findUniqueOrThrow({ where: { id: store.id }, select: { ledgerBalance: true } });
      if (Number(current.ledgerBalance) < amount) {
        // The transfer already went out — this shouldn't be reachable since a store can only
        // withdraw through this action, but if it ever is, the ledger entry still needs to
        // exist (money really left), just flagged for manual reconciliation via the negative
        // balance rather than silently dropped.
        throw new Error("BALANCE_RACE");
      }

      await tx.ledgerEntry.create({
        data: { storeId: store.id, type: "DEBIT", reason: "WITHDRAWAL", status, amount, reference },
      });

      await tx.store.update({ where: { id: store.id }, data: { ledgerBalance: { decrement: amount } } });
    });
  } catch (err) {
    console.error("requestWithdrawal: transfer succeeded but recording the ledger entry failed", err);
    return { ok: false, error: "Withdrawal was sent but couldn't be recorded — contact support with reference " + reference };
  }

  revalidatePath("/dashboard/balance");
  return { ok: true, reference, status };
}

/**
 * Polled client-side by WithdrawForm right after a withdrawal so the UI can flip from
 * "Processing" to "Completed"/"Failed" the moment Paystack's transfer webhook resolves it,
 * instead of the seller having to manually reload the page to see the final state.
 */
export async function getWithdrawalStatus(reference: string): Promise<"PENDING" | "COMPLETED" | "FAILED" | null> {
  const store = await requireStoreOwner();
  const entry = await prisma.ledgerEntry.findUnique({ where: { reference } });
  if (!entry || entry.storeId !== store.id) return null;
  return entry.status as "PENDING" | "COMPLETED" | "FAILED";
}
