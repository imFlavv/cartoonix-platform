import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { NavBar } from "@/components/NavBar";
import { Heart, Coins, Loader2, ShieldCheck, Ban } from "lucide-react";
import { toast } from "sonner";

const PRESETS = [10, 25, 50, 100];
const MIN = 10;
const MAX = 5000;

const Donate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const [amount, setAmount] = useState(25);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    api.get("/settings/donate").then((r) => setEnabled(r.data?.enabled !== false)).catch(() => {});
  }, []);

  const effective = custom !== "" ? Number(custom) : amount;
  const valid = Number.isFinite(effective) && effective >= MIN && effective <= MAX;
  const points = valid ? Math.floor(effective) : 0;

  const pickPreset = (v) => { setAmount(v); setCustom(""); };

  const donate = async () => {
    if (!user) { navigate("/login"); return; }
    if (!valid) { toast.error(`Suma trebuie să fie între ${MIN} și ${MAX} RON`); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/payments/donate", {
        amount: Math.round(effective * 100) / 100,
        origin_url: window.location.origin,
      });
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error("Nu am putut iniția donația. Încearcă din nou.");
        setBusy(false);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Ceva n-a mers. Încearcă din nou.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="donate-page">
      <NavBar />
      {!enabled && !isAdmin ? (
        <div className="pt-24 pb-16 px-4">
          <div className="max-w-md mx-auto text-center bg-[#111] border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl" data-testid="donate-disabled">
            <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Ban className="h-8 w-8 text-white/50" />
            </div>
            <h1 className="font-display text-3xl mb-3">Donațiile sunt indisponibile</h1>
            <p className="text-white/60 mb-6">Momentan nu se pot face donații. Revino mai târziu — mulțumim! ❤️</p>
            <button onClick={() => navigate("/home")} className="px-7 py-3 rounded-full bg-white/10 border border-white/20 font-bold hover:bg-white/20 transition">Înapoi acasă</button>
          </div>
        </div>
      ) : (
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-xl mx-auto">
          {!enabled && isAdmin && (
            <div data-testid="donate-admin-banner" className="mb-5 flex items-center gap-2 rounded-xl bg-[#ec1c24]/15 border border-[#ec1c24]/40 px-4 py-3 text-sm text-[#ff8085]">
              <Ban className="h-4 w-4 shrink-0" /> Donațiile sunt <b className="mx-1">dezactivate</b> pentru utilizatori. Doar tu (admin) vezi această pagină.
            </div>
          )}
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-[#ec1c24]/15 border border-[#ec1c24]/40 flex items-center justify-center">
              <Heart className="h-8 w-8 text-[#ec1c24] fill-[#ec1c24]" />
            </div>
            <h1 className="font-display text-4xl sm:text-5xl mb-3">Susține Cartoonix</h1>
            <p className="text-white/60 max-w-md mx-auto">
              Fiecare donație ne ajută să ținem platforma vie și fără reclame. Ca mulțumire,
              primești puncte în cont: <b className="text-[#ffcc00]">1 RON = 1 punct</b>.
            </p>
          </div>

          <div className="bg-[#111] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <p className="text-sm font-bold text-white/70 mb-3">Alege suma</p>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {PRESETS.map((v) => {
                const active = custom === "" && amount === v;
                return (
                  <button
                    key={v}
                    data-testid={`donate-preset-${v}`}
                    onClick={() => pickPreset(v)}
                    className={`py-3 rounded-xl font-bold transition-all duration-200 border ${
                      active
                        ? "bg-[#ec1c24] border-[#ec1c24] text-white scale-[1.03]"
                        : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    {v} <span className="text-xs font-semibold opacity-70">RON</span>
                  </button>
                );
              })}
            </div>

            <label className="text-sm font-bold text-white/70 mb-2 block">Sau altă sumă (RON)</label>
            <div className="relative mb-2">
              <input
                data-testid="donate-custom-amount"
                type="number"
                min={MIN}
                max={MAX}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={`ex: 200 (între ${MIN} și ${MAX})`}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-[#ffcc00] transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">RON</span>
            </div>
            {custom !== "" && !valid && (
              <p data-testid="donate-error" className="text-sm text-[#ec1c24] mb-2">
                Suma trebuie să fie între {MIN} și {MAX} RON.
              </p>
            )}

            {/* Points preview */}
            <div className="flex items-center justify-between rounded-2xl bg-[#ffcc00]/10 border border-[#ffcc00]/30 px-4 py-3 my-5">
              <span className="text-sm text-white/70">Vei primi</span>
              <span data-testid="donate-points-preview" className="flex items-center gap-2 text-xl font-extrabold text-[#ffcc00]">
                <Coins className="h-5 w-5" /> {points} puncte
              </span>
            </div>

            <button
              data-testid="donate-submit"
              disabled={!valid || busy}
              onClick={donate}
              className="w-full py-4 rounded-2xl bg-[#ec1c24] text-white font-bold text-lg hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> Se inițiază...</> : <><Heart className="h-5 w-5" /> Donează {valid ? `${effective} RON` : ""}</>}
            </button>

            <p className="flex items-center justify-center gap-2 text-xs text-white/40 mt-4">
              <ShieldCheck className="h-4 w-4" /> Plată securizată prin Stripe · punctele se încarcă automat după confirmare
            </p>
          </div>

          {user && (
            <p className="text-center text-sm text-white/50 mt-6">
              Ai acum <b className="text-[#ffcc00]">{user.points ?? 0}</b> puncte ·{" "}
              <button onClick={() => navigate("/profile")} className="underline hover:text-white transition-colors">vezi wallet-ul</button>
            </p>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default Donate;
