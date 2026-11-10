"use client";

import { useState, useEffect } from "react";
import { Plus, ShieldCheck, Building2, CalendarDays, ExternalLink, Link as LinkIcon, UserCog, User, Mail, KeyRound, X, LogOut, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SuperAdminDashboard() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hasTax, setHasTax] = useState(false);
  const [taxRate, setTaxRate] = useState<number>(16);
  const [submitting, setSubmitting] = useState(false);
  const [editingFeatures, setEditingFeatures] = useState<any>(null);
  const [savingFeatures, setSavingFeatures] = useState(false);

  // Edit Admin State
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteRestaurant = async (restaurantId: string, restaurantName: string) => {
    const confirmation = window.prompt(
      `⚠️ CRITICAL: You are about to permanently delete food supply "${restaurantName}" and all its branches, staff accounts, menus, tables, and orders.\n\nTo confirm, type the food supply name "${restaurantName}" below:`
    );

    if (confirmation !== restaurantName) {
      if (confirmation !== null) {
        alert("Deletion cancelled. Food supply name did not match.");
      }
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(`/api/superadmin/clients?id=${restaurantId}`, {
        method: "DELETE"
      });
      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Food supply deleted successfully.");
        setEditingAdmin(null);
        setEditingFeatures(null);
        fetchClients();
      } else {
        alert(data.error || "Failed to delete restaurant.");
      }
    } catch (err) {
      console.error("Delete restaurant error:", err);
      alert("Network error while deleting restaurant.");
    } finally {
      setDeleting(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/superadmin/clients");
      if (res.ok) {
        const json = await res.json();
        setClients(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClient = async (id: string, data: any) => {
    setSavingFeatures(true);
    try {
      const res = await fetch("/api/superadmin/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data })
      });
      if (res.ok) {
        setEditingFeatures(null);
        await fetchClients();
      } else {
        let errorMsg = "Failed to update food supply";
        try {
          const errData = await res.json();
          errorMsg = errData.error || errorMsg;
        } catch {}
        alert(errorMsg);
      }
    } catch (error) {
      alert("Failed to update food supply");
    } finally {
      setSavingFeatures(false);
    }
  };

  const openEditAdminModal = (client: any) => {
    const owner = client.users?.[0];
    setEditingAdmin(client);
    setAdminName(owner?.name || "Admin Owner");
    setAdminEmail(owner?.email || client.contactEmail || "");
    setAdminPassword("");
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setSavingAdmin(true);
    try {
      const res = await fetch("/api/superadmin/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: editingAdmin.id,
          userId: editingAdmin.users?.[0]?.id,
          name: adminName,
          email: adminEmail,
          password: adminPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Food supply admin details updated successfully!");
        setEditingAdmin(null);
        fetchClients();
      } else {
        alert(data.error || "Failed to update admin details");
      }
    } catch (err) {
      alert("Network error occurred");
    } finally {
      setSavingAdmin(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/superadmin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          slug, 
          contactEmail: email, 
          password,
          hasTax,
          taxRate: hasTax ? Number(taxRate) : 0
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert("Client registered successfully!");
        setIsAdding(false);
        setName("");
        setSlug("");
        setEmail("");
        setPassword("");
        setHasTax(false);
        setTaxRate(16);
        fetchClients();
      } else {
        alert(data.error || "Failed to add client");
      }
    } catch (error) {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  const activeClients = clients.filter(c => c.status === "ACTIVE").length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
            <ShieldCheck className="text-primary w-8 h-8" /> Lincoz Tech Master Control
          </h1>
          <p className="text-muted">Manage food supply tenants, branches, and active licenses.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={async () => {
              try {
                await fetch("/api/auth/logout", { method: "POST" });
              } catch (e) {
                console.error("Logout error", e);
              }
              window.location.href = "/superadmin/login";
            }}
            className="btn btn-ghost text-muted hover:text-danger hover:bg-danger-muted/10 border border-border flex items-center gap-2"
          >
            <LogOut size={16} /> Sign Out
          </button>
          <button onClick={() => setIsAdding(!isAdding)} className="btn btn-primary">
            {isAdding ? "Cancel" : <><Plus size={18} className="mr-2" /> Register New Client</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 border-l-4 border-l-primary">
          <h3 className="text-sm font-semibold text-muted mb-1">Total Active Clients</h3>
          <p className="text-3xl font-bold">{activeClients}</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-l-success">
          <h3 className="text-sm font-semibold text-muted mb-1">Total Sub-Branches</h3>
          <p className="text-3xl font-bold">{clients.reduce((acc, curr) => acc + (curr._count?.branches || 0), 0)}</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-l-warning">
          <h3 className="text-sm font-semibold text-muted mb-1">Est. Monthly Revenue</h3>
          <p className="text-3xl font-bold">${activeClients * 99}</p>
        </div>
      </div>

      {isAdding && (
        <div className="glass-card p-6 mb-8 animate-fade-in border border-primary/20 bg-primary-muted/5 shadow-xl">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Building2 size={20} /> Register New Food Supply</h2>
          <form onSubmit={handleAddClient} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold mb-1">Food Supply Name</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="input bg-surface border-border w-full" placeholder="e.g. Fresh Foods" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Subdomain / Tenant Code</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input type="text" required value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className="input pl-10 bg-surface border-border w-full" placeholder="fresh-foods" />
              </div>
              <p className="text-[10px] text-muted mt-1">This will be used for their login code (e.g. fresh-foods).</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Owner Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input bg-surface border-border w-full" placeholder="owner@foodsupply.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Initial Password</label>
              <input type="text" required value={password} onChange={e => setPassword(e.target.value)} className="input bg-surface border-border w-full" placeholder="SecurePass123" />
            </div>

            {/* Tax / GST Billing Option */}
            <div className="md:col-span-2 p-4 rounded-xl bg-surface border border-border flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-sm text-foreground">Include Tax / GST in Bills</span>
                  <p className="text-xs text-muted">Add automatic tax calculation to customer receipts for this food supply</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={hasTax} 
                    onChange={e => setHasTax(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-surface-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {hasTax && (
                <div className="pt-3 border-t border-border flex flex-wrap items-center gap-3 animate-fade-in">
                  <label className="text-sm font-semibold text-muted whitespace-nowrap">Tax Rate Percentage:</label>
                  <div className="relative w-36">
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      step="0.1" 
                      value={taxRate} 
                      onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} 
                      className="input bg-surface-2 border-border w-full pr-8 font-bold text-primary" 
                      placeholder="16" 
                      required={hasTax}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted font-bold text-sm">%</span>
                  </div>
                  <span className="text-xs text-muted">e.g. 16% for standard GST, 5% for provincial, etc.</span>
                </div>
              )}
            </div>

            <div className="md:col-span-2 mt-2 pt-4 border-t border-border">
              <button disabled={submitting} type="submit" className="btn btn-primary w-full md:w-auto px-8 h-12 text-base">
                {submitting ? "Creating Infrastructure..." : "Deploy Food Supply"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2"><Building2 size={18} /> Registered Food Supplies</h2>
          <div className="text-xs text-muted font-semibold bg-surface px-3 py-1.5 rounded-md border border-border">
            Total Database Tenants: {clients.length}
          </div>
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface border-b border-border text-xs uppercase text-muted">
            <tr>
              <th className="p-4 font-semibold">Tenant Info</th>
              <th className="p-4 font-semibold">Contact & Users</th>
              <th className="p-4 font-semibold">Infrastructure</th>
              <th className="p-4 font-semibold">Subscription</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-surface-2/50 transition-colors">
                <td className="p-4">
                  <p className="font-bold text-foreground text-sm">{client.name}</p>
                  <p className="text-xs text-primary font-mono mt-0.5 bg-primary-muted/20 w-max px-1.5 py-0.5 rounded flex items-center gap-1">
                    <ExternalLink size={10} /> {client.slug}
                  </p>
                </td>
                <td className="p-4">
                  <p className="font-bold text-sm text-foreground">{client.users?.[0]?.name || "Admin Owner"}</p>
                  <p className="font-medium text-xs text-muted mt-0.5">{client.users?.[0]?.email || client.contactEmail}</p>
                  <p className="text-[10px] text-muted/70">{client._count?.users || 0} Staff Accounts</p>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="bg-surface-3 px-2 py-1 rounded-md text-[10px] font-bold text-foreground border border-border w-max">
                      {client._count?.branches || 0} Branches
                    </span>
                    <div className="flex gap-1 items-center flex-wrap">
                      {client.hasHR && <span title="HR Enabled" className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center text-[8px] font-bold">HR</span>}
                      {client.hasInventory && <span title="Inventory Enabled" className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[8px] font-bold">IV</span>}
                      {client.hasKDS && <span title="KDS Enabled" className="w-4 h-4 rounded-full bg-warning/20 text-warning flex items-center justify-center text-[8px] font-bold">KD</span>}
                      {client.hasDelivery && <span title="Delivery Enabled" className="w-4 h-4 rounded-full bg-info/20 text-info flex items-center justify-center text-[8px] font-bold">DL</span>}
                      {client.hasTax ? (
                        <span className="text-[9px] font-bold text-primary bg-primary-muted/20 px-1 py-0.5 rounded border border-primary/30">
                          TAX: {client.taxRate}%
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium text-muted bg-surface-3 px-1 py-0.5 rounded">
                          NO TAX
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <p className="text-sm font-bold tracking-tight">{client.subscriptionPlan}</p>
                  <p className="text-[10px] text-muted flex items-center gap-1 mt-0.5 uppercase tracking-wider font-semibold">
                    <CalendarDays size={10} /> <span suppressHydrationWarning>{new Date(client.validUntil).toLocaleDateString()}</span>
                  </p>
                </td>
                <td className="p-4">
                  <span className={cn(
                    "badge",
                    client.status === "ACTIVE" ? "bg-success-muted text-success border-success/20" : "bg-danger-muted text-danger border-danger/20"
                  )}>
                    {client.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => {
                      const newStatus = client.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
                      handleUpdateClient(client.id, { status: newStatus });
                    }}
                    className={cn(
                      "text-xs font-bold mr-3",
                      client.status === "ACTIVE" ? "text-danger" : "text-success"
                    )}
                  >
                    {client.status === "ACTIVE" ? "Suspend" : "Activate"}
                  </button>
                  <button 
                    onClick={() => openEditAdminModal(client)}
                    className="btn btn-secondary py-1 px-2.5 text-xs mr-2 font-semibold text-primary border-primary/30 hover:bg-primary hover:text-white transition-colors"
                    title="Edit Admin Name, Email, and Password"
                  >
                    <UserCog size={13} className="mr-1 inline" /> Edit Admin
                  </button>
                  <button 
                    onClick={() => setEditingFeatures(client)}
                    className="btn btn-secondary py-1 px-3 text-xs mr-2"
                  >
                    Manage Features
                  </button>
                  <button 
                    onClick={() => handleDeleteRestaurant(client.id, client.name)}
                    className="p-1.5 text-muted hover:text-danger hover:bg-danger-muted/20 rounded-md transition-colors inline-flex items-center align-middle cursor-pointer"
                    title="Delete Food Supply"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Feature Management Modal */}
      {editingFeatures && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-scale-in">
            <h2 className="text-xl font-bold mb-1">Manage Features</h2>
            <p className="text-sm text-muted mb-6">{editingFeatures.name}</p>
            
            <div className="space-y-4">
              {[
                { id: "hasHR", label: "HR & Staff Management" },
                { id: "hasInventory", label: "Inventory & Stock" },
                { id: "hasKDS", label: "Kitchen Display (KDS)" },
                { id: "hasDelivery", label: "Delivery Module" },
                { id: "hasTables", label: "Dine-in (Tables)" },
              ].map(feat => (
                <div key={feat.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="font-semibold text-sm">{feat.label}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={Boolean(editingFeatures[feat.id])} 
                      onChange={(e) => {
                        setEditingFeatures({ ...editingFeatures, [feat.id]: e.target.checked });
                      }}
                    />
                    <div className="w-11 h-6 bg-surface-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}

              {/* Tax in Manage Features */}
              <div className="p-3 rounded-lg bg-surface-2 border border-border flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm">Include Tax / GST</span>
                    <p className="text-[11px] text-muted">Add tax to bills for this client</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={Boolean(editingFeatures.hasTax)} 
                      onChange={(e) => {
                        setEditingFeatures({ ...editingFeatures, hasTax: e.target.checked });
                      }}
                    />
                    <div className="w-11 h-6 bg-surface-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {editingFeatures.hasTax && (
                  <div className="pt-2 border-t border-border flex items-center justify-between gap-3">
                    <label className="text-xs font-semibold text-muted">Tax Rate (%):</label>
                    <div className="relative w-32">
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        step="0.1" 
                        value={editingFeatures.taxRate ?? 0} 
                        onChange={e => setEditingFeatures({ ...editingFeatures, taxRate: parseFloat(e.target.value) || 0 })} 
                        className="input bg-surface border-border w-full pr-8 text-right font-bold text-sm" 
                        placeholder="16" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted font-bold text-xs">%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                type="button"
                disabled={savingFeatures}
                onClick={() => setEditingFeatures(null)}
                className="btn btn-ghost flex-1"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={savingFeatures}
                onClick={() =>
                  handleUpdateClient(editingFeatures.id, {
                    hasHR: Boolean(editingFeatures.hasHR),
                    hasInventory: Boolean(editingFeatures.hasInventory),
                    hasKDS: Boolean(editingFeatures.hasKDS),
                    hasDelivery: Boolean(editingFeatures.hasDelivery),
                    hasTables: Boolean(editingFeatures.hasTables),
                    hasTax: Boolean(editingFeatures.hasTax),
                    taxRate: editingFeatures.hasTax ? Math.max(0, Number(editingFeatures.taxRate || 0)) : 0,
                  })
                }
                className="btn btn-primary flex-1"
              >
                {savingFeatures ? "Saving..." : "Save Changes"}
              </button>
            </div>

            {/* Danger Zone: Delete Food Supply */}
            <div className="pt-4 border-t border-danger/20 mt-6 bg-danger-muted/10 p-3.5 rounded-xl border border-danger/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-danger flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Delete Food Supply
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">
                    Permanently delete this food supply tenant and all data.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleDeleteRestaurant(editingFeatures.id, editingFeatures.name)}
                  className="btn bg-danger hover:bg-danger/90 text-white text-xs px-3.5 py-2 font-bold flex items-center gap-1.5 shrink-0 shadow-sm transition-all cursor-pointer"
                >
                  <Trash2 size={13} /> {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 shadow-2xl animate-scale-in border border-border bg-surface">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <UserCog size={22} className="text-primary" /> Edit Food Supply Admin
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Food Supply: <span className="font-semibold text-foreground">{editingAdmin.name}</span> ({editingAdmin.slug})
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="w-8 h-8 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-muted hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Admin Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={e => setAdminName(e.target.value)}
                    className="input pl-10 bg-surface-2 border-border w-full text-sm font-semibold"
                    placeholder="e.g. Usman Josan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Admin Email (Login ID)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    className="input pl-10 bg-surface-2 border-border w-full text-sm font-semibold"
                    placeholder="owner@foodsupply.com"
                  />
                </div>
                <p className="text-[11px] text-muted mt-1">This email is used by the admin to sign in to the back-office portal.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  New Password <span className="text-muted font-normal text-[10px] lowercase">(optional)</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input
                    type="text"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    className="input pl-10 bg-surface-2 border-border w-full text-sm font-mono"
                    placeholder="Leave blank to keep current password"
                  />
                </div>
                <p className="text-[11px] text-muted mt-1">Leave empty if you only want to change the name or email.</p>
              </div>

              <div className="pt-3 border-t border-border flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="btn btn-ghost flex-1 h-11 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdmin || !adminName || !adminEmail}
                  className="btn btn-primary flex-1 h-11 text-sm font-bold shadow-md shadow-primary/20"
                >
                  {savingAdmin ? "Saving..." : "Save Changes"}
                </button>
              </div>

              {/* Danger Zone: Delete Food Supply */}
              <div className="pt-4 border-t border-danger/20 mt-6 bg-danger-muted/10 p-3.5 rounded-xl border border-danger/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-danger flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Delete Food Supply
                    </p>
                    <p className="text-[11px] text-muted mt-0.5">
                      Permanently wipe this tenant, staff, menu items, and order history.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => handleDeleteRestaurant(editingAdmin.id, editingAdmin.name)}
                    className="btn bg-danger hover:bg-danger/90 text-white text-xs px-3.5 py-2 font-bold flex items-center gap-1.5 shrink-0 shadow-sm transition-all cursor-pointer"
                  >
                    <Trash2 size={13} /> {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
