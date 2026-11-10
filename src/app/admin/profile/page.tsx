"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Building2, 
  Eye, 
  EyeOff, 
  Save
} from "lucide-react";

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility toggles
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Status feedback
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          setProfile(json.user);
          setName(json.user.name || "");
          setEmail(json.user.email || "");
        }
      }
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    if (newPassword && newPassword.length < 4) {
      setMessage({ type: "error", text: "New password must be at least 4 characters long." });
      return;
    }

    if (newPassword && !currentPassword) {
      setMessage({ type: "error", text: "Please enter your current password to set a new password." });
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        name,
        email,
      };

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Profile details updated successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        fetchProfile();
        try {
          window.dispatchEvent(new Event("profileUpdated"));
        } catch (e) {}
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update profile." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error while saving changes." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <ShieldCheck className="text-primary w-8 h-8" /> Admin Profile & Security
        </h1>
        <p className="text-sm text-muted mt-1">
          Manage your account credentials, login email, and password.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="glass-card p-6 mb-8 border border-border bg-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-2xl shadow-sm">
            {profile?.name?.charAt(0) || "A"}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{profile?.name}</h2>
            <p className="text-xs text-muted font-medium flex items-center gap-2 mt-0.5">
              <Mail size={12} /> {profile?.email}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-primary-muted/20 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-primary/30">
                {profile?.role?.replace("_", " ")}
              </span>
              {profile?.restaurant?.name && (
                <span className="bg-surface-3 text-muted text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 border border-border">
                  <Building2 size={10} /> {profile.restaurant.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {message && (
        <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 text-sm font-semibold border animate-fade-in ${
          message.type === "success" 
            ? "bg-success-muted/15 border-success/30 text-success" 
            : "bg-danger-muted/15 border-danger/30 text-danger"
        }`}>
          {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details Section */}
        <div className="glass-card p-6 border border-border bg-surface rounded-2xl shadow-sm">
          <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <User size={18} className="text-primary" /> Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input pl-10 w-full text-sm font-semibold"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                Login Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-10 w-full text-sm font-semibold"
                  placeholder="admin@restaurant.com"
                />
              </div>
              <p className="text-[11px] text-muted mt-1">
                This email is used to log in to the back-office management portal.
              </p>
            </div>
          </div>
        </div>

        {/* Password & Security Section */}
        <div className="glass-card p-6 border border-border bg-surface rounded-2xl shadow-sm">
          <h3 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
            <Lock size={18} className="text-primary" /> Change Password
          </h3>
          <p className="text-xs text-muted mb-5">
            Leave these fields blank if you do not want to change your password.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input
                  type={showCurrentPass ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="input pl-10 pr-10 w-full text-sm font-mono"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="input pl-10 pr-10 w-full text-sm font-mono"
                    placeholder="New password (min 4 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground cursor-pointer"
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="input pl-10 w-full text-sm font-mono"
                    placeholder="Re-type new password"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !name || !email}
            className="btn btn-primary px-8 h-12 text-sm font-bold shadow-lg shadow-primary/25 flex items-center gap-2 cursor-pointer"
          >
            <Save size={16} /> {submitting ? "Saving Changes..." : "Save Profile Details"}
          </button>
        </div>
      </form>
    </div>
  );
}
