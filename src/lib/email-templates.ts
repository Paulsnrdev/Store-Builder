type OrderEmailData = {
  storeName: string;
  orderNumber: string;
  customerName: string;
  total: number;
  items: { productName: string; variantName: string | null; quantity: number; total: number }[];
};

function itemsRows(items: OrderEmailData["items"]) {
  return items
    .map(
      (i) =>
        `<tr><td style="padding:4px 0">${i.productName}${i.variantName ? ` (${i.variantName})` : ""} × ${i.quantity}</td><td style="padding:4px 0;text-align:right">₦${i.total.toLocaleString()}</td></tr>`
    )
    .join("");
}

function wrap(title: string, intro: string, data: OrderEmailData, footer = "") {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2>${title}</h2>
      <p>${intro}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">${itemsRows(data.items)}</table>
      <p style="font-weight:bold">Total: ₦${data.total.toLocaleString()}</p>
      ${footer}
    </div>
  `;
}

/** Bank transfer / cash on delivery: order placed but payment not yet confirmed. */
export function customerOrderPendingEmail(data: OrderEmailData, paymentInstructions: string) {
  return {
    subject: `Order ${data.orderNumber} received — ${data.storeName}`,
    html: wrap(
      `Thanks for your order, ${data.customerName}!`,
      `We've received your order <strong>${data.orderNumber}</strong> from ${data.storeName}.`,
      data,
      `<p>${paymentInstructions}</p>`
    ),
  };
}

export function sellerOrderPendingEmail(data: OrderEmailData, paymentMethodLabel: string) {
  return {
    subject: `New order ${data.orderNumber} (${paymentMethodLabel}) — ${data.storeName}`,
    html: wrap(
      "New order — action needed",
      `Order <strong>${data.orderNumber}</strong> from ${data.customerName} was placed via ${paymentMethodLabel}.`,
      data
    ),
  };
}

/** Flutterwave: payment confirmed via webhook. */
export function customerOrderPaidEmail(data: OrderEmailData) {
  return {
    subject: `Payment received for order ${data.orderNumber} — ${data.storeName}`,
    html: wrap(
      `Thanks for your order, ${data.customerName}!`,
      `Your payment for order <strong>${data.orderNumber}</strong> from ${data.storeName} has been confirmed.`,
      data
    ),
  };
}

export function sellerOrderPaidEmail(data: OrderEmailData) {
  return {
    subject: `Payment received — order ${data.orderNumber} — ${data.storeName}`,
    html: wrap(
      "Payment confirmed",
      `Order <strong>${data.orderNumber}</strong> from ${data.customerName} has been paid.`,
      data
    ),
  };
}

type SubscriptionEmailData = { storeName: string; planName: string };

/** A plan subscription became active — first charge or a renewal. */
export function sellerSubscriptionActiveEmail(data: SubscriptionEmailData & { currentPeriodEnd: Date | null }) {
  return {
    subject: `You're on the ${data.planName} plan — StoreHike`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>You're on the ${data.planName} plan</h2>
        <p>Thanks for upgrading, ${data.storeName}! Your subscription is active${
          data.currentPeriodEnd ? ` and renews on ${data.currentPeriodEnd.toLocaleDateString()}` : ""
        }.</p>
      </div>
    `,
  };
}

export function sellerSubscriptionCanceledEmail(data: SubscriptionEmailData & { accessUntil: Date | null }) {
  return {
    subject: `Your ${data.planName} plan was canceled — StoreHike`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Subscription canceled</h2>
        <p>Your ${data.planName} plan for ${data.storeName} has been canceled and won't renew.${
          data.accessUntil ? ` You'll keep your plan's features until ${data.accessUntil.toLocaleDateString()}.` : ""
        }</p>
      </div>
    `,
  };
}
