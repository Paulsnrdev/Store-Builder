"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/storefront/cart-context";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";
import { previewDiscount } from "@/lib/actions/storefront";
import { placeOrder } from "@/lib/actions/orders";

type Zone = { id: string; name: string; states: string[]; rate: number; freeAbove: number | null };

export function CheckoutForm({ storeId, storeSlug, zones }: { storeId: string; storeSlug: string; zones: Zone[] }) {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"PAYSTACK" | "BANK_TRANSFER" | "CASH_ON_DELIVERY">("PAYSTACK");

  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [checkingDiscount, startDiscountCheck] = useTransition();

  const [placing, startPlacing] = useTransition();
  const [orderError, setOrderError] = useState<string | null>(null);

  const zone = useMemo(() => zones.find((z) => z.states.includes(state)), [zones, state]);
  const shippingCost = zone ? (zone.freeAbove !== null && subtotal >= zone.freeAbove ? 0 : zone.rate) : 0;
  const discountAmount = discount?.amount ?? 0;
  const total = Math.max(subtotal + shippingCost - discountAmount, 0);

  function applyDiscount() {
    setDiscountError(null);
    startDiscountCheck(async () => {
      const result = await previewDiscount(storeId, discountCode, subtotal);
      if (result.ok) {
        setDiscount({ code: result.code, amount: result.amount });
      } else {
        setDiscount(null);
        setDiscountError(result.error);
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setOrderError(null);
    startPlacing(async () => {
      const result = await placeOrder({
        storeId,
        items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        customer: { name, phone, email: email || undefined },
        shippingAddress: { address, state },
        paymentMethod,
        discountCode: discount?.code,
        customerNote: note || undefined,
      });

      if (!result.ok) {
        setOrderError(result.error);
        return;
      }

      clear();
      if (result.paystackAuthorizationUrl) {
        window.location.href = result.paystackAuthorizationUrl;
      } else {
        router.push(`/shop/${storeSlug}/order/${result.orderNumber}`);
      }
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-500">Your cart is empty.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 sm:grid-cols-5">
      <div className="space-y-4 sm:col-span-3">
        <div>
          <h2 className="text-sm font-medium text-gray-700">Contact</h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm sm:col-span-2"
            />
            <input
              required
              placeholder="Phone (WhatsApp)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-700">Shipping address</h2>
          <div className="mt-2 grid gap-3">
            <textarea
              required
              placeholder="Street address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select state</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Note for the seller (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-700">Payment method</h2>
          <div className="mt-2 space-y-2">
            {[
              { value: "PAYSTACK", label: "Pay with card (Paystack)" },
              { value: "BANK_TRANSFER", label: "Bank transfer" },
              { value: "CASH_ON_DELIVERY", label: "Cash on delivery" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === opt.value}
                  onChange={() => setPaymentMethod(opt.value as typeof paymentMethod)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="sm:col-span-2">
        <div className="rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-medium text-gray-700">Order summary</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            {items.map((item) => (
              <li key={`${item.productId}:${item.variantId ?? ""}`} className="flex justify-between">
                <span>
                  {item.name}
                  {item.variantName ? ` (${item.variantName})` : ""} × {item.quantity}
                </span>
                <span>₦{(item.price * item.quantity).toLocaleString()}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex gap-2">
            <input
              placeholder="Discount code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={applyDiscount}
              disabled={checkingDiscount || !discountCode}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
            >
              Apply
            </button>
          </div>
          {discountError && <p className="mt-1 text-xs text-red-600">{discountError}</p>}
          {discount && <p className="mt-1 text-xs text-green-700">{discount.code} applied</p>}

          <div className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₦{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping{zone ? ` (${zone.name})` : ""}</span>
              <span>{state ? (zone ? `₦${shippingCost.toLocaleString()}` : "Not available") : "—"}</span>
            </div>
            {discount && (
              <div className="flex justify-between text-gray-600">
                <span>Discount</span>
                <span>−₦{discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>₦{total.toLocaleString()}</span>
            </div>
          </div>

          {orderError && <p className="mt-2 text-sm text-red-600">{orderError}</p>}

          <button
            type="submit"
            disabled={placing || !state || (!!state && !zone)}
            className="mt-4 w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {placing ? "Placing order..." : "Place order"}
          </button>
        </div>
      </div>
    </form>
  );
}
