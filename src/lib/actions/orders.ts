"use server";

import { prisma } from "@/lib/prisma";
import { priceCartItems, type CartItemRequest } from "@/lib/order-pricing";
import { reserveStock, restoreStock, InsufficientStockError } from "@/lib/inventory";
import { validateDiscountCode } from "@/lib/discounts";
import { randomOrderNumber } from "@/lib/order-number";
import { initializeTransaction, initiateBankTransferCharge, FLUTTERWAVE_TX_PREFIX, AUTO_BANK_TRANSFER_EXPIRY_MINUTES } from "@/lib/flutterwave";
import { sendEmail } from "@/lib/email";
import { customerOrderPendingEmail, sellerOrderPendingEmail } from "@/lib/email-templates";
import { hasFeature } from "@/lib/plan-features";

type PlaceOrderInput = {
  storeId: string;
  items: CartItemRequest[];
  customer: { name: string; phone: string; email?: string };
  shippingAddress: { address: string; state: string };
  paymentMethod: "FLUTTERWAVE" | "BANK_TRANSFER" | "CASH_ON_DELIVERY";
  discountCode?: string;
  customerNote?: string;
};

type PlaceOrderResult = { ok: true; orderNumber: string; flutterwavePaymentLink?: string } | { ok: false; error: string };

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const store = await prisma.store.findFirst({
    where: { id: input.storeId, isPublished: true, isSuspended: false },
    include: { subscription: { include: { plan: true } } },
  });
  if (!store) return { ok: false, error: "Store not found." };

  if (input.paymentMethod === "FLUTTERWAVE" && !hasFeature(store.subscription, "CARD_PAYMENTS")) {
    return { ok: false, error: "Card payments aren't available for this store yet." };
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

    if (input.paymentMethod === "FLUTTERWAVE") {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const result = await initializeTransaction({
        email: input.customer.email || `${input.customer.phone.replace(/[^\d]/g, "")}@guest.storehike.ng`,
        name: input.customer.name,
        phone: input.customer.phone,
        amount: total,
        currency: store.currency,
        txRef: `${FLUTTERWAVE_TX_PREFIX}${order.orderNumber}`,
        redirectUrl: `${appUrl}/shop/${store.slug}/order/${order.orderNumber}`,
        subaccountId: store.flutterwaveSubaccountId,
        storeName: store.name,
      });

      if (!result.ok) {
        // Payment couldn't start — the order was already committed above, but the buyer never
        // completed checkout, so undo it: release the reserved stock, give back any discount
        // usage, and delete the order. Otherwise it sits as a phantom PENDING order on the
        // seller's dashboard that the buyer doesn't know exists and never gets paid.
        await prisma.$transaction(async (tx) => {
          await restoreStock(tx, priced.lineItems);
          if (discountId) {
            await tx.discount.update({ where: { id: discountId }, data: { usageCount: { decrement: 1 } } });
          }
          await tx.order.delete({ where: { id: order.id } });
        });
        return { ok: false, error: result.error };
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { flutterwaveTxRef: `${FLUTTERWAVE_TX_PREFIX}${order.orderNumber}` },
      });
      return { ok: true, orderNumber: order.orderNumber, flutterwavePaymentLink: result.paymentLink };
    }

    const emailData = {
      storeName: store.name,
      orderNumber: order.orderNumber,
      customerName: input.customer.name,
      total,
      items: priced.lineItems,
    };

    // Auto-generated bank transfer: a temporary Flutterwave virtual account,
    // confirmed automatically by the webhook once paid, released by the expiry
    // cron if not. Falls through to the static seller-account flow below on any
    // failure — checkout should never break just because Flutterwave's charge
    // API had a hiccup.
    if (input.paymentMethod === "BANK_TRANSFER" && hasFeature(store.subscription, "AUTO_BANK_TRANSFER")) {
      const txRef = `${FLUTTERWAVE_TX_PREFIX}${order.orderNumber}`;
      const charge = await initiateBankTransferCharge({
        email: input.customer.email || `${input.customer.phone.replace(/[^\d]/g, "")}@guest.storehike.ng`,
        name: input.customer.name,
        phone: input.customer.phone,
        amount: total,
        currency: store.currency,
        txRef,
        subaccountId: store.flutterwaveSubaccountId,
      });

      if (charge.ok) {
        const expiresAt = new Date(Date.now() + AUTO_BANK_TRANSFER_EXPIRY_MINUTES * 60_000);
        await prisma.order.update({
          where: { id: order.id },
          data: {
            flutterwaveTxRef: txRef,
            bankTransferAccountNumber: charge.accountNumber,
            bankTransferBankName: charge.bankName,
            bankTransferAccountExpiresAt: expiresAt,
          },
        });

        const paymentInstructions = `Please transfer ₦${total.toLocaleString()} to ${charge.bankName}, account number ${charge.accountNumber}, within ${AUTO_BANK_TRANSFER_EXPIRY_MINUTES} minutes. We'll confirm your order automatically once payment is received.`;

        if (store.email) {
          await sendEmail({ to: store.email, ...sellerOrderPendingEmail(emailData, "bank transfer") });
        }
        if (input.customer.email) {
          await sendEmail({ to: input.customer.email, ...customerOrderPendingEmail(emailData, paymentInstructions), replyTo: store.email });
        }

        return { ok: true, orderNumber: order.orderNumber };
      }
    }

    // Bank transfer (no AUTO_BANK_TRANSFER feature, or the charge call above
    // failed) / cash on delivery: order is PENDING until the seller confirms manually.
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

    return { ok: true, orderNumber: order.orderNumber };
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return { ok: false, error: err.message };
    }
    console.error("Order creation failed:", err);
    return { ok: false, error: "Something went wrong placing your order. Please try again." };
  }
}
