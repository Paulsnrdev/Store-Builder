import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session;
}

export const getCurrentStore = cache(async () => {
  const session = await requireSession();
  const store = await prisma.store.findFirst({
    where: {
      OR: [{ userId: session.user.id }, { members: { some: { userId: session.user.id, status: "ACTIVE" } } }],
    },
    orderBy: { createdAt: "asc" },
    include: { subscription: { include: { plan: true } } },
  });
  if (!store) redirect(session.user.role === "ADMIN" ? "/dist" : "/register");
  if (store.isSuspended) redirect("/suspended");
  return store;
});

/** For pages/actions only the store owner should reach — staff members are redirected away. */
export async function requireStoreOwner() {
  const session = await requireSession();
  const store = await getCurrentStore();
  if (store.userId !== session.user.id) redirect("/dashboard");
  return store;
}
