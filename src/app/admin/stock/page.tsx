"use client";

import { useState, useEffect } from "react";
import { Package, Plus, AlertTriangle, ChefHat, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StockManagementPage() {
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAdd, setShowAdd] = useState(false);
  const [showIssue, setShowIssue] = useState<string | null>(null);

  // Form
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("kg");
  const [minStock, setMinStock] = useState("5");
  const [issueQty, setIssueQty] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchStock = async () => {
    try {
      const res = await fetch("/api/admin/stock");
      if (res.ok) {
        const json = await res.json();
        setStock(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_STOCK", name, quantity: qty, unit, minStock })
      });
      if (res.ok) {
        setShowAdd(false);
        setName(""); setQty("");
        fetchStock();
      }
    } catch (e) {
      alert("Error adding stock");
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueToKitchen = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ISSUE_TO_KITCHEN", id, issueQty })
      });
      if (res.ok) {
        setShowIssue(null);
        setIssueQty("");
        fetchStock();
        alert("Stock issued to kitchen successfully!");
      } else {
        alert("Insufficient stock in store");
      }
    } catch (e) {
      alert("Error issuing stock");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted">Loading stock...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
            <Package className="text-primary w-8 h-8" /> Store & Kitchen Stock
          </h1>
          <p className="text-muted">Manage raw materials, low stock alerts, and issue items to the kitchen.</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary">
          {showAdd ? "Cancel" : <><Plus size={18} className="mr-2" /> Add New Material</>}
        </button>
      </div>

      {showAdd && (
        <div className="glass-card p-6 mb-8 border border-primary/20 bg-primary-muted/5 animate-fade-in">
          <h2 className="text-xl font-bold mb-4">Add Raw Material to Store</h2>
          <form onSubmit={handleAddStock} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">Item Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="input bg-surface w-full" placeholder="e.g. Flour, Cooking Oil" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Initial Qty</label>
              <input type="number" step="0.1" required value={qty} onChange={e => setQty(e.target.value)} className="input bg-surface w-full" placeholder="100" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Unit</label>
              <select required value={unit} onChange={e => setUnit(e.target.value)} className="input bg-surface w-full">
                <option value="kg">KG</option>
                <option value="liter">Liter</option>
                <option value="pieces">Pieces</option>
                <option value="grams">Grams</option>
              </select>
            </div>
            <div>
              <button disabled={submitting} type="submit" className="btn btn-primary w-full h-[42px]">Save Item</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface border-b border-border text-xs uppercase text-muted">
            <tr>
              <th className="p-4 font-semibold">Material Name</th>
              <th className="p-4 font-semibold">Store Stock</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Kitchen Issue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {stock.map((item) => (
              <tr key={item.id} className="hover:bg-surface-2/50 transition-colors">
                <td className="p-4 font-bold text-foreground">{item.name}</td>
                <td className="p-4 font-medium text-lg">
                  {item.quantity} <span className="text-xs text-muted font-normal">{item.unit}</span>
                </td>
                <td className="p-4">
                  {item.quantity <= item.minStock ? (
                    <span className="badge bg-danger-muted text-danger border-danger/20 gap-1">
                      <AlertTriangle size={12} /> Low Stock
                    </span>
                  ) : (
                    <span className="badge bg-success-muted text-success border-success/20">Optimal</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  {showIssue === item.id ? (
                    <form onSubmit={(e) => handleIssueToKitchen(e, item.id)} className="flex items-center justify-end gap-2">
                      <input 
                        type="number" step="0.1" max={item.quantity} required 
                        value={issueQty} onChange={e => setIssueQty(e.target.value)} 
                        className="input w-24 bg-surface text-sm py-1.5" placeholder="Qty" 
                        autoFocus
                      />
                      <button type="submit" disabled={submitting} className="btn btn-primary px-3 py-1.5 text-xs">Confirm</button>
                      <button type="button" onClick={() => setShowIssue(null)} className="btn btn-secondary px-3 py-1.5 text-xs">X</button>
                    </form>
                  ) : (
                    <button onClick={() => setShowIssue(item.id)} className="btn btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1 border border-border">
                      Issue to Kitchen <ArrowRight size={14} /> <ChefHat size={14} className="text-warning ml-1" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {stock.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted">No materials found in the store.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
