import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Truck, Hammer, Gift, Plus, Minus, Loader2, Check, Lock, Copy, Clock, Coins, Key, Sparkles, Crown } from "lucide-react";

const PUMPKIN = "/halloween/pumpkin-normal.png";
const CARVED = "/halloween/pumpkin-carved.png";

const fmtDur = (s) => {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const rewardIcon = (r) => {
  if (r.reward === "points") return <Coins className="h-5 w-5 text-[#ffcc00]" />;
  if (r.reward === "avatar") return <Sparkles className="h-5 w-5 text-[#a855f7]" />;
  return <Key className="h-5 w-5 text-[#00e0ff]" />;
};
const rewardText = (r) => {
  if (r.reward === "points") return `${r.points} puncte`;
  if (r.reward === "avatar") return "Avatar special Halloween";
  return "1 cheie cutia misterioasă";
};

export const HalloweenEventModal = ({ open, onClose }) => {
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("deliver");
  const [basket, setBasket] = useState(0);
  const [busy, setBusy] = useState(false);
  const [carveRemaining, setCarveRemaining] = useState(0);
  const tickRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get("/halloween/status");
      setStatus(data);
      if (data.carving) setCarveRemaining(data.carving.remaining_seconds);
    } catch {
      toast.error("Nu s-a putut încărca evenimentul");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setLoading(true);
      setBasket(0);
      load();
    }
  }, [open]);

  // live countdown for carving
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (status?.carving && !status.carving.ready) {
      tickRef.current = setInterval(() => {
        setCarveRemaining((s) => {
          if (s <= 1) {
            clearInterval(tickRef.current);
            load();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => tickRef.current && clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.carving?.ready_at, status?.carving?.ready]);

  const doDeliver = async () => {
    if (basket < 1) return;
    setBusy(true);
    try {
      const { data } = await api.post("/halloween/deliver", { count: basket });
      setStatus(data);
      setBasket(0);
      toast.success(`Ai livrat ${basket} dovleac${basket === 1 ? "" : "i"}! 🎃`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Eroare");
    } finally {
      setBusy(false);
    }
  };

  const doCarveStart = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/halloween/carve/start");
      setStatus(data);
      if (data.carving) setCarveRemaining(data.carving.remaining_seconds);
      toast.success("Sculptarea a început! Revino peste 3 ore.");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Eroare");
    } finally {
      setBusy(false);
    }
  };

  const doCarveClaim = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/halloween/carve/claim");
      setStatus(data);
      toast.success("Dovleac sculptat revendicat! 🎃");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Eroare");
    } finally {
      setBusy(false);
    }
  };

  const claimReward = async (reward_id) => {
    setBusy(true);
    try {
      const { data } = await api.post("/halloween/reward/claim", { reward_id });
      setStatus(data);
      await refreshUser().catch(() => {});
      toast.success("Recompensă revendicată! 🎉");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Eroare");
    } finally {
      setBusy(false);
    }
  };

  const tabs = [
    { id: "deliver", label: "Livrează", icon: Truck },
    { id: "carve", label: "Sculptează", icon: Hammer },
    { id: "rewards", label: "Recompense", icon: Gift },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#120a1e] border-[#ff7a18]/30 text-white max-w-3xl max-h-[88vh] overflow-y-auto p-0" data-testid="halloween-modal">
        {/* header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-white/10 bg-gradient-to-b from-[#ff7a18]/15 to-transparent">
          <h2 className="font-display text-3xl flex items-center gap-2">🎃 Evenimentul Halloween</h2>
          <p className="text-sm text-white/60 mt-1">Adună dovleci, livrează-i sau sculptează-i și deblochează recompense.</p>
          {status && !loading && (
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                <img src={PUMPKIN} alt="" className="h-7 w-7 object-contain" />
                <span className="font-bold" data-testid="hw-pumpkin-count">{status.pumpkins}</span>
                <span className="text-xs text-white/50">dovleci</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                <img src={CARVED} alt="" className="h-7 w-7 object-contain" />
                <span className="font-bold">{status.carved}</span>
                <span className="text-xs text-white/50">sculptați</span>
              </div>
            </div>
          )}
        </div>

        {/* tabs */}
        <div className="flex gap-2 px-6 pt-4">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                data-testid={`hw-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition ${tab === t.id ? "bg-[#ff7a18] text-black" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-16 flex items-center justify-center text-white/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !status?.enabled ? (
            <div className="py-16 text-center text-white/50">Evenimentul nu este activ.</div>
          ) : tab === "deliver" ? (
            <div data-testid="hw-deliver">
              <p className="text-sm text-white/60 mb-4">Adaugă dovleci din inventar și livrează-i la castel.</p>
              {status.pumpkins === 0 && basket === 0 ? (
                <p className="text-center text-white/50 py-8">Nu ai dovleci în inventar. Trimite mesaje în chat și stai activ pe platformă ca să obții.</p>
              ) : (
                <>
                  <div className="min-h-[96px] rounded-2xl border-2 border-dashed border-[#ff7a18]/40 bg-black/20 p-4 flex flex-wrap gap-2 items-center justify-center">
                    {basket === 0 ? (
                      <span className="text-white/40 text-sm">Apasă + ca să adaugi dovleci de livrat</span>
                    ) : (
                      Array.from({ length: basket }).map((_, i) => (
                        <img key={i} src={PUMPKIN} alt="" className="h-12 w-12 object-contain drop-shadow" />
                      ))
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <button
                      data-testid="hw-basket-minus"
                      onClick={() => setBasket((b) => Math.max(0, b - 1))}
                      disabled={basket === 0}
                      className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center disabled:opacity-40"
                    ><Minus className="h-5 w-5" /></button>
                    <span className="font-display text-2xl w-10 text-center">{basket}</span>
                    <button
                      data-testid="hw-basket-plus"
                      onClick={() => setBasket((b) => Math.min(status.pumpkins, b + 1))}
                      disabled={basket >= status.pumpkins}
                      className="h-10 w-10 rounded-full bg-[#ff7a18] text-black hover:brightness-110 flex items-center justify-center disabled:opacity-40"
                    ><Plus className="h-5 w-5" /></button>
                  </div>
                  <button
                    data-testid="hw-deliver-btn"
                    onClick={doDeliver}
                    disabled={busy || basket < 1}
                    className="w-full mt-5 py-3 rounded-xl bg-[#ff7a18] text-black font-bold hover:brightness-110 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Truck className="h-5 w-5" />} Livrează {basket > 0 ? `(${basket})` : ""}
                  </button>
                  <p className="text-xs text-white/40 text-center mt-2">Total livrați: {status.delivered}</p>
                </>
              )}
            </div>
          ) : tab === "carve" ? (
            <div data-testid="hw-carve" className="text-center">
              {!status.carving ? (
                <>
                  <p className="text-sm text-white/60 mb-5">Pune un dovleac la sculptat. Durează 3 ore, apoi îl revendici.</p>
                  <div className="mx-auto h-40 w-40 rounded-2xl border-2 border-dashed border-[#ff7a18]/40 bg-black/20 flex items-center justify-center mb-5">
                    {status.pumpkins > 0 ? <img src={PUMPKIN} alt="" className="h-28 w-28 object-contain" /> : <span className="text-white/40 text-sm px-4">Niciun dovleac disponibil</span>}
                  </div>
                  <button
                    data-testid="hw-carve-start"
                    onClick={doCarveStart}
                    disabled={busy || status.pumpkins < 1}
                    className="px-8 py-3 rounded-xl bg-[#ff7a18] text-black font-bold hover:brightness-110 transition disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Hammer className="h-5 w-5" />} START
                  </button>
                </>
              ) : status.carving.ready || carveRemaining <= 0 ? (
                <>
                  <p className="text-sm text-[#39ff14] mb-5">Dovleacul e gata! Revendică-l ca să ajungă în inventar.</p>
                  <div className="mx-auto h-40 w-40 rounded-2xl border-2 border-[#ff7a18] bg-black/20 flex items-center justify-center mb-5 shadow-[0_0_24px_rgba(255,122,24,0.5)]">
                    <img src={CARVED} alt="" className="h-28 w-28 object-contain" />
                  </div>
                  <button
                    data-testid="hw-carve-claim"
                    onClick={doCarveClaim}
                    disabled={busy}
                    className="px-8 py-3 rounded-xl bg-[#39ff14] text-black font-bold hover:brightness-110 transition disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} REVENDICĂ
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-white/60 mb-5">Se sculptează... revino când timer-ul ajunge la zero.</p>
                  <div className="mx-auto h-40 w-40 rounded-2xl border-2 border-[#ff7a18]/50 bg-black/20 flex items-center justify-center mb-4 relative">
                    <img src={PUMPKIN} alt="" className="h-28 w-28 object-contain opacity-60" />
                    <Hammer className="h-8 w-8 text-[#ff7a18] absolute animate-pulse" />
                  </div>
                  <div data-testid="hw-carve-timer" className="font-display text-4xl text-[#ff7a18] tabular-nums flex items-center justify-center gap-2">
                    <Clock className="h-7 w-7" /> {fmtDur(carveRemaining)}
                  </div>
                </>
              )}
              <p className="text-xs text-white/40 mt-4">Total sculptați: {status.sculpted}</p>
            </div>
          ) : (
            <div data-testid="hw-rewards" className="space-y-3">
              {status.rewards.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="h-10 w-10 rounded-lg bg-black/30 flex items-center justify-center shrink-0">{rewardIcon(r)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{r.label}</p>
                    <p className="text-xs text-white/50">Recompensă: {rewardText(r)}</p>
                    <div className="h-1.5 w-full rounded-full bg-white/10 mt-1.5 overflow-hidden">
                      <div className="h-full bg-[#ff7a18]" style={{ width: `${Math.min(100, (r.progress / r.need) * 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-white/40 mt-0.5">{Math.min(r.progress, r.need)}/{r.need}</p>
                  </div>
                  {r.claimed ? (
                    <span className="text-xs font-bold text-[#39ff14] flex items-center gap-1 shrink-0"><Check className="h-4 w-4" /> Luat</span>
                  ) : r.eligible ? (
                    <button data-testid={`hw-claim-${r.id}`} onClick={() => claimReward(r.id)} disabled={busy} className="px-3 py-1.5 rounded-lg bg-[#ff7a18] text-black text-xs font-bold hover:brightness-110 disabled:opacity-50 shrink-0">Revendică</button>
                  ) : (
                    <span className="text-white/30 shrink-0"><Lock className="h-4 w-4" /></span>
                  )}
                </div>
              ))}

              {/* Final reward */}
              <div className="p-4 rounded-2xl border border-[#a855f7]/40 bg-gradient-to-r from-[#a855f7]/15 to-[#ff7a18]/10 mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-5 w-5 text-[#ffcc00]" />
                  <p className="font-display text-lg">Mare premiu final</p>
                </div>
                <p className="text-xs text-white/60 mb-3">Finalizează toate cele 6 activități și primești: <span className="text-white font-semibold">cod voucher abonament PLUS + 20 puncte</span>.</p>
                {status.final.claimed ? (
                  <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2">
                    <span className="text-xs text-white/50">Cod PLUS:</span>
                    <code className="font-mono font-bold text-[#39ff14] flex-1 truncate">{status.final.voucher}</code>
                    <button onClick={() => { navigator.clipboard.writeText(status.final.voucher); toast.success("Cod copiat!"); }} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"><Copy className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button
                    data-testid="hw-claim-final"
                    onClick={() => claimReward("final")}
                    disabled={busy || !status.final.eligible}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#ff7a18] text-white font-bold hover:brightness-110 transition disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Gift className="h-5 w-5" /> {status.final.eligible ? "Revendică marele premiu" : "Finalizează toate activitățile"}
                  </button>
                )}
              </div>

              {/* How to earn */}
              <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="font-semibold text-sm mb-2 flex items-center gap-2"><img src={PUMPKIN} className="h-5 w-5 object-contain" alt="" /> Cum obții dovleci</p>
                <ul className="text-xs text-white/60 space-y-1 list-disc list-inside">
                  <li>Trimite 50 / 100 / 200 de mesaje în chat = câte 1 dovleac</li>
                  <li>Timp activ pe platformă: 2 ore active = 1 dovleac</li>
                </ul>
                {status.earn && (
                  <p className="text-[11px] text-white/40 mt-2">
                    Mesaje în eveniment: {status.earn.messages} · Ore active: {Math.floor(status.earn.active_seconds / 3600)}h
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HalloweenEventModal;
