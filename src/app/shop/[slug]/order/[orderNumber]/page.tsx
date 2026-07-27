import { notFound } from "next/navigation";
import { getPublishedStore } from "@/lib/storefront";
import { prisma } from "@/lib/prisma";
import { whatsappLink } from "@/lib/whatsapp";
import { PaymentStatusPoller } from "@/components/storefront/payment-status-poller";

const STATUS_MESSAGE: Record<string, string> = {
  PENDING: "We're confirming your order.",
  PAID: "Payment received — your order is confirmed.",
  PROCESSING: "Your order is being prepared.",
  SHIPPED: "Your order is on its way.",
  DELIVERED: "Your order has been delivered.",
  CANCELLED: "This order was cancelled.",
  REFUNDED: "This order was refunded.",
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ slug: string; orderNumber: string }>;
}) {
  const { slug, orderNumber } = await params;
  const store = await getPublishedStore(slug);

  const order = await prisma.order.findFirst({
    where: { storeId: store.id, orderNumber },
    include: { items: true },
  });
  if (!order) notFound();

  const bankInstructions =
    order.paymentMethod === "BANK_TRANSFER" && order.status === "PENDING" && store.bankName && store.bankAccountNumber
      ? `Transfer ₦${Number(order.total).toLocaleString()} to ${store.bankName}, account number ${store.bankAccountNumber} (${store.bankAccountName ?? store.name}).`
      : null;

  return (
    <div className="mx-auto max-w-md px-4 py-10 text-center">
      <div className="mb-4 text-3xl">✓</div>
      <h1 className="text-xl font-semibold text-gray-900">Order {order.orderNumber}</h1>
      <p className="mt-1 text-sm text-gray-500">{STATUS_MESSAGE[order.status] ?? order.status}</p>

      {order.paymentMethod === "PAYSTACK" && <PaymentStatusPoller orderId={order.id} initialStatus={order.status} />}

      {bankInstructions && (
        <div className="mt-4 rounded-md bg-amber-50 p-3 text-left text-sm text-amber-800">{bankInstructions}</div>
      )}

      <div className="mt-6 divide-y divide-gray-100 border-y border-gray-100 text-left">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between py-3 text-sm">
            <span className="text-gray-700">
              {item.productName}
              {item.variantName ? ` (${item.variantName})` : ""} × {item.quantity}
            </span>
            <span className="text-gray-900">₦{Number(item.total).toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between text-base font-semibold text-gray-900">
        <span>Total</span>
        <span>₦{Number(order.total).toLocaleString()}</span>
      </div>

      {store.whatsappNumber && (
        <a
          href={whatsappLink(store.whatsappNumber, `Hi, I have a question about my order ${order.orderNumber}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block w-full rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white"
        >
          Message us on WhatsApp
        </a>
      )}
    </div>
  );
}
