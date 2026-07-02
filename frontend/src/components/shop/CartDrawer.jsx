import React from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Trash2, Minus, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { mediaUrl } from "@/lib/api";
import { useCart, fmtPrice } from "@/contexts/CartContext";

export function CartDrawer() {
  const { items, setQty, removeItem, subtotal, count, drawerOpen, setDrawerOpen } = useCart();
  const navigate = useNavigate();

  return (
    <>
      {/* Floating cart button */}
      <button
        type="button"
        data-testid="cart-open-button"
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-400 text-black shadow-lg shadow-amber-400/25 transition-all hover:bg-amber-300 hover:scale-105"
        aria-label="Deschide coșul"
      >
        <ShoppingBag className="h-6 w-6" />
        {count > 0 && (
          <span
            data-testid="cart-count-badge"
            className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#0b0c10] px-1.5 text-xs font-bold text-amber-400 ring-2 ring-amber-400"
          >
            {count}
          </span>
        )}
      </button>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          data-testid="cart-drawer"
          className="w-full sm:max-w-md border-l border-white/[0.08] bg-[#0b0c10]/95 backdrop-blur-xl flex flex-col p-0"
        >
          <SheetHeader className="border-b border-white/[0.06] px-5 py-4">
            <SheetTitle className="flex items-center gap-2 text-white">
              <ShoppingBag className="h-5 w-5 text-amber-400" /> Coșul tău
              {count > 0 && <span className="text-sm font-normal text-white/50">({count} produse)</span>}
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <ShoppingBag className="h-12 w-12 text-white/15" />
                <p className="text-sm text-white/50">Coșul tău este gol.</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.product_id}
                  data-testid={`cart-item-${item.product_id}`}
                  className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
                >
                  {item.image && (
                    <img
                      src={mediaUrl(item.image)}
                      alt={item.name}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2">{item.name}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.product_id)}
                        data-testid={`cart-remove-${item.product_id}`}
                        className="text-white/40 hover:text-red-400 transition-colors"
                        aria-label="Șterge din coș"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-1.5 py-0.5">
                        <button
                          type="button"
                          onClick={() => setQty(item.product_id, item.qty - 1)}
                          className="p-1 text-white/60 hover:text-white"
                          aria-label="Scade cantitatea"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-sm font-semibold text-white">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setQty(
                              item.product_id,
                              item.stock_enabled ? Math.min(item.qty + 1, item.stock) : item.qty + 1
                            )
                          }
                          className="p-1 text-white/60 hover:text-white"
                          aria-label="Crește cantitatea"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-amber-400">{fmtPrice(item.price * item.qty)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-white/[0.06] px-5 py-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Subtotal</span>
                <span className="font-bold text-white" data-testid="cart-subtotal">{fmtPrice(subtotal)}</span>
              </div>
              <Button
                data-testid="cart-checkout-button"
                className="w-full rounded-full bg-amber-400 text-black font-bold hover:bg-amber-300 h-11"
                onClick={() => {
                  setDrawerOpen(false);
                  navigate("/shop/checkout");
                }}
              >
                Finalizează comanda
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
