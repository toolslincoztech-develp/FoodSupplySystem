import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.restaurantId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (!["OWNER", "MANAGER", "HR", "SUPER_ADMIN"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
    }

    const staff = await prisma.user.findMany({
      where: { restaurantId: payload.restaurantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        branch: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, data: staff });

  } catch (error) {
    console.error("Staff GET Error:", error);
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

    // Only OWNER or MANAGER or HR can add staff
    if (!["OWNER", "MANAGER", "HR"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden. Not enough permissions." }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role, branchId } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        restaurantId: payload.restaurantId,
        branchId: branchId || payload.branchId || null
      }
    });

    return NextResponse.json({ success: true, data: { id: newUser.id, name: newUser.name } });

  } catch (error) {
    console.error("Staff POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    // Only OWNER or MANAGER or HR can delete staff
    if (!["OWNER", "MANAGER", "HR", "SUPER_ADMIN"].includes(payload.role)) {
      return NextResponse.json({ error: "Forbidden. Not enough permissions." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    if (id === payload.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    // Ensure the employee belongs to this restaurant
    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        restaurantId: payload.restaurantId
      }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (targetUser.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Cannot delete a Super Admin account" }, { status: 403 });
    }

    // Unlink orders where this user is creator or rider to prevent foreign key errors
    await prisma.order.updateMany({
      where: { userId: id },
      data: { userId: null }
    });

    await prisma.order.updateMany({
      where: { riderId: id },
      data: { riderId: null }
    });

    // Delete user
    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Staff member deleted successfully" });

  } catch (error) {
    console.error("Staff DELETE Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

