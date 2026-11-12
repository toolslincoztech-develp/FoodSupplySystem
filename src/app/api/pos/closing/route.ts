import { NextResponse } from "next/server";
import { prisma, getEffectiveBranchId } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { getOrSetCache, tenantCacheKey } from "@/lib/cache";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.restaurantId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const restaurantId = payload.restaurantId;
    const branchId = await getEffectiveBranchId(payload);
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "all"; // "all" (default) or "cashier"

    const isBranchScoped = Boolean(branchId && !["OWNER", "SUPER_ADMIN"].includes(payload.role));
    const cacheKey = tenantCacheKey(
      restaurantId,
      "closing",
      `${isBranchScoped ? branchId : "all"}:${scope}:${scope === "cashier" ? payload.id : "all"}`
    );

    const data = await getOrSetCache(
      cacheKey,
      15_000,
      async () => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const whereClause: any = {
          status: { in: ["PAID", "COMPLETED", "SERVED"] },
          createdAt: { gte: startOfDay, lte: endOfDay }
        };

        if (isBranchScoped) {
          whereClause.branchId = branchId;
        } else {
          whereClause.branch = { restaurantId };
        }

        if (scope === "cashier" && payload.id) {
          whereClause.userId = payload.id;
        }

        const [restaurant, orders] = await Promise.all([
          prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { name: true, logoUrl: true, contactPhone: true, address: true }
          }),
          prisma.order.findMany({
            where: whereClause,
            include: {
              payment: true,
              user: { select: { id: true, name: true } },
              items: {
                include: {
                  menuItem: {
                    include: {
                      category: { select: { id: true, name: true } }
                    }
                  }
                }
              }
            },
            orderBy: { createdAt: "desc" }
          })
        ]);

        let grossSales = 0;
        let totalDiscount = 0;
        let totalTax = 0;
        let netSales = 0;
        let cashSales = 0;
        let cashOrdersCount = 0;
        let cardSales = 0;
        let cardOrdersCount = 0;
        let otherSales = 0;
        let totalItemsSold = 0;

        const orderTypes = {
          dineIn: 0,
          takeaway: 0,
          delivery: 0
        };

        const channels = {
          dineIn: { orders: 0, sales: 0 },
          takeaway: { orders: 0, sales: 0 },
          delivery: { orders: 0, sales: 0 }
        };

        const itemsMap = new Map<string, {
          id: string;
          name: string;
          categoryName: string;
          quantity: number;
          totalRevenue: number;
        }>();

        const categoriesMap = new Map<string, {
          categoryName: string;
          quantity: number;
          totalRevenue: number;
        }>();

        orders.forEach((order) => {
          const orderTotal = order.payment?.amount ?? order.total;
          netSales += orderTotal;
          totalDiscount += order.discount || 0;
          totalTax += order.tax || 0;

          const method = (order.payment?.method || "CASH").toUpperCase();
          if (method === "CASH") {
            cashSales += orderTotal;
            cashOrdersCount++;
          } else if (method === "CARD") {
            cardSales += orderTotal;
            cardOrdersCount++;
          } else {
            otherSales += orderTotal;
          }

          if (order.orderType === "DINE_IN") {
            orderTypes.dineIn++;
            channels.dineIn.orders++;
            channels.dineIn.sales += orderTotal;
          } else if (order.orderType === "TAKEOUT" || order.orderType === "TAKEAWAY") {
            orderTypes.takeaway++;
            channels.takeaway.orders++;
            channels.takeaway.sales += orderTotal;
          } else if (order.orderType === "DELIVERY") {
            orderTypes.delivery++;
            channels.delivery.orders++;
            channels.delivery.sales += orderTotal;
          }

          order.items.forEach((item) => {
            const itemQty = item.quantity || 1;
            const itemLineTotal = item.price * itemQty;
            grossSales += itemLineTotal;
            totalItemsSold += itemQty;

            const menuItemId = item.menuItemId || item.id;
            const itemName = item.menuItem?.name || "Item";
            const catName = item.menuItem?.category?.name || "General";

            if (itemsMap.has(menuItemId)) {
              const existing = itemsMap.get(menuItemId)!;
              existing.quantity += itemQty;
              existing.totalRevenue += itemLineTotal;
            } else {
              itemsMap.set(menuItemId, {
                id: menuItemId,
                name: itemName,
                categoryName: catName,
                quantity: itemQty,
                totalRevenue: itemLineTotal
              });
            }

            if (categoriesMap.has(catName)) {
              const existing = categoriesMap.get(catName)!;
              existing.quantity += itemQty;
              existing.totalRevenue += itemLineTotal;
            } else {
              categoriesMap.set(catName, {
                categoryName: catName,
                quantity: itemQty,
                totalRevenue: itemLineTotal
              });
            }
          });
        });

        const itemsSold = Array.from(itemsMap.values()).map(it => ({
          ...it,
          category: it.categoryName,
          totalSales: it.totalRevenue
        })).sort((a, b) => b.quantity - a.quantity);

        const categoriesSold = Array.from(categoriesMap.values()).map(cat => ({
          ...cat,
          name: cat.categoryName,
          totalSales: cat.totalRevenue
        })).sort((a, b) => b.quantity - a.quantity);

        const summaryObj = {
          totalOrders: orders.length,
          paidOrdersCount: orders.length,
          grossSales,
          totalDiscount,
          discountTotal: totalDiscount,
          totalTax,
          taxTotal: totalTax,
          netSales,
          cashSales,
          cashOrdersCount,
          cardSales,
          cardOrdersCount,
          otherSales,
          totalItemsSold
        };

        return {
          cashier: {
            id: payload.id,
            name: payload.name || "Cashier",
            role: payload.role
          },
          restaurant: {
            name: restaurant?.name || "FoodSupplyERP",
            logoUrl: restaurant?.logoUrl || null,
            phone: restaurant?.contactPhone || null,
            address: restaurant?.address || null
          },
          date: now.toISOString(),
          scope,
          summary: summaryObj,
          metrics: summaryObj,
          orderTypes,
          channels,
          categories: categoriesSold,
          items: itemsSold
        };
      },
      60_000
    );

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error("Daily Closing API Error:", error);
    return NextResponse.json({ error: "Failed to generate daily closing report" }, { status: 500 });
  }
}
