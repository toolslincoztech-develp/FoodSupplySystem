import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { getOrSetCache, invalidateTenantCache, tenantCacheKey } from "@/lib/cache";

type NormalizedSizesResult =
  | { kind: "none" }
  | { kind: "clear" }
  | { kind: "valid"; sizesJson: string; basePrice: number }
  | { kind: "error"; message: string };

function normalizeSizesInput(sizes: unknown): NormalizedSizesResult {
  if (sizes === undefined) return { kind: "none" };
  if (sizes === null) return { kind: "clear" };

  if (typeof sizes === "string") {
    const trimmed = sizes.trim();
    if (!trimmed) return { kind: "clear" };
    try {
      return normalizeSizesInput(JSON.parse(trimmed));
    } catch {
      return { kind: "error", message: "Invalid sizes format" };
    }
  }

  if (typeof sizes === "object" && !Array.isArray(sizes)) {
    const normalized: Record<string, number> = {};
    for (const [rawKey, rawVal] of Object.entries(sizes as Record<string, unknown>)) {
      const key = rawKey.trim();
      const price = Number(rawVal);
      if (!key) continue;
      if (!Number.isFinite(price) || price < 0) {
        return { kind: "error", message: `Invalid price for size "${key}"` };
      }
      normalized[key] = price;
    }

    const prices = Object.values(normalized);
    if (prices.length === 0) {
      return { kind: "error", message: "Please add at least one size with a valid name and price" };
    }

    return {
      kind: "valid",
      sizesJson: JSON.stringify(normalized),
      basePrice: Math.min(...prices),
    };
  }

  return { kind: "error", message: "Invalid sizes payload" };
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.restaurantId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const categories = await getOrSetCache(
      tenantCacheKey(payload.restaurantId, "menu"),
      60_000,
      () =>
        prisma.category.findMany({
          where: { restaurantId: payload.restaurantId! },
          include: {
            items: true
          },
          orderBy: { sortOrder: "asc" }
        }),
      300_000
    );

    return NextResponse.json({ success: true, data: categories });

  } catch (error) {
    console.error("Menu GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const { action, name, description, price, categoryId, icon, sizes, id, isAvailable, image } = body;

    if (action === "ADD_CATEGORY") {
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      const newCategory = await prisma.category.create({
        data: {
          name,
          icon: icon || "🏷️",
          restaurantId: payload.restaurantId,
          sortOrder: 0
        }
      });
      invalidateTenantCache(payload.restaurantId, ["menu", "pos-init"]);
      return NextResponse.json({ success: true, data: newCategory });
    } 
    
    if (action === "ADD_ITEM") {
      const parsedSizes = normalizeSizesInput(sizes);
      if (parsedSizes.kind === "error") {
        return NextResponse.json({ error: parsedSizes.message }, { status: 400 });
      }

      const finalPrice =
        parsedSizes.kind === "valid" ? parsedSizes.basePrice : parseFloat(price || "0");
      const sizesJson = parsedSizes.kind === "valid" ? parsedSizes.sizesJson : null;

      if (!name || isNaN(finalPrice) || !categoryId) {
        return NextResponse.json({ error: "Name, price, and category are required" }, { status: 400 });
      }

      const newItem = await prisma.menuItem.create({
        data: {
          name,
          description: description || "",
          price: finalPrice,
          sizes: sizesJson,
          image: image || null,
          categoryId,
          restaurantId: payload.restaurantId,
          isAvailable: true
        }
      });
      invalidateTenantCache(payload.restaurantId, ["menu", "pos-init"]);
      return NextResponse.json({ success: true, data: newItem });
    }

    if (action === "UPDATE_ITEM") {
      if (!id) return NextResponse.json({ error: "Item ID is required" }, { status: 400 });

      // Verify item belongs to authenticated restaurant
      const existingItem = await prisma.menuItem.findFirst({
        where: { id, restaurantId: payload.restaurantId }
      });
      if (!existingItem) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      const parsedSizes = normalizeSizesInput(sizes);
      if (parsedSizes.kind === "error") {
        return NextResponse.json({ error: parsedSizes.message }, { status: 400 });
      }

      const finalPrice =
        parsedSizes.kind === "valid"
          ? parsedSizes.basePrice
          : price !== undefined && price !== ""
            ? parseFloat(price)
            : undefined;
      const sizesValue =
        parsedSizes.kind === "valid"
          ? parsedSizes.sizesJson
          : parsedSizes.kind === "clear"
            ? null
            : undefined;

      const updated = await prisma.menuItem.update({
        where: { id: existingItem.id },
        data: {
          ...(name ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(finalPrice !== undefined && !isNaN(finalPrice) ? { price: finalPrice } : {}),
          ...(sizesValue !== undefined ? { sizes: sizesValue } : {}),
          ...(image !== undefined ? { image: image || null } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(isAvailable !== undefined ? { isAvailable: Boolean(isAvailable) } : {})
        }
      });
      invalidateTenantCache(payload.restaurantId, ["menu", "pos-init"]);
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "DELETE_ITEM") {
      if (!id) return NextResponse.json({ error: "Item ID is required" }, { status: 400 });

      const existingItem = await prisma.menuItem.findFirst({
        where: { id, restaurantId: payload.restaurantId }
      });
      if (!existingItem) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      await prisma.menuItem.delete({
        where: { id: existingItem.id }
      });
      invalidateTenantCache(payload.restaurantId, ["menu", "pos-init"]);
      return NextResponse.json({ success: true });
    }

    if (action === "TOGGLE_AVAILABILITY") {
      if (!id) return NextResponse.json({ error: "Item ID is required" }, { status: 400 });

      const existingItem = await prisma.menuItem.findFirst({
        where: { id, restaurantId: payload.restaurantId }
      });
      if (!existingItem) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      const updated = await prisma.menuItem.update({
        where: { id: existingItem.id },
        data: { isAvailable: Boolean(isAvailable) }
      });
      invalidateTenantCache(payload.restaurantId, ["menu", "pos-init"]);
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Menu POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
