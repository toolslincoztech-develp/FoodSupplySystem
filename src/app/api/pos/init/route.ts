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

    // Execute all queries in parallel for maximum speed (<250ms)
    const [tables, categories, menuItems, riders, activeOrders, restaurant] = await Promise.all([
      // 1. Tables for the branch
      prisma.restaurantTable.findMany({
        where: { branchId },
        orderBy: { name: "asc" }
      }),
      // 2. Categories for the restaurant
      prisma.category.findMany({
        where: { restaurantId: payload.restaurantId },
        orderBy: { sortOrder: "asc" }
      }),
      // 3. Menu Items for the restaurant
      prisma.menuItem.findMany({
        where: { restaurantId: payload.restaurantId },
        orderBy: { name: "asc" }
      }),
      // 4. Delivery Riders for the restaurant
      prisma.user.findMany({
        where: { 
          restaurantId: payload.restaurantId,
          role: "RIDER"
        },
        select: {
          id: true,
          name: true,
          phone: true
        },
        orderBy: { name: "asc" }
      }),
      // 5. Active orders for tables & drawer list
      prisma.order.findMany({
        where: {
          branchId,
          status: { in: ["PENDING", "PREPARING", "READY", "SERVED"] }
        },
        include: {
          items: { include: { menuItem: true } },
          table: true,
          rider: true,
          user: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" }
      }),
      // 6. Restaurant Tax Configuration
      prisma.$queryRaw<Array<{ hasTax: boolean; taxRate: number }>>`
        SELECT "hasTax", "taxRate" FROM "Restaurant" WHERE id = ${payload.restaurantId} LIMIT 1
      `
    ]);

    const taxInfo = Array.isArray(restaurant) && restaurant.length > 0 ? restaurant[0] : null;

    return NextResponse.json({
      success: true,
      data: {
        tables,
        categories,
        menuItems,
        riders,
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
