import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Truck, Minus, Plus, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import PublicLayout from "@/components/PublicLayout";
import { api, mediaUrl } from "@/lib/api";
import { useCart, fmtPrice } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { ShopUnavailable } from "@/components/shop/ShopUnavailable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const FIELDS = [
  { key: "full_name", label: "Nume complet", placeholder: "Ion Popescu", required: true, min: 3 },
  { key: "phone", label: "Telefon", placeholder: "07xx xxx xxx", required: true, min: 6 },
  { key: "address", label: "Adresă (stradă, număr, bloc)", placeholder: "Str. Exemplu nr. 10", required: true, full: true, min: 5 },
  { key: "city", label: "Oraș", placeholder: "București", required: true, min: 2 },
  { key: "county", label: "Județ", placeholder: "Ilfov", required: true, min: 2 },
  { key: "postal_code", label: "Cod poștal (opțional)", placeholder: "012345", required: false },
];

export default function ShopCheckoutPage() {
  const { items, setQty, removeItem, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    county: "",
    postal_code: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/shop/config").then((r) => setConfig(r.data)).catch(() => {});
  }, []);

  const shippingCost = useMemo(() => {
    if (!config || items.length === 0) return 0;
    return subtotal >= config.free_shipping_threshold ? 0 : config.shipping_cost;
  }, [config, subtotal, items.length]);

  const total = Math.round((subtotal + shippingCost) * 100) / 100;
  const remainingForFree = config ? Math.max(0, config.free_shipping_threshold - subtotal) : 0;

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const isAdmin = user?.role === "admin";
  const shopDisabled = config && config.shop_enabled === false;

  if (shopDisabled && !isAdmin) {
    return <ShopUnavailable message={config.shop_disabled_message} />;
  }

  const submit = async () => {
    for (const f of FIELDS) {
      const val = form[f.key].trim();
      if (f.required && !val) {
        toast.error(`Completează câmpul „${f.label}”.`);
        return;
      }
      if (f.min && val.length < f.min) {
        toast.error(`Câmpul „${f.label}” este prea scurt.`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const r = await api.post("/shop/checkout", {
        items: items.map((i) => ({ product_id: i.product_id, qty: i.qty })),
        shipping: form,
        origin_url: window.location.origin,
      });
      window.location.href = r.data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Nu am putut iniția plata. Încearcă din nou.");
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center" data-testid="checkout-empty">
          <p className="text-white/60">Coșul tău este gol.</p>
          <Button
            onClick={() => navigate("/shop")}
            className="mt-5 rounded-full bg-amber-400 text-black font-bold hover:bg-amber-300"
            data-testid="checkout-back-to-shop"
          >
            Mergi la shop
          </Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div data-testid="shop-checkout-page" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-24">
        <Link
          to="/shop"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Continuă cumpărăturile
        </Link>
        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Finalizare <span className="text-amber-400">comandă</span>
        </h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Shipping form */}
          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Truck className="h-4 w-4 text-amber-400" /> Date de livrare
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                  <Label className="text-[13px] text-white/60">{f.label}</Label>
                  <Input
                    value={form[f.key]}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    data-testid={`checkout-${f.key}`}
                    className="mt-1.5 border-white/10 bg-white/[0.04] text-white placeholder:text-white/25"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <Label className="text-[13px] text-white/60">Note comandă (opțional — ex: mărime tricou)</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Detalii suplimentare pentru comandă..."
                  data-testid="checkout-notes"
                  className="mt-1.5 min-h-[70px] border-white/10 bg-white/[0.04] text-white placeholder:text-white/25"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="h-fit rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Sumar comandă</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.product_id} className="flex items-center gap-3" data-testid={`checkout-item-${item.product_id}`}>
                  {item.image && (
                    <img src={mediaUrl(item.image)} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-white">{item.name}</p>
                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-1.5 py-0.5">
                      <button type="button" onClick={() => setQty(item.product_id, item.qty - 1)} className="text-white/50 hover:text-white" aria-label="Scade">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-4 text-center text-xs font-semibold text-white">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(item.product_id, item.stock_enabled ? Math.min(item.qty + 1, item.stock) : item.qty + 1)}
                        className="text-white/50 hover:text-white"
                        aria-label="Crește"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[13px] font-bold text-white">{fmtPrice(item.price * item.qty)}</span>
                    <button type="button" onClick={() => removeItem(item.product_id)} className="text-white/30 hover:text-red-400" aria-label="Șterge">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/[0.08] pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-white/60">
                <span>Subtotal</span>
                <span className="text-white">{fmtPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Livrare</span>
                <span className={shippingCost === 0 ? "font-semibold text-emerald-400" : "text-white"} data-testid="checkout-shipping-cost">
                  {shippingCost === 0 ? "Gratuită" : fmtPrice(shippingCost)}
                </span>
              </div>
              {remainingForFree > 0 && (
                <p className="text-[12px] text-amber-300/80">
                  Mai adaugă {fmtPrice(remainingForFree)} pentru livrare gratuită!
                </p>
              )}
              <div className="flex justify-between border-t border-white/[0.08] pt-3 text-base font-bold text-white">
                <span>Total</span>
                <span className="text-amber-400" data-testid="checkout-total">{fmtPrice(total)}</span>
              </div>
            </div>

            <Button
              onClick={submit}
              disabled={submitting}
              data-testid="checkout-pay-button"
              className="h-12 w-full rounded-full bg-amber-400 text-black font-bold hover:bg-amber-300 transition-transform hover:scale-[1.01]"
            >
              <Lock className="mr-2 h-4 w-4" />
              {submitting ? "Se redirecționează..." : `Plătește ${fmtPrice(total)}`}
            </Button>
            <p className="text-center text-[11px] text-white/35">
              Plată securizată prin Stripe. Card bancar acceptat.
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
