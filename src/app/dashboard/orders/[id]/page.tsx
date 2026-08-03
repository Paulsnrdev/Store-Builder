import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { whatsappLink } from "@/lib/whatsapp";
import { orderStatusLabel, orderStatusClass, paymentMethodLabel } from "@/lib/order-status-display";
import { OrderActions } from "@/components/dashboard/order-actions";
import { OrderTimeline } from "@/components/dashboard/order-timeline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

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
          <StatusBadge tone={`${orderStatusClass[order.status]} px-3 py-1 text-sm`}>{orderStatusLabel[order.status]}</StatusBadge>
          <Button href={`/dashboard/orders/${order.id}/print`} target="_blank" variant="secondary" size="sm">
            Print invoice
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
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
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-900">Shipping address</h2>
          <p className="mt-2 text-sm text-gray-700">{shippingAddress.address}</p>
          <p className="text-sm text-gray-500">{shippingAddress.state} State</p>
          {order.customerNote && (
            <>
              <h2 className="mt-3 text-sm font-semibold text-gray-900">Note from customer</h2>
              <p className="mt-1 text-sm text-gray-500">{order.customerNote}</p>
            </>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-gray-900">Payment</h2>
          <p className="mt-2 text-sm text-gray-700">{paymentMethodLabel[order.paymentMethod]}</p>
          {order.flutterwaveTxRef && <p className="text-xs text-gray-400">Ref: {order.flutterwaveTxRef}</p>}
          {order.trackingNote && (
            <>
              <h2 className="mt-3 text-sm font-semibold text-gray-900">Tracking note</h2>
              <p className="mt-1 text-sm text-gray-500">{order.trackingNote}</p>
            </>
          )}
        </Card>

        <Card>
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
        </Card>
      </div>

      <div className="mt-4">
        <OrderActions orderId={order.id} status={order.status} paymentMethod={order.paymentMethod} />
      </div>

      <Card className="mt-4">
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
      </Card>
    </div>
  );
}
