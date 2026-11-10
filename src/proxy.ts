import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

// Public routes that don't require authentication
const publicRoutes = ["/login", "/pos/login", "/superadmin/login", "/api/auth/admin", "/api/auth/pos", "/api/setup"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and static files
  if (
    publicRoutes.includes(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.includes(".") // static files like images
  ) {
    return NextResponse.next();
  }

  // Get the token from cookies
  const token = request.cookies.get("restro_token")?.value;

  if (!token) {
    return redirectToLogin(request);
  }

  // Verify token
  const payload = await verifyToken(token);
  if (!payload) {
    return redirectToLogin(request);
  }

  // Role-based Access Control (RBAC)
  const role = payload.role;

  // Cashiers ONLY have access to the POS terminal (/pos) and nothing else
  if (role === "CASHIER") {
    if (!pathname.startsWith("/pos")) {
      return NextResponse.redirect(new URL("/pos", request.url));
    }
    return NextResponse.next();
  }

  // POS route protection (Only Staff, Cashiers, Managers, Owners)
  if (pathname.startsWith("/pos")) {
    if (!["WAITER", "CASHIER", "MANAGER", "OWNER"].includes(role)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // SuperAdmin route protection
  if (pathname.startsWith("/superadmin") && pathname !== "/superadmin/login") {
    if (role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/superadmin/login", request.url));
    }
  }

  // Admin route protection (Only Admin, Manager, HR, Accountant, SuperAdmin)
  if (pathname.startsWith("/admin")) {
    if (!["OWNER", "MANAGER", "ACCOUNTANT", "HR", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.redirect(new URL("/pos/login", request.url));
    }
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname.startsWith("/superadmin")) {
    return NextResponse.redirect(new URL("/superadmin/login", request.url));
  }
  if (pathname.startsWith("/pos")) {
    return NextResponse.redirect(new URL("/pos/login", request.url));
  }
  
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
