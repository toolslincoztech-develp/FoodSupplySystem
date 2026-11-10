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

    const pinRaw = body?.pin;
    const slugRaw = body?.slug;

    if (!pinRaw || !slugRaw || typeof pinRaw !== "string" || typeof slugRaw !== "string") {
      return NextResponse.json({ error: "PIN and Food Supply Code are required" }, { status: 400 });
    }

    const pin = pinRaw.trim();
    const slug = slugRaw.trim().toLowerCase();

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug }
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Invalid Food Supply Code" }, { status: 404 });
    }

    if (restaurant.status !== "ACTIVE") {
      return NextResponse.json({ error: "Food supply account is suspended or inactive" }, { status: 403 });
    }

    if (restaurant.validUntil && new Date(restaurant.validUntil) < new Date()) {
      return NextResponse.json({ error: "Food supply subscription license has expired" }, { status: 403 });
    }

    const posUsers = await prisma.user.findMany({
      where: {
        restaurantId: restaurant.id,
        role: { in: ["WAITER", "CASHIER", "KITCHEN_STAFF", "MANAGER", "OWNER", "RIDER"] }
      }
    });

    let matchedUser = null;

    for (const user of posUsers) {
      const isValid = await bcrypt.compare(pin, user.password);
      if (isValid) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    let branchId = matchedUser.branchId;
    if (!branchId && matchedUser.restaurantId) {
      const defaultBranch = await prisma.branch.findFirst({
        where: { restaurantId: matchedUser.restaurantId },
        select: { id: true },
        orderBy: { id: "asc" }
      });
      branchId = defaultBranch?.id || null;
    }

    const token = await signToken({
      id: matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role,
      restaurantId: matchedUser.restaurantId,
      branchId,
    });

    let redirectUrl = "/pos";
    if (matchedUser.role === "RIDER") {
      redirectUrl = "/delivery";
    } else if (matchedUser.role === "KITCHEN_STAFF") {
      redirectUrl = "/kds";
    }

    const response = NextResponse.json({ 
      success: true, 
      user: { name: matchedUser.name, role: matchedUser.role },
      redirectUrl
    });

    response.cookies.set({
      name: "restro_token",
      value: token,
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;

  } catch (error: any) {
    console.error("[POS Login Error]:", error);

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

    return NextResponse.json({ error: "POS terminal authentication failed. Please try again." }, { status: 500 });
  }
}
