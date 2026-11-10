import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.restaurantId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { tableId, status } = await req.json();
    if (!tableId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify table belongs to user's restaurant
    const table = await prisma.restaurantTable.findUnique({
      where: { id: tableId },
      include: { branch: true }
    });

    if (!table || table.branch.restaurantId !== payload.restaurantId) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // If resetting to AVAILABLE, check if there is an active order
    if (status === "AVAILABLE") {
      const activeOrder = await prisma.order.findFirst({
        where: {
          tableId,
          status: { in: ["PENDING", "PREPARING", "READY", "SERVED"] }
        }
      });

      if (activeOrder) {
        return NextResponse.json({ 
          error: "Cannot free table with an active order. Please settle the bill first." 
        }, { status: 400 });
      }
    }

    const updatedTable = await prisma.restaurantTable.update({
      where: { id: tableId },
      data: { status }
    });

    return NextResponse.json({ success: true, table: updatedTable });
  } catch (error) {
    console.error("Update Table Status Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
