import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, PackageOpen, Truck } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { api, mediaUrl } from "@/lib/api";
import { fmtPrice } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";

export const ORDER_STATUS_LABELS = {
  pending_payment: { label: "În așteptare plată", cls: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300" },
  paid: { label: "Plătită", cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  processing: { label: "În procesare", cls: "border-sky-400/30 bg-sky-400/10 text-sky-300" },
  shipped: { label: "Expediată", cls: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  delivered: { label: "Livrată", cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  cancelled: { label: "Anulată", cls: "border-red-400/30 bg-red-400/10 text-red-300" },
};

export function StatusBadge({ status }) {
  const s = ORDER_STATUS_LABELS[status] || { label: status, cls: "border-white/15 text-white/60" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function ShopOrdersPage() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    api.get("/shop/orders/my").then((r) => setOrders(r.data)).catch(() => setOrders([]));
  }, []);

  return (
    <PublicLayout>
      <div data-testid="shop-orders-page" className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-24">
        <Link
          to="/shop"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Înapoi la shop
        </Link>
        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Comenzile <span className="text-amber-400">mele</span>
        </h1>

        <div className="mt-8 space-y-4">
          {orders === null ? (
            [1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/[0.04]" />)
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.06] py-20 text-center">
              <PackageOpen className="h-12 w-12 text-white/15" />
              <p className="text-white/50">Nu ai plasat încă nicio comandă.</p>
              <Link to="/shop">
                <Button className="mt-2 rounded-full bg-amber-400 text-black font-bold hover:bg-amber-300">
                  Descoperă produsele
                </Button>
              </Link>
            </div>
          ) : (
            orders.map((o) => (
              <div
                key={o.id}
                data-testid={`order-${o.order_number}`}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold text-white">{o.order_number}</span>
                  <StatusBadge status={o.status} />
                  <span className="text-[12px] text-white/35">
                    {new Date(o.created_at).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <span className="ml-auto text-base font-bold text-amber-400">{fmtPrice(o.total)}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {o.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      {item.image && (
                        <img src={mediaUrl(item.image)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      )}
                      <span className="flex-1 text-white/70">{item.name}</span>
                      <span className="text-white/40">x{item.qty}</span>
                      <span className="font-medium text-white">{fmtPrice(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-3 text-[12px] text-white/40">
                  <Truck className="h-3.5 w-3.5" />
                  {o.shipping?.address}, {o.shipping?.city}, {o.shipping?.county}
                  <span className="ml-auto">
                    Livrare: {o.shipping_cost === 0 ? "gratuită" : fmtPrice(o.shipping_cost)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
