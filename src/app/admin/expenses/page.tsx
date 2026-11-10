"use client";

import { useState, useEffect } from "react";
import { 
  DollarSign, 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  CreditCard, 
  Banknote, 
  Receipt, 
  Tag, 
  RefreshCw, 
  FolderPlus, 
  X,
  TrendingDown,
  Building,
  CheckCircle2,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  _count?: { expenses: number };
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  categoryId?: string;
  categoryRel?: { id: string; name: string };
  paymentMethod: string;
  notes?: string;
  date: string;
  createdAt: string;
  user?: { id: string; name: string; role: string };
  branch?: { id: string; name: string };
}

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<"EXPENSES" | "CATEGORIES">("EXPENSES");
  const [timeframe, setTimeframe] = useState<string>("today");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [summary, setSummary] = useState<any>({
    totalExpenses: 0,
    cashExpenses: 0,
    bankExpenses: 0,
    count: 0,
    categoryBreakdown: []
  });
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);

  // Expense Form State
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Category Form State
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [submittingCat, setSubmittingCat] = useState(false);

  // Format currency helper
  const formatCurrency = (amt: number) => {
    return `PKR ${Number(amt || 0).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/expenses/categories");
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
        if (data.categories.length > 0 && !category) {
          setCategory(data.categories[0].name);
          setCategoryId(data.categories[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load expense categories", e);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("timeframe", timeframe);
      if (paymentMethodFilter !== "ALL") params.set("paymentMethod", paymentMethodFilter);
      if (categoryFilter !== "ALL") params.set("categoryId", categoryFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/expenses?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses || []);
        setSummary(data.summary || {});
      }
    } catch (e) {
      console.error("Failed to load expenses", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [timeframe, paymentMethodFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExpenses();
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!title.trim() || isNaN(num) || num <= 0) {
      alert("Please provide a valid title and positive amount.");
      return;
    }

    setSubmittingExpense(true);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          amount: num,
          category: category || "General",
          categoryId: categoryId || undefined,
          paymentMethod,
          notes: notes.trim() || undefined,
          date: expenseDate ? new Date(expenseDate).toISOString() : new Date().toISOString()
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowAddExpenseModal(false);
        setTitle("");
        setAmount("");
        setNotes("");
        fetchExpenses();
        fetchCategories(); // update category counts
      } else {
        alert(data.error || "Failed to create expense");
      }
    } catch (e) {
      alert("Network error creating expense");
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense? This will adjust your closing and finance figures.")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/expenses?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchExpenses();
        fetchCategories();
      } else {
        alert(data.error || "Failed to delete expense");
      }
    } catch (e) {
      alert("Network error");
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      alert("Category name is required.");
      return;
    }

    setSubmittingCat(true);
    try {
      const res = await fetch("/api/admin/expenses/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName.trim(),
          description: catDesc.trim() || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowAddCategoryModal(false);
        setCatName("");
        setCatDesc("");
        fetchCategories();
      } else {
        alert(data.error || "Failed to create category");
      }
    } catch (e) {
      alert("Network error creating category");
    } finally {
      setSubmittingCat(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/expenses/categories?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchCategories();
      } else {
        alert(data.error || "Failed to delete category");
      }
    } catch (e) {
      alert("Network error");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Expenses & Deductions
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Track daily food supply expenses. Cash expenses automatically deduct from drawer closing and finance reports.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAddCategoryModal(true)}
            className="btn bg-surface border border-border hover:bg-surface-2 text-foreground font-semibold px-3 py-2 text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
          >
            <FolderPlus size={15} className="text-primary" />
            <span>New Category</span>
          </button>

          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="btn bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/20 active:scale-95"
          >
            <Plus size={16} />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab("EXPENSES")}
          className={cn(
            "px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
            activeTab === "EXPENSES"
              ? "bg-rose-500/10 text-rose-500 border-b-2 border-rose-500 rounded-b-none"
              : "text-muted hover:text-foreground hover:bg-surface-2"
          )}
        >
          <Receipt size={16} />
          <span>Daily Expenses Log</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-3">
            {summary?.count || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("CATEGORIES")}
          className={cn(
            "px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
            activeTab === "CATEGORIES"
              ? "bg-rose-500/10 text-rose-500 border-b-2 border-rose-500 rounded-b-none"
              : "text-muted hover:text-foreground hover:bg-surface-2"
          )}
        >
          <Tag size={16} />
          <span>Expense Categories</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-3">
            {categories.length}
          </span>
        </button>
      </div>

      {activeTab === "EXPENSES" ? (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Expenses */}
            <div className="glass-card p-4 rounded-2xl border border-border flex flex-col justify-between">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Total Expenses</span>
                <span className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
                  <TrendingDown size={18} />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
                {formatCurrency(summary?.totalExpenses || 0)}
              </div>
              <p className="text-[11px] text-muted mt-2 border-t border-border/50 pt-2">
                Across {summary?.count || 0} recorded entries ({timeframe})
              </p>
            </div>

            {/* Cash Paid Expenses (Deducted from Drawer) */}
            <div className="glass-card p-4 rounded-2xl border border-border flex flex-col justify-between">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Cash (Drawer Deductions)</span>
                <span className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <Banknote size={18} />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {formatCurrency(summary?.cashExpenses || 0)}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2 border-t border-border/50 pt-2 flex items-center gap-1">
                <CheckCircle2 size={12} /> Directly reduces physical cash at closing
              </p>
            </div>

            {/* Bank / Online Paid Expenses */}
            <div className="glass-card p-4 rounded-2xl border border-border flex flex-col justify-between">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Bank / Card Paid</span>
                <span className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                  <CreditCard size={18} />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {formatCurrency(summary?.bankExpenses || 0)}
              </div>
              <p className="text-[11px] text-muted mt-2 border-t border-border/50 pt-2">
                Paid from online/bank accounts
              </p>
            </div>

            {/* Top Category */}
            <div className="glass-card p-4 rounded-2xl border border-border flex flex-col justify-between">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Top Spending Category</span>
                <span className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                  <Tag size={18} />
                </span>
              </div>
              <div className="text-lg font-black text-foreground truncate">
                {summary?.categoryBreakdown?.[0]?.name || "None yet"}
              </div>
              <p className="text-[11px] text-muted mt-2 border-t border-border/50 pt-2">
                {summary?.categoryBreakdown?.[0] 
                  ? `${formatCurrency(summary.categoryBreakdown[0].amount)} (${summary.categoryBreakdown[0].percentage}%)` 
                  : "No expense recorded"}
              </p>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
            {/* Timeframe pill filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
              {[
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "week", label: "Last 7 Days" },
                { id: "month", label: "This Month" },
                { id: "all", label: "All Time" }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTimeframe(t.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                    timeframe === t.id
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-surface-2 text-muted hover:text-foreground"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Filters: Category & Payment Method & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category dropdown */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input py-1.5 px-3 text-xs rounded-xl bg-surface-2 border-border text-foreground font-semibold"
              >
                <option value="ALL">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Payment Method dropdown */}
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="input py-1.5 px-3 text-xs rounded-xl bg-surface-2 border-border text-foreground font-semibold"
              >
                <option value="ALL">All Payment Types</option>
                <option value="CASH">Cash Drawer</option>
                <option value="BANK">Bank / Online</option>
                <option value="CARD">Card</option>
              </select>

              {/* Search input */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface-2 border-border w-40 sm:w-48 text-foreground"
                  />
                </div>
                <button
                  type="submit"
                  className="p-2 bg-surface-2 hover:bg-surface-3 text-muted hover:text-foreground rounded-xl border border-border"
                  title="Search"
                >
                  <RefreshCw size={13} className={cn(loading && "animate-spin")} />
                </button>
              </form>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-muted flex flex-col items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full mb-3" />
                <p className="text-sm font-semibold">Loading expenses...</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="p-12 text-center text-muted flex flex-col items-center justify-center">
                <div className="p-4 bg-surface-2 rounded-full mb-3 text-muted">
                  <Receipt size={32} />
                </div>
                <h3 className="font-bold text-foreground text-base">No expenses recorded</h3>
                <p className="text-xs text-muted max-w-sm mt-1">
                  No expenses found for the selected timeframe. Click below to add daily grocery, utility, or staff expenses.
                </p>
                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="mt-4 btn bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 text-xs rounded-xl flex items-center gap-2 shadow-md shadow-rose-600/20"
                >
                  <Plus size={15} /> Record Daily Expense
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-2/60 border-b border-border text-xs text-muted uppercase font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Expense Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Logged By</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {expenses.map((exp) => {
                      const isCash = exp.paymentMethod === "CASH";
                      const dateObj = new Date(exp.date);

                      return (
                        <tr key={exp.id} className="hover:bg-surface-2/40 transition-colors">
                          <td className="py-3 px-4 text-xs whitespace-nowrap">
                            <div className="font-semibold text-foreground">
                              {dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                            <div className="text-[10px] text-muted flex items-center gap-1">
                              <Clock size={10} />
                              {dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-foreground">{exp.title}</div>
                            {exp.notes && (
                              <div className="text-xs text-muted italic mt-0.5 line-clamp-1">{exp.notes}</div>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="badge bg-surface-3 border-border text-foreground font-medium text-xs">
                              {exp.categoryRel?.name || exp.category}
                            </span>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={cn(
                              "badge font-semibold text-xs flex items-center gap-1 w-fit",
                              isCash 
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30" 
                                : "bg-blue-500/10 text-blue-600 border border-blue-500/30"
                            )}>
                              {isCash ? <Banknote size={12} /> : <CreditCard size={12} />}
                              {isCash ? "Cash (Drawer)" : exp.paymentMethod}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <span className="font-black text-rose-600 dark:text-rose-400 text-base">
                              -{formatCurrency(exp.amount)}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-xs text-muted whitespace-nowrap">
                            <span className="font-medium text-foreground">{exp.user?.name || "Staff"}</span>
                            {exp.user?.role && (
                              <span className="text-[10px] text-muted block uppercase">({exp.user.role})</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1.5 hover:bg-danger-muted/20 text-muted hover:text-danger rounded-lg transition-colors"
                              title="Delete Expense"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* CATEGORIES TAB */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-foreground">Expense Categories</h2>
            <button
              onClick={() => setShowAddCategoryModal(true)}
              className="btn bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus size={14} /> Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div 
                key={cat.id} 
                className="glass-card p-4 rounded-2xl border border-border flex flex-col justify-between hover:border-rose-500/30 transition-colors"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-base text-foreground flex items-center gap-2">
                      <Tag size={16} className="text-rose-500" />
                      {cat.name}
                    </span>
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="p-1 hover:bg-danger-muted/20 text-muted hover:text-danger rounded-lg transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-muted mb-4">
                    {cat.description || "No description provided."}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-border/50 pt-2 text-muted">
                  <span>Expenses logged:</span>
                  <span className="font-bold text-foreground">{cat._count?.expenses || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= ADD EXPENSE MODAL ================= */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl border border-border w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-2/60">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Record Daily Expense</h3>
                  <p className="text-[11px] text-muted">Will automatically deduct from daily closing cash & finance</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddExpenseModal(false)}
                className="p-1 text-muted hover:text-foreground rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                  Expense Title / Purpose *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vegetables purchase, Milk & Dairy, Gas cylinder refill"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input w-full p-2.5 text-sm rounded-xl bg-surface-2 border-border text-foreground font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                    Amount (PKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input w-full p-2.5 text-sm rounded-xl bg-surface-2 border-border text-foreground font-black text-rose-500 text-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                    Expense Category *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      const matched = categories.find(c => c.id === e.target.value);
                      if (matched) setCategory(matched.name);
                    }}
                    className="input w-full p-2.5 text-sm rounded-xl bg-surface-2 border-border text-foreground font-semibold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Paid From (Payment Method) *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={cn(
                      "p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all",
                      paymentMethod === "CASH"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 font-bold shadow-sm"
                        : "border-border bg-surface-2 text-muted hover:text-foreground"
                    )}
                  >
                    <Banknote size={20} className={paymentMethod === "CASH" ? "text-emerald-500" : ""} />
                    <span className="text-xs">Cash Drawer</span>
                    <span className="text-[10px] text-muted font-normal">(Deducts from drawer cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("BANK")}
                    className={cn(
                      "p-3 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all",
                      paymentMethod === "BANK"
                        ? "border-blue-500 bg-blue-500/10 text-blue-600 font-bold shadow-sm"
                        : "border-border bg-surface-2 text-muted hover:text-foreground"
                    )}
                  >
                    <CreditCard size={20} className={paymentMethod === "BANK" ? "text-blue-500" : ""} />
                    <span className="text-xs">Bank / Online</span>
                    <span className="text-[10px] text-muted font-normal">(Online account / Card)</span>
                  </button>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                  Expense Date
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="input w-full p-2 text-sm rounded-xl bg-surface-2 border-border text-foreground"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                  Notes / Receipt Details (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Receipt number, supplier name, or details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input w-full p-2.5 text-xs rounded-xl bg-surface-2 border-border text-foreground"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="btn bg-surface-2 hover:bg-surface-3 px-4 py-2 text-xs font-bold rounded-xl text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="btn bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-xs font-bold rounded-xl shadow-md shadow-rose-600/20"
                >
                  {submittingExpense ? "Recording..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ADD CATEGORY MODAL ================= */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface rounded-2xl border border-border w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-2/60">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <FolderPlus size={18} />
                </div>
                <h3 className="font-bold text-foreground text-base">New Expense Category</h3>
              </div>
              <button 
                onClick={() => setShowAddCategoryModal(false)}
                className="p-1 text-muted hover:text-foreground rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marketing, Cleaning Supplies, Gas & Fuel"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="input w-full p-2.5 text-sm rounded-xl bg-surface-2 border-border text-foreground font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="What expenses fall under this category..."
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="input w-full p-2.5 text-xs rounded-xl bg-surface-2 border-border text-foreground"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="btn bg-surface-2 hover:bg-surface-3 px-4 py-2 text-xs font-bold rounded-xl text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCat}
                  className="btn btn-primary px-5 py-2 text-xs font-bold rounded-xl shadow-md shadow-primary/20"
                >
                  {submittingCat ? "Creating..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
