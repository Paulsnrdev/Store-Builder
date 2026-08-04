// Deliberately plain, not "designed" — heavy styling (background blocks, big
// buttons, logo headers) is exactly what mail providers' promotions filters
// key on. Looking like an ordinary person-to-person email is what keeps
// these landing in the primary inbox.

const BRAND = "#059669";

function shell(bodyHtml: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1f2937;">${bodyHtml}</div>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;">${text}</p>`;
}

function link(label: string, url: string): string {
  return `<a href="${url}" style="color:${BRAND};">${label}</a>`;
}

type OrderEmailData = {
  storeName: string;
  orderNumber: string;
  customerName: string;
  total: number;
  items: { productName: string; variantName: string | null; quantity: number; total: number }[];
};

function itemsList(items: OrderEmailData["items"]) {
  const rows = items
    .map((i) => `${i.productName}${i.variantName ? ` (${i.variantName})` : ""} x${i.quantity} — ₦${i.total.toLocaleString()}`)
    .join("<br>");
  return `<p style="margin:0 0 12px;">${rows}</p>`;
}

function orderEmail(intro: string, data: OrderEmailData, footer = "") {
  return shell(`
    ${paragraph(intro)}
    ${itemsList(data.items)}
    ${paragraph(`<strong>Total: ₦${data.total.toLocaleString()}</strong>`)}
    ${footer}
  `);
}

/** Bank transfer / cash on delivery: order placed but payment not yet confirmed. */
export function customerOrderPendingEmail(data: OrderEmailData, paymentInstructions: string) {
  return {
    subject: `Order ${data.orderNumber} received — ${data.storeName}`,
    html: orderEmail(
      `Hi ${data.customerName}, we've received your order ${data.orderNumber} from ${data.storeName}.`,
      data,
      paragraph(paymentInstructions)
    ),
  };
}

export function sellerOrderPendingEmail(data: OrderEmailData, paymentMethodLabel: string) {
  return {
    subject: `New order ${data.orderNumber} (${paymentMethodLabel}) — ${data.storeName}`,
    html: orderEmail(`Order ${data.orderNumber} from ${data.customerName} was placed via ${paymentMethodLabel}.`, data),
  };
}

/** Flutterwave: payment confirmed via webhook. */
export function customerOrderPaidEmail(data: OrderEmailData) {
  return {
    subject: `Payment received for order ${data.orderNumber} — ${data.storeName}`,
    html: orderEmail(`Hi ${data.customerName}, your payment for order ${data.orderNumber} from ${data.storeName} has been confirmed.`, data),
  };
}

export function sellerOrderPaidEmail(data: OrderEmailData) {
  return {
    subject: `Payment received — order ${data.orderNumber} — ${data.storeName}`,
    html: orderEmail(`Order ${data.orderNumber} from ${data.customerName} has been paid.`, data),
  };
}

type SubscriptionEmailData = { storeName: string; planName: string };

/** A plan subscription became active — first charge or a renewal. */
export function sellerSubscriptionActiveEmail(data: SubscriptionEmailData & { currentPeriodEnd: Date | null; billingUrl: string }) {
  return {
    subject: `You're on the ${data.planName} plan — StoreHike`,
    html: shell(`
      ${paragraph(
        `Thanks for upgrading, ${data.storeName}. Your ${data.planName} plan is active${
          data.currentPeriodEnd ? ` and renews on ${data.currentPeriodEnd.toLocaleDateString()}` : ""
        }.`
      )}
      ${paragraph(link("View billing", data.billingUrl))}
    `),
  };
}

export function sellerSubscriptionCanceledEmail(data: SubscriptionEmailData & { accessUntil: Date | null }) {
  return {
    subject: `Your ${data.planName} plan was canceled — StoreHike`,
    html: shell(
      paragraph(
        `Your ${data.planName} plan for ${data.storeName} has been canceled and won't renew.${
          data.accessUntil ? ` You'll keep your plan's features until ${data.accessUntil.toLocaleDateString()}.` : ""
        }`
      )
    ),
  };
}

/** A renewal charge was declined — subscription just dropped to PAST_DUE (Free-tier limits apply immediately, no grace period). */
export function sellerSubscriptionPastDueEmail(data: SubscriptionEmailData & { billingUrl: string }) {
  return {
    subject: `Payment failed for your ${data.planName} plan — StoreHike`,
    html: shell(`
      ${paragraph(
        `The card on file for ${data.storeName} was declined, so the ${data.planName} plan renewal failed. Your account has reverted to the Free plan's limits until this is resolved.`
      )}
      ${paragraph(link("Update billing", data.billingUrl))}
    `),
  };
}

/** New seller (or new store on an existing account) just registered. */
export function welcomeSellerEmail(data: { storeName: string; name: string; dashboardUrl: string }) {
  return {
    subject: `Welcome to StoreHike, ${data.name}`,
    html: shell(`
      ${paragraph(`Hi ${data.name},`)}
      ${paragraph(`${data.storeName} is set up and ready. Log in to add products, customize your storefront, and start taking orders.`)}
      ${paragraph(link("Go to your dashboard", data.dashboardUrl))}
    `),
  };
}

export function passwordResetEmail(data: { resetUrl: string }) {
  return {
    subject: `Reset your StoreHike password`,
    html: shell(`
      ${paragraph("Click below to choose a new password. This link expires in 1 hour and can only be used once.")}
      ${paragraph(link("Reset your password", data.resetUrl))}
      ${paragraph(`If you didn't request this, you can ignore this email.`)}
    `),
  };
}

type OrderStatusEmailData = OrderEmailData & { trackingNote?: string | null };

export function customerOrderShippedEmail(data: OrderStatusEmailData) {
  return {
    subject: `Your order ${data.orderNumber} has shipped — ${data.storeName}`,
    html: orderEmail(
      `Hi ${data.customerName}, order ${data.orderNumber} from ${data.storeName} has been shipped.`,
      data,
      data.trackingNote ? paragraph(data.trackingNote) : ""
    ),
  };
}

export function customerOrderDeliveredEmail(data: OrderEmailData) {
  return {
    subject: `Your order ${data.orderNumber} was delivered — ${data.storeName}`,
    html: orderEmail(`Hi ${data.customerName}, order ${data.orderNumber} from ${data.storeName} has been marked as delivered.`, data),
  };
}

export function customerOrderCancelledEmail(data: OrderEmailData) {
  return {
    subject: `Your order ${data.orderNumber} was cancelled — ${data.storeName}`,
    html: orderEmail(`Order ${data.orderNumber} from ${data.storeName} has been cancelled.`, data),
  };
}

export function customerOrderRefundedEmail(data: OrderEmailData) {
  return {
    subject: `Your order ${data.orderNumber} was refunded — ${data.storeName}`,
    html: orderEmail(`Order ${data.orderNumber} from ${data.storeName} has been refunded.`, data),
  };
}

export function staffInviteEmail(data: { storeName: string; acceptUrl: string }) {
  return {
    subject: `You've been invited to help manage ${data.storeName} on StoreHike`,
    html: shell(`
      ${paragraph(`You've been invited to help manage ${data.storeName}'s StoreHike dashboard. You'll need to sign in or create a free account first.`)}
      ${paragraph(link("Accept invitation", data.acceptUrl))}
    `),
  };
}
