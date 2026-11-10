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
    if (!payload || !payload.restaurantId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const branchId = await getEffectiveBranchId(payload);
    if (!branchId) return NextResponse.json({ error: "No branch found" }, { status: 403 });

    // Execute orders and riders queries in parallel
    const [orders, riders] = await Promise.all([
      prisma.order.findMany({
        where: {
          branchId,
          orderType: "DELIVERY",
          status: { in: ["READY", "OUT_FOR_DELIVERY"] }
        },
        include: {
          rider: { select: { id: true, name: true } },
          items: { include: { menuItem: { select: { name: true } } } }
        },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.user.findMany({
        where: {
          restaurantId: payload.restaurantId,
          role: "RIDER"
        },
        select: { id: true, name: true }
      })
    ]);

    return NextResponse.json({ success: true, data: { orders, riders, currentUserRole: payload.role, currentUserId: payload.id } });
  } catch (error) {
    console.error("Delivery GET Error:", error);
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

    const { action, orderId, riderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Verify order belongs to requester's restaurant
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        branch: { restaurantId: payload.restaurantId }
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (action === "ASSIGN_RIDER") {
      // Only Managers, Owners, or Cashiers can assign riders
      if (!["OWNER", "MANAGER", "CASHIER", "SUPER_ADMIN"].includes(payload.role)) {
        return NextResponse.json({ error: "Forbidden. Not authorized to assign riders." }, { status: 403 });
      }

      if (!riderId) return NextResponse.json({ error: "Rider ID is required" }, { status: 400 });

      // Verify rider belongs to this restaurant
      const validRider = await prisma.user.findFirst({
        where: {
          id: riderId,
          restaurantId: payload.restaurantId,
          role: "RIDER"
        }
      });

      if (!validRider) {
        return NextResponse.json({ error: "Invalid rider for this restaurant" }, { status: 400 });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          riderId,
          status: "OUT_FOR_DELIVERY"
        }
      });
      return NextResponse.json({ success: true, data: updatedOrder });
    }

    if (action === "MARK_DELIVERED") {
      // If user is a RIDER, ensure they are assigned to this order
      if (payload.role === "RIDER" && order.riderId !== payload.id) {
        return NextResponse.json({ error: "Forbidden. You can only deliver orders assigned to you." }, { status: 403 });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "COMPLETED" // Marking as delivered finishes the lifecycle
        }
      });
      return NextResponse.json({ success: true, data: updatedOrder });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Delivery POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
