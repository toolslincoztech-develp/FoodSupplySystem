"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  ClipboardList,
  Package,
  Wallet,
  LogOut,
  Receipt,
  UserCog
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS Terminal", icon: UtensilsCrossed },
  { href: "/admin/billing", label: "Billing / Cashier", icon: Receipt },
  { href: "/admin/orders", label: "Sales & Orders", icon: ClipboardList },
  { href: "/admin/inventory", label: "Menu Management", icon: Package },
  { href: "/admin/stock", label: "Stock & Inventory", icon: ClipboardList },
  { href: "/admin/expenses", label: "Expenses", icon: Receipt },
  { href: "/admin/finance", label: "Accounting & Finance", icon: Wallet },
  { href: "/admin/hr", label: "Staff & HR", icon: Users },
  { href: "/admin/profile", label: "Profile & Security", icon: UserCog },
];

export function Sidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<any>(null);

  // Hide sidebar on POS and all login/superadmin pages
  const isFullScreenApp = ["/pos", "/login", "/superadmin"].some(path => pathname?.startsWith(path));

  useEffect(() => {
    if (isFullScreenApp || pathname === "/") return;
    if (profile) return; // Skip refetching if profile is already loaded in memory

    fetch("/api/auth/me", { cache: "no-store" })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProfile(data.user);
        } else {
          setProfile(null);
        }
      })
      .catch((err) => {
        console.error("Failed to load user profile:", err);
      });
  }, [pathname, isFullScreenApp, profile]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      fetch("/api/auth/me", { cache: "no-store" })
        .then(res => res.json())
        .then(data => {
          if (data.success) setProfile(data.user);
        })
        .catch(console.error);
    };
    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdate);
  }, []);

  if (isFullScreenApp || pathname === "/") return null;

  return (
    <aside className="w-64 flex-shrink-0 bg-surface-2 border-r border-border h-screen sticky top-0 flex flex-col z-40">
      <div className="p-4 border-b border-border flex items-center gap-3 flex-shrink-0">
        {profile?.restaurant?.logoUrl ? (
          <img src={profile.restaurant.logoUrl} alt="Logo" className="w-9 h-9 object-contain rounded-lg bg-white" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white font-bold text-sm">
            {profile?.restaurant?.name?.charAt(0) || "F"}
          </div>
        )}
        <div className="overflow-hidden">
          <h1 className="font-bold text-foreground text-sm leading-tight tracking-tight truncate max-w-[150px]">
            {profile?.restaurant?.name || "FoodSupplyERP"}
          </h1>
          <p className="text-[10px] text-muted uppercase font-semibold tracking-wider">Enterprise</p>
        </div>
      </div>

      <div className="flex-1 py-3 px-3 overflow-y-auto flex flex-col gap-0.5">
        <div className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5 px-2">Menu</div>
        {NAV_ITEMS.filter(item => {
          if (!profile) return false;
          const { role, restaurant } = profile;

          // 1. Feature Toggles Check (SuperAdmin overrides)
          if (item.href === "/admin/hr" && restaurant?.hasHR === false) return false;
          if (item.href === "/admin/inventory" && restaurant?.hasInventory === false) return false;
          if (item.href === "/admin/stock" && restaurant?.hasInventory === false) return false;

          // 2. Role-Based Permissions
          if (role === "OWNER" || role === "SUPER_ADMIN") return true;
          if (role === "MANAGER") {
            // Managers see most things except Accounting by default
            if (["/admin/finance"].includes(item.href)) return false;
            return true;
          }
          if (role === "HR" && item.href === "/admin/hr") return true;
          if (role === "ACCOUNTANT" && (item.href === "/admin/finance" || item.href === "/admin/expenses")) return true;
          if (role === "CASHIER") return item.href === "/pos";

          if (item.href === "/admin") return true; // Everyone sees Dashboard
          return false;
        }).map((item) => {
          const isActive = pathname === item.href || (pathname?.startsWith(item.href) && item.href !== "/admin");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "sidebar-link py-2 px-3 text-xs lg:text-sm flex items-center gap-3 rounded-lg",
                isActive && "active font-bold"
              )}
            >
              <item.icon size={17} className={isActive ? "text-primary" : ""} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-3 border-t border-border flex-shrink-0">
        <Link
          href="/admin/profile"
          className="flex items-center gap-2.5 mb-2 px-2 py-1.5 rounded-lg hover:bg-surface-3 transition-colors cursor-pointer group"
          title="Edit Profile & Security"
        >
          <div className="w-8 h-8 rounded-full bg-surface-3 group-hover:bg-primary/20 group-hover:text-primary flex items-center justify-center text-foreground font-semibold text-xs transition-colors">
            {profile?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{profile?.name || "Loading..."}</p>
            <p className="text-[10px] text-muted truncate uppercase">{profile?.role?.replace("_", " ")}</p>
          </div>
          <UserCog size={14} className="text-muted group-hover:text-primary transition-colors shrink-0" />
        </Link>

        <button
          onClick={async () => {
            try {
              sessionStorage.clear();
              localStorage.clear();
            } catch (e) { }
            try {
              await fetch("/api/auth/logout", { method: "POST" });
            } catch (err) {
              console.error("Sign out error", err);
            }
            window.location.href = "/login";
          }}
          className="w-full sidebar-link py-1.5 px-3 text-xs text-danger hover:bg-danger-muted hover:text-danger flex items-center gap-2 rounded-lg cursor-pointer"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
