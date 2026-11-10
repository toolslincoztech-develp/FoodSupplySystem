"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Trash2, Mail, Briefcase, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HRPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // Also acts as PIN
  const [role, setRole] = useState("WAITER");
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/admin/staff");
      if (res.ok) {
        const json = await res.json();
        setStaff(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch staff");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert("Staff member added successfully!");
        setIsAdding(false);
        setName("");
        setEmail("");
        setPassword("");
        setRole("WAITER");
        fetchStaff();
      } else {
        alert(data.error || "Failed to add staff");
      }
    } catch (error) {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteStaff = async (id: string, staffName: string) => {
    if (!confirm(`Are you sure you want to remove "${staffName}" from staff?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/staff?id=${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok) {
        setStaff(prev => prev.filter(user => user.id !== id));
      } else {
        alert(data.error || "Failed to delete staff member");
      }
    } catch (error) {
      alert("Network error while deleting staff");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
            <Users className="text-primary" /> Staff & HR Management
          </h1>
          <p className="text-muted">Manage your food supply employees, waiters, and kitchen staff.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="btn btn-primary"
        >
          {isAdding ? "Cancel" : <><Plus size={18} className="mr-2" /> Add Staff</>}
        </button>
      </div>

      {isAdding && (
        <div className="glass-card p-6 mb-8 animate-fade-in border border-primary/20 bg-primary-muted/5">
          <h2 className="text-xl font-bold mb-4">Add New Employee</h2>
          <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Full Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="input bg-surface border-border w-full" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Email / Login ID</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input bg-surface border-border w-full" placeholder="john@foodsupply.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Password / POS PIN</label>
              <input type="text" required value={password} onChange={e => setPassword(e.target.value)} className="input bg-surface border-border w-full" placeholder="e.g. 1234 or strongpass" />
              <p className="text-[10px] text-muted mt-1">Waiters and Cashiers will use this as their POS PIN.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Role</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="input bg-surface border-border w-full">
                <option value="WAITER">Waiter</option>
                <option value="CASHIER">Cashier</option>
                <option value="KITCHEN_STAFF">Kitchen Staff (Chef)</option>
                <option value="MANAGER">Manager</option>
                <option value="RIDER">Delivery Rider</option>
              </select>
            </div>
            <div className="md:col-span-2 mt-4">
              <button disabled={submitting} type="submit" className="btn btn-primary w-full md:w-auto px-8">
                {submitting ? "Saving..." : "Save Employee"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-2 border-b border-border text-sm">
              <th className="p-4 font-semibold text-muted uppercase tracking-wider">Employee</th>
              <th className="p-4 font-semibold text-muted uppercase tracking-wider">Role</th>
              <th className="p-4 font-semibold text-muted uppercase tracking-wider">Branch</th>
              <th className="p-4 font-semibold text-muted uppercase tracking-wider">Joined</th>
              <th className="p-4 font-semibold text-muted uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {staff.map((user) => (
              <tr key={user.id} className="hover:bg-surface-2/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold">{user.name}</p>
                      <p className="text-xs text-muted flex items-center gap-1"><Mail size={10} /> {user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 w-max",
                    user.role === "OWNER" || user.role === "MANAGER" ? "bg-accent-muted text-accent" :
                    user.role === "KITCHEN_STAFF" ? "bg-warning-muted text-warning" : 
                    user.role === "RIDER" ? "bg-purple-500/10 text-purple-500" :
                    "bg-info-muted text-info"
                  )}>
                    {user.role === "OWNER" || user.role === "MANAGER" ? <ShieldAlert size={12} /> : <Briefcase size={12} />}
                    {user.role.replace("_", " ")}
                  </span>
                </td>
                <td className="p-4 text-sm font-semibold">{user.branch?.name || "All Branches"}</td>
                <td className="p-4 text-sm text-muted" suppressHydrationWarning>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => handleDeleteStaff(user.id, user.name)}
                    disabled={deletingId === user.id}
                    title="Remove Employee"
                    className="p-2 text-muted hover:text-danger hover:bg-danger-muted rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deletingId === user.id ? (
                      <div className="w-4 h-4 border-2 border-danger border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted">No staff found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
