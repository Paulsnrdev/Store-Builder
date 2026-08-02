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
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!store) redirect(session.user.role === "ADMIN" ? "/admin" : "/register");
  if (store.isSuspended) redirect("/suspended");
  return store;
});
