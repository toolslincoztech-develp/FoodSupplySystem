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

    const branchId = await getEffectiveBranchId(payload);
    if (!branchId) {
      return NextResponse.json({ error: "No branch found" }, { status: 403 });
    }

    const tables = await prisma.restaurantTable.findMany({
      where: { branchId },
      orderBy: [
        { floor: "asc" },
        { name: "asc" }
      ]
    });

    return NextResponse.json({ success: true, data: tables });
  } catch (error) {
    console.error("Tables GET Error:", error);
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

    const branchId = await getEffectiveBranchId(payload);
    if (!branchId) {
      return NextResponse.json({ error: "No branch found" }, { status: 403 });
    }

    const { action, tableId, name, capacity, floor } = await req.json();

    if (action === "ADD") {
      if (!name || !capacity || !floor) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

      const newTable = await prisma.restaurantTable.create({
        data: {
          name,
          capacity: parseInt(capacity),
          floor,
          branchId,
          status: "AVAILABLE"
        }
      });
      return NextResponse.json({ success: true, data: newTable });
    }

    if (action === "DELETE") {
      if (!tableId) return NextResponse.json({ error: "Table ID required" }, { status: 400 });

      await prisma.restaurantTable.delete({
        where: { id: tableId }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Tables POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
