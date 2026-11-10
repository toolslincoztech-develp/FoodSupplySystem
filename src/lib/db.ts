import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Always preserve and reuse connection across warm serverless container invocations
globalForPrisma.prisma = prisma;

// In-memory branch cache to eliminate redundant DB lookups on every request
const branchCache = new Map<string, { id: string; expires: number }>();

export async function getEffectiveBranchId(payload: { branchId?: string | null; restaurantId?: string | null }): Promise<string | null> {
  if (payload.branchId) return payload.branchId;
  if (!payload.restaurantId) return null;

  const cached = branchCache.get(payload.restaurantId);
  if (cached && cached.expires > Date.now()) {
    return cached.id;
  }

  try {
    const branch = await prisma.branch.findFirst({
      where: { restaurantId: payload.restaurantId },
      select: { id: true },
      orderBy: { id: "asc" }
    });

    if (branch?.id) {
      branchCache.set(payload.restaurantId, { id: branch.id, expires: Date.now() + 5 * 60 * 1000 });
    }

    return branch?.id || null;
  } catch (error) {
    console.warn("Failed to getEffectiveBranchId:", error);
    return null;
  }
}
