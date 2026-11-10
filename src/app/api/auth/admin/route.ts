import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request payload format" }, { status: 400 });
    }

    const emailRaw = body?.email;
    const passwordRaw = body?.password;
    const slugRaw = body?.slug;
    const isSuperAdmin = Boolean(body?.isSuperAdmin);

    if (!emailRaw || !passwordRaw || typeof emailRaw !== "string" || typeof passwordRaw !== "string") {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const email = emailRaw.trim().toLowerCase();
    const password = passwordRaw;
    const slug = typeof slugRaw === "string" ? slugRaw.trim().toLowerCase() : "";

    // Case-insensitive lookup prevents mobile autocorrect casing mismatches
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive"
        }
      },
      include: { restaurant: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (isSuperAdmin && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Not authorized as SuperAdmin" }, { status: 403 });
    }

    if (!isSuperAdmin && user.role === "SUPER_ADMIN") {
      return NextResponse.json({ 
        error: "Super Admin accounts must sign in through the Master Control portal (/superadmin/login)" 
      }, { status: 403 });
    }

    if (!isSuperAdmin && user.role !== "SUPER_ADMIN") {
      if (!slug || user.restaurant?.slug?.toLowerCase() !== slug) {
        return NextResponse.json({ error: "Invalid restaurant code" }, { status: 401 });
      }

      if (user.restaurant?.status !== "ACTIVE") {
        return NextResponse.json({ error: "Restaurant account is suspended or inactive" }, { status: 403 });
      }

      if (user.restaurant?.validUntil && new Date(user.restaurant.validUntil) < new Date()) {
        return NextResponse.json({ error: "Restaurant subscription license has expired" }, { status: 403 });
      }
    }

    // Safely compare password without risking uncaught bcrypt exceptions
    let isPasswordValid = false;
    try {
      if (user.password && typeof user.password === "string") {
        isPasswordValid = await bcrypt.compare(password, user.password);
      }
    } catch (bcryptErr) {
      console.error("[Auth] Password compare error:", bcryptErr);
      isPasswordValid = false;
    }

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Must be an admin/manager role or SuperAdmin
    const allowedRoles = ["OWNER", "MANAGER", "ACCOUNTANT", "SUPER_ADMIN"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Access denied. Admin portal only." }, { status: 403 });
    }

    let branchId = user.branchId;
    if (!branchId && user.restaurantId) {
      try {
        const defaultBranch = await prisma.branch.findFirst({
          where: { restaurantId: user.restaurantId },
          select: { id: true },
          orderBy: { id: "asc" }
        });
        branchId = defaultBranch?.id || null;
      } catch (branchErr) {
        console.warn("[Auth] Fallback branch lookup skipped:", branchErr);
        branchId = null;
      }
    }

    const token = await signToken({
      id: user.id,
      name: user.name || "Admin",
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId || null,
      branchId: branchId || null,
    });

    const response = NextResponse.json({ 
      success: true, 
      user: { name: user.name, role: user.role } 
    });

    response.cookies.set({
      name: "restro_token",
      value: token,
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    return response;

  } catch (error: any) {
    console.error("[Auth Admin Error]:", error);

    const isDbError = 
      error?.code === "P1001" || 
      error?.code === "P1002" || 
      error?.code === "P2024" ||
      error?.name === "PrismaClientInitializationError" ||
      error?.name === "PrismaClientKnownRequestError" ||
      String(error?.message || "").toLowerCase().includes("can't reach database") ||
      String(error?.message || "").toLowerCase().includes("connection pool");

    if (isDbError) {
      return NextResponse.json({ 
        error: "Database is temporarily reconnecting. Please try again in a few moments." 
      }, { status: 503 });
    }

    return NextResponse.json({ 
      error: "Authentication service encountered an unexpected error. Please try again." 
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
