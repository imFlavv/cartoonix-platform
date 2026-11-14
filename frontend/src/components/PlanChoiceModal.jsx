import { useState } from "react";
import { Check, Sparkles, X, Loader2 } from "lucide-react";
import { PlusIcon } from "@/components/PlusIcon";
import { api } from "@/lib/api";
import { toast } from "sonner";

const PERKS = [
  "Acces la toate episoadele, fără limite",
  "Fără reclame, streaming HD",
  "Desene noi adăugate săptămânal",
  "Avatare premium exclusive",
  "Vizionare pe toate dispozitivele",
];

/**
 * Popup afișat imediat după crearea contului.
 * Împinge vizual spre PLUS; FREE e disponibil dar discret.
 */
const PlanChoiceModal = ({ onFree }) => {
  const [busy, setBusy] = useState(false);

  const goPlus = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/payments/checkout", {
        origin_url: window.location.origin,
      });
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error("Nu am putut iniția plata. Încearcă din nou.");
        setBusy(false);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Ceva n-a mers. Încearcă din nou.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#141414] border border-white/10 rounded-3xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
        {/* glow */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(255,204,0,0.35), transparent 60%)",
          }}
        />

        {/* close = alege FREE */}
        <button
          type="button"
          onClick={onFree}
          aria-label="Continuă gratuit"
          className="absolute top-4 right-4 z-10 text-white/40 hover:text-white/80 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative px-7 pt-9 pb-7 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-[#ffcc00] text-black px-2.5 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Recomandat
            </span>
          </div>

          <h2 className="text-2xl font-extrabold mb-1 text-white">Contul tău e gata! 🎉</h2>
          <p className="text-white/60 text-sm mb-6">
            Deblochează experiența completă cu{" "}
            <span className="inline-flex items-center align-middle">
              <PlusIcon className="h-4" />
            </span>
          </p>

          <div className="text-left bg-[#0a0a0a] border border-[#ffcc00]/30 rounded-2xl p-5 mb-5">
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-extrabold text-[#ffcc00]">50 RON</span>
              <span className="text-white/50 text-sm">/ o singură dată, pe viață</span>
            </div>
            <ul className="space-y-2.5">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-white/85">
                  <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-[#ffcc00]/20 flex items-center justify-center">
                    <Check className="h-3 w-3 text-[#ffcc00]" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <button
            data-testid="plan-choose-plus"
            onClick={goPlus}
            disabled={busy}
            className="w-full py-3.5 rounded-full bg-[#ffcc00] text-black font-extrabold text-lg hover:bg-[#ffd633] transition-colors duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Se deschide plata...
              </>
            ) : (
              <>Activează PLUS pe viață</>
            )}
          </button>

          <button
            data-testid="plan-choose-free"
            onClick={onFree}
            disabled={busy}
            className="mt-3 text-sm text-white/45 hover:text-white/70 transition underline-offset-2 hover:underline disabled:opacity-50"
          >
            Nu acum, continuă cu planul gratuit
          </button>

          <p className="mt-4 text-[11px] text-white/30">
            Plată unică securizată prin Stripe. Fără abonament recurent.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlanChoiceModal;
