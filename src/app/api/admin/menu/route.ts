import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

    const categories = await prisma.category.findMany({
      where: { restaurantId: payload.restaurantId },
      include: {
        items: true
      },
      orderBy: { sortOrder: "asc" }
    });

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
      return NextResponse.json({ success: true, data: newCategory });
    } 
    
    if (action === "ADD_ITEM") {
      let finalPrice = parseFloat(price || "0");
      let sizesJson: string | null = null;

      if (sizes && typeof sizes === "object") {
        sizesJson = JSON.stringify(sizes);
        if (sizes.Small) {
          finalPrice = parseFloat(sizes.Small);
        } else if (sizes.Medium) {
          finalPrice = parseFloat(sizes.Medium);
        }
      } else if (typeof sizes === "string" && sizes.trim()) {
        sizesJson = sizes;
      }

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

      let finalPrice = price ? parseFloat(price) : undefined;
      let sizesValue: string | null | undefined = undefined;

      if (sizes === null) {
        sizesValue = null;
      } else if (sizes && typeof sizes === "object") {
        sizesValue = JSON.stringify(sizes);
        if (sizes.Small) finalPrice = parseFloat(sizes.Small);
        else if (sizes.Medium) finalPrice = parseFloat(sizes.Medium);
      } else if (typeof sizes === "string" && sizes.trim()) {
        sizesValue = sizes;
      }

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
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Menu POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
