import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { DEMO_CATEGORIES, DEMO_MENU_ITEMS, DEMO_TABLES } from "@/lib/demo-data";

export async function GET() {
  try {
    // 1. Check if users exist
    const superAdminExists = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
    
    if (superAdminExists) {
      return NextResponse.json({ message: "Database already seeded!" });
    }

    // 2. Create SuperAdmin
    const superAdminPassword = await bcrypt.hash("super123", 10);
    await prisma.user.create({
      data: {
        name: "Super Admin",
        email: "super@restroerp.com",
        password: superAdminPassword,
        role: "SUPER_ADMIN",
        phone: "000-0000000",
      }
    });

    // 3. Create First Tenant (Restaurant)
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const restaurant = await prisma.restaurant.create({
      data: {
        name: "Demo Burger Joint",
        slug: "demo-burger",
        contactEmail: "info@demoburger.com",
        contactPhone: "111-222-3333",
        licenseKey: "DEMO-KEY-2026",
        validUntil: nextYear,
      }
    });

    // 4. Create First Branch
    const branch = await prisma.branch.create({
      data: {
        name: "Downtown Branch",
        address: "123 Main St",
        restaurantId: restaurant.id,
      }
    });

    // 5. Create Owner and Waiter Users for the Tenant
    const adminPassword = await bcrypt.hash("admin123", 10);
    const waiterPassword = await bcrypt.hash("1234", 10); // Using PIN as password for POS

    await prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@restaurant.com",
        password: adminPassword,
        role: "OWNER",
        phone: "0300-0000000",
        restaurantId: restaurant.id,
      }
    });

    await prisma.user.create({
      data: {
        name: "Ali Waiter",
        email: "ali@restaurant.com",
        password: waiterPassword,
        role: "WAITER",
        phone: "0300-1111111",
        restaurantId: restaurant.id,
        branchId: branch.id,
      }
    });

    // 6. Create Tables for the Branch
    for (const table of DEMO_TABLES) {
      await prisma.restaurantTable.create({
        data: {
          name: table.name,
          capacity: table.capacity,
          status: table.status,
          floor: table.floor,
          branchId: branch.id,
        }
      });
    }

    // 7. Create Categories & Menu Items for the Restaurant
    for (const cat of DEMO_CATEGORIES) {
      const createdCat = await prisma.category.create({
        data: {
          name: cat.name,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
          restaurantId: restaurant.id,
        }
      });

      const itemsForCat = DEMO_MENU_ITEMS.filter(item => item.categoryId === cat.id);
      for (const item of itemsForCat) {
        await prisma.menuItem.create({
          data: {
            name: item.name,
            price: item.price,
            description: item.description,
            isAvailable: item.isAvailable,
            categoryId: createdCat.id,
            restaurantId: restaurant.id,
          }
        });
      }
    }

    return NextResponse.json({ 
      message: "Multi-Tenant Database seeded successfully!",
      credentials: {
        superAdmin: { email: "super@restroerp.com", password: "super123" },
        admin: { email: "admin@restaurant.com", password: "admin123", slug: "demo-burger" },
        pos: { pin: "1234", slug: "demo-burger" }
      }
    });

  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
