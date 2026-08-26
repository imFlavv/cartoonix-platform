import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Gift, Coins, Crown, Ticket, Tag, Clock, ChevronRight, Copy, Check } from "lucide-react";

const PRODUCT_IMG = {
  plus_invite: "https://static.prod-images.emergentagent.com/jobs/9e14088f-8d65-46e8-8761-dcb2cff76665/images/fdc68784e35b6a112f20a5dfdcd46b1b5f2c3a1ff89a720e32d92be60a14c83c.jpeg",
  cinema_ticket: "https://static.prod-images.emergentagent.com/jobs/9e14088f-8d65-46e8-8761-dcb2cff76665/images/ce5c90a1fc41980587c5020b1a137bf1ce66bf2403e43d4605031adb17a8e915.jpeg",
  emag_voucher: "https://static.prod-images.emergentagent.com/jobs/9e14088f-8d65-46e8-8761-dcb2cff76665/images/d2c3006de9e6f365358dcad0138d5c7fa280431967ad671690084c4cc5fa1289.jpeg",
};

const timeAgo = (iso) => {
  if (!iso) return "";
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "acum";
  if (d < 3600) return `acum ${Math.floor(d / 60)} min`;
  if (d < 86400) return `acum ${Math.floor(d / 3600)} h`;
  return `acum ${Math.floor(d / 86400)} zile`;
};

const StatCard = ({ testid, icon, label, value, sub, accent, onClick }) => (
  <div
    data-testid={testid}
    onClick={onClick}
    className={`relative overflow-hidden rounded-2xl border p-5 flex items-center gap-4 ${accent} ${onClick ? "cursor-pointer hover:brightness-110" : ""} transition-all duration-200`}
  >
    <div className="h-14 w-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs uppercase tracking-wide text-white/50 font-semibold">{label}</p>
      <p className="font-display text-2xl md:text-3xl leading-tight truncate">{value}</p>
      <p className="text-xs text-white/40 truncate">{sub}</p>
    </div>
    {onClick && <ChevronRight className="h-5 w-5 text-white/40 shrink-0" />}
  </div>
);

const CodeResult = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <div data-testid="reward-gift-code" className="mt-3 flex items-center gap-2 rounded-xl bg-black/40 border border-[#ffcc00]/40 px-3 py-2">
      <Gift className="h-4 w-4 text-[#ffcc00] shrink-0" />
      <code className="font-mono text-[#ffcc00] tracking-widest text-sm flex-1">{code}</code>
      <button onClick={copy} data-testid="copy-gift-code" className="text-white/70 hover:text-white shrink-0" title="Copiază">
        {copied ? <Check className="h-4 w-4 text-[#22c55e]" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
};

