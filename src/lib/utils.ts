import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function stripEmojis(str: string): string {
  if (!str) return "";
  return str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '').trim();
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateOrderNumber(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `ORD-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${Math.floor(Math.random() * 100)}`;
}

export function getTimeElapsed(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export const ORDER_STATUSES = {
  PENDING: { label: "Pending", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  PREPARING: { label: "Preparing", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  READY: { label: "Ready", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  SERVED: { label: "Served", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  PAID: { label: "Paid", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  CANCELLED: { label: "Cancelled", color: "bg-red-500/20 text-red-400 border-red-500/30" },
} as const;

export const TABLE_STATUSES = {
  FREE: { label: "Available", color: "border-emerald-500/50 bg-emerald-500/10" },
  OCCUPIED: { label: "Occupied", color: "border-orange-500/50 bg-orange-500/10" },
  RESERVED: { label: "Reserved", color: "border-blue-500/50 bg-blue-500/10" },
} as const;
