"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit3,
  LayoutGrid, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle,
  Image as ImageIcon,
  Upload,
  X,
  Link as LinkIcon,
  Camera,
  UtensilsCrossed
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

type SizeEntry = {
  name: string;
  price: string;
};

const createEmptySizeEntry = (): SizeEntry => ({ name: "", price: "" });

function parseSizeEntries(rawSizes: unknown): SizeEntry[] {
  if (!rawSizes) return [];
  try {
    const parsed = typeof rawSizes === "string" ? JSON.parse(rawSizes) : rawSizes;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    return Object.entries(parsed as Record<string, unknown>).map(([name, price]) => ({
      name,
      price: price !== undefined && price !== null ? String(price) : "",
    }));
  } catch {
    return [];
  }
}

function buildSizesPayload(
  entries: SizeEntry[]
): { payload: Record<string, number>; minPrice: number } | { error: string } {
  if (entries.length === 0) {
    return { error: "Please add at least one size option." };
  }

  const payload: Record<string, number> = {};
  const seenLower = new Set<string>();

  for (const entry of entries) {
    const trimmedName = entry.name.trim();
    if (!trimmedName) {
      return { error: "Each size must have a name (e.g. Half, Full, 500g, 1kg)." };
    }
    const lower = trimmedName.toLowerCase();
    if (seenLower.has(lower)) {
      return { error: `Duplicate size name "${trimmedName}". Each size name must be unique.` };
    }
    seenLower.add(lower);

    const parsedPrice = parseFloat(entry.price);
    if (entry.price.trim() === "" || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return { error: `Please enter a valid price for size "${trimmedName}".` };
    }
    payload[trimmedName] = parsedPrice;
  }

  const minPrice = Math.min(...Object.values(payload));
  return { payload, minPrice };
}

