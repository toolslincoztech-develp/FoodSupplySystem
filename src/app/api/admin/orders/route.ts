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
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (!["OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status") || "ALL";
    const typeFilter = searchParams.get("type") || "ALL";
    const timeframe = searchParams.get("timeframe") || "all";

    const isOwner = ["OWNER", "SUPER_ADMIN", "MANAGER"].includes(payload.role);
    const branchId = await getEffectiveBranchId(payload);

    const baseWhere: any = (payload.branchId && !isOwner)
      ? { branchId: payload.branchId }
      : { branch: { restaurantId: payload.restaurantId } };

    // Date filtering
    const now = new Date();
    let startDate: Date | null = null;

    if (timeframe === "today") {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === "week") {
      startDate = new Date();
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const where: any = {
      ...baseWhere
    };

    if (startDate) {
      where.createdAt = { gte: startDate, lte: now };
    }

    // Status filtering
    if (statusFilter === "PAID") {
      where.status = { in: ["PAID", "COMPLETED"] };
    } else if (statusFilter === "ACTIVE") {
      where.status = { in: ["PENDING", "PREPARING", "READY", "SERVED", "OUT_FOR_DELIVERY"] };
    } else if (statusFilter === "CANCELLED") {
      where.status = "CANCELLED";
    }

    // Order Type filtering
    if (typeFilter !== "ALL") {
      where.orderType = typeFilter;
    }

    // Text search by order number
    if (search.trim()) {
      where.orderNumber = {
        contains: search.trim(),
        mode: "insensitive"
      };
    }

    // Fetch orders with full relation details (limit to 100 for fast page response)
    const orders = await prisma.order.findMany({
      where,
      include: {
        table: true,
        user: { select: { name: true, email: true } },
        rider: { select: { name: true } },
        payment: true,
        items: {
          include: {
            menuItem: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    // Compute summary metrics with lean projection (only status, total, payment amount)
    const allOrdersForStats = await prisma.order.findMany({
      where: baseWhere,
      select: {
        status: true,
        total: true,
        payment: { select: { amount: true } }
      }
    });

    const totalOrders = allOrdersForStats.length;
    const paidOrdersCount = allOrdersForStats.filter(o => ["PAID", "COMPLETED", "SERVED"].includes(o.status)).length;
    const activeOrdersCount = allOrdersForStats.filter(o => ["PENDING", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(o.status)).length;
    const totalSales = allOrdersForStats
      .filter(o => ["PAID", "COMPLETED", "SERVED"].includes(o.status))
      .reduce((sum, o) => sum + (o.payment?.amount ?? o.total), 0);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        summary: {
          totalOrders,
          paidOrdersCount,
          activeOrdersCount,
          totalSales
        }
      }
    });

  } catch (error) {
    console.error("Admin Orders API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
