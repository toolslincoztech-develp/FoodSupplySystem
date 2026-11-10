"use client";

import { useState, useEffect } from "react";
import {
  X,
  Search,
  ShoppingCart,
  CreditCard,
  Banknote,
  UtensilsCrossed,
  LayoutGrid,
  ChevronLeft,
  Trash2,
  Plus,
  Minus,
  Package,
  AlertCircle,
  RefreshCw,
  Tag,
  Printer,
  LogOut,
  FileText,
  DollarSign,
  CheckCircle2
} from "lucide-react";
import { cn, formatCurrency, stripEmojis } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";
import { printReceipt, printClosingReport } from "@/lib/receipt";

export default function POSPage() {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"MENU" | "ACTIVE_BILLS" | "DAILY_CLOSING">("MENU");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedPizzaItem, setSelectedPizzaItem] = useState<any>(null); // Mobile cart toggle

  // Daily Closing States
  const [closingData, setClosingData] = useState<any>(null);
  const [loadingClosing, setLoadingClosing] = useState(false);
  const [closingScope, setClosingScope] = useState<"cashier" | "all">("all");

  // Database States
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    items: cartItems,
    addItem,
    updateQuantity,
    getSubtotal,
    getTax,
    getTotal,
    discountType,
    discountValue,
    setDiscount,
    getDiscountAmount,
    clearCart,
    resetOrder,
    existingOrderId,
    setExistingOrderId,
    setOriginalItems,
    paymentMethod,
    setPaymentMethod,
    hasTax,
    taxRate,
    setTaxConfig
  } = useCartStore();

  const fetchInitData = async (retry = true) => {
    let retrying = false;
    try {
      const res = await fetch("/api/pos/init", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/pos/login";
        return;
      }
      if (res.ok) {
        const json = await res.json();
        const data = json.data || {};
        setCategories(data.categories || []);
        setMenuItems(data.menuItems || []);
        if (data.activeOrders) {
          setActiveOrders(data.activeOrders);
        }
        if (data.taxConfig) {
          setTaxConfig(data.taxConfig.hasTax ?? false, data.taxConfig.taxRate ?? 0);
        }
      }
    } catch (error) {
      if (retry) {
        retrying = true;
        setTimeout(() => fetchInitData(false), 400);
        return;
      }
      console.warn("Failed to fetch POS data:", error);
    } finally {
      if (!retrying) {
        setLoading(false);
      }
    }
  };

  const fetchDailyClosing = async (scope: "cashier" | "all" = closingScope) => {
    try {
      setLoadingClosing(true);
      const res = await fetch(`/api/pos/closing?scope=${scope}`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setClosingData(data);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to load daily closing report");
      }
    } catch (e) {
      console.error("Failed to fetch closing data", e);
    } finally {
      setLoadingClosing(false);
    }
  };

  useEffect(() => {
    fetchInitData();
    const interval = setInterval(() => fetchInitData(), 15000); // Auto refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeCategory === "ALL" || item.categoryId === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleItemClick = (item: any) => {
    if (!item.isAvailable) return;
    if (item.sizes) {
      let parsedSizes: any = null;
      try {
        parsedSizes = typeof item.sizes === 'string' ? JSON.parse(item.sizes) : item.sizes;
      } catch (e) { }
      if (parsedSizes && typeof parsedSizes === 'object' && Object.keys(parsedSizes).length > 0) {
        setSelectedPizzaItem({ ...item, parsedSizes });
        return;
      }
    }
    addItem({ menuItemId: item.id, name: item.name, price: item.price });
  };

  const handleSelectSize = (sizeName: string, price: number) => {
    if (!selectedPizzaItem) return;
    addItem({
      menuItemId: selectedPizzaItem.id,
      name: `${selectedPizzaItem.name} (${sizeName})`,
      price: price,
      size: sizeName,
      notes: `Size: ${sizeName}`
    });
    setSelectedPizzaItem(null);
  };

  const printUnpaidReceipt = (order: any) => {
    printReceipt(order, { paymentStatus: "UNPAID" });
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    setSubmitting(true);

    try {
      const checkoutItems = cartItems.map(item => ({
        id: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes || ""
      }));

      const res = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "POS",
          items: checkoutItems,
          subtotal: getSubtotal(),
          tax: getTax(),
          discount: getDiscountAmount(),
          total: getTotal(),
          existingOrderId
        })
      });

      if (res.ok) {
        resetOrder();
        fetchInitData(); // Refresh active orders
        setView("MENU");
        setIsCartOpen(false);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to place order");
      }
    } catch (error) {
      alert("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="h-screen w-full bg-background flex overflow-hidden relative">
      {/* Left Area - Menu, Active Bills, or Daily Closing */}
      <div className="flex-1 flex flex-col h-full bg-surface-2 lg:border-r border-border w-full">
        {/* Header */}
        <header className="h-16 px-4 lg:px-6 border-b border-border flex items-center justify-between bg-surface shadow-sm z-10">
          <div className="flex items-center gap-2 lg:gap-4">
            {view === "DAILY_CLOSING" ? (
              <button
                onClick={() => setView("MENU")}
                className="btn btn-ghost !p-2"
                title="Back to Menu"
              >
                <ChevronLeft size={20} />
              </button>
            ) : null}
            <div className="flex items-center gap-2 text-primary">
              <UtensilsCrossed size={24} />
              <h1 className="font-bold text-lg lg:text-xl text-foreground tracking-tight hidden sm:block">Food Supply POS</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 lg:gap-2 bg-surface-3 p-1 rounded-lg">
              <button
                className={cn("px-3 lg:px-4 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-colors", view === "MENU" ? "bg-primary text-white" : "text-muted hover:text-foreground")}
                onClick={() => setView("MENU")}
              >
                Menu
              </button>
              <button
                className={cn("px-3 lg:px-4 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-colors relative", view === "ACTIVE_BILLS" ? "bg-primary text-white" : "text-muted hover:text-foreground")}
                onClick={() => setView("ACTIVE_BILLS")}
              >
                Active Bills
                {activeOrders.length > 0 && (
                  <span className="absolute -top-2 -right-1 w-4 h-4 bg-danger text-[10px] text-white flex items-center justify-center rounded-full animate-pulse border border-background">
                    {activeOrders.length}
                  </span>
                )}
              </button>
              <button
                className={cn(
                  "px-3 lg:px-4 py-1.5 text-xs lg:text-sm font-semibold rounded-md transition-colors flex items-center gap-1.5",
                  view === "DAILY_CLOSING" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"
                )}
                onClick={() => {
                  setView("DAILY_CLOSING");
                  fetchDailyClosing(closingScope);
                }}
              >
                <FileText size={14} className="hidden sm:inline-block" />
                <span>Daily Closing</span>
              </button>
            </div>

            {/* POS Terminal Lock / Logout */}
            <button
              onClick={async () => {
                if (confirm("Log out of POS terminal?")) {
                  try {
                    await fetch("/api/auth/logout", { method: "POST" });
                  } catch (e) {
                    console.error("Logout error", e);
                  }
                  window.location.href = "/pos/login";
                }
              }}
              className="p-2 text-muted hover:text-danger hover:bg-danger-muted/20 rounded-lg transition-colors cursor-pointer"
              title="Lock Terminal / Sign Out"
            >
              <LogOut size={18} />
            </button>

            {/* Mobile Cart Button */}
            {view !== "DAILY_CLOSING" && (
              <button
                className="lg:hidden relative p-2 ml-2 bg-primary text-white rounded-lg shadow-md"
                onClick={() => setIsCartOpen(true)}
              >
                <ShoppingCart size={20} />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-danger text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-surface">
                    {totalItems}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>

        {view === "ACTIVE_BILLS" ? (
          /* Active Bills View */
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg lg:text-xl font-bold">Active Bills & Orders</h2>
              <button onClick={() => fetchInitData()} className="btn border border-border bg-surface hover:bg-surface-2 text-xs font-bold gap-2">
                <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Refresh
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeOrders.map(order => (
                <div key={order.id} className="glass-card p-4 rounded-xl border border-border flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-lg text-primary">{order.orderNumber}</span>
                      <span className="badge bg-surface-3">{order.status}</span>
                    </div>
                    <p className="text-xs text-muted mb-1 font-medium">
                      Cashier: <span className="text-foreground font-semibold">{order.user?.name || "Staff"}</span>
                    </p>
                    <p className="text-xs text-muted mb-4">{order.items.length} items • {formatCurrency(order.total)}</p>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        clearCart();
                        order.items.forEach((item: any) => {
                          const sizeMatch = item.notes?.match(/Size:\s*(.+?)(?:\s*\||$)/);
                          const size = sizeMatch ? sizeMatch[1].trim() : undefined;
                          const displayName = size ? `${item.menuItem?.name || "Item"} (${size})` : (item.menuItem?.name || "Item");
                          addItem({
                            menuItemId: item.menuItemId,
                            name: displayName,
                            price: item.price,
                            size: size,
                            notes: item.notes || ""
                          });
                          const stateItems = useCartStore.getState().items;
                          useCartStore.getState().updateQuantity(stateItems[stateItems.length - 1].id, item.quantity);
                        });
                        setExistingOrderId(order.id);
                        setOriginalItems(useCartStore.getState().items);
                        setView("MENU");
                      }}
                      className="btn border border-border bg-surface hover:bg-surface-2 flex-1 py-2 text-xs font-bold"
                    >
                      Edit Items
                    </button>
                    <button
                      onClick={() => printUnpaidReceipt(order)}
                      className="w-10 h-10 rounded-xl border border-border bg-surface hover:bg-surface-2 hover:border-primary/50 text-muted hover:text-primary flex items-center justify-center transition-all flex-shrink-0"
                      title="Print Unpaid Bill / Guest Check"
                    >
                      <Printer size={19} className="transition-transform active:scale-90" />
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/pos/orders/settle", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ orderId: order.id, paymentMethod: "CASH", amountPaid: order.total })
                          });
                          if (res.ok) {
                            printReceipt(order, { paymentStatus: "PAID" });
                            fetchInitData();
                          }
                        } catch (e) { }
                      }}
                      className="btn btn-success flex-1 py-2 text-xs shadow-md"
                    >
                      Pay
                    </button>
                  </div>
                </div>
              ))}
              {activeOrders.length === 0 && (
                <p className="text-muted col-span-full">No active bills found.</p>
              )}
            </div>
          </div>
        ) : view === "DAILY_CLOSING" ? (
          /* Daily Closing View */
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-surface-2">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Header / Actions Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-border shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-primary/10 text-primary rounded-xl">
                      <FileText className="w-5 h-5" />
                    </span>
                    <div>
                      <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground">
                        Daily Closing
                      </h2>
                      <p className="text-xs text-muted mt-0.5">
                        {closingData ? (
                          <>
                            {closingData.restaurant?.name || "Food Supply"} • Date: <span className="font-semibold text-foreground">{closingData.date ? new Date(closingData.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : new Date().toLocaleDateString()}</span> • Cashier: <span className="font-semibold text-primary">{closingScope === "all" ? "All Cashiers (Terminal)" : (closingData.cashier?.name || "Cashier")}</span>
                          </>
                        ) : (
                          "Shift settlement, items sold count, and daily sales summary"
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Scope filter (All vs Cashier) */}
                  <div className="flex bg-surface-3 p-1 rounded-xl border border-border text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setClosingScope("all");
                        fetchDailyClosing("all");
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg transition-all",
                        closingScope === "all" ? "bg-primary text-white shadow-sm font-bold" : "text-muted hover:text-foreground"
                      )}
                    >
                      All Cashiers
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClosingScope("cashier");
                        fetchDailyClosing("cashier");
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg transition-all",
                        closingScope === "cashier" ? "bg-primary text-white shadow-sm font-bold" : "text-muted hover:text-foreground"
                      )}
                    >
                      My Shift Sales
                    </button>
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={() => fetchDailyClosing(closingScope)}
                    disabled={loadingClosing}
                    className="btn border border-border bg-surface hover:bg-surface-3 text-xs font-semibold py-2 px-3"
                    title="Refresh Data"
                  >
                    <RefreshCw size={14} className={cn(loadingClosing && "animate-spin")} />
                  </button>

                  {/* Print Closing Report Button */}
                  <button
                    onClick={() => {
                      if (!closingData) return;
                      printClosingReport(closingData);
                    }}
                    disabled={!closingData || loadingClosing}
                    className="btn btn-primary text-xs font-bold py-2 px-4 shadow-md flex items-center gap-2"
                  >
                    <Printer size={15} />
                    <span>Print Report</span>
                  </button>
                </div>
              </div>

              {loadingClosing && !closingData ? (
                <div className="py-24 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p className="text-sm text-muted">Calculating daily sales & items sold...</p>
                </div>
              ) : closingData ? (
                <>
                  {/* Zero Cashier Sales Notice */}
                  {closingScope === "cashier" && (closingData.metrics?.paidOrdersCount || 0) === 0 && (
                    <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between text-xs text-foreground/80">
                      <span>
                        No paid orders recorded directly under this cashier account today.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setClosingScope("all");
                          fetchDailyClosing("all");
                        }}
                        className="underline font-bold text-primary hover:opacity-85 ml-2 whitespace-nowrap cursor-pointer"
                      >
                        Switch to All Cashiers
                      </button>
                    </div>
                  )}

                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    {/* Total Net Sales */}
                    <div className="glass-card p-4 rounded-2xl border border-border flex flex-col justify-between">
                      <div className="flex items-center justify-between text-muted mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Net Sales</span>
                        <span className="p-1.5 bg-success/10 text-success rounded-lg">
                          <DollarSign className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl font-black text-foreground">
                        {formatCurrency(closingData.metrics?.netSales || 0)}
                      </div>
                      <div className="text-[11px] text-muted mt-2 flex justify-between border-t border-border/50 pt-2">
                        <span>Gross: {formatCurrency(closingData.metrics?.grossSales || 0)}</span>
                        <span>Disc: -{formatCurrency(closingData.metrics?.discountTotal || 0)}</span>
                      </div>
                    </div>

                    {/* Total Items Sold */}
                    <div className="glass-card p-4 rounded-2xl border border-border flex flex-col justify-between">
                      <div className="flex items-center justify-between text-muted mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Items Sold</span>
                        <span className="p-1.5 bg-primary/10 text-primary rounded-lg">
                          <Package className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl font-black text-foreground">
                        {closingData.metrics?.totalItemsSold || 0}
                      </div>
                      <div className="text-[11px] text-muted mt-2 border-t border-border/50 pt-2">
                        Across {closingData.categories?.length || 0} categories
                      </div>
                    </div>

                    {/* Paid Orders */}
                    <div className="glass-card p-4 rounded-2xl border border-border flex flex-col justify-between">
                      <div className="flex items-center justify-between text-muted mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Paid Orders</span>
                        <span className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="text-2xl font-black text-foreground">
                        {closingData.metrics?.paidOrdersCount || 0}
                      </div>
                      <div className="text-[11px] text-muted mt-2 border-t border-border/50 pt-2">
                        Tax: {formatCurrency(closingData.metrics?.taxTotal || 0)}
                      </div>
                    </div>

                    {/* Cash vs Card Split */}
                    <div className="glass-card p-4 rounded-2xl border border-border flex flex-col justify-between">
                      <div className="flex items-center justify-between text-muted mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider">Payment Breakdown</span>
                        <span className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">
                          <CreditCard className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1 text-emerald-500"><Banknote size={13} /> Cash</span>
                          <span>{formatCurrency(closingData.metrics?.cashSales || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1 text-blue-500"><CreditCard size={13} /> Card</span>
                          <span>{formatCurrency(closingData.metrics?.cardSales || 0)}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-muted mt-2 border-t border-border/50 pt-1">
                        {closingData.metrics?.otherSales > 0 ? `Other: ${formatCurrency(closingData.metrics.otherSales)}` : "Settled today"}
                      </div>
                    </div>
                  </div>

                  {/* Category Breakdown (e.g. Pizzas Sold, Drinks Sold, etc.) */}
                  <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                          <Tag className="w-4 h-4 text-primary" /> Category-wise Items Sold
                        </h3>
                        <p className="text-xs text-muted mt-0.5">
                          Daily quantity breakdown (e.g. Number of Pizzas, Burgers, Drinks)
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-surface-3 rounded-lg text-muted">
                        {closingData.categories?.length || 0} Categories
                      </span>
                    </div>

                    {(!closingData.categories || closingData.categories.length === 0) ? (
                      <div className="py-8 text-center text-muted text-xs">
                        No items sold yet today.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {closingData.categories.map((cat: any) => (
                          <div
                            key={cat.name}
                            className="p-3 bg-surface-2 rounded-xl border border-border/80 flex flex-col justify-between hover:border-primary/40 transition-colors"
                          >
                            <span className="text-xs font-bold text-foreground truncate" title={cat.name}>
                              {stripEmojis(cat.name)}
                            </span>
                            <div className="mt-2 flex items-baseline justify-between">
                              <span className="text-xl font-extrabold text-primary">
                                {cat.quantity}
                              </span>
                              <span className="text-[10px] text-muted font-medium">sold</span>
                            </div>
                            <span className="text-[11px] font-semibold text-muted mt-1">
                              {formatCurrency(cat.totalSales)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Itemized Sold Products Breakdown Table */}
                  <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                          <Package className="w-4 h-4 text-primary" /> Itemized Sales Detail
                        </h3>
                        <p className="text-xs text-muted mt-0.5">
                          All individual items sold today sorted by highest quantity
                        </p>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-full w-fit">
                        {closingData.items?.length || 0} Distinct Items
                      </span>
                    </div>

                    {(!closingData.items || closingData.items.length === 0) ? (
                      <div className="py-12 text-center text-muted text-sm">
                        No items sold during this period.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-surface-3 text-muted uppercase font-bold text-[10px] tracking-wider border-b border-border">
                            <tr>
                              <th className="py-3 px-4">#</th>
                              <th className="py-3 px-4">Item Name</th>
                              <th className="py-3 px-4">Category</th>
                              <th className="py-3 px-4 text-center">Qty Sold</th>
                              <th className="py-3 px-4 text-right">Total Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border font-medium">
                            {closingData.items.map((item: any, idx: number) => (
                              <tr key={item.id} className="hover:bg-surface-2/60 transition-colors">
                                <td className="py-2.5 px-4 text-muted">{idx + 1}</td>
                                <td className="py-2.5 px-4 font-bold text-foreground">{item.name}</td>
                                <td className="py-2.5 px-4">
                                  <span className="px-2 py-0.5 rounded-md bg-surface-3 text-muted text-[11px] font-semibold">
                                    {stripEmojis(item.category)}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-center font-black text-sm text-primary">
                                  {item.quantity}
                                </td>
                                <td className="py-2.5 px-4 text-right font-bold text-foreground">
                                  {formatCurrency(item.totalSales)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          /* Menu View */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Categories & Search */}
            <div className="p-3 lg:p-4 border-b border-border bg-surface-2 flex flex-col gap-3 lg:gap-4 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  type="text"
                  placeholder="Search menu items..."
                  className="input pl-10 bg-surface-3 border-none h-10 lg:h-12 text-sm lg:text-base w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-nowrap w-full">
                <button
                  onClick={() => setActiveCategory("ALL")}
                  className={cn(
                    "whitespace-nowrap px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl font-medium transition-all duration-200 text-xs lg:text-sm flex-shrink-0",
                    activeCategory === "ALL"
                      ? "bg-primary text-white shadow-lg shadow-primary/25"
                      : "bg-surface-3 text-muted hover:bg-surface hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="w-3 h-3 lg:w-4 lg:h-4 inline-block mr-1 lg:mr-2" /> All
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      "whitespace-nowrap px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl font-medium transition-all duration-200 text-xs lg:text-sm flex-shrink-0",
                      activeCategory === category.id
                        ? "bg-primary text-white shadow-lg shadow-primary/25"
                        : "bg-surface-3 text-muted hover:bg-surface hover:text-foreground"
                    )}
                  >
                    {stripEmojis(category.name)}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Grid */}
            <div className="flex-1 overflow-y-auto p-3 lg:p-4 bg-surface-3/30">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4 pb-24 lg:pb-20">
                {filteredItems.map(item => {
                  let parsedSizes: Record<string, number> | null = null;
                  if (item.sizes) {
                    try {
                      parsedSizes = typeof item.sizes === 'string' ? JSON.parse(item.sizes) : item.sizes;
                    } catch (e) { }
                  }
                  const sizeEntries = parsedSizes
                    ? Object.entries(parsedSizes).filter(([, p]) => typeof p === 'number' && Number.isFinite(p) && p > 0)
                    : [];
                  const hasMultipleSizes = sizeEntries.length > 0;
                  const startingPrice = hasMultipleSizes ? Math.min(...sizeEntries.map(([, p]) => p)) : item.price;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      disabled={!item.isAvailable}
                      className={cn(
                        "flex flex-col text-left p-3 lg:p-4 rounded-2xl glass-card transition-all duration-200 active:scale-95 group relative overflow-hidden",
                        !item.isAvailable && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {hasMultipleSizes && (
                        <div className="absolute top-2 right-2 z-10 bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-md">
                          {sizeEntries.length} {sizeEntries.length === 1 ? "Size" : "Sizes"}
                        </div>
                      )}
                      <div className="w-full aspect-video bg-surface-3 rounded-lg mb-2 lg:mb-3 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <UtensilsCrossed className="text-muted/30 w-8 h-8 lg:w-12 lg:h-12" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground text-sm lg:text-base mb-1 line-clamp-1 group-hover:text-primary transition-colors">{item.name}</h3>
                        <p className="text-[10px] lg:text-xs text-muted line-clamp-2 mb-2 lg:mb-3 h-7 lg:h-8">{item.description}</p>
                      </div>
                      <div className="flex items-center justify-between w-full mt-auto">
                        <div>
                          {hasMultipleSizes && <span className="block text-[10px] text-muted font-medium">Starting from</span>}
                          <span className="font-bold text-base lg:text-lg text-primary">{formatCurrency(startingPrice)}</span>
                        </div>
                        {!item.isAvailable && <span className="text-[10px] text-danger font-semibold uppercase">Out</span>}
                        {item.isAvailable && hasMultipleSizes && (
                          <span className="text-xs bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                            Select Size
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {filteredItems.length === 0 && (
                  <div className="col-span-full py-12 text-center text-muted">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No menu items found in this category.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cart Overlay Backdrop */}
      {isCartOpen && view !== "DAILY_CLOSING" && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Right Area - Cart / Order Panel */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] lg:static lg:w-[400px] flex-shrink-0 bg-surface flex flex-col h-full shadow-2xl transition-transform duration-300 transform",
        isCartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        view === "DAILY_CLOSING" && "hidden"
      )}>
        <div className="p-3 lg:p-4 border-b border-border bg-surface-2 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-sm lg:text-base flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5 text-primary" /> Current Order
            </h2>
            <div className="text-[11px] lg:text-xs text-muted mt-0.5 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success"></span>
              {existingOrderId ? "Editing Running Order" : "Direct Order"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearCart}
              className="p-1.5 text-muted hover:text-danger hover:bg-danger-muted rounded-lg transition-colors"
              title="Clear Cart"
            >
              <Trash2 size={16} />
            </button>
            {/* Close button for mobile */}
            <button
              onClick={() => setIsCartOpen(false)}
              className="lg:hidden p-1.5 bg-surface-3 rounded-lg text-foreground ml-2"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto min-h-0 p-3 lg:p-4 flex flex-col gap-2">
          {cartItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted gap-3 opacity-60">
              <ShoppingCart size={40} className="stroke-1" />
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            <div className="stagger-children flex flex-col gap-2">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-2 bg-surface-2 p-2 rounded-xl border border-border animate-slide-left items-center">
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <h4 className="font-semibold text-xs lg:text-sm truncate">{item.name}</h4>
                    <span className="text-primary font-semibold text-xs">{formatCurrency(item.price * item.quantity)}</span>
                  </div>

                  <div className="flex items-center gap-2 lg:gap-3 bg-surface-3 rounded-lg px-2 py-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1 lg:p-1 text-muted hover:text-foreground hover:bg-surface rounded-md transition-colors"
                    >
                      <Minus size={12} className="lg:w-3.5 lg:h-3.5" />
                    </button>
                    <span className="font-bold text-xs lg:text-sm w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1 lg:p-1 text-muted hover:text-foreground hover:bg-surface rounded-md transition-colors"
                    >
                      <Plus size={12} className="lg:w-3.5 lg:h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Section */}
        <div className="bg-surface-2 p-3 lg:p-4 border-t border-border mt-auto rounded-t-xl lg:rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex-shrink-0">
          {/* Discount Section */}
          <div className="bg-surface p-2 rounded-xl border border-border mb-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground flex items-center gap-1 uppercase tracking-wider">
                <Tag size={12} className="text-primary" /> Discount
              </span>
              <div className="flex bg-surface-2 p-0.5 rounded-lg text-[10px] font-semibold border border-border">
                <button
                  type="button"
                  onClick={() => setDiscount(discountValue, "FLAT")}
                  className={cn(
                    "py-0.5 px-2 rounded-md transition-all",
                    discountType === "FLAT"
                      ? "bg-primary text-white shadow-sm font-bold"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  Flat
                </button>
                <button
                  type="button"
                  onClick={() => setDiscount(discountValue, "PERCENTAGE")}
                  className={cn(
                    "py-0.5 px-2 rounded-md transition-all",
                    discountType === "PERCENTAGE"
                      ? "bg-primary text-white shadow-sm font-bold"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  % Percent
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-[11px] font-bold">
                  {discountType === "PERCENTAGE" ? "%" : "Rs"}
                </span>
                <input
                  type="number"
                  min="0"
                  max={discountType === "PERCENTAGE" ? 100 : getSubtotal()}
                  step={discountType === "PERCENTAGE" ? "1" : "10"}
                  placeholder={discountType === "PERCENTAGE" ? "Enter %" : "Enter amount"}
                  value={discountValue === 0 ? "" : discountValue}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setDiscount(val, discountType);
                  }}
                  className="input w-full bg-surface-2 border-border pl-8 pr-6 text-xs font-bold h-7 lg:h-8 py-0"
                />
                {discountValue > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscount(0, discountType)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted hover:text-danger text-xs p-0.5"
                    title="Remove discount"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {discountType === "PERCENTAGE" && (
                <div className="flex gap-1">
                  {[5, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscount(pct, "PERCENTAGE")}
                      className={cn(
                        "h-7 lg:h-8 px-1.5 text-[10px] font-bold rounded-lg border transition-all",
                        discountValue === pct
                          ? "bg-primary text-white border-primary"
                          : "bg-surface-2 border-border text-muted hover:text-foreground hover:bg-surface-3"
                      )}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1 text-xs mb-2.5">
            <div className="flex justify-between text-muted font-medium">
              <span>Subtotal</span>
              <span>{formatCurrency(getSubtotal())}</span>
            </div>
            {getDiscountAmount() > 0 && (
              <div className="flex justify-between text-success font-semibold">
                <span className="flex items-center gap-1">
                  <Tag size={11} /> Discount ({discountType === "PERCENTAGE" ? `${discountValue}%` : "Flat"})
                </span>
                <span>-{formatCurrency(getDiscountAmount())}</span>
              </div>
            )}
            {hasTax && taxRate > 0 && (
              <div className="flex justify-between text-muted font-medium">
                <span>Tax ({taxRate}%)</span>
                <span>{formatCurrency(getTax())}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1.5 border-t border-border border-dashed">
              <span className="text-xs lg:text-sm font-bold">Total</span>
              <span className="text-lg lg:text-xl font-black text-primary tracking-tight">{formatCurrency(getTotal())}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              onClick={() => setPaymentMethod("CASH")}
              className={cn(
                "h-8 lg:h-9 text-xs font-bold rounded-lg transition-all border",
                paymentMethod === "CASH" || paymentMethod === null
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-surface-3 text-muted hover:text-foreground border-border"
              )}
            >
              Cash (16% Tax)
            </button>
            <button
              onClick={() => setPaymentMethod("CARD")}
              className={cn(
                "h-8 lg:h-9 text-xs font-bold rounded-lg transition-all border",
                paymentMethod === "CARD"
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-surface-3 text-muted hover:text-foreground border-border"
              )}
            >
              Card (5% Tax)
            </button>
          </div>

          <button
            disabled={cartItems.length === 0 || submitting}
            className="btn btn-primary w-full py-2.5 lg:py-3 text-xs lg:text-sm font-bold shadow-md shadow-primary/20 disabled:opacity-50 disabled:shadow-none relative overflow-hidden group rounded-xl"
            onClick={handleCheckout}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {submitting ? "Processing..." : existingOrderId ? "Update Running Order" : "Place Order"}
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          </button>
        </div>
      </div>

      {/* Size Selection Modal */}
      {selectedPizzaItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <UtensilsCrossed size={20} className="text-primary" /> Select Size / Variant
                </h2>
                <p className="text-xs text-muted mt-0.5 font-medium">{selectedPizzaItem.name}</p>
              </div>
              <button
                onClick={() => setSelectedPizzaItem(null)}
                className="w-8 h-8 rounded-lg bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-muted hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-muted mb-4">Select an available size or option to add to order:</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {Object.entries(selectedPizzaItem.parsedSizes || {}).map(([sizeKey, rawPrice]) => {
                const price = Number(rawPrice);
                const isAvailable = Number.isFinite(price) && price > 0;

                return (
                  <button
                    key={sizeKey}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => isAvailable && handleSelectSize(sizeKey, price)}
                    className={cn(
                      "p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-200 group",
                      isAvailable
                        ? "bg-surface-2 border-border hover:border-primary hover:bg-primary/5 active:scale-95 cursor-pointer shadow-sm"
                        : "bg-surface-2/40 border-border/40 opacity-40 cursor-not-allowed"
                    )}
                  >
                    <span className="text-base font-extrabold text-foreground group-hover:text-primary transition-colors mb-2">
                      {sizeKey}
                    </span>
                    <span className="text-sm font-bold text-primary px-2.5 py-0.5 rounded-md bg-primary/10">
                      {isAvailable ? formatCurrency(price) : 'N/A'}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setSelectedPizzaItem(null)}
              className="btn btn-secondary w-full h-11 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
