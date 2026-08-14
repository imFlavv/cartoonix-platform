import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PlusIcon } from "@/components/PlusIcon";
import { X, Tv, Check } from "lucide-react";

const PromoPopup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [promo, setPromo] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user || user.plus) return;
    if (sessionStorage.getItem("cx_promo_dismissed")) return;
    api.get("/settings/promo-popup").then((r) => {
      if (r.data?.enabled) {
        setPromo(r.data);
        setTimeout(() => setShow(true), 900);
      }
    }).catch(() => {});
  }, [user]);

  const close = () => {
    sessionStorage.setItem("cx_promo_dismissed", "1");
    setShow(false);
  };

  const go = () => {
    close();
    navigate(promo?.cta_link || "/plus");
  };

  if (!show || !promo) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={close}>
      <div
        data-testid="promo-popup"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl border border-[#ffcc00]/40 bg-gradient-to-br from-[#1a1206] via-[#141414] to-[#0a0a0a] p-8 shadow-[0_0_60px_rgba(255,204,0,0.25)]"
      >
        <button onClick={close} className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70" aria-label="Închide">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <PlusIcon className="h-7 w-7" />
          <span className="font-display text-2xl">Cartoonix PLUS</span>
        </div>

        <h2 className="font-display italic text-3xl leading-tight mb-3" style={{ textShadow: "0 2px 24px rgba(255,204,0,0.4)" }}>
          {promo.title}
        </h2>
        <p className="text-white/75 mb-4 leading-relaxed">{promo.message}</p>

        <div className="flex items-center gap-2 mb-5 text-sm text-white/80">
          <Tv className="h-5 w-5 text-[#ffcc00]" />
          <span className="flex items-center gap-1"><Check className="h-4 w-4 text-[#22c55e]" /> Acces GRATUIT și la aplicația de TV</span>
        </div>

        {(promo.price_old || promo.price_new) && (
          <div className="flex items-end gap-3 mb-6">
            {promo.price_old && <span className="text-xl text-white/40 line-through decoration-[#ec1c24] decoration-2">{promo.price_old}</span>}
            {promo.price_new && (
              <span className="font-display text-5xl text-[#ffcc00]">{promo.price_new}</span>
            )}
            <span className="text-xs text-white/50 mb-1.5">plată unică</span>
          </div>
        )}

        <button
          data-testid="promo-cta"
          onClick={go}
          className="w-full py-3.5 rounded-xl bg-[#ffcc00] text-black font-extrabold text-lg hover:brightness-110 transition-all duration-200"
        >
          {promo.cta_label || "Vreau PLUS"}
        </button>
        <button onClick={close} className="w-full mt-2 py-2 text-sm text-white/40 hover:text-white/70">Poate mai târziu</button>
      </div>
    </div>
  );
};

export default PromoPopup;
