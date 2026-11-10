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

    const restaurantId = payload.restaurantId;
    const branchId = await getEffectiveBranchId(payload);

    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get("tableId");
    const isScopedBranch = Boolean(branchId && !["OWNER", "MANAGER"].includes(payload.role));

    const whereClause: any = {
      status: { in: ["PENDING", "PREPARING", "READY", "SERVED"] },
      branch: { restaurantId }
    };

    if (isScopedBranch) {
      whereClause.branchId = branchId;
    }

    if (tableId) {
      whereClause.tableId = tableId;
      const activeOrder = await getOrSetCache(
        tenantCacheKey(restaurantId, "orders", `pos-table:${isScopedBranch ? branchId : "all"}:${tableId}`),
        8_000,
        () =>
          prisma.order.findFirst({
            where: whereClause,
            include: { items: { include: { menuItem: true } } }
          }),
        60_000
      );
      return NextResponse.json({ success: true, activeOrder });
    }

    const activeOrders = await getOrSetCache(
      tenantCacheKey(restaurantId, "orders", `pos-active:${isScopedBranch ? branchId : "all"}`),
      8_000,
      () =>
        prisma.order.findMany({
          where: whereClause,
          include: {
            items: { include: { menuItem: true } },
            user: { select: { name: true } }
          },
          orderBy: { createdAt: "desc" }
        }),
      60_000
    );

    return NextResponse.json({ success: true, activeOrders });

  } catch (error) {
    console.error("Orders GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    const branchId = await getEffectiveBranchId(payload);
    if (!branchId) {
      return NextResponse.json({ error: "Branch not found" }, { status: 400 });
    }

    const body = await req.json();
    const { orderType, items, total, tax, discount, existingOrderId } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Order must contain items" }, { status: 400 });
    }

    if (existingOrderId) {
      const existingOrder = await prisma.order.findFirst({
        where: { id: existingOrderId, branchId },
        include: { items: true }
      });
      if (!existingOrder) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Helper to strip any [NEW ADDITION] tag from notes
      const cleanItemNotes = (str?: string | null) =>
        (str || "").replace(/\s*\|\s*\[NEW ADDITION\]|\[NEW ADDITION\]/g, "").trim();

      // Build pool of existing items
      const existingPool = existingOrder.items.map((ei) => ({
        menuItemId: ei.menuItemId,
        cleanNotes: cleanItemNotes(ei.notes),
        quantity: ei.quantity,
        price: Number(ei.price)
      }));

      const finalItemsToCreate: {
        menuItemId: string;
        quantity: number;
        price: number;
        notes: string;
      }[] = [];

      let hasNewAdditions = false;

      // Match incoming items against existing items
      for (const item of items) {
        const incomingId = item.id || item.menuItemId;
        const incomingNotesClean = cleanItemNotes(item.notes);
        const requestedQty = Number(item.quantity) || 1;
        const itemPrice = Number(item.price) || 0;

        // Try exact match on menuItemId and cleanNotes
        let matchedPool = existingPool.find(
          (ep) => ep.menuItemId === incomingId && ep.cleanNotes === incomingNotesClean && ep.quantity > 0
        );

        // Fallback: match by menuItemId only if specific note wasn't matched
        if (!matchedPool) {
          matchedPool = existingPool.find(
            (ep) => ep.menuItemId === incomingId && ep.quantity > 0
          );
        }

        let existingCoveredQty = 0;
        if (matchedPool) {
          existingCoveredQty = Math.min(matchedPool.quantity, requestedQty);
          matchedPool.quantity -= existingCoveredQty;
        }

        const newlyAddedQty = requestedQty - existingCoveredQty;

        // Portion that was already sent previously
        if (existingCoveredQty > 0) {
          finalItemsToCreate.push({
            menuItemId: incomingId,
            quantity: existingCoveredQty,
            price: itemPrice,
            notes: cleanItemNotes(item.notes)
          });
        }

        // Portion that is newly added in this edit
        if (newlyAddedQty > 0) {
          hasNewAdditions = true;
          const cleanBase = cleanItemNotes(item.notes);
          const taggedNote = cleanBase ? `${cleanBase} | [NEW ADDITION]` : "[NEW ADDITION]";
          finalItemsToCreate.push({
            menuItemId: incomingId,
            quantity: newlyAddedQty,
            price: itemPrice,
            notes: taggedNote
          });
        }
      }

      // OVERWRITE items + update order in a single transaction round-trip
      const [, updatedOrder] = await prisma.$transaction([
        prisma.orderItem.deleteMany({ where: { orderId: existingOrderId } }),
        prisma.order.update({
          where: { id: existingOrderId },
          data: {
            total,
            tax,
            discount: discount || 0,
            status: hasNewAdditions ? "PENDING" : existingOrder.status,
            items: {
              create: finalItemsToCreate
            }
          }
        })
      ]);

      invalidateTenantCache(payload.restaurantId, [
        "pos-init",
        "orders",
        "dashboard",
        "finance",
        "closing"
      ]);

      return NextResponse.json({ success: true, order: updatedOrder, hasNewAdditions });
    }

    // Generate Order Number for this branch (single lookup; retry only on unique conflict P2002)
    const lastOrder = await prisma.order.findFirst({
      where: { branchId },
      orderBy: { createdAt: "desc" },
      select: { orderNumber: true }
    });

    let nextNum = 1001;
    if (lastOrder?.orderNumber) {
      const match = lastOrder.orderNumber.match(/\d+/);
      if (match) {
        nextNum = parseInt(match[0], 10) + 1;
      }
    }

    let order: any = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const orderNumber = `#ORD-${String(nextNum + attempt).padStart(4, "0")}`;
      try {
        order = await prisma.order.create({
          data: {
            orderNumber,
            orderType: orderType || "POS",
            total,
            tax,
            discount: discount || 0,
            branchId,
            userId: payload.id,
            status: "PENDING",
            items: {
              create: items.map((item: any) => ({
                menuItemId: item.id || item.menuItemId,
                quantity: item.quantity,
                price: item.price,
                notes: item.notes || ""
              }))
            }
          }
        });
        break;
      } catch (err: any) {
        if (err?.code === "P2002" && attempt < 9) {
          continue;
        }
        throw err;
      }
    }

    invalidateTenantCache(payload.restaurantId, [
      "pos-init",
      "orders",
      "dashboard",
      "finance",
      "closing"
    ]);

    return NextResponse.json({
      success: true,
      order
    });

  } catch (error) {
    console.error("POS Order Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
