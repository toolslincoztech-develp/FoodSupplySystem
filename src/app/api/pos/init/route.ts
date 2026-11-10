import { NextResponse } from "next/server";
import { prisma, getEffectiveBranchId } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

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

    // In a multi-branch setup, Waiters are assigned to a branchId, or Owners default to restaurant's branch
    const branchId = await getEffectiveBranchId(payload);

    if (!branchId) {
      return NextResponse.json({ error: "User is not assigned to a branch and no branch found" }, { status: 403 });
    }

    // Execute queries in parallel for maximum speed (<250ms)
    const [categories, menuItems, activeOrders, restaurant] = await Promise.all([
      // 1. Categories for the tenant
      prisma.category.findMany({
        where: { restaurantId: payload.restaurantId },
        orderBy: { sortOrder: "asc" }
      }),
      // 2. Menu Items for the tenant
      prisma.menuItem.findMany({
        where: { restaurantId: payload.restaurantId },
        orderBy: { name: "asc" }
      }),
      // 3. Active orders for drawer list
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
      // 4. Tax Configuration
      prisma.$queryRaw<Array<{ hasTax: boolean; taxRate: number }>>`
        SELECT "hasTax", "taxRate" FROM "Restaurant" WHERE id = ${payload.restaurantId} LIMIT 1
      `
    ]);

    const taxInfo = Array.isArray(restaurant) && restaurant.length > 0 ? restaurant[0] : null;

    return NextResponse.json({
      success: true,
      data: {
        categories,
        menuItems,
        activeOrders,
        taxConfig: {
          hasTax: Boolean(taxInfo?.hasTax),
          taxRate: Number(taxInfo?.taxRate || 0)
        }
      }
    });

  } catch (error) {
    console.error("POS Init Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
