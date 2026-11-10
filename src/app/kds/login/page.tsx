"use client";

import { useRouter } from "next/navigation";
import { ChefHat, Flame, Coffee, Pizza } from "lucide-react";

export default function KDSLoginPage() {
  const router = useRouter();

  const handleStationSelect = (station: string) => {
    // In a real app, save station to local context/store
    router.push("/kds");
  };

  return (
    <div className="min-h-screen bg-surface-2 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-full bg-primary items-center justify-center text-white mb-4 shadow-sm">
            <ChefHat size={32} />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Kitchen Display System</h1>
          <p className="text-muted mt-2">Select your prep station to begin</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StationCard 
            title="Main Grill" 
            description="Burgers, Steaks, Chicken"
            icon={<Flame size={40} className="text-warning" />}
            onClick={() => handleStationSelect("grill")}
          />
          <StationCard 
            title="Pizza & Oven" 
            description="Pizzas, Pastas, Baked items"
            icon={<Pizza size={40} className="text-danger" />}
            onClick={() => handleStationSelect("oven")}
          />
          <StationCard 
            title="Drinks & Desserts" 
            description="Beverages, Shakes, Sweets"
            icon={<Coffee size={40} className="text-info" />}
            onClick={() => handleStationSelect("drinks")}
          />
        </div>

        <div className="mt-12 text-center">
          <button 
            onClick={() => router.push("/login")}
            className="text-sm text-muted hover:text-foreground font-medium"
          >
            ← Back to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

function StationCard({ title, description, icon, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="glass-card p-8 flex flex-col items-center text-center hover:border-primary transition-all duration-300 group"
    >
      <div className="w-20 h-20 rounded-full bg-surface-2 border border-border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-muted">{description}</p>
    </button>
  );
}
