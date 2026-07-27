import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { whatsappLink } from "@/lib/whatsapp";
import { orderStatusLabel, orderStatusClass, paymentMethodLabel } from "@/lib/order-status-display";
import { OrderActions } from "@/components/dashboard/order-actions";
import { OrderTimeline } from "@/components/dashboard/order-timeline";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const store = await getCurrentStore();
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, storeId: store.id },
    include: { items: true, customer: true },
  });
  if (!order) notFound();

  const shippingAddress = order.shippingAddress as { address: string; state: string };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/orders" className="text-sm text-gray-500 hover:underline">
            ← Orders
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">{order.orderNumber}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${orderStatusClass[order.status]}`}>
            {orderStatusLabel[order.status]}
          </span>
          <Link
            href={`/dashboard/orders/${order.id}/print`}
            target="_blank"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Print invoice
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Customer</h2>
          <p className="mt-2 text-sm text-gray-700">{order.customer.name}</p>
          <p className="text-sm text-gray-500">{order.customer.phone}</p>
          {order.customer.email && <p className="text-sm text-gray-500">{order.customer.email}</p>}
          <Link
            href={whatsappLink(order.customer.phone, `Hi ${order.customer.name}, this is regarding your order ${order.orderNumber} (status: ${orderStatusLabel[order.status]}).`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            Message on WhatsApp
          </Link>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Shipping address</h2>
          <p className="mt-2 text-sm text-gray-700">{shippingAddress.address}</p>
          <p className="text-sm text-gray-500">{shippingAddress.state} State</p>
          {order.customerNote && (
            <>
              <h2 className="mt-3 text-sm font-semibold text-gray-900">Note from customer</h2>
              <p className="mt-1 text-sm text-gray-500">{order.customerNote}</p>
            </>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Payment</h2>
          <p className="mt-2 text-sm text-gray-700">{paymentMethodLabel[order.paymentMethod]}</p>
          {order.paystackReference && <p className="text-xs text-gray-400">Ref: {order.paystackReference}</p>}
          {order.trackingNote && (
            <>
              <h2 className="mt-3 text-sm font-semibold text-gray-900">Tracking note</h2>
              <p className="mt-1 text-sm text-gray-500">{order.trackingNote}</p>
            </>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Status timeline</h2>
          <div className="mt-3">
            <OrderTimeline
              status={order.status}
              createdAt={order.createdAt}
              paidAt={order.paidAt}
              shippedAt={order.shippedAt}
              deliveredAt={order.deliveredAt}
              updatedAt={order.updatedAt}
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <OrderActions orderId={order.id} status={order.status} paymentMethod={order.paymentMethod} />
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Items</h2>
        <div className="mt-2 divide-y divide-gray-100">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between py-2 text-sm">
              <span className="text-gray-700">
                {item.productName}
                {item.variantName ? ` (${item.variantName})` : ""} × {item.quantity}
              </span>
              <span className="text-gray-900">₦{Number(item.total).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>₦{Number(order.subtotal).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Shipping</span>
            <span>₦{Number(order.shippingCost).toLocaleString()}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Discount {order.discountCode ? `(${order.discountCode})` : ""}</span>
              <span>−₦{Number(order.discount).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold text-gray-900">
            <span>Total</span>
            <span>₦{Number(order.total).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
