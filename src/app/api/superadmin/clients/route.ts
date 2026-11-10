import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getOrSetCache, invalidateSuperAdminCache, invalidateTenantCache } from "@/lib/cache";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden. SuperAdmin only." }, { status: 403 });
    }

    const restaurants = await getOrSetCache(
      "superadmin:clients",
      30_000,
      () =>
        prisma.restaurant.findMany({
          include: {
            _count: {
              select: { branches: true, users: true }
            },
            users: {
              where: { role: "OWNER" },
              select: { id: true, name: true, email: true, role: true }
            }
          },
          orderBy: { createdAt: "desc" }
        }),
      300_000
    );

    return NextResponse.json({ success: true, data: restaurants });

  } catch (error) {
    console.error("SuperAdmin GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;

    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden. SuperAdmin only." }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, contactEmail, password, hasTax, taxRate } = body;

    if (!name || !slug || !contactEmail || !password) {
      return NextResponse.json({ error: "Name, Subdomain, Email, and Password are required" }, { status: 400 });
    }

    // Check if slug or email exists
    const existingSlug = await prisma.restaurant.findUnique({ where: { slug } });
    if (existingSlug) return NextResponse.json({ error: "Subdomain already taken" }, { status: 400 });

    const existingUser = await prisma.user.findUnique({ where: { email: contactEmail } });
    if (existingUser) return NextResponse.json({ error: "Email already in use by another user" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);
    const licenseKey = `LIC-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now()}`;
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        slug,
        contactEmail,
        contactPhone: "",
        licenseKey,
        validUntil: nextYear,
        hasTax: Boolean(hasTax),
        taxRate: hasTax ? Math.max(0, Number(taxRate || 0)) : 0,
        branches: {
          create: [{ name: "Main Branch" }]
        },
        users: {
          create: [{ 
            name: "Admin Owner", 
            email: contactEmail, 
            password: hashedPassword, 
            role: "OWNER" 
          }]
        }
      }
    });

    // We must link the new user to the branch since they need a branchId for POS
    // Find the newly created branch
    const branch = await prisma.branch.findFirst({ where: { restaurantId: restaurant.id } });
    const user = await prisma.user.findFirst({ where: { restaurantId: restaurant.id, email: contactEmail } });

    if (branch && user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { branchId: branch.id }
      });
    }

    invalidateSuperAdminCache();
    return NextResponse.json({ success: true, data: restaurant });

  } catch (error) {
    console.error("SuperAdmin POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { id, hasHR, hasInventory, hasKDS, hasDelivery, hasTables, hasTax, taxRate, status, validUntil } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Food Supply ID is required" }, { status: 400 });
    }

    const parsedTaxRate = taxRate !== undefined ? Number(taxRate) : undefined;
    const safeTaxRate =
      parsedTaxRate !== undefined && Number.isFinite(parsedTaxRate)
        ? Math.max(0, Math.min(100, parsedTaxRate))
        : undefined;

    const data: Record<string, any> = {};
    if (hasHR !== undefined) data.hasHR = Boolean(hasHR);
    if (hasInventory !== undefined) data.hasInventory = Boolean(hasInventory);
    if (hasKDS !== undefined) data.hasKDS = Boolean(hasKDS);
    if (hasDelivery !== undefined) data.hasDelivery = Boolean(hasDelivery);
    if (hasTables !== undefined) data.hasTables = Boolean(hasTables);
    if (hasTax !== undefined) {
      data.hasTax = Boolean(hasTax);
      if (!data.hasTax) {
        data.taxRate = 0;
      } else if (safeTaxRate !== undefined) {
        data.taxRate = safeTaxRate;
      }
    } else if (safeTaxRate !== undefined) {
      data.taxRate = safeTaxRate;
    }
    if (status !== undefined) data.status = status;
    if (validUntil) data.validUntil = new Date(validUntil);

    const updated = await prisma.restaurant.update({
      where: { id },
      data
    });

    invalidateSuperAdminCache();
    invalidateTenantCache(id, ["auth", "pos-init"]);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("SuperAdmin PATCH Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden. SuperAdmin only." }, { status: 403 });
    }

    const body = await req.json();
    const { restaurantId, userId, name, email, password } = body;

    if (!restaurantId || !name || !email) {
      return NextResponse.json({ error: "Food Supply ID, Admin Name, and Email are required" }, { status: 400 });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedName = String(name).trim();

    // Verify restaurant exists
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });
    if (!restaurant) {
      return NextResponse.json({ error: "Food supply not found" }, { status: 404 });
    }

    // Find the target admin user for this restaurant
    let targetUser = null;
    if (userId) {
      targetUser = await prisma.user.findFirst({
        where: { id: userId, restaurantId }
      });
    }
    if (!targetUser) {
      targetUser = await prisma.user.findFirst({
        where: { restaurantId, role: "OWNER" }
      });
    }

    // If no existing owner found, create a new one
    if (!targetUser) {
      const emailConflict = await prisma.user.findUnique({ where: { email: trimmedEmail } });
      if (emailConflict) {
        return NextResponse.json({ error: "Email already taken by another user" }, { status: 400 });
      }

      if (!password) {
        return NextResponse.json({ error: "Password is required when creating admin credentials" }, { status: 400 });
      }

      const branch = await prisma.branch.findFirst({ where: { restaurantId } });
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          name: trimmedName,
          email: trimmedEmail,
          password: hashedPassword,
          role: "OWNER",
          restaurantId,
          branchId: branch?.id || null
        }
      });

      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: { contactEmail: trimmedEmail }
      });

      invalidateSuperAdminCache();
      invalidateTenantCache(restaurantId, ["auth", "staff"]);
      return NextResponse.json({ success: true, message: "Admin created successfully", data: newUser });
    }

    // If email is changing, ensure it's not taken by another user
    if (trimmedEmail !== targetUser.email.toLowerCase()) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: trimmedEmail }
      });
      if (emailConflict && emailConflict.id !== targetUser.id) {
        return NextResponse.json({ error: "Email already taken by another user" }, { status: 400 });
      }
    }

    const updateData: any = {
      name: trimmedName,
      email: trimmedEmail
    };

    if (password && String(password).trim().length > 0) {
      updateData.password = await bcrypt.hash(String(password).trim(), 10);
    }

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUser.id },
        data: updateData,
        select: { id: true, name: true, email: true, role: true }
      }),
      prisma.restaurant.update({
        where: { id: restaurantId },
        data: { contactEmail: trimmedEmail }
      })
    ]);

    invalidateSuperAdminCache();
    invalidateTenantCache(restaurantId, ["auth", "staff"]);
    return NextResponse.json({ success: true, message: "Admin details updated successfully", data: updatedUser });

  } catch (error) {
    console.error("SuperAdmin PUT Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("restro_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden. SuperAdmin only." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Food Supply ID is required" }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id }
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Food supply not found" }, { status: 404 });
    }

    // Find all branches for this restaurant
    const branches = await prisma.branch.findMany({
      where: { restaurantId: id },
      select: { id: true }
    });
    const branchIds = branches.map(b => b.id);

    // Run clean cascade deletion within a single transaction
    await prisma.$transaction([
      // 1. Delete payments on orders associated with this restaurant's branches
      prisma.payment.deleteMany({
        where: { order: { branchId: { in: branchIds } } }
      }),
      // 2. Delete order items
      prisma.orderItem.deleteMany({
        where: { order: { branchId: { in: branchIds } } }
      }),
      // 3. Delete orders
      prisma.order.deleteMany({
        where: { branchId: { in: branchIds } }
      }),
      // 4. Delete tables
      prisma.restaurantTable.deleteMany({
        where: { branchId: { in: branchIds } }
      }),
      // 5. Delete inventory items
      prisma.inventoryItem.deleteMany({
        where: { branchId: { in: branchIds } }
      }),
      // 6. Delete menu items
      prisma.menuItem.deleteMany({
        where: { restaurantId: id }
      }),
      // 7. Delete categories
      prisma.category.deleteMany({
        where: { restaurantId: id }
      }),
      // 8. Delete users (staff and owners)
      prisma.user.deleteMany({
        where: { restaurantId: id }
      }),
      // 9. Delete branches
      prisma.branch.deleteMany({
        where: { restaurantId: id }
      }),
      // 10. Delete restaurant record
      prisma.restaurant.delete({
        where: { id }
      })
    ]);

    invalidateSuperAdminCache();
    invalidateTenantCache(id);

    return NextResponse.json({ 
      success: true, 
      message: `Food supply "${restaurant.name}" and all associated data deleted successfully.` 
    });

  } catch (error: any) {
    console.error("SuperAdmin DELETE Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
