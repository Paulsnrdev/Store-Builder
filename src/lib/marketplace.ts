import type { StoreNiche } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { STORE_NICHES, nicheLabel, nicheSlug } from "@/lib/store-niches";

const LISTED_WHERE = { isPublished: true, isSuspended: false } as const;

export async function getNicheCounts() {
  const counts = await prisma.store.groupBy({
    by: ["niche"],
    where: LISTED_WHERE,
    _count: true,
  });
  const countByNiche = new Map(counts.map((c) => [c.niche as string, c._count]));

  return STORE_NICHES.filter((n) => (countByNiche.get(n.value) ?? 0) > 0).map((n) => ({
    ...n,
    count: countByNiche.get(n.value) ?? 0,
  }));
}

export async function getStoresByNiche(niche: StoreNiche) {
  return prisma.store.findMany({
    where: { ...LISTED_WHERE, niche },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
}

export { nicheLabel, nicheSlug };
