import { NextResponse } from "next/server";
import { prisma, getEffectiveBranchId } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { getOrSetCache, tenantCacheKey } from "@/lib/cache";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.restaurantId) {
      return NextResponse.json({ error: "Invalid token or tenant missing" }, { status: 401 });
    }

    const restaurantId = payload.restaurantId;
    const branchId = await getEffectiveBranchId(payload);

    if (!branchId) {
      return NextResponse.json({ error: "User is not assigned to a branch and no branch found" }, { status: 403 });
    }

    const data = await getOrSetCache(
      tenantCacheKey(restaurantId, "pos-init", branchId),
      10_000,
      async () => {
        const [categories, menuItems, activeOrders, restaurant] = await Promise.all([
          prisma.category.findMany({
            where: { restaurantId },
            orderBy: { sortOrder: "asc" }
          }),
          prisma.menuItem.findMany({
            where: { restaurantId },
            orderBy: { name: "asc" }
          }),
          prisma.order.findMany({
            where: {
              branchId,
              status: { in: ["PENDING", "PREPARING", "READY", "SERVED"] }
            },
            include: {
              items: { include: { menuItem: true } },
              user: { select: { name: true } }
            },
            orderBy: { createdAt: "desc" }
          }),
          prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { hasTax: true, taxRate: true }
          })
        ]);

        return {
          categories,
          menuItems,
          activeOrders,
          taxConfig: {
            hasTax: Boolean(restaurant?.hasTax),
            taxRate: Number(restaurant?.taxRate || 0)
          }
        };
      },
      120_000
    );

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("POS Init Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
