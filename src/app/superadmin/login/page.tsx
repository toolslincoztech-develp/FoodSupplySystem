"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Mail, Lock, ArrowRight } from "lucide-react";

export default function SuperAdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // In a real app, you'd have a specific /api/auth/superadmin
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, isSuperAdmin: true })
      });

      if (res.ok) {
        try {
          sessionStorage.clear();
        } catch (e) {}
        window.location.href = "/superadmin";
      } else {
        let errorMsg = "Login failed";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch {
          errorMsg = `Server error (${res.status}). Please try again.`;
        }
        alert(errorMsg);
        setLoading(false);
      }
    } catch (err) {
      alert("Network error or connection lost. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-danger flex items-center justify-center text-white">
            <Shield size={24} />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          Lincoz Tech Master Control
        </h2>
        <p className="mt-2 text-center text-sm text-muted">
          Master control panel for Lincoz Tech SaaS
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-danger-muted">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  type="email"
                  required
                  className="input pl-10"
                  style={{ paddingLeft: "2.5rem" }}
                  placeholder="super@restroerp.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                <input
                  type="password"
                  required
                  className="input pl-10"
                  style={{ paddingLeft: "2.5rem" }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-danger flex justify-center py-2.5"
              >
                {loading ? "Authenticating..." : "Login to Master Control"} 
                {!loading && <ArrowRight size={18} className="ml-2" />}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <button onClick={() => router.push("/login")} className="text-sm text-muted hover:text-foreground">
              ← Back to Client Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
