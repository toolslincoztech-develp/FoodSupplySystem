import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

    const restaurantId = payload.restaurantId;
    const branchId = payload.branchId;

    // Get today's start and end dates
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Filter by branch if user has branchId (non-owner), otherwise restaurant-wide
    const isOwner = ["OWNER", "SUPER_ADMIN"].includes(payload.role);
    const whereClause = (branchId && !isOwner) ? { branchId } : { branch: { restaurantId } };
    const todayWhereClause = { ...whereClause, createdAt: { gte: startOfDay, lte: endOfDay } };

    // Execute all 4 dashboard queries in parallel for sub-second response
    const [completedOrders, activeOrdersCount, recentOrders, staffCount] = await Promise.all([
      // 1. Total Revenue Today (Includes PAID, COMPLETED, SERVED)
      prisma.order.findMany({
        where: {
          ...todayWhereClause,
          status: { in: ["PAID", "COMPLETED", "SERVED"] }
        },
        select: {
          total: true,
          createdAt: true,
          payment: {
            select: { amount: true }
          }
        }
      }),
      // 2. Active Orders (In kitchen or unserved)
      prisma.order.count({
        where: {
          ...whereClause,
          status: { in: ["PENDING", "PREPARING", "READY"] }
        }
      }),
      // 3. Recent Orders
      prisma.order.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          createdAt: true,
          table: {
            select: { name: true }
          },
          user: {
            select: { name: true }
          }
        }
      }),
      // 4. Staff Count
      prisma.user.count({
        where: { restaurantId }
      })
    ]);
    
    const totalRevenue = completedOrders.reduce((acc, order) => {
      return acc + (order.payment?.amount ?? order.total);
    }, 0);
    const totalOrders = completedOrders.length;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // 5. Hourly Revenue for Today
    const hoursMap: { [key: string]: number } = {
      "9AM": 0, "10AM": 0, "11AM": 0, "12PM": 0, "1PM": 0, "2PM": 0, 
      "3PM": 0, "4PM": 0, "5PM": 0, "6PM": 0, "7PM": 0, "8PM": 0, "9PM": 0, "10PM": 0
    };

    completedOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const hour = orderDate.getHours();
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const key = `${displayHour}${period}`;
      if (hoursMap[key] !== undefined) {
        hoursMap[key] += (order.payment?.amount ?? order.total);
      }
    });

    const revenueByHour = Object.entries(hoursMap).map(([hour, amount]) => ({
      hour,
      amount
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        activeOrdersCount,
        recentOrders,
        staffCount,
        revenueByHour
      }
    });

  } catch (error) {
    console.error("Admin Dashboard Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