function SizeOptionsEditor({
  enabled,
  onToggle,
  entries,
  onChange,
  singlePrice,
  onSinglePriceChange,
}: {
  enabled: boolean;
  onToggle: (checked: boolean) => void;
  entries: SizeEntry[];
  onChange: (next: SizeEntry[]) => void;
  singlePrice: string;
  onSinglePriceChange: (value: string) => void;
}) {
  const handleEntryChange = (index: number, field: keyof SizeEntry, value: string) => {
    const updated = entries.map((entry, idx) =>
      idx === index ? { ...entry, [field]: value } : entry
    );
    onChange(updated);
  };

  const handleAddRow = () => {
    onChange([...entries, createEmptySizeEntry()]);
  };

  const handleRemoveRow = (index: number) => {
    if (entries.length <= 1) return;
    onChange(entries.filter((_, idx) => idx !== index));
  };

  return (
    <div className="p-4 bg-surface-2 rounded-xl border border-border space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <label className="font-bold text-sm text-foreground flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                const checked = e.target.checked;
                onToggle(checked);
                if (checked && entries.length === 0) {
                  onChange([createEmptySizeEntry()]);
                }
              }}
              className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
            />
            Multiple Sizes / Variants
          </label>
          <p className="text-xs text-muted mt-0.5">
            Add custom sizes or pack options (e.g. Half, Full, 500g, 1kg, Large) with individual prices.
          </p>
        </div>
        {enabled && (
          <span className="text-xs font-bold text-primary px-2.5 py-1 bg-primary/10 rounded-full border border-primary/20">
            {entries.length} {entries.length === 1 ? "Size" : "Sizes"} Active
          </span>
        )}
      </div>

      {enabled ? (
        <div className="space-y-2.5 pt-3 border-t border-border">
          {entries.map((entry, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-foreground mb-1">
                  Size / Variant Name
                </label>
                <input
                  type="text"
                  required={enabled}
                  value={entry.name}
                  onChange={(e) => handleEntryChange(index, "name", e.target.value)}
                  className="input bg-surface border-border w-full text-sm font-semibold"
                  placeholder="e.g. Half, 500g, Regular, Large"
                />
              </div>
              <div className="w-full sm:w-40">
                <label className="block text-xs font-bold text-foreground mb-1">
                  Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required={enabled}
                  value={entry.price}
                  onChange={(e) => handleEntryChange(index, "price", e.target.value)}
                  className="input bg-surface border-border w-full text-sm font-semibold"
                  placeholder="e.g. 550"
                />
              </div>
              <button
                type="button"
                disabled={entries.length <= 1}
                onClick={() => handleRemoveRow(index)}
                className="p-2.5 rounded-lg border border-border bg-surface text-muted hover:text-danger hover:bg-danger-muted/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center"
                title={entries.length <= 1 ? "At least one size is required" : "Remove size"}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddRow}
            className="btn btn-secondary text-xs font-bold px-3.5 py-2 border border-dashed border-primary/40 text-primary hover:bg-primary/5 cursor-pointer"
          >
            <Plus size={14} /> Add Another Size
          </button>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-bold text-foreground mb-1">Single Price</label>
          <div className="relative max-w-xs">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              type="number"
              step="0.01"
              min="0"
              required={!enabled}
              value={singlePrice}
              onChange={(e) => onSinglePriceChange(e.target.value)}
              className="input pl-10 bg-surface border-border w-full font-semibold"
              placeholder="e.g. 450"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Form States
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  
  const [catName, setCatName] = useState("");

  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemImage, setItemImage] = useState("");
  const [imageInputMode, setImageInputMode] = useState<"UPLOAD" | "URL">("UPLOAD");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [processingImage, setProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasSizes, setHasSizes] = useState(false);
  const [sizeEntries, setSizeEntries] = useState<SizeEntry[]>([createEmptySizeEntry()]);
  const [submitting, setSubmitting] = useState(false);

  // Edit Item States
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editImageInputMode, setEditImageInputMode] = useState<"UPLOAD" | "URL">("UPLOAD");
  const [editImageUrlInput, setEditImageUrlInput] = useState("");
  const [editProcessingImage, setEditProcessingImage] = useState(false);
  const [editHasSizes, setEditHasSizes] = useState(false);
  const [editSizeEntries, setEditSizeEntries] = useState<SizeEntry[]>([createEmptySizeEntry()]);
  const [editIsAvailable, setEditIsAvailable] = useState(true);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = (
    file: File,
    onSuccess: (dataUrl: string) => void,
    onStart: () => void,
    onEnd: () => void
  ) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, WebP)");
      return;
    }

    onStart();
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 600;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/webp", 0.82);
          onSuccess(dataUrl);
        } else {
          onSuccess(event.target?.result as string);
        }
        onEnd();
      };
      img.onerror = () => {
        onEnd();
        alert("Failed to read image file.");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file, setItemImage, () => setProcessingImage(true), () => setProcessingImage(false));
  };

  const handleEditImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file, setEditImage, () => setEditProcessingImage(true), () => setEditProcessingImage(false));
  };

  const handleStartEditItem = (item: any, categoryId: string) => {
    setEditingItem(item);
    setEditName(item.name || "");
    setEditDesc(item.description || "");
    setEditCategory(item.categoryId || categoryId);
    setEditImage(item.image || "");
    setEditImageUrlInput("");
    setEditImageInputMode("UPLOAD");
    setEditIsAvailable(item.isAvailable ?? true);

    const parsedEntries = parseSizeEntries(item.sizes);
    if (parsedEntries.length > 0) {
      setEditHasSizes(true);
      setEditSizeEntries(parsedEntries);
      setEditPrice(String(item.price || ""));
      return;
    }

    setEditHasSizes(false);
    setEditSizeEntries([createEmptySizeEntry()]);
    setEditPrice(String(item.price || ""));
  };

  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    let sizesPayload: Record<string, number> | null = null;
    let finalPrice = editPrice;

    if (editHasSizes) {
      const built = buildSizesPayload(editSizeEntries);
      if ("error" in built) {
        alert(built.error);
        return;
      }
      sizesPayload = built.payload;
      finalPrice = String(built.minPrice);
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_ITEM",
          id: editingItem.id,
          name: editName,
          description: editDesc,
          price: finalPrice,
          sizes: editHasSizes ? sizesPayload : null,
          categoryId: editCategory,
          image: editImage || null,
          isAvailable: editIsAvailable
        })
      });

      if (res.ok) {
        setEditingItem(null);
        fetchMenu();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update item");
      }
    } catch (error) {
      alert("Error updating item");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (editingItem) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [editingItem]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editingItem) {
        setEditingItem(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingItem]);

  const fetchMenu = async () => {
    try {
      const res = await fetch("/api/admin/menu");
      if (res.ok) {
        const json = await res.json();
        setCategories(json.data);
        if (json.data.length > 0 && !itemCategory) {
          setItemCategory(json.data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch menu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_CATEGORY", name: catName })
      });
      if (res.ok) {
        setCatName("");
        setIsAddingCategory(false);
        fetchMenu();
      }
    } catch (error) {
      alert("Error adding category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();

    let sizesPayload: Record<string, number> | null = null;
    let finalPrice = itemPrice;

    if (hasSizes) {
      const built = buildSizesPayload(sizeEntries);
      if ("error" in built) {
        alert(built.error);
        return;
      }
      sizesPayload = built.payload;
      finalPrice = String(built.minPrice);
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "ADD_ITEM", 
          name: itemName, 
          description: itemDesc, 
          price: finalPrice, 
          sizes: sizesPayload,
          categoryId: itemCategory,
          image: itemImage || null
        })
      });
      if (res.ok) {
        setItemName("");
        setItemDesc("");
        setItemPrice("");
        setItemImage("");
        setImageUrlInput("");
        setHasSizes(false);
        setSizeEntries([createEmptySizeEntry()]);
        setIsAddingItem(false);
        fetchMenu();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to add item");
      }
    } catch (error) {
      alert("Error adding item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE_ITEM", id })
      });
      if (res.ok) {
        fetchMenu();
      }
    } catch (e) {
      alert("Failed to delete item");
    }
  };

  const handleToggleAvailability = async (id: string, current: boolean) => {
    try {
      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TOGGLE_AVAILABILITY", id, isAvailable: !current })
      });
      if (res.ok) {
        fetchMenu();
      }
    } catch (e) {
      alert("Failed to update status");
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
            <Package className="text-primary" /> Menu & Inventory
          </h1>
          <p className="text-muted">Manage your categories, items, and custom size or pack options.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsAddingCategory(!isAddingCategory)} className="btn btn-secondary border border-border">
            {isAddingCategory ? "Cancel" : <><LayoutGrid size={18} className="mr-2" /> Add Category</>}
          </button>
          <button onClick={() => setIsAddingItem(!isAddingItem)} className="btn btn-primary">
            {isAddingItem ? "Cancel" : <><Plus size={18} className="mr-2" /> Add Item</>}
          </button>
        </div>
      </div>

      {isAddingCategory && (
        <div className="glass-card p-6 animate-fade-in border border-secondary/20">
          <h2 className="text-xl font-bold mb-4">Add New Category</h2>
          <form onSubmit={handleAddCategory} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-1">Category Name</label>
              <input type="text" required value={catName} onChange={e => setCatName(e.target.value)} className="input bg-surface border-border w-full" placeholder="e.g. Pizzas" />
            </div>
            <button disabled={submitting} type="submit" className="btn btn-secondary h-12 px-8">Save Category</button>
          </form>
        </div>
      )}

      {isAddingItem && (
        <div className="glass-card p-6 animate-fade-in border border-primary/20 bg-surface">
          <h2 className="text-xl font-bold mb-4">Add Menu Item</h2>
          <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Item Name</label>
              <input type="text" required value={itemName} onChange={e => setItemName(e.target.value)} className="input bg-surface-2 border-border w-full" placeholder="e.g. Chicken Fajita Pizza" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Category</label>
              <select value={itemCategory} onChange={e => setItemCategory(e.target.value)} className="input bg-surface-2 border-border w-full">
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Size Options Toggle & Price Configuration */}
            <div className="md:col-span-2">
              <SizeOptionsEditor
                enabled={hasSizes}
                onToggle={setHasSizes}
                entries={sizeEntries}
                onChange={setSizeEntries}
                singlePrice={itemPrice}
                onSinglePriceChange={setItemPrice}
              />
            </div>

            {/* Dish Picture Section */}
            <div className="md:col-span-2 p-4 bg-surface-2 rounded-xl border border-border space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <label className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Camera size={16} className="text-primary" /> Dish Picture (Optional)
                  </label>
                  <p className="text-xs text-muted mt-0.5">Add an appetizing photo of the dish to display on POS terminals.</p>
                </div>
                <div className="flex gap-1 bg-surface p-1 rounded-lg border border-border text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setImageInputMode("UPLOAD")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                      imageInputMode === "UPLOAD" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"
                    )}
                  >
                    <Upload size={13} /> Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMode("URL")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                      imageInputMode === "URL" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"
                    )}
                  >
                    <LinkIcon size={13} /> Image URL
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center pt-2">
                {/* Image Preview Box */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl border-2 border-dashed border-border bg-surface flex items-center justify-center overflow-hidden relative flex-shrink-0 group shadow-sm">
                  {itemImage ? (
                    <>
                      <img src={itemImage} alt="Dish Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setItemImage(""); setImageUrlInput(""); }}
                        className="absolute top-1.5 right-1.5 bg-danger text-white p-1 rounded-full shadow-md hover:bg-danger/80 transition-transform active:scale-90"
                        title="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted p-2 text-center">
                      <ImageIcon size={24} className="mb-1 opacity-40" />
                      <span className="text-[10px] leading-tight font-medium">No picture</span>
                    </div>
                  )}
                </div>

                {/* Input area based on mode */}
                <div className="flex-1 w-full">
                  {imageInputMode === "UPLOAD" ? (
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageFileUpload}
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={processingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 px-4 border border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        {processingImage ? (
                          <span className="flex items-center gap-2">
                            <span className="animate-spin w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full" />
                            Optimizing photo...
                          </span>
                        ) : (
                          <>
                            <Upload size={16} /> Choose Photo from Device (PNG, JPG, WebP)
                          </>
                        )}
                      </button>
                      <p className="text-[11px] text-muted mt-1.5">Photos are automatically optimized for instant loading on the POS terminal.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          placeholder="Paste image link e.g. https://images.unsplash.com/..."
                          className="input bg-surface border-border flex-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (imageUrlInput.trim()) {
                              setItemImage(imageUrlInput.trim());
                            }
                          }}
                          className="btn btn-secondary px-4 text-xs font-bold"
                        >
                          Apply
                        </button>
                      </div>
                      <p className="text-[11px] text-muted">Paste any direct public web link to a picture.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">Description</label>
              <textarea value={itemDesc} onChange={e => setItemDesc(e.target.value)} className="input bg-surface-2 border-border w-full py-2 min-h-[70px]" placeholder="Ingredients, crust details, toppings..."></textarea>
            </div>
            
            <div className="md:col-span-2 mt-2">
              <button disabled={submitting || categories.length === 0} type="submit" className="btn btn-primary w-full md:w-auto px-8">
                {submitting ? "Saving..." : "Save Item"}
              </button>
              {categories.length === 0 && <p className="text-danger text-xs mt-2 font-semibold">Please create a category first.</p>}
            </div>
          </form>
        </div>
      )}

      {/* Menu Categories List */}
      <div className="flex flex-col gap-8">
        {categories.map((category) => (
          <div key={category.id} className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border bg-surface-2 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                {category.name}
              </h3>
              <span className="badge border-border text-muted">{category.items.length} Items</span>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border text-xs uppercase tracking-wider text-muted font-bold">
                  <th className="p-4">Item Name</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Price / Sizes</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {category.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-surface-2/50 transition-colors group">
                    <td className="p-4 font-bold text-foreground">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover border border-border flex-shrink-0 shadow-sm"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center text-muted border border-border flex-shrink-0">
                            <UtensilsCrossed size={18} className="opacity-60" />
                          </div>
                        )}
                        <div>
                          <span className="font-bold text-foreground block">{item.name}</span>
                          {item.image && (
                            <span className="text-[10px] text-primary font-medium flex items-center gap-1 mt-0.5">
                              <ImageIcon size={10} /> Photo
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-muted max-w-[280px] truncate">{item.description || "—"}</td>
                    <td className="p-4">
                      {item.sizes ? (() => {
                        try {
                          const parsed = typeof item.sizes === "string" ? JSON.parse(item.sizes) : item.sizes;
                          return (
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(parsed).map(([sz, pr]: any) => (
                                <span key={sz} className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold border border-primary/20 whitespace-nowrap">
                                  {sz}: {formatCurrency(pr)}
                                </span>
                              ))}
                            </div>
                          );
                        } catch(e) {
                          return <span className="font-bold text-primary">{formatCurrency(item.price)}</span>;
                        }
                      })() : (
                        <span className="font-bold text-primary">{formatCurrency(item.price)}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase transition-all",
                          item.isAvailable 
                            ? "bg-success-muted text-success hover:bg-success-muted/80" 
                            : "bg-danger-muted text-danger hover:bg-danger-muted/80"
                        )}
                      >
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => handleStartEditItem(item, category.id)}
                          className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 bg-surface rounded-lg border border-border shadow-sm transition-colors cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="p-1.5 text-muted hover:text-danger hover:bg-danger-muted bg-surface rounded-lg border border-border shadow-sm transition-colors cursor-pointer"
                          title="Delete Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {category.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted italic text-sm">No items in this category yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
            <Package size={48} className="mx-auto text-muted mb-4 opacity-50" />
            <h3 className="text-xl font-bold mb-2">No Menu Found</h3>
            <p className="text-muted">Start by adding a Category, then add Items to it.</p>
          </div>
        )}
      </div>

      {/* Edit Menu Item Modal Card (Pinned and Centered on Screen via Portal) */}
      {mounted && editingItem && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingItem(null);
            }
          }}
        >
          <div 
            className="relative w-full max-w-2xl bg-surface rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-surface-2 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Edit3 size={18} />
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">Edit Menu Item</h2>
                  <p className="text-xs text-muted">Update details, sizes, pricing, and picture for &ldquo;{editingItem.name}&rdquo;</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-3 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEditItem} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Item Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="input bg-surface-2 border-border w-full text-sm font-semibold"
                      placeholder="e.g. Chicken Fajita Pizza"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1">Category</label>
                    <select
                      value={editCategory}
                      onChange={e => setEditCategory(e.target.value)}
                      className="input bg-surface-2 border-border w-full text-sm font-semibold"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Availability Toggle */}
                <div className="p-3 bg-surface-2 rounded-xl border border-border flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Availability Status</span>
                    <span className="text-[11px] text-muted">Controls whether cashiers can select this item on POS terminals.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditIsAvailable(!editIsAvailable)}
                    className={cn(
                      "text-xs px-3 py-1 rounded-full font-bold uppercase transition-all cursor-pointer",
                      editIsAvailable
                        ? "bg-success-muted text-success hover:bg-success-muted/80"
                        : "bg-danger-muted text-danger hover:bg-danger-muted/80"
                    )}
                  >
                    {editIsAvailable ? "Available" : "Unavailable"}
                  </button>
                </div>

                {/* Size Options Toggle & Price Configuration */}
                <SizeOptionsEditor
                  enabled={editHasSizes}
                  onToggle={setEditHasSizes}
                  entries={editSizeEntries}
                  onChange={setEditSizeEntries}
                  singlePrice={editPrice}
                  onSinglePriceChange={setEditPrice}
                />

                {/* Dish Picture Section */}
                <div className="p-4 bg-surface-2 rounded-xl border border-border space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <label className="font-bold text-sm text-foreground flex items-center gap-2">
                        <Camera size={16} className="text-primary" /> Dish Picture
                      </label>
                      <p className="text-xs text-muted mt-0.5">Upload a new photo or update the web image link.</p>
                    </div>
                    <div className="flex gap-1 bg-surface p-1 rounded-lg border border-border text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setEditImageInputMode("UPLOAD")}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                          editImageInputMode === "UPLOAD" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"
                        )}
                      >
                        <Upload size={13} /> Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditImageInputMode("URL")}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                          editImageInputMode === "URL" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-foreground"
                        )}
                      >
                        <LinkIcon size={13} /> Image URL
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-center pt-2">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl border-2 border-dashed border-border bg-surface flex items-center justify-center overflow-hidden relative flex-shrink-0 group shadow-sm">
                      {editImage ? (
                        <>
                          <img src={editImage} alt="Dish Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => { setEditImage(""); setEditImageUrlInput(""); }}
                            className="absolute top-1.5 right-1.5 bg-danger text-white p-1 rounded-full shadow-md hover:bg-danger/80 transition-transform active:scale-90 cursor-pointer"
                            title="Remove image"
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted p-2 text-center">
                          <ImageIcon size={24} className="mb-1 opacity-40" />
                          <span className="text-[10px] leading-tight font-medium">No picture</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 w-full">
                      {editImageInputMode === "UPLOAD" ? (
                        <div>
                          <input
                            type="file"
                            ref={editFileInputRef}
                            onChange={handleEditImageFileUpload}
                            accept="image/png, image/jpeg, image/webp"
                            className="hidden"
                          />
                          <button
                            type="button"
                            disabled={editProcessingImage}
                            onClick={() => editFileInputRef.current?.click()}
                            className="w-full py-3 px-4 border border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            {editProcessingImage ? (
                              <span className="flex items-center gap-2">
                                <span className="animate-spin w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full" />
                                Optimizing photo...
                              </span>
                            ) : (
                              <>
                                <Upload size={16} /> Choose Photo from Device
                              </>
                            )}
                          </button>
                          <p className="text-[11px] text-muted mt-1.5">Replacing with a new file will automatically resize and optimize it.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={editImageUrlInput}
                              onChange={(e) => setEditImageUrlInput(e.target.value)}
                              placeholder="Paste image link e.g. https://images.unsplash.com/..."
                              className="input bg-surface border-border flex-1 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (editImageUrlInput.trim()) {
                                  setEditImage(editImageUrlInput.trim());
                                }
                              }}
                              className="btn btn-secondary px-4 text-xs font-bold cursor-pointer"
                            >
                              Apply
                            </button>
                          </div>
                          <p className="text-[11px] text-muted">Paste any direct public web link to a picture.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">Description</label>
                  <textarea
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    className="input bg-surface-2 border-border w-full py-2 min-h-[70px] text-sm"
                    placeholder="Ingredients, crust details, toppings..."
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-border bg-surface-2 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="btn btn-secondary text-xs font-semibold px-4 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary text-xs font-bold px-6 py-2 shadow-md cursor-pointer"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
