import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function getPublishedStore(slug: string) {
  const store = await prisma.store.findFirst({ where: { slug, isPublished: true } });
  if (!store) notFound();
  return store;
}
