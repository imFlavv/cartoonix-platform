import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Gift, Crown, Ticket, Tag, Clock, ChevronRight, ChevronDown, Copy, Check, Sparkles, Loader2, X, Lock, ShoppingCart } from "lucide-react";
import { NixCoin } from "@/components/NixCoin";
import { KeyIcon } from "@/components/KeyIcon";
import { AvatarFrame } from "@/components/AvatarFrame";

const DEFAULT_PREVIEW_AVATAR = "/default-avatar.jpg";

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
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [checking, setChecking] = useState(false);
  const [preview, setPreview] = useState(null);
  const [lastGiftCode, setLastGiftCode] = useState(null);
  const [buying, setBuying] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [activityOpen, setActivityOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/rewards");
      setData(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const checkCode = async () => {
    if (!code.trim()) return;
    setChecking(true);
    setPreview(null);
    try {
      const { data: res } = await api.post("/rewards/preview-code", { code: code.trim() });
      setPreview(res.reward);
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Cod invalid");
    } finally {
      setChecking(false);
    }
  };

  const redeemCode = async () => {
    if (!code.trim() || !preview) return;
    setRedeeming(true);
    try {
      const { data: res } = await api.post("/rewards/redeem-code", { code: code.trim() });
      if (res.granted?.type === "plus") toast.success("Felicitări! Ai primit acces Cartoonix PLUS pe viață! 👑");
      else if (res.granted?.type === "points") toast.success(`Ai primit ${res.granted.points} NIX!`);
      else if (res.granted?.type === "keys") toast.success(`Ai primit ${res.granted.keys} ${res.granted.keys === 1 ? "cheie" : "chei"} Mystery Box! 🔑`);
      else toast.success("Cod valorificat!");
      setCode("");
      setPreview(null);
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

  const buy = async (item) => {
    setBuying(item.id);
    try {
      const { data: res } = await api.post("/shop/purchase", { item_id: item.id });
      if (res.granted?.kind === "keys") toast.success(`Ai primit ${res.granted.keys} ${res.granted.keys === 1 ? "cheie" : "chei"} Mystery Box! 🔑`);
      else if (res.granted?.kind === "avatar") toast.success("Avatar deblocat! Îl poți pune din Setări → Personalizare. 🎃");
      else if (res.granted?.kind === "frame") toast.success("Ramă deblocată! O poți pune din Setări → Personalizare. ✨");
      else toast.success("Achiziție reușită!");
      await load();
      refreshUser?.();
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Nu s-a putut finaliza achiziția");
    } finally {
      setBuying(null);
    }
  };

  const fmtRemaining = (iso) => {
    const ms = new Date(iso).getTime() - now;
    if (ms <= 0) return null;
    const mins = Math.ceil(ms / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h}h ${m}min` : `${m} min`;
  };

  const ShopCard = ({ item }) => {
    const remaining = item.next_available_at ? fmtRemaining(item.next_available_at) : null;
    const owned = item.owned;
    const soldOut = item.sold_out && !owned;
    const limitedByWindow = soldOut && item.window_hours > 0;
    const affordable = points >= item.cost;
    const disabled = owned || soldOut || !affordable || buying === item.id;
    const isAvatar = item.kind === "avatar";
    const isFrame = item.kind === "frame";

    let label = `Cumpără · ${item.cost} NIX`;
    if (owned) label = "Deținut";
    else if (limitedByWindow) label = remaining ? `Revine în ${remaining}` : "Revino mai târziu";
    else if (soldOut) label = "Limită atinsă";
    else if (!affordable) label = "NIX insuficient";

    return (
      <div
        data-testid={`shop-item-${item.id}`}
        className="group relative flex items-center gap-3 bg-[#111] border border-white/10 rounded-xl p-3 hover:border-white/20 transition-colors duration-200"
      >
        <div className={`relative h-14 w-14 shrink-0 ${isFrame ? "" : "rounded-lg overflow-hidden"} ${isAvatar ? "bg-black" : isFrame ? "" : "bg-gradient-to-br from-[#1a1206] to-[#0f0f0f] flex items-center justify-center"}`}>
          {isAvatar ? (
            <img src={item.img} alt={item.title} className="w-full h-full object-cover" draggable={false} />
          ) : isFrame ? (
            <AvatarFrame src={DEFAULT_PREVIEW_AVATAR} frame={item.frame} alt={item.title} size="h-14 w-14" />
          ) : (
            <div className="relative flex items-center justify-center">
              <KeyIcon className="h-9 w-9 drop-shadow-[0_0_10px_rgba(255,122,24,0.5)]" />
              {item.keys > 1 && (
                <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-[#ff7a18] text-black text-[10px] font-black grid place-items-center border-2 border-[#111]">×{item.keys}</span>
              )}
            </div>
          )}
          {owned && (
            <div className={`absolute inset-0 bg-black/55 flex items-center justify-center ${isFrame ? "rounded-full" : ""}`}>
              <Check className="h-5 w-5 text-[#22c55e]" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display text-sm leading-tight truncate">{item.title}</h3>
            {(isAvatar || isFrame) && <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[#ff7a18]/15 text-[#ffb37a] border border-[#ff7a18]/30">Limitat</span>}
          </div>
          <p className="text-[11px] text-white/40 truncate">{item.desc}</p>
          <div className="flex items-center gap-1 text-[#c084fc] font-bold text-xs mt-1">
            <NixCoin className="h-3.5 w-3.5" /> {item.cost} NIX
            {item.max_per_user > 1 && (
              <span className="ml-1 text-white/40 font-normal">({item.purchased_count}/{item.max_per_user})</span>
            )}
          </div>
        </div>
        <button
          data-testid={`shop-buy-${item.id}`}
          onClick={() => buy(item)}
          disabled={disabled}
          title={label}
          className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-colors duration-200 inline-flex items-center justify-center gap-1.5 whitespace-nowrap ${
            owned
              ? "bg-[#22c55e]/15 text-[#22c55e] cursor-default"
              : disabled
                ? "bg-white/5 text-white/40 cursor-not-allowed"
                : "bg-[#ec1c24] text-white hover:bg-[#ff2d36]"
          }`}
        >
          {buying === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : owned ? <Check className="h-3.5 w-3.5" />
            : limitedByWindow ? <Clock className="h-3.5 w-3.5" />
            : soldOut ? <Lock className="h-3.5 w-3.5" />
            : <ShoppingCart className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{label}</span>
        </button>
      </div>
    );
  };

  const shop = data?.shop ?? [];
  const keyItems = shop.filter((i) => i.category === "key");
  const limitedItems = shop.filter((i) => i.category === "limited");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative" data-testid="rewards-page">
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/halloween/rewards-bg.jpg')" }}
      />
      <div className="fixed inset-0 bg-black/65" />
      <NavBar />
      <div className="relative z-10 pt-24 px-4 md:px-12 pb-16 max-w-6xl mx-auto">
        <button
          data-testid="rewards-back"
          onClick={() => navigate("/lobby")}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200 mb-4"
        >
          <ArrowLeft className="h-5 w-5" /> Lobby
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main column: stats + shop */}
          <div className="lg:col-span-2 space-y-8">
            {/* Top stats */}
            <div className="grid sm:grid-cols-3 gap-4">
              <StatCard
                testid="rewards-points-card"
                icon={<NixCoin className="h-7 w-7" />}
                label="NIX disponibil"
                value={points.toLocaleString("ro-RO")}
                sub="Adună NIX și descoperă recompense noi!"
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

            {/* Shop */}
            <div className="space-y-6" data-testid="rewards-shop">
              {keyItems.length > 0 && (
                <section data-testid="shop-category-key">
                  <div className="flex items-center gap-2.5 mb-3">
                    <KeyIcon className="h-5 w-5" />
                    <h2 className="font-display text-lg text-[#ff7a18]">Chei Mystery Box</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {keyItems.map((item) => <ShopCard key={item.id} item={item} />)}
                  </div>
                </section>
              )}

              {limitedItems.length > 0 && (
                <section data-testid="shop-category-limited">
                  <div className="flex items-center gap-2.5 mb-3">
                    <Sparkles className="h-5 w-5 text-[#ffcc00]" />
                    <h2 className="font-display text-lg text-[#ffcc00]">Ediție Limitată</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {limitedItems.map((item) => <ShopCard key={item.id} item={item} />)}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Right sidebar: redeem code (priority) + recent activity */}
          <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-24 lg:self-start">
            {/* Redeem code */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1a0b0c] via-[#0f0f0f] to-[#12080f] border border-[#ec1c24]/40 rounded-2xl p-5 shadow-[0_0_50px_rgba(236,28,36,0.15)]" data-testid="rewards-redeem-code">
              <div className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-[#ec1c24]/15 blur-3xl" />
              <div className="relative">
                <h3 className="font-display text-xl flex items-center gap-2 mb-1">
                  <Tag className="h-5 w-5 text-[#ec1c24]" /> Valorifică Codul
                </h3>
                <p className="text-xs text-white/50 mb-4">Introdu un cod promoțional, verifică ce primești, apoi revendică-l.</p>
                <div className="flex flex-col gap-2.5">
                  <div className="relative">
                    <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                      data-testid="redeem-code-input"
                      value={code}
                      onChange={(e) => { setCode(e.target.value.toUpperCase()); setPreview(null); }}
                      onKeyDown={(e) => e.key === "Enter" && (preview ? redeemCode() : checkCode())}
                      placeholder="Codul tău (ex: ABC-123-XYZ)"
                      className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#ec1c24] outline-none font-mono tracking-wider uppercase text-sm"
                    />
                  </div>
                  {!preview && (
                    <button
                      data-testid="check-code-btn"
                      onClick={checkCode}
                      disabled={checking || !code.trim()}
                      className="w-full px-6 py-3 rounded-xl bg-white/10 border border-white/15 text-white font-bold hover:bg-white/15 transition-colors duration-200 disabled:opacity-50 shrink-0 flex items-center justify-center gap-2"
                    >
                      {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-[#ffcc00]" />}
                      {checking ? "Se verifică..." : "Verifică"}
                    </button>
                  )}
                </div>

                {/* Preview a ceea ce oferă codul */}
                {preview && (
                  <div data-testid="code-preview" className="mt-4 rounded-2xl border border-[#ffcc00]/30 bg-gradient-to-br from-[#1a1607] to-[#0f0f0f] p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-black/40 border border-[#ffcc00]/30 flex items-center justify-center shrink-0">
                        {preview.type === "plus"
                          ? <Crown className="h-6 w-6 text-[#ffcc00]" />
                          : preview.type === "points"
                            ? <NixCoin className="h-6 w-6" />
                            : preview.type === "keys"
                              ? <KeyIcon className="h-6 w-6" />
                              : <Gift className="h-6 w-6 text-[#ec4899]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wide text-[#ffcc00]/70 font-bold mb-0.5">Codul tău oferă</p>
                        <p className="font-display text-lg leading-tight truncate" data-testid="code-preview-title">{preview.title}</p>
                        <p className="text-xs text-white/50 truncate">{preview.desc}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        data-testid="redeem-code-btn"
                        onClick={redeemCode}
                        disabled={redeeming}
                        className="flex-1 py-3 rounded-xl bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {redeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        {redeeming ? "Se revendică..." : "Revendică recompensa"}
                      </button>
                      <button
                        data-testid="cancel-code-btn"
                        onClick={() => setPreview(null)}
                        disabled={redeeming}
                        className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-200 disabled:opacity-50"
                        title="Anulează"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {lastGiftCode && (
                  <div className="mt-4">
                    <p className="text-xs text-white/50">Cod PLUS generat pentru „{lastGiftCode.title}" — dăruiește-l unui prieten FREE:</p>
                    <CodeResult code={lastGiftCode.code} />
                  </div>
                )}
              </div>
            </div>

            {/* Recent activity (expandable) */}
            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden" data-testid="rewards-activity">
              <button
                type="button"
                data-testid="activity-toggle"
                onClick={() => setActivityOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 p-5 text-left"
              >
                <h3 className="font-display text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-white/60" /> Activitate recentă
                  {claims.length > 0 && <span className="text-xs font-normal text-white/40">({claims.length})</span>}
                </h3>
                <ChevronDown className={`h-5 w-5 text-white/50 shrink-0 transition-transform duration-200 ${activityOpen ? "rotate-180" : ""}`} />
              </button>
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${activityOpen ? "max-h-[420px]" : "max-h-0"}`}
              >
                <div className="px-5 pb-5">
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
        </div>
      </div>
    </div>
  );
};

export default Rewards;
