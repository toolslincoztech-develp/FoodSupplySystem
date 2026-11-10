import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { getOrSetCache, invalidateTenantCache, tenantCacheKey } from "@/lib/cache";

const DEFAULT_CATEGORIES = [
  { name: "Supplies & Groceries", description: "Vegetables, meat, spices, dairy, bakery items" },
  { name: "Utilities & Bills", description: "Electricity, gas cylinders, water, internet" },
  { name: "Staff Meals & Tea", description: "Staff daily tea, lunch, refreshments" },
  { name: "Packaging & Disposables", description: "Packaging boxes, cups, bags, napkins" },
  { name: "Fuel & Transportation", description: "Market purchase travel, transport fuel" },
  { name: "Maintenance & Repairs", description: "Equipment repair, AC servicing, plumbing" },
  { name: "Petty Cash & Misc", description: "Daily miscellaneous petty expenses" }
];

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
    const categories = await getOrSetCache(
      tenantCacheKey(restaurantId, "expense-categories"),
      60_000,
      async () => {
        let list = await prisma.expenseCategory.findMany({
          where: { restaurantId },
          include: {
            _count: { select: { expenses: true } }
          },
          orderBy: { name: "asc" }
        });

        if (list.length === 0) {
          await prisma.expenseCategory.createMany({
            data: DEFAULT_CATEGORIES.map((cat) => ({
              name: cat.name,
              description: cat.description,
              restaurantId
            })),
            skipDuplicates: true
          });

          list = await prisma.expenseCategory.findMany({
            where: { restaurantId },
            include: {
              _count: { select: { expenses: true } }
            },
            orderBy: { name: "asc" }
          });
        }

        return list;
      },
      300_000
    );

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("Expense Categories GET error:", error);
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
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

    if (!["OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN", "CASHIER"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Check duplicate
    const existing = await prisma.expenseCategory.findFirst({
      where: {
        restaurantId: payload.restaurantId,
        name: { equals: trimmedName, mode: "insensitive" }
      }
    });

    if (existing) {
      return NextResponse.json({ error: "Category with this name already exists" }, { status: 400 });
    }

    const category = await prisma.expenseCategory.create({
      data: {
        name: trimmedName,
        description: description?.trim() || null,
        restaurantId: payload.restaurantId
      }
    });

    invalidateTenantCache(payload.restaurantId, ["expense-categories"]);
    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Expense Category POST error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const existing = await prisma.expenseCategory.findFirst({
      where: { id, restaurantId: payload.restaurantId }
    });

    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    await prisma.expenseCategory.delete({
      where: { id }
    });

    invalidateTenantCache(payload.restaurantId, ["expense-categories", "expenses"]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Expense Category DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
