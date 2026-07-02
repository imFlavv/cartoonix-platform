import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, XCircle, ReceiptText } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { api } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";

export default function ShopSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { clearCart } = useCart();
  const [state, setState] = useState("checking"); // checking | paid | expired | error
  const [orderNumber, setOrderNumber] = useState(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      return;
    }
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      if (attemptsRef.current >= 8) {
        setState("error");
        return;
      }
      attemptsRef.current += 1;
      try {
        const r = await api.get(`/shop/checkout/status/${sessionId}`);
        if (cancelled) return;
        if (r.data.payment_status === "paid") {
          setOrderNumber(r.data.order_number);
          setState("paid");
          clearCart();
          return;
        }
        if (r.data.status === "expired") {
          setState("expired");
          return;
        }
        setTimeout(poll, 2000);
      } catch {
        if (!cancelled) setTimeout(poll, 2000);
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <PublicLayout>
      <div data-testid="shop-success-page" className="mx-auto max-w-xl px-4 py-24 text-center">
        {state === "checking" && (
          <div className="space-y-4">
            <Clock className="mx-auto h-14 w-14 animate-pulse text-amber-400" />
            <h1 className="text-2xl font-bold text-white">Se verifică plata...</h1>
            <p className="text-sm text-white/50">Te rugăm să aștepți câteva secunde. Nu închide pagina.</p>
          </div>
        )}
        {state === "paid" && (
          <div className="space-y-4" data-testid="payment-success">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" />
            <h1 className="text-3xl font-extrabold text-white">Comandă plasată cu succes!</h1>
            {orderNumber && (
              <p className="text-white/70">
                Numărul comenzii tale: <span className="font-bold text-amber-400" data-testid="success-order-number">{orderNumber}</span>
              </p>
            )}
            <p className="text-sm text-white/50">
              Îți mulțumim pentru comandă! Vei fi contactat pentru confirmare și livrare.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link to="/shop/orders">
                <Button className="rounded-full bg-amber-400 text-black font-bold hover:bg-amber-300" data-testid="success-view-orders">
                  <ReceiptText className="mr-2 h-4 w-4" /> Vezi comenzile mele
                </Button>
              </Link>
              <Link to="/shop">
                <Button variant="outline" className="rounded-full border-white/15 text-white hover:bg-white/10">
                  Înapoi la shop
                </Button>
              </Link>
            </div>
          </div>
        )}
        {(state === "expired" || state === "error") && (
          <div className="space-y-4" data-testid="payment-failed">
            <XCircle className="mx-auto h-14 w-14 text-red-400" />
            <h1 className="text-2xl font-bold text-white">
              {state === "expired" ? "Sesiunea de plată a expirat" : "Nu am putut confirma plata"}
            </h1>
            <p className="text-sm text-white/50">
              Dacă ai finalizat plata, comanda va apărea în „Comenzile mele” în scurt timp. Altfel, poți încerca din nou.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link to="/shop/checkout">
                <Button className="rounded-full bg-amber-400 text-black font-bold hover:bg-amber-300">
                  Încearcă din nou
                </Button>
              </Link>
              <Link to="/shop/orders">
                <Button variant="outline" className="rounded-full border-white/15 text-white hover:bg-white/10">
                  Comenzile mele
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
