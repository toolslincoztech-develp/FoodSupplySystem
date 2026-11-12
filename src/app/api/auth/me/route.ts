import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken, signToken } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getOrSetCache, invalidateSuperAdminCache, invalidateTenantCache, tenantCacheKey } from "@/lib/cache";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.id) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const cacheKey = payload.restaurantId
      ? tenantCacheKey(payload.restaurantId, "auth", `user:${payload.id}`)
      : `auth:user:${payload.id}`;

    const user = await getOrSetCache(
      cacheKey,
      30_000,
      () =>
        prisma.user.findUnique({
          where: { id: payload.id },
          include: {
            restaurant: {
              select: {
                name: true,
                contactPhone: true,
                address: true,
                logoUrl: true,
                status: true,
                validUntil: true,
                hasHR: true,
                hasInventory: true,
                hasKDS: true,
                hasDelivery: true,
                hasTables: true
              }
            }
          }
        }),
      300_000
    );

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user.restaurant && user.role !== "SUPER_ADMIN") {
      if (user.restaurant.status !== "ACTIVE") {
        return NextResponse.json({ error: "Food supply account is suspended or inactive" }, { status: 403 });
      }
      if (user.restaurant.validUntil && new Date(user.restaurant.validUntil) < new Date()) {
        return NextResponse.json({ error: "Food supply subscription license has expired" }, { status: 403 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        restaurant: user.restaurant ? {
          name: user.restaurant.name,
          contactPhone: user.restaurant.contactPhone,
          address: user.restaurant.address,
          logoUrl: user.restaurant.logoUrl,
          hasHR: user.restaurant.hasHR,
          hasInventory: user.restaurant.hasInventory,
          hasKDS: user.restaurant.hasKDS,
          hasDelivery: user.restaurant.hasDelivery,
          hasTables: user.restaurant.hasTables,
        } : null
      }
    });
  } catch (error) {
    console.error("Auth Me Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || !payload.id) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await req.json();
    const { name, email, currentPassword, newPassword, business } = body;

    const user = await prisma.user.findUnique({
      where: { id: payload.id }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const updateData: any = {};

    if (name && String(name).trim().length > 0) {
      updateData.name = String(name).trim();
    }

    if (email && String(email).trim().length > 0) {
      const trimmedEmail = String(email).trim().toLowerCase();
      if (trimmedEmail !== user.email.toLowerCase()) {
        const existing = await prisma.user.findUnique({
          where: { email: trimmedEmail }
        });
        if (existing && existing.id !== user.id) {
          return NextResponse.json({ error: "Email is already taken by another account" }, { status: 400 });
        }
        updateData.email = trimmedEmail;
      }
    }

    // Password change handling
    if (newPassword && String(newPassword).trim().length > 0) {
      const trimmedNewPass = String(newPassword).trim();
      if (trimmedNewPass.length < 4) {
        return NextResponse.json({ error: "New password must be at least 4 characters long" }, { status: 400 });
      }

      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required to set a new password" }, { status: 400 });
      }

      const isCurrentValid = await bcrypt.compare(String(currentPassword), user.password);
      if (!isCurrentValid) {
        return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
      }

      updateData.password = await bcrypt.hash(trimmedNewPass, 10);
    }

    const businessUpdateData: Record<string, any> = {};
    if (business && typeof business === "object" && user.restaurantId) {
      if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(user.role)) {
        return NextResponse.json({ error: "Forbidden. Only business admins can update receipt branding." }, { status: 403 });
      }
      if (business.name !== undefined) {
        const bName = String(business.name).trim();
        if (!bName) {
          return NextResponse.json({ error: "Business name cannot be empty" }, { status: 400 });
        }
        businessUpdateData.name = bName;
      }
      if (business.phone !== undefined) {
        businessUpdateData.contactPhone = String(business.phone).trim();
      }
      if (business.address !== undefined) {
        const bAddr = String(business.address).trim();
        businessUpdateData.address = bAddr || null;
      }
      if (business.logoUrl !== undefined) {
        const bLogo = typeof business.logoUrl === "string" ? business.logoUrl.trim() : "";
        businessUpdateData.logoUrl = bLogo || null;
      }
    }

    if (user.role === "OWNER" && updateData.email && user.restaurantId) {
      businessUpdateData.contactEmail = updateData.email;
    }

    if (Object.keys(updateData).length === 0 && Object.keys(businessUpdateData).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    const updatedUser = Object.keys(updateData).length > 0
      ? await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true
          }
        })
      : {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        };

    if (user.restaurantId && Object.keys(businessUpdateData).length > 0) {
      await prisma.restaurant.update({
        where: { id: user.restaurantId },
        data: businessUpdateData
      });
    }

    if (user.restaurantId) {
      invalidateTenantCache(user.restaurantId, [
        "auth",
        "pos-init",
        "orders",
        "closing"
      ]);
      if (Object.keys(businessUpdateData).length > 0) {
        invalidateSuperAdminCache();
      }
    }

    // Refresh JWT session cookie with new info
    const refreshedToken = await signToken({
      ...payload,
      name: updatedUser.name,
      email: updatedUser.email
    });

    const response = NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });

    response.cookies.set({
      name: "restro_token",
      value: refreshedToken,
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24,
      sameSite: "lax"
    });

    return response;

  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
