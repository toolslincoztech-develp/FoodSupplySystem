"use client";

import { useState, useEffect } from "react";
import { Bike, PackageCheck, CheckCircle2, Navigation, LogOut, Users, Mail } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export default function DeliveryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/delivery");
      if (res.ok) {
        const json = await res.json();
        setOrders(json.data.orders);
        setRiders(json.data.riders);
        setUserRole(json.data.currentUserRole);
        setUserId(json.data.currentUserId);
      }
    } catch (error) {
      console.error("Failed to fetch delivery data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Live poll
    return () => clearInterval(interval);
  }, []);

  const handleAssignRider = async (orderId: string, riderId: string) => {
    if (!riderId) return;
    try {
      await fetch("/api/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ASSIGN_RIDER", orderId, riderId })
      });
      fetchData();
    } catch (error) {
      alert("Failed to assign rider");
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    try {
      await fetch("/api/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_DELIVERED", orderId })
      });
      fetchData();
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const parseDeliveryInfo = (items: any[]) => {
    const firstItem = items[0];
    if (!firstItem || !firstItem.notes) return null;
    const match = firstItem.notes.match(/Delivery To: (.*?) \((.*?)\) - Address: (.*)/);
    if (!match) return null;
    return { name: match[1], phone: match[2], address: match[3] };
  };

  const handleSettleOrder = async (orderId: string, total: number) => {
    try {
      const res = await fetch("/api/pos/orders/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentMethod: "CASH", amountPaid: total })
      });
      if (res.ok) {
        alert("Payment settled successfully!");
        fetchData();
      }
    } catch (error) {
      alert("Failed to settle payment");
    }
  };

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  // If user is a Rider, they should only see their assigned orders
  if (userRole === "RIDER") {
    const myOrders = orders.filter(o => o.riderId === userId);

    return (
      <div className="h-screen bg-surface-2 flex flex-col">
        <header className="bg-primary text-white p-4 shadow-md flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bike size={24} />
            <h1 className="font-bold text-lg">My Deliveries</h1>
          </div>
          <button 
            onClick={async () => {
              try {
                await fetch("/api/auth/logout", { method: "POST" });
              } catch (err) {
                console.error("Sign out error", err);
              }
              window.location.href = "/pos/login";
            }} 
            className="p-2 bg-white/20 hover:bg-white/30 transition-colors rounded-md cursor-pointer"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </header>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {myOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted opacity-60">
              <PackageCheck size={64} className="mb-4" />
              <p className="text-lg font-semibold">No active deliveries</p>
            </div>
          ) : (
            myOrders.map(order => {
              const info = parseDeliveryInfo(order.items);
              return (
                <div key={order.id} className="bg-surface p-4 rounded-xl shadow-sm border border-border flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">{order.orderNumber}</span>
                    <span className="badge bg-warning-muted text-warning">OUT FOR DELIVERY</span>
                  </div>
                  
                  {info && (
                    <div className="bg-surface-2 p-3 rounded-lg border border-border space-y-1">
                      <p className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Users size={14} className="text-primary"/> {info.name}
                      </p>
                      <p className="text-xs text-muted flex items-center gap-2 font-medium">
                        <Mail size={14} className="text-primary"/> {info.phone}
                      </p>
                      <p className="text-xs text-muted flex items-start gap-2 font-medium">
                        <Navigation size={14} className="text-primary mt-0.5"/> {info.address}
                      </p>
                    </div>
                  )}

                  <div className="text-sm font-semibold text-foreground">
                    {order.items.length} Items to deliver
                  </div>
                  <div className="text-2xl font-black text-primary">
                    {formatCurrency(order.total)} <span className="text-sm text-muted font-normal block">Collect Cash</span>
                  </div>
                  <button 
                    onClick={() => handleMarkDelivered(order.id)}
                    className="btn btn-success mt-2 py-4 text-base font-bold flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={20} /> Mark as Delivered
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // If Manager/Cashier, show Full Dashboard
  const readyOrders = orders.filter(o => o.status === "READY");
  const outOrders = orders.filter(o => o.status === "OUT_FOR_DELIVERY");

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      <header className="h-16 px-6 border-b border-border bg-surface shadow-sm z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Bike size={24} />
          </div>
          <div>
            <h1 className="font-bold text-xl text-foreground tracking-tight">Delivery Hub</h1>
            <p className="text-xs text-muted font-semibold">Assign & Track Riders</p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6 bg-surface-2">
        {/* Waiting for Rider Column */}
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-lg flex items-center gap-2 text-warning">
            <PackageCheck size={20} /> Ready to Assign ({readyOrders.length})
          </h2>
          {readyOrders.map(order => {
            const info = parseDeliveryInfo(order.items);
            return (
              <div key={order.id} className="glass-card p-4 flex flex-col gap-4 border-l-4 border-l-warning">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{order.orderNumber}</h3>
                    {info && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-bold text-foreground">{info.name}</p>
                        <p className="text-xs text-muted font-medium">{info.address}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted mt-2 font-semibold uppercase tracking-wider">{order.items.length} Items • {formatCurrency(order.total)}</p>
                  </div>
                  <span className="badge bg-warning-muted text-warning">Awaiting Rider</span>
                </div>
                
                <div className="bg-surface-2 p-3 rounded-lg border border-border">
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">Assign Rider</label>
                  <div className="flex gap-2">
                    <select 
                      className="input bg-surface border-border flex-1"
                      onChange={(e) => handleAssignRider(order.id, e.target.value)}
                      defaultValue=""
                    >
                      <option value="" disabled>Select a Rider...</option>
                      {riders.map(rider => (
                        <option key={rider.id} value={rider.id}>{rider.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
          {readyOrders.length === 0 && (
            <div className="glass-card p-8 text-center text-muted">
              No orders waiting for assignment.
            </div>
          )}
        </div>

        {/* Out For Delivery Column */}
        <div className="flex flex-col gap-4">
          <h2 className="font-bold text-lg flex items-center gap-2 text-primary">
            <Navigation size={20} /> Out For Delivery ({outOrders.length})
          </h2>
          {outOrders.map(order => {
            const info = parseDeliveryInfo(order.items);
            return (
              <div key={order.id} className="glass-card p-4 flex flex-col gap-3 border-l-4 border-l-primary">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{order.orderNumber}</h3>
                    {info && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-bold text-foreground">{info.name} • {info.phone}</p>
                        <p className="text-xs text-muted font-medium">{info.address}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted mt-2 font-semibold uppercase tracking-wider">{order.items.length} Items • {formatCurrency(order.total)}</p>
                  </div>
                  <span className="badge bg-primary-muted text-primary">En Route</span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-surface-2 p-3 rounded-lg border border-border mt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      {order.rider?.name?.charAt(0) || "R"}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted uppercase tracking-tighter">Assigned Rider</p>
                      <p className="font-bold text-sm leading-none">{order.rider?.name || "Unknown Rider"}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSettleOrder(order.id, order.total)}
                    className="btn btn-primary h-9 px-4 text-xs font-bold shadow-md shadow-primary/20"
                  >
                    Settle & Close
                  </button>
                </div>
              </div>
            );
          })}
          {outOrders.length === 0 && (
            <div className="glass-card p-8 text-center text-muted">
              No orders currently out for delivery.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
