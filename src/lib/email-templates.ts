// Restrained by design: mail providers' promotions filters key on the visual
// patterns of marketing email — color-block banners, logo images, filled
// "sale button" CTAs. This stays clean and legible (a real item table, a
// light header rule, an outline-style link for the one primary action) while
// avoiding every one of those triggers, so these keep landing in the primary
// inbox instead of Promotions.

const BRAND = "#059669";
const TEXT = "#1f2937";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function shell(bodyHtml: string, headerLabel: string): string {
  return `
    <div style="font-family:${FONT};font-size:15px;line-height:1.6;color:${TEXT};max-width:520px;">
      <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:${MUTED};text-transform:uppercase;letter-spacing:0.03em;">${headerLabel}</p>
      ${bodyHtml}
      <p style="margin:28px 0 0;padding-top:16px;border-top:1px solid ${BORDER};font-size:12px;color:${MUTED};">
        Sent by StoreHike.
      </p>
    </div>
  `;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 14px;">${text}</p>`;
}

/** A single, restrained action — outlined rather than filled, so it reads as a link with structure, not a "sale" button. */
function button(label: string, url: string): string {
  return `
    <p style="margin:20px 0;">
      <a href="${url}" style="display:inline-block;padding:9px 18px;border:1px solid ${BRAND};border-radius:6px;color:${BRAND};text-decoration:none;font-weight:600;">${label}</a>
    </p>
  `;
}

type OrderEmailData = {
  storeName: string;
  orderNumber: string;
  customerName: string;
  total: number;
  items: { productName: string; variantName: string | null; quantity: number; total: number }[];
};

function itemsTable(items: OrderEmailData["items"], total: number) {
  const rows = items
    .map(
      (i) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid ${BORDER};">
            ${i.productName}${i.variantName ? `<br><span style="color:${MUTED};font-size:13px;">${i.variantName}</span>` : ""}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid ${BORDER};text-align:center;color:${MUTED};">x${i.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid ${BORDER};text-align:right;white-space:nowrap;">₦${i.total.toLocaleString()}</td>
        </tr>`
    )
    .join("");
  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      ${rows}
      <tr>
        <td style="padding:10px 0 0;font-weight:700;" colspan="2">Total</td>
        <td style="padding:10px 0 0;font-weight:700;text-align:right;white-space:nowrap;">₦${total.toLocaleString()}</td>
      </tr>
    </table>
  `;
}

function orderEmail(intro: string, data: OrderEmailData, footer = "") {
  return shell(
    `
      ${paragraph(intro)}
      ${itemsTable(data.items, data.total)}
      ${footer}
    `,
    data.storeName
  );
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

/** Paystack: payment confirmed via webhook. */
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
    html: shell(
      `
        ${paragraph(
          `Thanks for upgrading, ${data.storeName}. Your ${data.planName} plan is active${
            data.currentPeriodEnd ? ` and renews on ${data.currentPeriodEnd.toLocaleDateString()}` : ""
          }.`
        )}
        ${button("View billing", data.billingUrl)}
      `,
      "StoreHike"
    ),
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
      ),
      "StoreHike"
    ),
  };
}

/** A renewal charge was declined — subscription just dropped to PAST_DUE (Free-tier limits apply immediately, no grace period). */
export function sellerSubscriptionPastDueEmail(data: SubscriptionEmailData & { billingUrl: string }) {
  return {
    subject: `Payment failed for your ${data.planName} plan — StoreHike`,
    html: shell(
      `
        ${paragraph(
          `The card on file for ${data.storeName} was declined, so the ${data.planName} plan renewal failed. Your account has reverted to the Free plan's limits until this is resolved.`
        )}
        ${button("Update billing", data.billingUrl)}
      `,
      "StoreHike"
    ),
  };
}

/** New seller (or new store on an existing account) just registered. */
export function welcomeSellerEmail(data: { storeName: string; name: string; dashboardUrl: string }) {
  return {
    subject: `Welcome to StoreHike, ${data.name}`,
    html: shell(
      `
        ${paragraph(`Hi ${data.name},`)}
        ${paragraph(`${data.storeName} is set up and ready. Log in to add products, customize your storefront, and start taking orders.`)}
        ${button("Go to your dashboard", data.dashboardUrl)}
      `,
      "StoreHike"
    ),
  };
}

export function passwordResetEmail(data: { resetUrl: string }) {
  return {
    subject: `Reset your StoreHike password`,
    html: shell(
      `
        ${paragraph("Click below to choose a new password. This link expires in 1 hour and can only be used once.")}
        ${button("Reset your password", data.resetUrl)}
        ${paragraph(`If you didn't request this, you can ignore this email.`)}
      `,
      "StoreHike"
    ),
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
    html: shell(
      `
        ${paragraph(`You've been invited to help manage ${data.storeName}'s StoreHike dashboard. You'll need to sign in or create a free account first.`)}
        ${button("Accept invitation", data.acceptUrl)}
      `,
      "StoreHike"
    ),
  };
}
