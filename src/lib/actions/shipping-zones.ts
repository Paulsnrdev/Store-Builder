"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentStore } from "@/lib/store";
import { NIGERIAN_STATES } from "@/lib/nigerian-states";
import { hasFeature } from "@/lib/plan-features";

const zoneSchema = z.object({
  name: z.string().min(1, "Name is required"),
  states: z.array(z.enum(NIGERIAN_STATES)).min(1, "Select at least one state"),
  rate: z.coerce.number().nonnegative(),
  freeAbove: z.coerce.number().nonnegative().nullable().optional(),
});

function parseZoneForm(formData: FormData) {
  return zoneSchema.safeParse({
    name: formData.get("name"),
    states: formData.getAll("states"),
    rate: formData.get("rate"),
    freeAbove: formData.get("freeAbove") || null,
  });
}

export type ShippingZoneFormState = { error?: string };

export async function createShippingZone(_prev: ShippingZoneFormState, formData: FormData): Promise<ShippingZoneFormState> {
  const store = await getCurrentStore();
  if (!hasFeature(store.subscription, "SHIPPING_ZONES")) {
    return { error: "Custom shipping zones are available on the Basic plan and above. Upgrade to add one." };
  }

  const parsed = parseZoneForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.shippingZone.create({
    data: { storeId: store.id, name: parsed.data.name, states: parsed.data.states, rate: parsed.data.rate, freeAbove: parsed.data.freeAbove },
  });

  revalidatePath("/dashboard/shipping");
  redirect("/dashboard/shipping");
}

export async function updateShippingZone(id: string, _prev: ShippingZoneFormState, formData: FormData): Promise<ShippingZoneFormState> {
  const store = await getCurrentStore();
  const existing = await prisma.shippingZone.findFirst({ where: { id, storeId: store.id } });
  if (!existing) return { error: "Shipping zone not found." };

  const parsed = parseZoneForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.shippingZone.update({
    where: { id },
    data: { name: parsed.data.name, states: parsed.data.states, rate: parsed.data.rate, freeAbove: parsed.data.freeAbove },
  });

  revalidatePath("/dashboard/shipping");
  redirect("/dashboard/shipping");
}

export async function deleteShippingZone(id: string) {
  const store = await getCurrentStore();
  await prisma.shippingZone.deleteMany({ where: { id, storeId: store.id } });
  revalidatePath("/dashboard/shipping");
}
