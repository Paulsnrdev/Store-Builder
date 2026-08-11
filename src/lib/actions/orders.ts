"use server";

import { prisma } from "@/lib/prisma";
import { priceCartItems, type CartItemRequest } from "@/lib/order-pricing";
import { reserveStock, InsufficientStockError } from "@/lib/inventory";
import { validateDiscountCode } from "@/lib/discounts";
import { randomOrderNumber } from "@/lib/order-number";
import { sendEmail } from "@/lib/email";
import { customerOrderPendingEmail, sellerOrderPendingEmail } from "@/lib/email-templates";
import { hasFeature } from "@/lib/plan-features";
import { createOrderVirtualAccount } from "@/lib/paystack";

const DVA_EXPIRY_MINUTES = 30;

type PlaceOrderInput = {
  storeId: string;
  items: CartItemRequest[];
  customer: { name: string; phone: string; email?: string };
  shippingAddress: { address: string; state: string };
  paymentMethod: "PAYSTACK" | "BANK_TRANSFER" | "CASH_ON_DELIVERY";
  discountCode?: string;
  customerNote?: string;
};

type PlaceOrderResult =
  | {
      ok: true;
      orderId: string;
      orderNumber: string;
      paystack?: { publicKey: string; amount: number; reference: string };
      bankTransfer?: { accountNumber: string; bankName: string; amount: number; expiresAt: string };
    }
  | { ok: false; error: string };

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const store = await prisma.store.findFirst({
    where: { id: input.storeId, isPublished: true, isSuspended: false },
    include: { subscription: { include: { plan: true } } },
  });
  if (!store) return { ok: false, error: "Store not found." };

  if (input.paymentMethod === "PAYSTACK" && !hasFeature(store.subscription, "CARD_PAYMENTS")) {
    return { ok: false, error: "Card payments aren't available for this store yet." };
  }
  if (input.paymentMethod === "PAYSTACK" && !store.paystackPublicKey) {
    return { ok: false, error: "Card payments aren't set up for this store yet." };
  }

  if (!input.customer.name.trim() || !input.customer.phone.trim()) {
    return { ok: false, error: "Name and phone are required." };
  }
  if (!input.shippingAddress.address.trim() || !input.shippingAddress.state.trim()) {
    return { ok: false, error: "Shipping address is required." };
  }

  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, storeId: store.id },
    include: { variants: true },
  });
  const productMap = new Map(
    products.map((p) => [
      p.id,
      {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        isActive: p.isActive,
        trackInventory: p.trackInventory,
        stockQuantity: p.stockQuantity,
        variants: p.variants.map((v) => ({ id: v.id, name: v.name, price: v.price ? Number(v.price) : null, stockQuantity: v.stockQuantity })),
      },
    ])
  );

  const priced = priceCartItems(input.items, productMap);
  if (!priced.ok) return { ok: false, error: priced.error };

  // Shipping cost is recomputed server-side from the store's zones — never trust a client-supplied amount.
  const zone = await prisma.shippingZone.findFirst({ where: { storeId: store.id, states: { has: input.shippingAddress.state } } });
  const shippingCost = zone ? (zone.freeAbove && priced.subtotal >= Number(zone.freeAbove) ? 0 : Number(zone.rate)) : 0;

  let discountAmount = 0;
  let discountId: string | null = null;
  let discountCode: string | null = null;
  if (input.discountCode) {
    const discountResult = await validateDiscountCode(store.id, input.discountCode, priced.subtotal);
    if (!discountResult.ok) return { ok: false, error: discountResult.error };
    discountAmount = discountResult.amount;
    discountId = discountResult.discountId;
    discountCode = discountResult.code;
  }

  const total = Math.max(priced.subtotal + shippingCost - discountAmount, 0);

  try {
    const order = await prisma.$transaction(async (tx) => {
      await reserveStock(tx, priced.lineItems);

      const customer = await tx.customer.upsert({
        where: { storeId_phone: { storeId: store.id, phone: input.customer.phone } },
        update: { name: input.customer.name, email: input.customer.email },
        create: { storeId: store.id, name: input.customer.name, phone: input.customer.phone, email: input.customer.email },
      });

      let orderNumber = randomOrderNumber();
      for (let attempt = 0; attempt < 5; attempt++) {
        const clash = await tx.order.findFirst({ where: { storeId: store.id, orderNumber } });
        if (!clash) break;
        orderNumber = randomOrderNumber();
      }

      const created = await tx.order.create({
        data: {
          storeId: store.id,
          customerId: customer.id,
          orderNumber,
          status: "PENDING",
          subtotal: priced.subtotal,
          shippingCost,
          discount: discountAmount,
          discountCode,
          total,
          paymentMethod: input.paymentMethod,
          shippingAddress: input.shippingAddress,
          customerNote: input.customerNote,
          items: {
            create: priced.lineItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              productName: item.productName,
              variantName: item.variantName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
          },
        },
      });

      if (discountId) {
        await tx.discount.update({ where: { id: discountId }, data: { usageCount: { increment: 1 } } });
      }

      return created;
    });

    // Card checkout happens entirely client-side against the seller's own
    // Paystack account (their public key, passed straight through to the
    // browser widget) — StoreHike's server never calls Paystack for this.
    // "Pending" emails don't apply here; the buyer/seller "paid" emails go out
    // once the widget's callback confirms payment (see confirmPaystackPayment
    // in src/lib/actions/order-status.ts).
    if (input.paymentMethod === "PAYSTACK") {
      return {
        ok: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        paystack: { publicKey: store.paystackPublicKey!, amount: total, reference: order.orderNumber },
      };
    }

    // Pooled bank transfer: the seller has no Paystack account of their own, so a fresh
    // Dedicated Virtual Account is created for this order alone (30-min expiry, see the
    // cron sweep) and payment is confirmed automatically via webhook — no seller action
    // needed. Falls back to the static "seller's own account" flow below on any failure,
    // same trade-off as the original Flutterwave version of this feature.
    if (input.paymentMethod === "BANK_TRANSFER" && hasFeature(store.subscription, "AUTO_BANK_TRANSFER")) {
      const dva = await createOrderVirtualAccount({
        email: input.customer.email || `${input.customer.phone.replace(/[^\d]/g, "")}@guest.storehike.ng`,
        name: input.customer.name,
        phone: input.customer.phone,
      });

      if (dva.ok) {
        const expiresAt = new Date(Date.now() + DVA_EXPIRY_MINUTES * 60 * 1000);
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paystackDvaCustomerCode: dva.customerCode,
            paystackDvaAccountId: dva.accountId,
            paystackDvaAccountNumber: dva.accountNumber,
            paystackDvaBankName: dva.bankName,
            expiresAt,
          },
        });

        return {
          ok: true,
          orderId: order.id,
          orderNumber: order.orderNumber,
          bankTransfer: { accountNumber: dva.accountNumber, bankName: dva.bankName, amount: total, expiresAt: expiresAt.toISOString() },
        };
      }

      console.error("placeOrder: DVA creation failed, falling back to static bank transfer:", dva.error);
    }

    const emailData = {
      storeName: store.name,
      orderNumber: order.orderNumber,
      customerName: input.customer.name,
      total,
      items: priced.lineItems,
    };

    // Bank transfer (seller's own static account) / cash on delivery: order is
    // PENDING until the seller confirms manually.
    const paymentMethodLabel = input.paymentMethod === "BANK_TRANSFER" ? "bank transfer" : "cash on delivery";
    const paymentInstructions =
      input.paymentMethod === "BANK_TRANSFER"
        ? store.bankName && store.bankAccountNumber
          ? `Please transfer ₦${total.toLocaleString()} to ${store.bankName}, account number ${store.bankAccountNumber} (${store.bankAccountName ?? store.name}). We'll confirm your order once payment is received.`
          : `We'll be in touch with bank transfer details shortly.`
        : `Please have ₦${total.toLocaleString()} ready for the courier on delivery.`;

    if (store.email) {
      await sendEmail({ to: store.email, ...sellerOrderPendingEmail(emailData, paymentMethodLabel) });
    }
    if (input.customer.email) {
      await sendEmail({ to: input.customer.email, ...customerOrderPendingEmail(emailData, paymentInstructions), replyTo: store.email });
    }

    return { ok: true, orderId: order.id, orderNumber: order.orderNumber };
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return { ok: false, error: err.message };
    }
    console.error("Order creation failed:", err);
    return { ok: false, error: "Something went wrong placing your order. Please try again." };
  }
}
