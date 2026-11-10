"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Utensils,
  RefreshCw
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { DEMO_STATS } from "@/lib/demo-data"; // Fallback for chart

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000); // Live poll every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return <div className="h-screen w-full flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  const { totalRevenue, totalOrders, averageOrderValue, activeOrdersCount, recentOrders, staffCount, revenueByHour } = data || {};

  const chartData = (revenueByHour && revenueByHour.some((d: any) => d.amount > 0)) 
    ? revenueByHour 
    : DEMO_STATS.revenueByHour;
  const maxAmt = Math.max(...chartData.map((d: any) => d.amount), 1);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Overview</h1>
          <p className="text-muted">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDashboard}
            className="btn btn-secondary text-sm flex items-center gap-1.5"
            title="Refresh Dashboard"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <div className="px-4 py-2 bg-surface-2 rounded-lg border border-border text-sm font-semibold">
            <span suppressHydrationWarning>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 stagger-children">
        <StatCard 
          title="Today's Revenue" 
          value={formatCurrency(totalRevenue || 0)}
          trend="Live"
          isPositive={true}
          icon={CreditCard}
          colorClass="text-primary bg-primary-muted"
        />
        <StatCard 
          title="Total Orders" 
          value={totalOrders?.toString() || "0"}
          trend="Live"
          isPositive={true}
          icon={ShoppingBag}
          colorClass="text-accent bg-accent-muted"
        />
        <StatCard 
          title="Average Ticket" 
          value={formatCurrency(averageOrderValue || 0)}
          trend="Live"
          isPositive={true}
          icon={TrendingUp}
          colorClass="text-success bg-success-muted"
        />
        <StatCard 
          title="Active Orders" 
          value={activeOrdersCount?.toString() || "0"}
          trend="Cooking"
          isPositive={true}
          icon={Utensils}
          colorClass="text-info bg-info-muted"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in" style={{ animationDelay: "0.4s" }}>
        {/* Main Chart Area */}
        <div className="xl:col-span-2 glass-card p-6 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Revenue Today</h2>
              <p className="text-xs text-muted">Hourly breakdown of completed sales</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground px-3 py-1.5 bg-surface-2 border border-border rounded-lg">
                Total Today: <strong className="text-primary">{formatCurrency(totalRevenue || 0)}</strong>
              </span>
            </div>
          </div>
          
          {/* Robust Chart Container with explicit height */}
          <div className="relative flex-1 w-full flex flex-col justify-end pt-4 pb-1">
            {/* Guide Gridlines */}
            <div className="absolute inset-x-0 top-6 bottom-7 flex flex-col justify-between pointer-events-none">
              <div className="w-full border-b border-border/40 border-dashed" />
              <div className="w-full border-b border-border/40 border-dashed" />
              <div className="w-full border-b border-border/40 border-dashed" />
              <div className="w-full border-b border-border/60" />
            </div>

            {/* Bars container */}
            <div className="relative z-10 w-full h-[230px] flex items-end gap-1.5 sm:gap-2">
              {chartData.map((d: any, i: number) => {
                const pct = maxAmt > 0 ? (d.amount / maxAmt) : 0;
                const barHeightPx = d.amount > 0 ? Math.max(Math.round(pct * 190), 16) : 4;
                return (
                  <div key={i} className="flex-1 h-full flex flex-col justify-end items-center group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 bg-foreground text-background text-xs font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                      {d.hour}: {formatCurrency(d.amount)}
                    </div>

                    {/* Bar Pill */}
                    <div className="w-full max-w-[32px] flex items-end justify-center">
                      <div 
                        className={cn(
                          "w-full rounded-t-md transition-all duration-500",
                          d.amount > 0 
                            ? "bg-primary hover:bg-primary-hover shadow-sm" 
                            : "bg-surface-3/70 hover:bg-surface-3"
                        )}
                        style={{ height: `${barHeightPx}px` }}
                      />
                    </div>

                    {/* Hour Label */}
                    <span className="text-[10px] text-muted font-medium mt-2 shrink-0 truncate">
                      {d.hour}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Items & Recent Activity */}
        <div className="flex flex-col gap-6">
          <div className="glass-card p-6 flex-1">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users size={18} className="text-accent" /> Staff Status
            </h2>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="font-semibold text-sm">Total Staff Enrolled</span>
                <span className="font-bold text-primary">{staffCount || 0}</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="font-semibold text-sm">Active Tables</span>
                <span className="font-bold text-warning">{activeOrdersCount || 0}</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Clock size={18} className="text-info" /> Recent Orders
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {recentOrders && recentOrders.length > 0 ? recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 border-dashed">
                  <div>
                    <p className="font-bold text-sm">{order.orderNumber}</p>
                    <p className="text-xs text-muted">By {order.user?.name || "Server"} {order.table ? `• Table ${order.table.name}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(order.total)}</p>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase",
                      order.status === "COMPLETED" || order.status === "SERVED" || order.status === "PAID" ? "bg-emerald-500/10 text-emerald-500" :
                      order.status === "PENDING" ? "bg-blue-500/10 text-blue-500" :
                      order.status === "READY" ? "bg-success-muted text-success" :
                      "bg-warning-muted/50 text-warning"
                    )}>
                      {order.status}
                    </span>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted text-center py-4">No recent orders found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, isPositive, icon: Icon, colorClass }: any) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl", colorClass)}>
          <Icon size={24} />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
          isPositive ? "bg-success-muted text-success" : "bg-danger-muted text-danger"
        )}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
      <div>
        <h3 className="text-muted text-sm font-semibold tracking-wider uppercase mb-1">{title}</h3>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}
