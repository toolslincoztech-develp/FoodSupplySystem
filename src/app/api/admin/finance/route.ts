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
    const timeframe = searchParams.get("timeframe") || "today";

    const isOwner = ["OWNER", "SUPER_ADMIN", "ACCOUNTANT"].includes(payload.role);
    const branchId = await getEffectiveBranchId(payload);
    
    // Restaurant or Branch scope
    const baseWhere: any = (payload.branchId && !isOwner)
      ? { branchId: payload.branchId }
      : { branch: { restaurantId: payload.restaurantId } };

    // Calculate Date Range
    const now = new Date();
    let startDate = new Date();

    if (timeframe === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === "week") {
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeframe === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      // all time
      startDate = new Date(0);
    }

    const expenseWhere: any = {
      restaurantId: payload.restaurantId,
      date: { gte: startDate, lte: now }
    };
    if (payload.branchId && !isOwner) {
      expenseWhere.branchId = payload.branchId;
    }

    // Query paid/completed orders, payments, and expenses in parallel
    const [paidOrders, payments, expenses] = await Promise.all([
      prisma.order.findMany({
        where: {
          ...baseWhere,
          status: { in: ["PAID", "COMPLETED", "SERVED"] },
          createdAt: { gte: startDate, lte: now }
        },
        include: {
          payment: true,
          user: { select: { name: true } },
          table: { select: { name: true } },
          branch: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.payment.findMany({
        where: {
          createdAt: { gte: startDate, lte: now },
          order: baseWhere
        },
        include: {
          order: {
            include: {
              user: { select: { name: true } },
              table: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.expense.findMany({
        where: expenseWhere,
        include: {
          categoryRel: { select: { name: true } },
          user: { select: { name: true } },
          branch: { select: { name: true } }
        },
        orderBy: { date: "desc" }
      })
    ]);

    // Financial Summaries
    let grossRevenue = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let cashTotal = 0;
    let cardTotal = 0;
    let otherTotal = 0;
    let cashCount = 0;
    let cardCount = 0;
    let otherCount = 0;

    let dineInRevenue = 0;
    let takeawayRevenue = 0;
    let deliveryRevenue = 0;
    let dineInCount = 0;
    let takeawayCount = 0;
    let deliveryCount = 0;

    paidOrders.forEach(order => {
      const orderAmount = order.payment?.amount ?? order.total;
      grossRevenue += orderAmount;
      totalTax += order.tax || 0;
      totalDiscount += order.discount || 0;

      const method = (order.payment?.method || "CASH").toUpperCase();
      if (method === "CASH") {
        cashTotal += orderAmount;
        cashCount++;
      } else if (method === "CARD") {
        cardTotal += orderAmount;
        cardCount++;
      } else {
        otherTotal += orderAmount;
        otherCount++;
      }

      if (order.orderType === "DINE_IN") {
        dineInRevenue += orderAmount;
        dineInCount++;
      } else if (order.orderType === "TAKEAWAY") {
        takeawayRevenue += orderAmount;
        takeawayCount++;
      } else if (order.orderType === "DELIVERY") {
        deliveryRevenue += orderAmount;
        deliveryCount++;
      }
    });

    // Expenses calculations
    let totalExpenses = 0;
    let cashExpenses = 0;
    let bankExpenses = 0;
    const expenseCatMap = new Map<string, number>();

    expenses.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      totalExpenses += amt;
      const method = (exp.paymentMethod || "CASH").toUpperCase();
      if (method === "CASH") {
        cashExpenses += amt;
      } else {
        bankExpenses += amt;
      }
      const cat = exp.category || exp.categoryRel?.name || "General";
      expenseCatMap.set(cat, (expenseCatMap.get(cat) || 0) + amt);
    });

    const netSales = Math.max(0, grossRevenue - totalTax);
    const netProfit = netSales - totalExpenses;
    const netCashInDrawer = Math.max(0, cashTotal - cashExpenses);
    const profitMargin = netSales > 0 ? Math.round((netProfit / netSales) * 100) : 0;
    const totalTransactions = paidOrders.length;
    const avgTicket = totalTransactions > 0 ? Math.round(grossRevenue / totalTransactions) : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          grossRevenue,
          netSales,
          totalTax,
          totalDiscount,
          totalTransactions,
          avgTicket,
          totalExpenses,
          cashExpenses,
          bankExpenses,
          netProfit,
          netCashInDrawer,
          profitMargin
        },
        expenses: {
          total: totalExpenses,
          cash: cashExpenses,
          bank: bankExpenses,
          count: expenses.length,
          categories: Array.from(expenseCatMap.entries())
            .map(([name, amount]) => ({
              name,
              amount,
              percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
            }))
            .sort((a, b) => b.amount - a.amount),
          list: expenses.map(e => ({
            id: e.id,
            title: e.title,
            amount: e.amount,
            category: e.category,
            paymentMethod: e.paymentMethod,
            date: e.date,
            user: e.user?.name || "Staff"
          }))
        },
        paymentMethods: {
          cash: { total: cashTotal, count: cashCount, netAfterExpenses: netCashInDrawer },
          card: { total: cardTotal, count: cardCount },
          other: { total: otherTotal, count: otherCount }
        },
        orderTypes: {
          dineIn: { revenue: dineInRevenue, count: dineInCount },
          takeaway: { revenue: takeawayRevenue, count: takeawayCount },
          delivery: { revenue: deliveryRevenue, count: deliveryCount }
        },
        transactions: paidOrders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          date: order.createdAt,
          amount: order.payment?.amount ?? order.total,
          method: order.payment?.method || "CASH",
          orderType: order.orderType,
          tax: order.tax,
          discount: order.discount,
          serverName: order.user?.name || "Cashier",
          tableName: order.table?.name || null,
          status: order.status
        }))
      }
    });

  } catch (error) {
    console.error("Finance API Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
