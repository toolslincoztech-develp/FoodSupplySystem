import { NextResponse } from "next/server";
import { prisma, getEffectiveBranchId } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { getOrSetCache, invalidateTenantCache, tenantCacheKey } from "@/lib/cache";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.restaurantId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    if (!["OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const branchId = await getEffectiveBranchId(payload);
    if (!branchId) return NextResponse.json({ error: "No branch found" }, { status: 403 });

    const stock = await getOrSetCache(
      tenantCacheKey(payload.restaurantId, "stock", branchId),
      30_000,
      () =>
        prisma.inventoryItem.findMany({
          where: { branchId },
          orderBy: { name: "asc" }
        }),
      180_000
    );

    return NextResponse.json({ success: true, data: stock });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.restaurantId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const branchId = await getEffectiveBranchId(payload);
    if (!branchId) return NextResponse.json({ error: "No branch found" }, { status: 403 });

    const { action, id, name, quantity, unit, minStock, issueQty } = await req.json();

    if (action === "ADD_STOCK") {
      const newItem = await prisma.inventoryItem.create({
        data: {
          name,
          quantity: parseFloat(quantity),
          unit,
          minStock: parseFloat(minStock || 0),
          branchId
        }
      });
      invalidateTenantCache(payload.restaurantId, ["stock"]);
      return NextResponse.json({ success: true, data: newItem });
    }

    if (action === "UPDATE_STOCK") {
      const updated = await prisma.inventoryItem.update({
        where: { id },
        data: {
          quantity: { increment: parseFloat(quantity) }
        }
      });
      invalidateTenantCache(payload.restaurantId, ["stock"]);
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "ISSUE_TO_KITCHEN") {
      // Deduct from Store stock
      const item = await prisma.inventoryItem.findUnique({ where: { id } });
      if (!item || item.quantity < parseFloat(issueQty)) {
        return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
      }
      
      const updated = await prisma.inventoryItem.update({
        where: { id },
        data: { quantity: { decrement: parseFloat(issueQty) } }
      });
      invalidateTenantCache(payload.restaurantId, ["stock"]);
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "DELETE") {
      await prisma.inventoryItem.delete({ where: { id } });
      invalidateTenantCache(payload.restaurantId, ["stock"]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
