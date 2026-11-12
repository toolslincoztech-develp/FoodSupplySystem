"use client";

import { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Calendar, 
  Receipt, 
  RefreshCw, 
  Download, 
  Eye, 
  X, 
  Printer, 
  UtensilsCrossed, 
  Bike, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  CreditCard,
  Banknote
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { printReceipt, BusinessReceiptInfo } from "@/lib/receipt";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [businessInfo, setBusinessInfo] = useState<BusinessReceiptInfo | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [timeframe, setTimeframe] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        timeframe
      });
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setOrders(json.data.orders || []);
        setSummary(json.data.summary || {});
        if (json.data.businessInfo) {
          setBusinessInfo(json.data.businessInfo);
        }
      }
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, timeframe]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const exportToCSV = () => {
    if (!orders.length) return;
    const headers = ["Order #", "Date", "Staff", "Status", "Payment Method", "Items Count", "Tax", "Total Amount"];
    
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = orders.map((o: any) => [
      escapeCsv(o.orderNumber),
      escapeCsv(new Date(o.createdAt).toLocaleString()),
      escapeCsv(o.user?.name || "N/A"),
      escapeCsv(o.status),
      escapeCsv(o.payment?.method || "Unpaid"),
      escapeCsv(o.items?.length || 0),
      escapeCsv(o.tax ?? 0),
      escapeCsv(o.total ?? 0)
    ]);

    const csvContent = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows.map((e: string[]) => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 text-foreground">Order History</h1>
          <p className="text-muted text-sm">Review, inspect, and print historical orders and receipts across all tables.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={fetchOrders}
            className="btn btn-secondary p-2.5 text-xs rounded-xl"
            title="Refresh"
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} />
          </button>

          <button 
            onClick={exportToCSV}
            disabled={!orders.length}
            className="btn btn-secondary px-3 py-2 text-xs rounded-xl flex items-center gap-1.5 font-semibold"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-primary-muted text-primary">
              <ShoppingBag size={24} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">Total</span>
          </div>
          <h3 className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">Total Orders</h3>
          <p className="text-3xl font-black text-foreground">{summary?.totalOrders || 0}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-success-muted text-success">
              <CheckCircle2 size={24} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-success/10 text-success">Settled</span>
          </div>
          <h3 className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">Paid / Completed</h3>
          <p className="text-3xl font-black text-foreground">{summary?.paidOrdersCount || 0}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-warning-muted text-warning">
              <Clock size={24} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-warning/10 text-warning">Live</span>
          </div>
          <h3 className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">Active / Pending</h3>
          <p className="text-3xl font-black text-foreground">{summary?.activeOrdersCount || 0}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-accent-muted text-accent">
              <Receipt size={24} />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent/10 text-accent">Revenue</span>
          </div>
          <h3 className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">Total Settled Sales</h3>
          <p className="text-3xl font-black text-foreground">{formatCurrency(summary?.totalSales || 0)}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex bg-surface-2 p-1 rounded-xl border border-border overflow-x-auto">
          {[
            { id: "ALL", label: "All Orders" },
            { id: "PAID", label: "Paid / Completed" },
            { id: "ACTIVE", label: "Active" },
            { id: "CANCELLED", label: "Cancelled" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all",
                statusFilter === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dropdown Filters & Search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe */}
          <select
            value={timeframe}
            onChange={e => setTimeframe(e.target.value)}
            className="input bg-surface border border-border text-xs py-2 px-3 rounded-xl font-medium"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">This Month</option>
          </select>

          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search #ORD..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 py-2 text-xs w-full bg-surface-2 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-surface-2 border-b border-border text-xs uppercase tracking-wider text-muted font-bold">
                <th className="py-3.5 px-6">Order #</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Staff</th>
                <th className="py-3.5 px-4">Items Summary</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && !orders.length ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-xs font-semibold">Loading orders...</p>
                  </td>
                </tr>
              ) : orders.length > 0 ? (
                orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-surface-2/60 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-foreground">
                      {order.orderNumber}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString("en-US", { 
                        month: "short", 
                        day: "numeric", 
                        hour: "2-digit", 
                        minute: "2-digit" 
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <p className="font-bold text-foreground">
                        {order.user?.name || "Staff"}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted max-w-[200px] truncate" title={order.items?.map((it: any) => `${it.quantity}x ${it.menuItem?.name || 'Item'}`).join(", ")}>
                      <span className="font-semibold text-foreground">{order.items?.length || 0} items: </span>
                      {order.items?.map((it: any) => `${it.quantity}x ${it.menuItem?.name || 'Item'}`).slice(0, 2).join(", ")}
                      {(order.items?.length || 0) > 2 ? "..." : ""}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {order.payment ? (
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1 w-max",
                          order.payment.method === "CASH" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                        )}>
                          {order.payment.method === "CASH" ? <Banknote size={12} /> : <CreditCard size={12} />}
                          {order.payment.method}
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-surface-3 text-muted font-bold uppercase">
                          UNPAID
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                        order.status === "PAID" || order.status === "COMPLETED" || order.status === "SERVED"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : order.status === "CANCELLED"
                          ? "bg-danger-muted text-danger"
                          : "bg-warning-muted/60 text-warning"
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-foreground">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="btn btn-secondary py-1 px-2.5 text-xs rounded-lg inline-flex items-center gap-1 font-semibold"
                        title="View Receipt"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    <ShoppingBag size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-sm">No orders matching your criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details / Receipt Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-scale-in border border-border max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <Receipt size={22} className="text-primary" /> Receipt: {selectedOrder.orderNumber}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Receipt Breakdown */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Order Meta details */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-surface-2 rounded-xl text-xs">
                <div>
                  <span className="text-muted block">Order #</span>
                  <strong className="text-foreground">{selectedOrder.orderNumber}</strong>
                </div>
                <div>
                  <span className="text-muted block">Taken By</span>
                  <strong className="text-foreground">{selectedOrder.user?.name || "Staff"}</strong>
                </div>
                <div>
                  <span className="text-muted block">Payment Method</span>
                  <strong className="text-foreground">{selectedOrder.payment?.method || "Unpaid"}</strong>
                </div>
                <div>
                  <span className="text-muted block">Status</span>
                  <strong className={cn(
                    "uppercase",
                    selectedOrder.status === "PAID" || selectedOrder.status === "COMPLETED" ? "text-emerald-500" : "text-warning"
                  )}>
                    {selectedOrder.status}
                  </strong>
                </div>
              </div>

              {/* Itemized Table */}
              <div>
                <h3 className="text-xs font-bold uppercase text-muted tracking-wider mb-2">Itemized List</h3>
                <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                  {selectedOrder.items?.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-surface flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-foreground">
                          {item.quantity}x {item.menuItem?.name || "Item"}
                        </p>
                        {item.notes && (
                          <p className="text-[11px] text-muted italic">Note: {item.notes}</p>
                        )}
                        <p className="text-[10px] text-muted">@ {formatCurrency(item.price)} each</p>
                      </div>
                      <span className="font-bold text-foreground">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation */}
              <div className="p-4 bg-surface-2 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between text-muted">
                  <span>Subtotal</span>
                  <span>{formatCurrency(Math.max(0, selectedOrder.total - (selectedOrder.tax || 0) + (selectedOrder.discount || 0)))}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Tax</span>
                  <span>{formatCurrency(selectedOrder.tax || 0)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-500">
                    <span>Discount</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-foreground pt-2 border-t border-border">
                  <span>Total Amount</span>
                  <span className="text-primary">{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="border-t border-border pt-4 flex gap-3">
              <button
                onClick={() => printReceipt(selectedOrder, { businessInfo })}
                className="btn btn-secondary flex-1 py-2 text-xs font-bold flex items-center justify-center gap-2 rounded-xl"
              >
                <Printer size={15} /> Print Receipt
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="btn btn-primary flex-1 py-2 text-xs font-bold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
