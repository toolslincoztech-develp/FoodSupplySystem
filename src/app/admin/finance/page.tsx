"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CreditCard, 
  Banknote, 
  Receipt, 
  TrendingUp, 
  TrendingDown,
  Calendar, 
  Search, 
  Download, 
  RefreshCw, 
  UtensilsCrossed, 
  ShoppingBag, 
  Bike, 
  Percent, 
  FileSpreadsheet,
  Tag,
  ArrowRight
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

export default function FinancePage() {
  const [timeframe, setTimeframe] = useState<"today" | "week" | "month" | "year" | "all">("today");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchFinance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/finance?timeframe=${timeframe}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch finance report", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
  }, [timeframe]);

  const { summary, paymentMethods, orderTypes, transactions = [] } = data || {};

  const filteredTransactions = transactions.filter((tx: any) => {
    const q = searchQuery.toLowerCase();
    return (
      tx.orderNumber.toLowerCase().includes(q) ||
      (tx.serverName && tx.serverName.toLowerCase().includes(q)) ||
      tx.method.toLowerCase().includes(q)
    );
  });

  const exportToCSV = () => {
    const listToExport = searchQuery ? filteredTransactions : transactions;
    if (!listToExport.length) return;

    const headers = ["Order Number", "Date", "Channel", "Server", "Payment Method", "Tax", "Discount", "Total Amount"];
    
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = listToExport.map((t: any) => [
      escapeCsv(t.orderNumber),
      escapeCsv(new Date(t.date).toLocaleString()),
      escapeCsv(t.orderType),
      escapeCsv(t.serverName || "N/A"),
      escapeCsv(t.method),
      escapeCsv(t.tax ?? 0),
      escapeCsv(t.discount ?? 0),
      escapeCsv(t.amount ?? 0)
    ]);

    const csvContent = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows.map((e: string[]) => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance_report_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`;
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
          <h1 className="text-3xl font-bold tracking-tight mb-1 text-foreground">Finance & Accounting</h1>
          <p className="text-muted text-sm">Real-time revenue, tax reports, and transaction ledger.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Filters */}
          <div className="flex bg-surface-2 p-1 rounded-xl border border-border">
            {(["today", "week", "month", "year", "all"] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all",
                  timeframe === tf 
                    ? "bg-primary text-white shadow-sm" 
                    : "text-muted hover:text-foreground"
                )}
              >
                {tf === "today" ? "Today" : tf === "week" ? "This Week" : tf === "month" ? "This Month" : tf === "year" ? "This Year" : "All Time"}
              </button>
            ))}
          </div>

          <button 
            onClick={fetchFinance} 
            className="btn btn-secondary p-2.5 text-xs rounded-xl"
            title="Refresh"
          >
            <RefreshCw size={16} className={cn(loading && "animate-spin")} />
          </button>

          <button 
            onClick={exportToCSV}
            disabled={!transactions.length}
            className="btn btn-secondary px-3 py-2 text-xs rounded-xl flex items-center gap-1.5 font-semibold"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="h-64 w-full flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          {/* Key Financial Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-primary-muted text-primary">
                  <Banknote size={24} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">Gross</span>
              </div>
              <h3 className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">Total Revenue</h3>
              <p className="text-3xl font-black text-foreground">{formatCurrency(summary?.grossRevenue || 0)}</p>
            </div>

            <div className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-success-muted text-success">
                  <TrendingUp size={24} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-success/10 text-success">Net</span>
              </div>
              <h3 className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">Net Sales (Excl. Tax)</h3>
              <p className="text-3xl font-black text-foreground">{formatCurrency(summary?.netSales || 0)}</p>
            </div>

            <div className="stat-card border-rose-500/20 bg-rose-500/5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500">
                  <TrendingDown size={24} />
                </div>
                <Link href="/admin/expenses" className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 hover:underline flex items-center gap-1">
                  Expenses &rarr;
                </Link>
              </div>
              <h3 className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">Total Expenses</h3>
              <p className="text-3xl font-black text-rose-600 dark:text-rose-400">-{formatCurrency(summary?.totalExpenses || 0)}</p>
              <div className="text-[11px] text-muted mt-2 border-t border-border/50 pt-2 flex justify-between">
                <span>Cash: -{formatCurrency(summary?.cashExpenses || 0)}</span>
                <span>Bank: -{formatCurrency(summary?.bankExpenses || 0)}</span>
              </div>
            </div>

            <div className="stat-card border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <TrendingUp size={24} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 font-bold">
                  {summary?.profitMargin || 0}% Margin
                </span>
              </div>
              <h3 className="text-muted text-xs font-semibold uppercase tracking-wider mb-1">Net Earnings (Profit)</h3>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(summary?.netProfit ?? ((summary?.netSales || 0) - (summary?.totalExpenses || 0)))}
              </p>
              <div className="text-[11px] text-muted mt-2 border-t border-border/50 pt-2">
                Sales minus recorded expenses
              </div>
            </div>
          </div>

          {/* Secondary Financial KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-xl border border-border">
              <div className="text-xs text-muted mb-1 flex items-center gap-1 font-semibold"><Percent size={14} className="text-warning" /> Tax Collected</div>
              <div className="text-xl font-bold text-foreground">{formatCurrency(summary?.totalTax || 0)}</div>
            </div>

            <div className="glass-card p-4 rounded-xl border border-border">
              <div className="text-xs text-muted mb-1 flex items-center gap-1 font-semibold"><Receipt size={14} className="text-accent" /> Paid Orders</div>
              <div className="text-xl font-bold text-foreground">{summary?.totalTransactions || 0}</div>
              <div className="text-[10px] text-muted">Avg {formatCurrency(summary?.avgTicket || 0)}</div>
            </div>

            <div className="glass-card p-4 rounded-xl border border-border">
              <div className="text-xs text-muted mb-1 flex items-center gap-1 font-semibold text-emerald-500"><Banknote size={14} /> Cash in Drawer</div>
              <div className="text-xl font-bold text-foreground">{formatCurrency(summary?.netCashInDrawer ?? paymentMethods?.cash?.total ?? 0)}</div>
              <div className="text-[10px] text-muted">After cash expenses</div>
            </div>

            <div className="glass-card p-4 rounded-xl border border-border">
              <div className="text-xs text-muted mb-1 flex items-center gap-1 font-semibold text-blue-500"><CreditCard size={14} /> Card / Digital</div>
              <div className="text-xl font-bold text-foreground">{formatCurrency(paymentMethods?.card?.total || 0)}</div>
              <div className="text-[10px] text-muted">{paymentMethods?.card?.count || 0} transactions</div>
            </div>
          </div>

          {/* Breakdown Section: Payment Methods & Order Channels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Methods Card */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                  <CreditCard size={18} className="text-primary" /> Payment Method Breakdown
                </h2>
                <p className="text-xs text-muted mb-6">Distribution of cash vs digital payments</p>

                <div className="space-y-4">
                  {/* Cash */}
                  <div>
                    <div className="flex justify-between items-center text-sm font-semibold mb-1.5">
                      <span className="flex items-center gap-2 text-foreground">
                        <Banknote size={16} className="text-emerald-500" /> Cash ({paymentMethods?.cash?.count || 0})
                      </span>
                      <span className="font-bold text-foreground">{formatCurrency(paymentMethods?.cash?.total || 0)}</span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-3 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${summary?.grossRevenue ? ((paymentMethods?.cash?.total || 0) / summary.grossRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Card */}
                  <div>
                    <div className="flex justify-between items-center text-sm font-semibold mb-1.5">
                      <span className="flex items-center gap-2 text-foreground">
                        <CreditCard size={16} className="text-blue-500" /> Card / POS ({paymentMethods?.card?.count || 0})
                      </span>
                      <span className="font-bold text-foreground">{formatCurrency(paymentMethods?.card?.total || 0)}</span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-3 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                        style={{ width: `${summary?.grossRevenue ? ((paymentMethods?.card?.total || 0) / summary.grossRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Split / Other */}
                  {(paymentMethods?.other?.total > 0) && (
                    <div>
                      <div className="flex justify-between items-center text-sm font-semibold mb-1.5">
                        <span className="flex items-center gap-2 text-foreground">
                          <Receipt size={16} className="text-purple-500" /> Other / Split ({paymentMethods?.other?.count || 0})
                        </span>
                        <span className="font-bold text-foreground">{formatCurrency(paymentMethods?.other?.total || 0)}</span>
                      </div>
                      <div className="w-full h-2.5 bg-surface-3 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full transition-all duration-500" 
                          style={{ width: `${summary?.grossRevenue ? ((paymentMethods?.other?.total || 0) / summary.grossRevenue) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted">
                <span>Total Settled: {summary?.totalTransactions || 0} bills</span>
                <span className="font-semibold text-foreground">Net: {formatCurrency(summary?.grossRevenue || 0)}</span>
              </div>
            </div>

            {/* Sales Channel Card */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                  <UtensilsCrossed size={18} className="text-accent" /> Revenue by Sales Channel
                </h2>
                <p className="text-xs text-muted mb-6">Performance across Dine-in, Takeaway, and Delivery</p>

                <div className="space-y-4">
                  {/* Dine In */}
                  <div>
                    <div className="flex justify-between items-center text-sm font-semibold mb-1.5">
                      <span className="flex items-center gap-2 text-foreground">
                        <UtensilsCrossed size={16} className="text-accent" /> Dine-In ({orderTypes?.dineIn?.count || 0})
                      </span>
                      <span className="font-bold text-foreground">{formatCurrency(orderTypes?.dineIn?.revenue || 0)}</span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-3 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent rounded-full transition-all duration-500" 
                        style={{ width: `${summary?.grossRevenue ? ((orderTypes?.dineIn?.revenue || 0) / summary.grossRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Takeaway */}
                  <div>
                    <div className="flex justify-between items-center text-sm font-semibold mb-1.5">
                      <span className="flex items-center gap-2 text-foreground">
                        <ShoppingBag size={16} className="text-warning" /> Takeaway ({orderTypes?.takeaway?.count || 0})
                      </span>
                      <span className="font-bold text-foreground">{formatCurrency(orderTypes?.takeaway?.revenue || 0)}</span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-3 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-warning rounded-full transition-all duration-500" 
                        style={{ width: `${summary?.grossRevenue ? ((orderTypes?.takeaway?.revenue || 0) / summary.grossRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Delivery */}
                  <div>
                    <div className="flex justify-between items-center text-sm font-semibold mb-1.5">
                      <span className="flex items-center gap-2 text-foreground">
                        <Bike size={16} className="text-primary" /> Delivery ({orderTypes?.delivery?.count || 0})
                      </span>
                      <span className="font-bold text-foreground">{formatCurrency(orderTypes?.delivery?.revenue || 0)}</span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-3 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500" 
                        style={{ width: `${summary?.grossRevenue ? ((orderTypes?.delivery?.revenue || 0) / summary.grossRevenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted">
                <span>Discounts Applied: {formatCurrency(summary?.totalDiscount || 0)}</span>
                <span className="font-semibold text-foreground">Tax: {formatCurrency(summary?.totalTax || 0)}</span>
              </div>
            </div>
          </div>

          {/* Transaction Ledger Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <FileSpreadsheet size={18} className="text-primary" /> Transaction Ledger
                </h2>
                <p className="text-xs text-muted">Detailed log of all settled payments and receipts</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input 
                  type="text"
                  placeholder="Search order or server..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input pl-9 py-2 text-xs w-full bg-surface-2"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-2 border-b border-border text-xs uppercase tracking-wider text-muted font-bold">
                    <th className="py-3.5 px-6">Order #</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Channel</th>
                    <th className="py-3.5 px-4">Server</th>
                    <th className="py-3.5 px-4">Method</th>
                    <th className="py-3.5 px-4 text-right">Tax</th>
                    <th className="py-3.5 px-6 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-surface-2/60 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-foreground">
                          {tx.orderNumber}
                          {tx.tableName && (
                            <span className="ml-2 text-[11px] font-normal text-muted">({tx.tableName})</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted">
                          {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                            tx.orderType === "DINE_IN" ? "bg-accent/10 text-accent" :
                            tx.orderType === "TAKEAWAY" ? "bg-warning/10 text-warning" :
                            "bg-primary/10 text-primary"
                          )}>
                            {tx.orderType.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted font-medium">
                          {tx.serverName}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded font-bold uppercase",
                            tx.method === "CASH" ? "bg-emerald-500/10 text-emerald-500" :
                            "bg-blue-500/10 text-blue-500"
                          )}>
                            {tx.method}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-muted">
                          {formatCurrency(tx.tax || 0)}
                        </td>
                        <td className="py-3.5 px-6 text-right font-black text-foreground">
                          {formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted">
                        <Receipt size={36} className="mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-sm">No transactions found for this period.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
