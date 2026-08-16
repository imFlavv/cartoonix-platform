import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PlusIcon } from "@/components/PlusIcon";
import { Tv, Lock, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const TvAccount = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ exists: false, jellyfin_url: "" });
  const [error, setError] = useState("");

  const isPlus = user?.plus;

  useEffect(() => {
    if (!isPlus) { setLoading(false); return; }
    api.get("/jellyfin/status")
      .then((res) => setStatus(res.data))
      .catch((err) => setError(formatApiErrorDetail(err.response?.data?.detail) || "Serviciul Cartoonix TV nu este disponibil momentan"))
      .finally(() => setLoading(false));
  }, [isPlus]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Parola trebuie să aibă minim 6 caractere."); return; }
    if (password !== confirm) { setError("Parolele nu coincid."); return; }
    setBusy(true);
    try {
      const { data } = await api.post("/jellyfin/register", { password });
      setStatus((s) => ({ ...s, exists: true, jellyfin_url: data.jellyfin_url }));
      toast.success("Contul Cartoonix TV a fost creat! 🎉");
      setPassword("");
      setConfirm("");
    } catch (err) {
      const msg = formatApiErrorDetail(err.response?.data?.detail) || "Nu s-a putut crea contul";
      setError(msg);
      if (err.response?.status === 409) setStatus((s) => ({ ...s, exists: true }));
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-24 px-4 pb-16 max-w-lg mx-auto">
        <div className="rounded-3xl border border-white/10 bg-[#0f0f0f] p-6 md:p-8 shadow-[0_0_60px_rgba(0,0,0,0.5)]" data-testid="tv-account-page">
          <div className="flex items-center gap-3 mb-1">
            <Tv className="h-7 w-7 text-[#ffcc00]" />
            <h1 className="font-display text-3xl">Cont Cartoonix TV</h1>
          </div>
          <p className="text-white/55 text-sm mb-6">
            Creează-ți contul pentru aplicația Cartoonix TV (Jellyfin) de pe televizor. Numele de utilizator este adresa ta de email.
          </p>

          {!isPlus ? (
            <div className="text-center py-8" data-testid="tv-upsell">
              <div className="mx-auto mb-4"><PlusIcon className="h-14 w-14 mx-auto" /></div>
              <h2 className="font-display text-2xl mb-2">Exclusiv Cartoonix PLUS</h2>
              <p className="text-white/60 mb-6">Contul Cartoonix TV este disponibil doar pentru membrii Cartoonix PLUS.</p>
              <button onClick={() => navigate("/plus")} className="px-7 py-3 rounded-full bg-[#ffcc00] text-black font-bold hover:brightness-110 transition-all duration-200">
                Devino membru PLUS
              </button>
            </div>
          ) : loading ? (
            <p className="text-white/40 py-8 text-center">Se încarcă...</p>
          ) : status.exists ? (
            <div className="py-4" data-testid="tv-account-exists">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/30 mb-5">
                <Check className="h-6 w-6 text-[#22c55e] shrink-0" />
                <div>
                  <p className="font-semibold">Ai deja un cont Cartoonix TV</p>
                  <p className="text-sm text-white/60">Utilizator: <span className="text-white/90 font-mono">{user.email}</span></p>
                </div>
              </div>
              <p className="text-sm text-white/60 mb-4">
                Folosește emailul și parola setată pentru a te conecta din aplicația Jellyfin de pe televizor.
                Vezi pașii de configurare în pagina de suport.
              </p>
              <button onClick={() => navigate("/help")} className="w-full py-3 rounded-lg bg-white/10 hover:bg-white/20 font-semibold transition-colors duration-200 flex items-center justify-center gap-2">
                <ExternalLink className="h-4 w-4" /> Cum configurez aplicația TV
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4" data-testid="tv-account-form">
              <div>
                <label className="text-xs font-semibold text-white/60 mb-1.5 block">Nume utilizator (email)</label>
                <div className="relative">
                  <input data-testid="tv-username" value={user.email} readOnly disabled className={`${input} pr-10 opacity-70 cursor-not-allowed`} />
                  <Lock className="h-4 w-4 text-white/40 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 mb-1.5 block">Parolă</label>
                <input data-testid="tv-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Alege o parolă (min. 6 caractere)" className={input} />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 mb-1.5 block">Confirmă parola</label>
                <input data-testid="tv-password-confirm" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Reintrodu parola" className={input} />
              </div>

              {error && <p data-testid="tv-error" className="text-sm text-[#ff6b71]">{error}</p>}

              <button data-testid="tv-submit" type="submit" disabled={busy} className="w-full py-3 rounded-lg bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-60 flex items-center justify-center gap-2">
                <Tv className="h-5 w-5" /> {busy ? "Se creează contul..." : "Creează cont Cartoonix TV"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TvAccount;
