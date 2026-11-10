import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { invalidateTenantCache } from "@/lib/cache";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.restaurantId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { orderId, paymentMethod, amountPaid, discount } = await req.json();

    if (!orderId || !paymentMethod) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { 
        id: orderId,
        branch: { restaurantId: payload.restaurantId }
      }
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Mark Order as PAID and record Payment in a single transaction round-trip
    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { 
          status: "PAID",
          ...(discount !== undefined ? { discount, total: amountPaid || order.total } : {})
        }
      }),
      prisma.payment.create({
        data: {
          orderId,
          amount: amountPaid || order.total,
          method: paymentMethod,
          status: "COMPLETED"
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

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("Settle Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
