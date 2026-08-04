"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCart } from "@/components/storefront/cart-context";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";
import { previewDiscount } from "@/lib/actions/storefront";
import { placeOrder } from "@/lib/actions/orders";

type Zone = { id: string; name: string; states: string[]; rate: number; freeAbove: number | null };

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-(--store-primary,#111827) focus:outline-none focus:ring-2 focus:ring-(--store-primary,#111827)/15";

const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

const PAYMENT_OPTIONS = [
  { value: "FLUTTERWAVE", label: "Pay with card", hint: "Powered by Flutterwave" },
  { value: "BANK_TRANSFER", label: "Bank transfer", hint: "Pay directly to the seller's account" },
  { value: "CASH_ON_DELIVERY", label: "Cash on delivery", hint: "Pay when your order arrives" },
] as const;

export function CheckoutForm({
  storeId,
  storeSlug,
  zones,
  allowCardPayments,
}: {
  storeId: string;
  storeSlug: string;
  zones: Zone[];
  allowCardPayments: boolean;
}) {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();

  const paymentOptions = allowCardPayments ? PAYMENT_OPTIONS : PAYMENT_OPTIONS.filter((o) => o.value !== "FLUTTERWAVE");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"FLUTTERWAVE" | "BANK_TRANSFER" | "CASH_ON_DELIVERY">(
    allowCardPayments ? "FLUTTERWAVE" : "BANK_TRANSFER"
  );

  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [checkingDiscount, startDiscountCheck] = useTransition();

  const [placing, startPlacing] = useTransition();
  const [orderError, setOrderError] = useState<string | null>(null);

  const [step, setStep] = useState<"details" | "payment">("details");

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

    if (step === "details") {
      setStep("payment");
      return;
    }

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
      if (result.flutterwavePaymentLink) {
        window.location.href = result.flutterwavePaymentLink;
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
      <div className="flex gap-1.5 sm:hidden">
        <div className="h-1 flex-1 rounded-full bg-(--store-primary,#111827)" />
        <div className={`h-1 flex-1 rounded-full ${step === "payment" ? "bg-(--store-primary,#111827)" : "bg-gray-200"}`} />
      </div>

      <div className="space-y-4 sm:col-span-3">
        {step === "details" ? (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900">Contact</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Full name</label>
                  <input required placeholder="e.g. Segun Ajayi" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Phone (WhatsApp)</label>
                  <input required placeholder="080..." value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email (optional)</label>
                  <input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900">Shipping address</h2>
              <div className="mt-3 space-y-4">
                <div>
                  <label className={labelClass}>Street address</label>
                  <textarea
                    required
                    placeholder="House number, street, area"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <select required value={state} onChange={(e) => setState(e.target.value)} className={inputClass}>
                    <option value="">Select state</option>
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Note for the seller (optional)</label>
                  <textarea
                    placeholder="e.g. Call before delivery"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Contact & shipping</h2>
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="text-xs font-medium text-(--store-primary,#111827) hover:underline"
                >
                  Edit
                </button>
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">{name}</p>
              <p className="text-sm text-gray-500">
                {phone}
                {email ? ` · ${email}` : ""}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                {address}, {state}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900">Payment method</h2>
              <div className="mt-3 space-y-2.5">
                {paymentOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-3.5 py-3 text-sm transition-colors ${
                      paymentMethod === opt.value ? "border-(--store-primary,#111827) bg-gray-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === opt.value}
                      onChange={() => setPaymentMethod(opt.value)}
                      className="h-4 w-4 accent-(--store-primary,#111827)"
                    />
                    <span>
                      <span className="block font-medium text-gray-900">{opt.label}</span>
                      <span className="block text-xs text-gray-500">{opt.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="sm:col-span-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:sticky sm:top-20">
          <h2 className="text-base font-semibold text-gray-900">Order summary</h2>
          <ul className="mt-3 space-y-3">
            {items.map((item) => (
              <li key={`${item.productId}:${item.variantId ?? ""}`} className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100">
                  {item.image && <Image src={item.image} alt="" fill className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium text-gray-900">{item.name}</p>
                  <p className="text-gray-500">
                    {item.variantName ? `${item.variantName} · ` : ""}Qty {item.quantity}
                  </p>
                </div>
                <span className="text-sm font-medium text-gray-900">₦{(item.price * item.quantity).toLocaleString()}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
            <input
              placeholder="Discount code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-(--store-primary,#111827) focus:outline-none focus:ring-2 focus:ring-(--store-primary,#111827)/15"
            />
            <button
              type="button"
              onClick={applyDiscount}
              disabled={checkingDiscount || !discountCode}
              className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Apply
            </button>
          </div>
          {discountError && <p className="mt-1.5 text-xs text-red-600">{discountError}</p>}
          {discount && <p className="mt-1.5 text-xs font-medium text-green-700">{discount.code} applied</p>}

          <div className="mt-4 space-y-1.5 rounded-lg bg-gray-50 p-3 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₦{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping{zone ? ` (${zone.name})` : ""}</span>
              <span>{state ? (shippingCost > 0 ? `₦${shippingCost.toLocaleString()}` : "Free") : "—"}</span>
            </div>
            {discount && (
              <div className="flex justify-between text-gray-600">
                <span>Discount</span>
                <span>−₦{discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-1.5 text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>₦{total.toLocaleString()}</span>
            </div>
          </div>

          {orderError && <p className="mt-3 text-sm font-medium text-red-600">{orderError}</p>}

          <button
            type="submit"
            disabled={placing || (step === "payment" && !state)}
            className="mt-4 w-full rounded-lg bg-(--store-primary,#111827) px-4 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {step === "details" ? "Continue" : placing ? "Placing order..." : "Place order"}
          </button>
          {step === "payment" && (
            <button
              type="button"
              onClick={() => setStep("details")}
              className="mt-2 w-full text-center text-sm font-medium text-gray-500 hover:underline"
            >
              Back
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
