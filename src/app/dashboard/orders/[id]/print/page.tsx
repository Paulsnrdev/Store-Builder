import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { paymentMethodLabel } from "@/lib/order-status-display";
import { PrintButton } from "@/components/dashboard/print-button";

export default async function OrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const store = await getCurrentStore();
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, storeId: store.id },
    include: { items: true, customer: true },
  });
  if (!order) notFound();

  const shippingAddress = order.shippingAddress as { address: string; state: string };

  return (
    <div className="mx-auto max-w-xl p-8 text-gray-900">
      <PrintButton />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{store.name}</h1>
          {store.address && <p className="text-sm text-gray-500">{store.address}</p>}
          {store.phone && <p className="text-sm text-gray-500">{store.phone}</p>}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">Invoice</p>
          <p className="text-sm text-gray-500">{order.orderNumber}</p>
          <p className="text-sm text-gray-500">{order.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-semibold text-gray-700">Bill to</p>
          <p className="mt-1">{order.customer.name}</p>
          <p className="text-gray-500">{order.customer.phone}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Ship to</p>
          <p className="mt-1">{shippingAddress.address}</p>
          <p className="text-gray-500">{shippingAddress.state} State</p>
        </div>
      </div>

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b border-gray-300 text-left">
            <th className="pb-2">Item</th>
            <th className="pb-2 text-right">Qty</th>
            <th className="pb-2 text-right">Unit price</th>
            <th className="pb-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-2">
                {item.productName}
                {item.variantName ? ` (${item.variantName})` : ""}
              </td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">₦{Number(item.unitPrice).toLocaleString()}</td>
              <td className="py-2 text-right">₦{Number(item.total).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-56 space-y-1 text-sm">
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
            <span>Discount</span>
            <span>−₦{Number(order.discount).toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-300 pt-1 text-base font-semibold">
          <span>Total</span>
          <span>₦{Number(order.total).toLocaleString()}</span>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray-500">Payment method: {paymentMethodLabel[order.paymentMethod]}</p>
    </div>
  );
}
