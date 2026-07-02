import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Package,
  ReceiptText,
  Star,
  Settings2,
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
  TrendingUp,
} from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import { fmtPrice } from "@/contexts/CartContext";
import { StatusBadge, ORDER_STATUS_LABELS } from "@/pages/shop/ShopOrdersPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RatingStars } from "@/components/shop/ProductCard";

const EMPTY_PRODUCT = {
  name: "",
  description: "",
  price: "",
  images: [],
  category: "Figurine 3D",
  stock_enabled: false,
  stock: 0,
  active: true,
  badge: "",
};

function ProductDialog({ open, onClose, product, onSaved }) {
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm(product ? { ...product, badge: product.badge || "", price: String(product.price) } : EMPTY_PRODUCT);
    }
  }, [open, product]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const uploadImage = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/shop/admin/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      set("images", [...form.images, r.data.url]);
    } catch {
      toast.error("Nu am putut încărca imaginea.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const price = parseFloat(form.price);
    if (!form.name.trim() || !price || price <= 0) {
      toast.error("Completează numele și un preț valid.");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description,
      price,
      images: form.images,
      category: form.category.trim() || "Diverse",
      stock_enabled: form.stock_enabled,
      stock: parseInt(form.stock, 10) || 0,
      active: form.active,
      badge: form.badge.trim() || null,
    };
    try {
      if (product?.id) {
        await api.put(`/shop/admin/products/${product.id}`, payload);
        toast.success("Produs actualizat.");
      } else {
        await api.post("/shop/admin/products", payload);
        toast.success("Produs adăugat.");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Eroare la salvare.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="product-dialog">
        <DialogHeader>
          <DialogTitle>{product ? "Editează produsul" : "Produs nou"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nume produs</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} data-testid="product-name-input" className="mt-1.5" />
          </div>
          <div className="sm:col-span-2">
            <Label>Descriere</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} data-testid="product-description-input" className="mt-1.5 min-h-[90px]" />
          </div>
          <div>
            <Label>Preț (RON)</Label>
            <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} data-testid="product-price-input" className="mt-1.5" />
          </div>
          <div>
            <Label>Categorie</Label>
            <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Figurine 3D" data-testid="product-category-input" className="mt-1.5" />
          </div>
          <div>
            <Label>Badge (opțional, ex: Nou, Bestseller)</Label>
            <Input value={form.badge} onChange={(e) => set("badge", e.target.value)} data-testid="product-badge-input" className="mt-1.5" />
          </div>
          <div className="flex items-end gap-6 pb-1">
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} data-testid="product-active-switch" />
              <span className="text-sm">Activ</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.stock_enabled} onCheckedChange={(v) => set("stock_enabled", v)} data-testid="product-stock-switch" />
              <span className="text-sm">Stoc gestionat</span>
            </div>
          </div>
          {form.stock_enabled && (
            <div>
              <Label>Stoc disponibil (bucăți)</Label>
              <Input type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} data-testid="product-stock-input" className="mt-1.5" />
            </div>
          )}
          <div className="sm:col-span-2">
            <Label>Imagini produs</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {form.images.map((img, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
                  <img src={mediaUrl(img)} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => set("images", form.images.filter((_, j) => j !== i))}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white hover:bg-red-500"
                    aria-label="Șterge imaginea"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                data-testid="product-upload-image"
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span className="text-[10px]">{uploading ? "..." : "Încarcă"}</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Anulează</Button>
          <Button onClick={save} disabled={saving} data-testid="product-save-button">
            {saving ? "Se salvează..." : "Salvează"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    api.get("/shop/admin/products").then((r) => setProducts(r.data)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const remove = async (p) => {
    if (!window.confirm(`Ștergi produsul „${p.name}”? Recenziile lui vor fi șterse.`)) return;
    try {
      await api.delete(`/shop/admin/products/${p.id}`);
      toast.success("Produs șters.");
      load();
    } catch {
      toast.error("Eroare la ștergere.");
    }
  };

  const toggleActive = async (p) => {
    try {
      await api.put(`/shop/admin/products/${p.id}`, { active: !p.active });
      load();
    } catch {
      toast.error("Eroare la actualizare.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} data-testid="add-product-button">
          <Plus className="mr-2 h-4 w-4" /> Produs nou
        </Button>
      </div>
      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.id} data-testid={`admin-product-${p.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            {p.images?.[0] ? (
              <img src={mediaUrl(p.images[0])} alt="" className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                <Package className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.category} · {fmtPrice(p.price)}
                {p.stock_enabled ? ` · Stoc: ${p.stock}` : " · Stoc nelimitat"}
                {p.rating_count > 0 ? ` · ★ ${p.rating_avg} (${p.rating_count})` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} data-testid={`toggle-active-${p.id}`} />
              <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setDialogOpen(true); }} data-testid={`edit-product-${p.id}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-400" onClick={() => remove(p)} data-testid={`delete-product-${p.id}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {products.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Niciun produs. Adaugă primul produs!</p>}
      </div>
      <ProductDialog open={dialogOpen} onClose={() => setDialogOpen(false)} product={editing} onSaved={load} />
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    const params = filter !== "all" ? { status: filter } : {};
    api.get("/shop/admin/orders", { params }).then((r) => setOrders(r.data)).catch(() => {});
  }, [filter]);
  useEffect(load, [load]);

  const updateStatus = async (order, status) => {
    try {
      await api.put(`/shop/admin/orders/${order.id}/status`, { status });
      toast.success(`Comanda ${order.order_number} → ${ORDER_STATUS_LABELS[status]?.label || status}`);
      load();
    } catch {
      toast.error("Eroare la actualizarea statusului.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px]" data-testid="orders-filter-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate comenzile</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.id} data-testid={`admin-order-${o.order_number}`} className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                className="font-semibold text-sm hover:underline"
                data-testid={`expand-order-${o.order_number}`}
              >
                {o.order_number}
              </button>
              <StatusBadge status={o.status} />
              <span className="text-xs text-muted-foreground">{o.user_nickname} · {o.user_email}</span>
              <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ro-RO")}</span>
              <span className="ml-auto text-sm font-bold">{fmtPrice(o.total)}</span>
              <Select value={o.status} onValueChange={(v) => updateStatus(o, v)}>
                <SelectTrigger className="h-8 w-[160px] text-xs" data-testid={`order-status-select-${o.order_number}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ORDER_STATUS_LABELS)
                    .filter(([k]) => k !== "pending_payment")
                    .map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  {o.status === "pending_payment" && (
                    <SelectItem value="pending_payment" disabled>În așteptare plată</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {expanded === o.id && (
              <div className="mt-3 grid gap-4 border-t border-border pt-3 sm:grid-cols-2" data-testid={`order-details-${o.order_number}`}>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Produse</p>
                  {o.items.map((it, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 text-sm">
                      {it.image && <img src={mediaUrl(it.image)} alt="" className="h-8 w-8 rounded object-cover" />}
                      <span className="flex-1">{it.name}</span>
                      <span className="text-muted-foreground">x{it.qty}</span>
                      <span>{fmtPrice(it.price * it.qty)}</span>
                    </div>
                  ))}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Subtotal {fmtPrice(o.subtotal)} · Livrare {o.shipping_cost === 0 ? "gratuită" : fmtPrice(o.shipping_cost)}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Livrare</p>
                  <p className="font-medium">{o.shipping?.full_name} · {o.shipping?.phone}</p>
                  <p className="text-muted-foreground">{o.shipping?.address}</p>
                  <p className="text-muted-foreground">{o.shipping?.city}, {o.shipping?.county} {o.shipping?.postal_code}</p>
                  {o.shipping?.notes && <p className="mt-1 italic text-muted-foreground">Note: {o.shipping.notes}</p>}
                </div>
              </div>
            )}
          </div>
        ))}
        {orders.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nicio comandă găsită.</p>}
      </div>
    </div>
  );
}

function ReviewsTab() {
  const [reviews, setReviews] = useState([]);

  const load = useCallback(() => {
    api.get("/shop/admin/reviews").then((r) => setReviews(r.data)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const remove = async (r) => {
    if (!window.confirm("Ștergi această recenzie?")) return;
    try {
      await api.delete(`/shop/admin/reviews/${r.id}`);
      toast.success("Recenzie ștearsă.");
      load();
    } catch {
      toast.error("Eroare la ștergere.");
    }
  };

  return (
    <div className="space-y-2">
      {reviews.map((r) => (
        <div key={r.id} data-testid={`admin-review-${r.id}`} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{r.nickname}</span>
              <RatingStars value={r.rating} />
              <span className="text-xs text-muted-foreground">pe „{r.product_name}”</span>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ro-RO")}</span>
            </div>
            {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
          </div>
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-400" onClick={() => remove(r)} data-testid={`delete-review-${r.id}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {reviews.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nicio recenzie încă.</p>}
    </div>
  );
}

function SettingsTab() {
  const [form, setForm] = useState({
    shipping_cost: "",
    free_shipping_threshold: "",
    shop_enabled: true,
    shop_disabled_message: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/shop/admin/settings").then((r) =>
      setForm({
        shipping_cost: String(r.data.shipping_cost),
        free_shipping_threshold: String(r.data.free_shipping_threshold),
        shop_enabled: r.data.shop_enabled !== false,
        shop_disabled_message: r.data.shop_disabled_message || "",
      })
    ).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/shop/admin/settings", {
        shipping_cost: parseFloat(form.shipping_cost) || 0,
        free_shipping_threshold: parseFloat(form.free_shipping_threshold) || 0,
        shop_enabled: !!form.shop_enabled,
        shop_disabled_message: form.shop_disabled_message.trim(),
      });
      toast.success("Setările shop-ului au fost salvate.");
    } catch {
      toast.error("Eroare la salvare.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label className="text-sm font-semibold">Shop disponibil pentru utilizatori</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Dacă e dezactivat, utilizatorii care nu sunt admini vor vedea un mesaj în loc de shop și nu pot iniția plăți.
            </p>
          </div>
          <Switch
            checked={form.shop_enabled}
            onCheckedChange={(v) => setForm((f) => ({ ...f, shop_enabled: v }))}
            data-testid="settings-shop-enabled"
          />
        </div>
        {!form.shop_enabled && (
          <div className="mt-4">
            <Label>Mesaj afișat utilizatorilor</Label>
            <Textarea
              value={form.shop_disabled_message}
              onChange={(e) => setForm((f) => ({ ...f, shop_disabled_message: e.target.value }))}
              placeholder="Ex: Shop-ul este momentan indisponibil. Revenim în curând!"
              rows={3}
              maxLength={500}
              data-testid="settings-shop-disabled-message"
              className="mt-1.5"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {form.shop_disabled_message.length}/500 caractere
            </p>
          </div>
        )}
      </div>

      <div>
        <Label>Cost livrare (RON)</Label>
        <Input
          type="number" min="0" step="0.01"
          value={form.shipping_cost}
          onChange={(e) => setForm((f) => ({ ...f, shipping_cost: e.target.value }))}
          data-testid="settings-shipping-cost"
          className="mt-1.5"
        />
      </div>
      <div>
        <Label>Prag livrare gratuită (RON)</Label>
        <Input
          type="number" min="0" step="0.01"
          value={form.free_shipping_threshold}
          onChange={(e) => setForm((f) => ({ ...f, free_shipping_threshold: e.target.value }))}
          data-testid="settings-free-threshold"
          className="mt-1.5"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Comenzile cu subtotal peste acest prag au livrare gratuită.
        </p>
      </div>
      <Button onClick={save} disabled={saving} data-testid="settings-save-button">
        {saving ? "Se salvează..." : "Salvează setările"}
      </Button>
    </div>
  );
}

export default function AdminShop() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/shop/admin/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div data-testid="admin-shop-page" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shop Cartoonix</h1>
        <p className="text-sm text-muted-foreground">Gestionează produsele, comenzile, recenziile și setările de livrare.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Venituri", value: fmtPrice(stats.revenue), icon: TrendingUp },
            { label: "Comenzi plătite", value: stats.paid_orders, icon: ReceiptText },
            { label: "Produse", value: stats.products_count, icon: Package },
            { label: "Recenzii", value: stats.reviews_count, icon: Star },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4" data-testid={`stat-${s.label}`}>
              <div className="flex items-center gap-2 text-muted-foreground">
                <s.icon className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="mt-1 text-xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" data-testid="tab-products"><Package className="mr-1.5 h-4 w-4" /> Produse</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders"><ReceiptText className="mr-1.5 h-4 w-4" /> Comenzi</TabsTrigger>
          <TabsTrigger value="reviews" data-testid="tab-reviews"><Star className="mr-1.5 h-4 w-4" /> Recenzii</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings"><Settings2 className="mr-1.5 h-4 w-4" /> Setări</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4"><ProductsTab /></TabsContent>
        <TabsContent value="orders" className="mt-4"><OrdersTab /></TabsContent>
        <TabsContent value="reviews" className="mt-4"><ReviewsTab /></TabsContent>
        <TabsContent value="settings" className="mt-4"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
