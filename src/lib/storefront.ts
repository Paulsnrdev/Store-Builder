import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/request-cache";

export async function getPublishedStore(slug: string) {
  const store = await cached(`store:${slug}`, 60_000, () =>
    prisma.store.findFirst({
      where: { slug, isPublished: true, isSuspended: false },
      include: { subscription: { include: { plan: true } } },
    })
  );
  if (!store) notFound();
  return store;
}
