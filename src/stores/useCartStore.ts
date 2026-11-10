import { create } from "zustand";

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  originalItems: CartItem[];
  existingOrderId: string | null;
  paymentMethod: "CASH" | "CARD" | null;
  discount: number;
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number;
  hasTax: boolean;
  taxRate: number; // Percentage, e.g. 16 for 16%

  // Actions
  addItem: (item: Omit<CartItem, "id" | "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateNotes: (id: string, notes: string) => void;
  setExistingOrderId: (orderId: string | null) => void;
  setOriginalItems: (items: CartItem[]) => void;
  setPaymentMethod: (method: "CASH" | "CARD" | null) => void;
  setDiscount: (value: number, type?: "FLAT" | "PERCENTAGE") => void;
  setTaxConfig: (hasTax: boolean, taxRate: number) => void;
  clearCart: () => void;
  resetOrder: () => void;

  // Computed
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTax: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  getNewlyAddedItems: () => CartItem[];
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  originalItems: [],
  existingOrderId: null,
  paymentMethod: null,
  discount: 0,
  discountType: "FLAT",
  discountValue: 0,
  hasTax: false,
  taxRate: 0,

  addItem: (item) => {
    const { items } = get();
    const existing = items.find(
      (i) => i.menuItemId === item.menuItemId && (i.size || "") === (item.size || "")
    );
    if (existing) {
      set({
        items: items.map((i) =>
          i.id === existing.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      });
    } else {
      set({
        items: [
          ...items,
          { ...item, id: crypto.randomUUID(), quantity: 1 },
        ],
      });
    }
  },

  removeItem: (id) => {
    set({ items: get().items.filter((i) => i.id !== id) });
  },

  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id);
      return;
    }
    set({
      items: get().items.map((i) => (i.id === id ? { ...i, quantity } : i)),
    });
  },

  updateNotes: (id, notes) => {
    set({
      items: get().items.map((i) => (i.id === id ? { ...i, notes } : i)),
    });
  },

  setExistingOrderId: (orderId) => set({ existingOrderId: orderId }),

  setOriginalItems: (items) => set({ originalItems: items.map((i) => ({ ...i })) }),

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  setTaxConfig: (hasTax, taxRate) => set({ hasTax, taxRate }),

  setDiscount: (value, type) => {
    const dType = type || get().discountType || "FLAT";
    const safeVal = Math.max(0, isNaN(value) ? 0 : value);
    const subtotal = get().getSubtotal();
    const calculatedDiscount = dType === "PERCENTAGE"
      ? Math.min(subtotal, Math.round(((subtotal * safeVal) / 100) * 100) / 100)
      : Math.min(subtotal, safeVal);

    set({
      discountValue: safeVal,
      discountType: dType,
      discount: calculatedDiscount
    });
  },

  clearCart: () =>
    set({
      items: [],
      originalItems: [],
      discount: 0,
      discountValue: 0,
    }),

  resetOrder: () =>
    set({
      items: [],
      originalItems: [],
      existingOrderId: null,
      paymentMethod: null,
      discount: 0,
      discountValue: 0,
      discountType: "FLAT",
    }),

  getNewlyAddedItems: () => {
    const { items, originalItems, existingOrderId } = get();
    if (!existingOrderId || originalItems.length === 0) {
      return items;
    }

    const newlyAdded: CartItem[] = [];
    for (const item of items) {
      const orig = originalItems.find(
        (o) => o.menuItemId === item.menuItemId && (o.size || "") === (item.size || "")
      );
      const origQty = orig ? orig.quantity : 0;
      const diffQty = item.quantity - origQty;
      if (diffQty > 0) {
        newlyAdded.push({
          ...item,
          quantity: diffQty,
        });
      }
    }
    return newlyAdded;
  },

  getSubtotal: () => get().items.reduce((t, i) => t + i.price * i.quantity, 0),

  getDiscountAmount: () => {
    const subtotal = get().getSubtotal();
    const { discountType, discountValue } = get();
    if (!discountValue || discountValue <= 0 || subtotal <= 0) return 0;
    if (discountType === "PERCENTAGE") {
      const calculated = (subtotal * discountValue) / 100;
      return Math.min(subtotal, Math.round(calculated * 100) / 100);
    }
    return Math.min(subtotal, discountValue);
  },

  getTax: () => {
    const { hasTax, taxRate } = get();
    if (!hasTax || !taxRate || taxRate <= 0) return 0;
    const subtotal = get().getSubtotal();
    const discount = get().getDiscountAmount();
    const taxableAmount = Math.max(0, subtotal - discount);
    return Math.round(taxableAmount * (taxRate / 100) * 100) / 100;
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().getDiscountAmount();
    const tax = get().getTax();
    return Math.round(Math.max(0, subtotal - discount + tax) * 100) / 100;
  },

  getItemCount: () => get().items.reduce((t, i) => t + i.quantity, 0),
}));
