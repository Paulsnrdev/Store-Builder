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

/** A renewal charge was declined — subscription just dropped to PAST_DUE (Free-tier limits apply immediately, no grace period). */
export function sellerSubscriptionPastDueEmail(data: SubscriptionEmailData) {
  return {
    subject: `Payment failed for your ${data.planName} plan — StoreHike`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>We couldn't renew your ${data.planName} plan</h2>
        <p>The card on file for ${data.storeName} was declined. Your account has reverted to the Free plan's limits until this is resolved — update your payment details and resubscribe from your dashboard's Billing page.</p>
      </div>
    `,
  };
}

/** New seller (or new store on an existing account) just registered. */
export function welcomeSellerEmail(data: { storeName: string; name: string }) {
  return {
    subject: `Welcome to StoreHike, ${data.name}!`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Welcome to StoreHike, ${data.name}!</h2>
        <p>${data.storeName} is set up and ready. Log in to your dashboard to add products, customize your storefront, and start taking orders.</p>
      </div>
    `,
  };
}

export function passwordResetEmail(data: { resetUrl: string }) {
  return {
    subject: `Reset your StoreHike password`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2>Reset your password</h2>
        <p>Click the link below to choose a new password. This link expires in 1 hour and can only be used once.</p>
        <p><a href="${data.resetUrl}" style="color:#059669">Reset your password</a></p>
        <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };
}

type OrderStatusEmailData = OrderEmailData & { trackingNote?: string | null };

export function customerOrderShippedEmail(data: OrderStatusEmailData) {
  return {
    subject: `Your order ${data.orderNumber} has shipped — ${data.storeName}`,
    html: wrap(
      `Your order is on its way, ${data.customerName}!`,
      `Order <strong>${data.orderNumber}</strong> from ${data.storeName} has been shipped.`,
      data,
      data.trackingNote ? `<p>${data.trackingNote}</p>` : ""
    ),
  };
}

export function customerOrderDeliveredEmail(data: OrderEmailData) {
  return {
    subject: `Your order ${data.orderNumber} was delivered — ${data.storeName}`,
    html: wrap(
      `Order delivered, ${data.customerName}!`,
      `Order <strong>${data.orderNumber}</strong> from ${data.storeName} has been marked as delivered. Enjoy!`,
      data
    ),
  };
}

export function customerOrderCancelledEmail(data: OrderEmailData) {
  return {
    subject: `Your order ${data.orderNumber} was cancelled — ${data.storeName}`,
    html: wrap(
      `Order cancelled`,
      `Order <strong>${data.orderNumber}</strong> from ${data.storeName} has been cancelled.`,
      data
    ),
  };
}

export function customerOrderRefundedEmail(data: OrderEmailData) {
  return {
    subject: `Your order ${data.orderNumber} was refunded — ${data.storeName}`,
    html: wrap(
      `Order refunded`,
      `Order <strong>${data.orderNumber}</strong> from ${data.storeName} has been refunded.`,
      data
    ),
  };
}
