import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { PlusIcon } from "@/components/PlusIcon";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";

const PERKS = [
  "Acces la toate episoadele, fără limite",
  "Fără reclame, streaming HD",
  "Desene noi adăugate săptămânal",
  "Avatare premium exclusive",
  "Vizionare pe toate dispozitivele",
];

const Plus = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const subscribe = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setBusy(true);
    try {
      // NOTĂ: Stripe se conectează în faza următoare — momentan activare demo
      const { data } = await api.post("/auth/subscribe");
      setUser(data);
      toast.success("Cartoonix PLUS activat! (demo)");
    } catch {
      toast.error("Ceva n-a mers. Încearcă din nou.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="relative pt-28 pb-20 px-4 md:px-12 overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{
          background: "radial-gradient(circle at 50% 0%, rgba(255,204,0,0.25), transparent 55%)",
        }} />
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 mb-6">
            <PlusIcon className="h-5 w-5" />
            <span className="text-sm font-bold text-[#ffcc00]">CARTOONIX PLUS</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl leading-none mb-4">
            Toată copilăria, <span className="text-[#ec1c24]">nelimitat</span>
          </h1>
          <p className="text-white/60 max-w-xl mx-auto mb-10">
            Deblochează întreaga bibliotecă de desene clasice și bucură-te de streaming fără reclame.
          </p>

          <div className="relative max-w-md mx-auto bg-[#141414] border border-white/10 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#ec1c24] text-xs font-bold uppercase tracking-wide">
              Cel mai popular
            </div>
            <div className="flex items-end justify-center gap-1 mb-1">
              <span className="font-display text-6xl">50</span>
              <span className="text-2xl font-bold text-[#ffcc00] mb-2">RON</span>
            </div>
            <p className="text-white/50 text-sm mb-6">pe lună · anulează oricând</p>

            <ul className="text-left space-y-3 mb-8">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-0.5 flex items-center justify-center h-5 w-5 rounded-full bg-[#ec1c24] shrink-0">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                  <span className="text-sm text-white/80">{p}</span>
                </li>
              ))}
            </ul>

            {user?.plus ? (
              <div data-testid="plus-active" className="w-full py-3.5 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 text-[#ffcc00] font-bold flex items-center justify-center gap-2">
                <PlusIcon className="h-5 w-5" /> Ești abonat PLUS
              </div>
            ) : (
              <button
                data-testid="plus-subscribe"
                onClick={subscribe}
                disabled={busy}
                className="w-full py-3.5 rounded-full bg-[#ffcc00] text-black font-bold text-lg hover:brightness-110 transition-all duration-200 disabled:opacity-60"
              >
                {busy ? "Se procesează..." : "Abonează-te la PLUS"}
              </button>
            )}
            <p className="text-xs text-white/30 mt-4">Plata prin Stripe se activează în curând.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plus;
