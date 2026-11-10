"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, Plus, Trash2, Users, Grid2X2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TablesManagementPage() {
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [floor, setFloor] = useState("Family Hall");
  const [submitting, setSubmitting] = useState(false);

  const fetchTables = async () => {
    try {
      const res = await fetch("/api/admin/tables");
      if (res.ok) {
        const json = await res.json();
        setTables(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch tables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD", name, capacity, floor })
      });
      
      const data = await res.json();
      if (res.ok) {
        setIsAdding(false);
        setName("");
        fetchTables();
      } else {
        alert(data.error || "Failed to add table");
      }
    } catch (error) {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tableId: string) => {
    if (!confirm("Are you sure you want to delete this table?")) return;
    try {
      await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE", tableId })
      });
      fetchTables();
    } catch (error) {
      alert("Failed to delete table");
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  // Group tables by floor
  const floors = Array.from(new Set(tables.map(t => t.floor)));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
            <LayoutDashboard className="text-primary" /> Tables & Floors
          </h1>
          <p className="text-muted">Manage your dining layout and seating capacity.</p>
        </div>
        <button onClick={() => setIsAdding(!isAdding)} className="btn btn-primary">
          {isAdding ? "Cancel" : <><Plus size={18} className="mr-2" /> Add Table</>}
        </button>
      </div>

      {isAdding && (
        <div className="glass-card p-6 mb-8 animate-fade-in border border-primary/20 bg-primary-muted/5">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Grid2X2 size={20} /> Create New Table</h2>
          <form onSubmit={handleAddTable} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
            <div>
              <label className="block text-sm font-semibold mb-1">Floor / Section</label>
              <input type="text" required list="floors-list" value={floor} onChange={e => setFloor(e.target.value)} className="input bg-surface border-border w-full" placeholder="e.g. Family Hall" />
              <datalist id="floors-list">
                {floors.map(f => <option key={f} value={f} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Table Name/Number</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="input bg-surface border-border w-full" placeholder="e.g. T-12" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Seating Capacity</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input type="number" required min="1" max="20" value={capacity} onChange={e => setCapacity(e.target.value)} className="input pl-10 bg-surface border-border w-full" />
              </div>
            </div>
            <div className="md:col-span-3 mt-2">
              <button disabled={submitting} type="submit" className="btn btn-primary px-8 h-12">
                {submitting ? "Saving..." : "Save Table"}
              </button>
            </div>
          </form>
        </div>
      )}

      {floors.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
          <LayoutDashboard size={48} className="mx-auto text-muted mb-4 opacity-50" />
          <h3 className="text-xl font-bold mb-2">No Tables Found</h3>
          <p className="text-muted">Start by adding your first dining table.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {floors.map(floorName => (
            <div key={floorName} className="glass-card p-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-border pb-3">
                <Grid2X2 className="text-accent" /> {floorName}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {tables.filter(t => t.floor === floorName).map(table => (
                  <div key={table.id} className="relative aspect-square rounded-2xl border-2 border-border bg-surface flex flex-col items-center justify-center p-4 group">
                    <span className="text-2xl font-bold mb-1">{table.name}</span>
                    <span className="text-xs font-semibold text-muted flex items-center gap-1">
                      <Users size={12} /> {table.capacity} Seats
                    </span>
                    <div className="absolute top-2 right-2 text-[10px] bg-background/80 px-1.5 py-0.5 rounded-full font-medium border border-border">
                      {table.status}
                    </div>
                    
                    {/* Delete overlay */}
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                      <button 
                        onClick={() => handleDelete(table.id)}
                        disabled={table.status === "OCCUPIED"}
                        className="btn btn-danger p-3 rounded-full shadow-lg disabled:opacity-50"
                        title={table.status === "OCCUPIED" ? "Cannot delete occupied table" : "Delete Table"}
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
