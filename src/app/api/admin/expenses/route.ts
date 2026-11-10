import { NextResponse } from "next/server";
import { prisma, getEffectiveBranchId } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.restaurantId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "today";
    const paymentMethod = searchParams.get("paymentMethod");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search")?.trim();
    const customStart = searchParams.get("startDate");
    const customEnd = searchParams.get("endDate");

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (timeframe === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    } else if (timeframe === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      startDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      endDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
    } else if (timeframe === "week") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else if (timeframe === "year") {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    } else if (timeframe === "custom" && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // all time
      startDate = new Date(0);
    }

    const where: any = {
      restaurantId: payload.restaurantId,
      date: { gte: startDate, lte: endDate }
    };

    const isGlobalAdmin = ["OWNER", "SUPER_ADMIN", "ACCOUNTANT"].includes(payload.role);
    if (payload.branchId && !isGlobalAdmin) {
      where.branchId = payload.branchId;
    }

    if (paymentMethod && paymentMethod !== "ALL") {
      where.paymentMethod = paymentMethod.toUpperCase();
    }

    if (categoryId && categoryId !== "ALL") {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } }
      ];
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        categoryRel: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, role: true } },
        branch: { select: { id: true, name: true } }
      },
      orderBy: { date: "desc" }
    });

    let totalExpenses = 0;
    let cashExpenses = 0;
    let bankExpenses = 0;
    const catMap = new Map<string, number>();

    expenses.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      totalExpenses += amt;
      const method = (exp.paymentMethod || "CASH").toUpperCase();
      if (method === "CASH") {
        cashExpenses += amt;
      } else {
        bankExpenses += amt;
      }

      const catName = exp.category || exp.categoryRel?.name || "General";
      catMap.set(catName, (catMap.get(catName) || 0) + amt);
    });

    const categoryBreakdown = Array.from(catMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      success: true,
      expenses,
      summary: {
        totalExpenses,
        cashExpenses,
        bankExpenses,
        count: expenses.length,
        categoryBreakdown
      }
    });
  } catch (error) {
    console.error("Expenses GET error:", error);
    return NextResponse.json({ error: "Failed to load expenses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.restaurantId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const branchId = await getEffectiveBranchId(payload);
    if (!branchId) {
      return NextResponse.json({ error: "Branch not found" }, { status: 400 });
    }

    const body = await req.json();
    const { title, amount, category, categoryId, paymentMethod, notes, date } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title or description is required" }, { status: 400 });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    const categoryName = (category || "Petty Cash & Misc").trim();
    const validPaymentMethod = ["CASH", "CARD", "BANK"].includes((paymentMethod || "").toUpperCase())
      ? (paymentMethod || "CASH").toUpperCase()
      : "CASH";

    const expenseDate = date ? new Date(date) : new Date();

    const expense = await prisma.expense.create({
      data: {
        title: title.trim(),
        amount: numericAmount,
        category: categoryName,
        categoryId: categoryId || null,
        paymentMethod: validPaymentMethod,
        notes: notes?.trim() || null,
        date: expenseDate,
        restaurantId: payload.restaurantId,
        branchId,
        userId: payload.id || null
      },
      include: {
        categoryRel: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error("Expense POST error:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.restaurantId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (!["OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden. Manager or admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    }

    const existing = await prisma.expense.findFirst({
      where: { id, restaurantId: payload.restaurantId }
    });

    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await prisma.expense.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Expense DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