const Rewards = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [lastGiftCode, setLastGiftCode] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/rewards");
      setData(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const redeem = async (p) => {
    if ((data?.points ?? 0) < p.cost) {
      toast.error("Nu ai suficiente puncte pentru această recompensă");
      return;
    }
    if (!window.confirm(`Revendici „${p.title}" pentru ${p.cost} puncte?`)) return;
    setBusy(p.id);
    try {
      const { data: res } = await api.post("/rewards/redeem", { product_id: p.id });
      if (res.claim?.voucher_code) {
        setLastGiftCode({ title: p.title, code: res.claim.voucher_code });
        toast.success("Cod PLUS generat! Îl poți dărui unui prieten.");
      } else {
        toast.success("Recompensă revendicată! O vei primi în curând.");
      }
      await load();
      refreshUser?.();
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Nu s-a putut revendica");
    } finally {
      setBusy(null);
    }
  };

  const redeemCode = async () => {
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const { data: res } = await api.post("/rewards/redeem-code", { code: code.trim() });
      if (res.granted?.type === "plus") toast.success("Felicitări! Ai primit acces Cartoonix PLUS pe viață! 👑");
      else if (res.granted?.type === "points") toast.success(`Ai primit ${res.granted.points} puncte!`);
      else toast.success("Cod valorificat!");
      setCode("");
      await load();
      refreshUser?.();
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Cod invalid");
    } finally {
      setRedeeming(false);
    }
  };

  const points = data?.points ?? 0;
  const claims = data?.claims ?? [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="rewards-page">
      <NavBar />
      <div className="pt-24 px-4 md:px-12 pb-16 max-w-6xl mx-auto">
        <button
          data-testid="rewards-back"
          onClick={() => navigate("/lobby")}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200 mb-4"
        >
          <ArrowLeft className="h-5 w-5" /> Lobby
        </button>
        <h1 className="font-display text-4xl md:text-5xl mb-7 flex items-center gap-3">
          <Gift className="h-9 w-9 text-[#ec4899]" /> Recompensele tale
        </h1>

        {/* Top stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <StatCard
            testid="rewards-points-card"
            icon={<Coins className="h-7 w-7 text-[#ec4899]" />}
            label="Puncte disponibile"
            value={points.toLocaleString("ro-RO")}
            sub="Adună puncte și descoperă recompense noi!"
            accent="bg-[#1a0f1a] border-[#ec4899]/40 shadow-[0_0_40px_rgba(236,72,153,0.12)]"
          />
          <StatCard
            testid="rewards-claimed-card"
            icon={<Gift className="h-7 w-7 text-[#a855f7]" />}
            label="Recompense revendicate"
            value={data?.claimed_count ?? 0}
            sub="Continuă să colecționezi recompense!"
            accent="bg-[#140f1c] border-[#a855f7]/40 shadow-[0_0_40px_rgba(168,85,247,0.12)]"
          />
          <StatCard
            testid="rewards-level-card"
            icon={<Crown className={`h-7 w-7 ${data?.plus ? "text-[#ffcc00]" : "text-white/40"}`} />}
            label="Nivel cont"
            value={data?.plus ? "PLUS" : "FREE"}
            sub={data?.plus ? "Beneficii premium active" : "Deblochează beneficiile PLUS"}
            accent={data?.plus ? "bg-[#1a1607] border-[#ffcc00]/50 shadow-[0_0_40px_rgba(255,204,0,0.12)]" : "bg-[#111] border-white/10"}
            onClick={data?.plus ? undefined : () => navigate("/plus")}
          />
        </div>

        {/* Products */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8" data-testid="rewards-products">
          {(data?.products || []).map((p) => {
            const affordable = points >= p.cost;
            return (
              <div
                key={p.id}
                data-testid={`reward-product-${p.id}`}
                className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-4 flex flex-col hover:border-white/20 transition-colors duration-200"
              >
                <div className="rounded-xl overflow-hidden bg-black mb-4 aspect-square">
                  <img src={PRODUCT_IMG[p.id]} alt={p.title} className="w-full h-full object-cover" draggable={false} />
                </div>
                <h3 className="font-display text-xl mb-1">{p.title}</h3>
                <p className="text-sm text-white/50 flex-1 mb-3">{p.desc}</p>
                <div className="flex items-center gap-1.5 text-[#ffcc00] font-bold mb-3">
                  <Coins className="h-4 w-4" /> Cost: {p.cost} puncte
                </div>
                <button
                  data-testid={`redeem-${p.id}`}
                  onClick={() => redeem(p)}
                  disabled={busy === p.id || !affordable}
                  className="w-full py-2.5 rounded-lg bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy === p.id ? "Se revendică..." : affordable ? "Revendică" : "Puncte insuficiente"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Redeem code + recent activity */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Redeem code */}
          <div className="bg-[#0f0f0f] border border-[#ec1c24]/30 rounded-2xl p-6" data-testid="rewards-redeem-code">
            <h3 className="font-display text-2xl flex items-center gap-2 mb-1">
              <Tag className="h-6 w-6 text-[#ec1c24]" /> Valorifică Codul
            </h3>
            <p className="text-sm text-white/50 mb-4">Folosește un cod promoțional pentru a primi recompense exclusive.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  data-testid="redeem-code-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && redeemCode()}
                  placeholder="Introdu codul tău (ex: ABC-123-XYZ)"
                  className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#ec1c24] outline-none font-mono tracking-wider uppercase"
                />
              </div>
              <button
                data-testid="redeem-code-btn"
                onClick={redeemCode}
                disabled={redeeming || !code.trim()}
                className="px-6 py-3 rounded-xl bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-50 shrink-0"
              >
                {redeeming ? "..." : "Valorifică"}
              </button>
            </div>
            {lastGiftCode && (
              <div className="mt-4">
                <p className="text-xs text-white/50">Cod PLUS generat pentru „{lastGiftCode.title}" — dăruiește-l unui prieten FREE:</p>
                <CodeResult code={lastGiftCode.code} />
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6" data-testid="rewards-activity">
            <h3 className="font-display text-2xl flex items-center gap-2 mb-4">
              <Clock className="h-6 w-6 text-white/60" /> Activitate recentă
            </h3>
            {claims.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-8 text-white/40">
                <Gift className="h-10 w-10 mb-2 text-white/20" />
                <p className="text-sm">Nu ai revendicat încă nicio recompensă.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {claims.map((c) => (
                  <div key={c.id} data-testid={`activity-${c.id}`} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="h-9 w-9 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                      {c.kind === "plus_invite" ? <Crown className="h-4 w-4 text-[#ffcc00]" /> : <Ticket className="h-4 w-4 text-[#ec4899]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">Ai revendicat {c.product_title}</p>
                      <p className="text-xs text-white/40">
                        {c.status === "fulfilled" ? "Onorat" : c.status === "canceled" ? "Anulat" : "În procesare"} · {timeAgo(c.created_at)}
                      </p>
                      {c.voucher_code && <div className="mt-1"><CodeResult code={c.voucher_code} /></div>}
                    </div>
                    <span className="text-[#ec1c24] font-bold text-sm shrink-0">- {c.cost}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rewards;
