"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UtensilsCrossed, Delete, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

export default function POSLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNumber = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleLogin = async () => {
    if (pin.length !== 4 || !slug) {
      setError(true);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/auth/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, slug })
      });

      if (res.ok) {
        const data = await res.json();
        try {
          sessionStorage.clear();
        } catch (e) {}
        window.location.href = data.redirectUrl || "/pos";
      } else {
        setError(true);
        setPin("");
        setLoading(false);
      }
    } catch (err) {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-2 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-sm border border-border p-8 flex flex-col items-center">
        
        <div className="w-16 h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center text-primary mb-6">
          <UtensilsCrossed size={32} />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-1">POS Terminal</h1>
        
        <div className="w-full mb-6 mt-4">
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2 text-center">Restaurant Code</label>
          <input 
            type="text" 
            placeholder="e.g. demo-burger" 
            className="input text-center font-bold"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
          />
        </div>

        <p className="text-muted mb-6 text-sm">Enter your 4-digit Staff PIN</p>

        {/* PIN Display */}
        <div className="flex gap-4 mb-8">
          {[0, 1, 2, 3].map((index) => (
            <div 
              key={index}
              className={cn(
                "w-14 h-14 rounded-xl border-2 flex items-center justify-center text-3xl transition-colors",
                pin.length > index ? "border-primary bg-primary-muted text-primary" : "border-border bg-surface-2 text-transparent",
                error && "border-danger bg-danger-muted text-danger animate-pulse"
              )}
            >
              {pin.length > index ? "•" : ""}
            </div>
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumber(num.toString())}
              className="h-16 rounded-xl bg-surface-2 hover:bg-surface-3 active:bg-border border border-border text-2xl font-semibold transition-colors"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleDelete}
            className="h-16 rounded-xl bg-surface-2 hover:bg-surface-3 active:bg-border border border-border flex items-center justify-center text-muted transition-colors"
          >
            <Delete size={24} />
          </button>
          <button
            onClick={() => handleNumber("0")}
            className="h-16 rounded-xl bg-surface-2 hover:bg-surface-3 active:bg-border border border-border text-2xl font-semibold transition-colors"
          >
            0
          </button>
          <button
            onClick={handleLogin}
            disabled={pin.length !== 4}
            className="h-16 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
          >
            <LogIn size={24} />
          </button>
        </div>

        <button 
          onClick={() => router.push("/login")}
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          Switch to Back-Office Login
        </button>
      </div>
    </div>
  );
}
