"use client";

import { useState, useEffect, useRef } from "react";
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
  Save,
  Phone,
  MapPin,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  X,
  Printer
} from "lucide-react";

const BUSINESS_EDIT_ROLES = ["OWNER", "MANAGER", "SUPER_ADMIN"];

function compressLogoToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Invalid image file."));
      img.onload = () => {
        const maxDim = 500;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not initialize image canvas."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", 0.85));
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Personal Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Business & Receipt Branding State
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessLogo, setBusinessLogo] = useState("");
  const [logoInputMode, setLogoInputMode] = useState<"UPLOAD" | "URL">("UPLOAD");
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [processingLogo, setProcessingLogo] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Visibility toggles
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // Status feedback
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canEditBusiness = Boolean(
    profile?.restaurant && BUSINESS_EDIT_ROLES.includes(profile?.role)
  );

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          setProfile(json.user);
          setName(json.user.name || "");
          setEmail(json.user.email || "");
          if (json.user.restaurant) {
            setBusinessName(json.user.restaurant.name || "");
            setBusinessPhone(json.user.restaurant.contactPhone || "");
            setBusinessAddress(json.user.restaurant.address || "");
            const logo = json.user.restaurant.logoUrl || "";
            setBusinessLogo(logo);
            setLogoUrlInput(logo.startsWith("data:") ? "" : logo);
          }
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

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select a valid image file (PNG, JPG, WebP, or SVG)." });
      return;
    }

    setProcessingLogo(true);
    setMessage(null);
    try {
      const dataUrl = await compressLogoToDataUrl(file);
      setBusinessLogo(dataUrl);
      setLogoUrlInput("");
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Failed to process logo image." });
    } finally {
      setProcessingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (canEditBusiness && !businessName.trim()) {
      setMessage({ type: "error", text: "Business name is required." });
      return;
    }

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

      if (canEditBusiness) {
        payload.business = {
          name: businessName.trim(),
          phone: businessPhone.trim(),
          address: businessAddress.trim(),
          logoUrl: businessLogo.trim() || null,
        };
      }

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
        setMessage({ type: "success", text: "Profile & receipt settings updated successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        await fetchProfile();
        try {
          window.dispatchEvent(new Event("profileUpdated"));
        } catch (e) {}
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update settings." });
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
                  placeholder="admin@foodsupply.com"
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

        {/* Business & Receipt Branding Section */}
        {canEditBusiness && (
          <div className="glass-card p-6 border border-border bg-surface rounded-2xl shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
                <Printer size={18} className="text-primary" /> Business &amp; Receipt Branding
              </h3>
              <p className="text-xs text-muted">
                Configure the business name, contact number, address, and logo printed on POS receipts and daily closing reports.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Business Name *
                </label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Al-Madina Foods"
                    className="w-full h-11 pl-10 pr-4 bg-background border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Business Phone / WhatsApp Number
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    placeholder="e.g. 0300 1234567"
                    className="w-full h-11 pl-10 pr-4 bg-background border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Business Address
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-3.5 text-muted" />
                  <input
                    type="text"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder="e.g. Main Boulevard, Gulberg III, Lahore"
                    className="w-full h-11 pl-10 pr-4 bg-background border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Logo Upload & Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2 border-t border-border/60">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ImageIcon size={15} className="text-primary" /> Business Logo
                  </label>
                  <div className="flex rounded-lg bg-background p-0.5 border border-border text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setLogoInputMode("UPLOAD")}
                      className={`px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors ${
                        logoInputMode === "UPLOAD"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      <Upload size={12} /> Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoInputMode("URL")}
                      className={`px-2.5 py-1 rounded-md flex items-center gap-1 cursor-pointer transition-colors ${
                        logoInputMode === "URL"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      <LinkIcon size={12} /> Image URL
                    </button>
                  </div>
                </div>

                {logoInputMode === "UPLOAD" ? (
                  <div className="flex items-center gap-3">
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={processingLogo}
                      onClick={() => logoFileInputRef.current?.click()}
                      className="h-11 px-4 rounded-xl border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 text-xs font-bold text-primary flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Upload size={15} />
                      {processingLogo ? "Processing Logo..." : businessLogo ? "Change Logo Image" : "Upload Logo Image"}
                    </button>
                    {businessLogo && (
                      <button
                        type="button"
                        onClick={() => {
                          setBusinessLogo("");
                          setLogoUrlInput("");
                        }}
                        className="h-11 px-3 rounded-xl border border-border bg-background hover:bg-danger/10 hover:text-danger hover:border-danger/30 text-xs font-semibold text-muted flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <X size={14} /> Remove
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={logoUrlInput}
                      onChange={(e) => {
                        setLogoUrlInput(e.target.value);
                        setBusinessLogo(e.target.value.trim());
                      }}
                      placeholder="https://example.com/logo.png"
                      className="flex-1 h-11 px-3.5 bg-background border border-border rounded-xl text-sm font-medium focus:outline-none focus:border-primary transition-colors"
                    />
                    {businessLogo && (
                      <button
                        type="button"
                        onClick={() => {
                          setBusinessLogo("");
                          setLogoUrlInput("");
                        }}
                        className="h-11 px-3 rounded-xl border border-border bg-background hover:bg-danger/10 hover:text-danger text-xs font-semibold text-muted cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-muted">
                  Uploaded images are automatically resized and optimized for 80mm thermal receipt printing. High-contrast dark logos print clearest.
                </p>
              </div>

              {/* Compact Thermal Receipt Preview */}
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">
                  Receipt Header &amp; Footer Preview
                </div>
                <div className="bg-white text-black rounded-lg border border-dashed border-zinc-300 p-3 text-center font-mono text-xs space-y-1.5">
                  {businessLogo ? (
                    <div className="flex justify-center pb-1">
                      <img
                        src={businessLogo}
                        alt="Receipt logo preview"
                        className="max-h-12 max-w-[160px] object-contain"
                      />
                    </div>
                  ) : null}
                  <div className="text-sm font-black uppercase tracking-tight">
                    {businessName.trim() || "Business Name"}
                  </div>
                  {businessAddress.trim() && (
                    <div className="text-[10px] text-zinc-700 leading-tight break-words">
                      {businessAddress.trim()}
                    </div>
                  )}
                  <div className="border-t border-dashed border-zinc-300 pt-1.5 mt-1.5 text-[10px] text-zinc-700">
                    {businessPhone.trim()
                      ? `For orders & complaints: ${businessPhone.trim()}`
                      : "Thank you for your business!"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !name || !email || (canEditBusiness && !businessName.trim())}
            className="btn btn-primary px-8 h-12 text-sm font-bold shadow-lg shadow-primary/25 flex items-center gap-2 cursor-pointer"
          >
            <Save size={16} /> {submitting ? "Saving Changes..." : "Save All Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
