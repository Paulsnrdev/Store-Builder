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

/** Paystack: payment confirmed via webhook. */
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
