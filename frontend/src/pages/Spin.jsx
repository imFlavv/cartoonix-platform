import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { X, RotateCw, Gift } from "lucide-react";
import { NixCoin } from "@/components/NixCoin";
import { KeyIcon } from "@/components/KeyIcon";

// --- Reward visual catalogue (odds are NEVER shown / sent to the client) ---
const PRIZES = {
  retry: { label: "Mai încearcă", short: "MAI ÎNCEARCĂ", img: null, color: "#8b8f98", tint: "rgba(139,143,152,0.16)", rarity: "COMUN" },
  p5:    { label: "5 NIX",  short: "5 NIX",  img: "/nix/coin.png", color: "#c084fc", tint: "rgba(168,85,247,0.12)", rarity: "COMUN" },
  key:   { label: "1 Cheie Mystery Box", short: "1 CHEIE", img: "/nix/key.png", color: "#ffcc00", tint: "rgba(255,204,0,0.16)", rarity: "SPECIAL" },
  pumpkin: { label: "1 Dovleac", short: "1 DOVLEAC", img: "/halloween/pumpkin-normal.png", color: "#ff7a18", tint: "rgba(255,122,24,0.18)", rarity: "EVENIMENT" },
  p10:   { label: "10 NIX", short: "10 NIX", img: "/nix/coin.png", color: "#c084fc", tint: "rgba(168,85,247,0.18)", rarity: "FOARTE RAR" },
  p15:   { label: "15 NIX", short: "15 NIX", img: "/nix/coin.png", color: "#c084fc", tint: "rgba(168,85,247,0.24)", rarity: "RAR" },
  p50:   { label: "50 NIX", short: "50 NIX", img: "/nix/pile.png", color: "#d8b4fe", tint: "rgba(192,132,252,0.24)", rarity: "EPIC" },
  plus:  { label: "Invitație PLUS", short: "INVITAȚIE PLUS", img: "/nix/scroll.png", color: "#ffcc00", tint: "rgba(255,204,0,0.20)", rarity: "LEGENDAR" },
  avatar_special: { label: "Avatar Halloween", short: "AVATAR SPECIAL", img: "/avatars/halloween-castle-pumpkin.gif", color: "#ef4444", tint: "rgba(239,68,68,0.22)", rarity: "MITIC" },
};
const PRIZE_KEYS = Object.keys(PRIZES);

// --- Sound FX via Web Audio (no asset files needed) ---
let _actx = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!_actx) { try { _actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { _actx = null; } }
  if (_actx && _actx.state === "suspended") _actx.resume().catch(() => {});
  return _actx;
};
const beep = (freq, start, dur, type = "sine", vol = 0.14) => {
  const ctx = getCtx(); if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
  const t = ctx.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.03);
};
const playStop = () => { beep(340, 0, 0.12, "triangle", 0.13); beep(200, 0.05, 0.16, "sine", 0.08); };
const playPoints = () => { beep(660, 0, 0.1, "sine", 0.12); beep(880, 0.09, 0.14, "sine", 0.1); };
const playLegendary = () => { [523, 659, 784, 1047, 1319].forEach((f, i) => beep(f, i * 0.13, 0.4, "triangle", 0.15)); };

const CARD_W = 128;   // card width in px
const GAP = 12;       // margin between cards
const STRIDE = CARD_W + GAP;
const REEL_LEN = 60;  // total cards in the reel
const TARGET = 50;    // index the winner lands on
const START_INDEX = 3;
const SPIN_MS = 6000;

// Cosmetic filler — intentionally uniform so it does NOT reveal real drop rates.
const randKey = () => PRIZE_KEYS[Math.floor(Math.random() * PRIZE_KEYS.length)];
const makeFiller = (len) => Array.from({ length: len }, randKey);

const ReelCard = ({ pkey, won }) => {
  const p = PRIZES[pkey] || PRIZES.retry;
  return (
    <div
      className={`shrink-0 rounded-xl overflow-hidden relative flex flex-col items-center justify-center transition-[filter,transform] duration-300 ${won ? "won-card" : ""}`}
      style={{
        width: CARD_W, marginRight: GAP, height: 150,
        background: `linear-gradient(160deg, ${p.tint}, rgba(10,10,10,0.9))`,
        border: `1px solid ${won ? p.color : "rgba(255,255,255,0.08)"}`,
        boxShadow: won ? `0 0 26px ${p.color}, inset 0 0 20px ${p.tint}` : "none",
        transform: won ? "scale(1.04)" : "none",
      }}
    >
      <span className="absolute top-2 left-0 right-0 text-center text-[10px] font-bold tracking-wider" style={{ color: p.color }}>{p.rarity}</span>
      {p.img ? (
        <img src={p.img} alt={p.label} draggable={false} className="h-14 w-14 object-contain mb-2 mt-2 select-none" />
      ) : (
        <span className="grid place-items-center h-14 w-14 rounded-full mb-2 mt-2" style={{ background: p.tint, color: p.color }}>
          <RotateCw className="h-7 w-7" />
        </span>
      )}
      <span className="text-[11px] font-extrabold tracking-wide text-center px-1 leading-tight" style={{ color: p.color }}>{p.short}</span>
    </div>
  );
};

const Spin = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [spins, setSpins] = useState(0);
  const [points, setPoints] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [reel, setReel] = useState({ cards: makeFiller(REEL_LEN), target: null, id: 0 });
  const [finished, setFinished] = useState(false);

  const trackRef = useRef(null);
  const vpRef = useRef(null);
  const busyRef = useRef(false);

  const load = useCallback(() => {
    api.get("/spin").then((res) => setSpins(res.data.spins || 0)).catch(() => {});
    api.get("/points/me").then((res) => setPoints(res.data.points || 0)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  // Center the idle reel on load / resize.
  useLayoutEffect(() => {
    const track = trackRef.current, vp = vpRef.current;
    if (!track || !vp || reel.target != null) return;
    const x = vp.clientWidth / 2 - (START_INDEX * STRIDE + CARD_W / 2);
    track.style.transition = "none";
    track.style.transform = `translateX(${x}px)`;
  }, [reel]);

  // Run the opening animation whenever a new reel (id) is armed with a target.
  useLayoutEffect(() => {
    if (reel.target == null) return;
    const track = trackRef.current, vp = vpRef.current;
    if (!track || !vp) return;
    const vpw = vp.clientWidth;
    const startX = vpw / 2 - (START_INDEX * STRIDE + CARD_W / 2);
    const jitter = (Math.random() * 2 - 1) * (CARD_W * 0.26);
    const endX = vpw / 2 - (reel.target * STRIDE + CARD_W / 2) + jitter;
    track.style.transition = "none";
    track.style.transform = `translateX(${startX}px)`;
    void track.offsetWidth; // force reflow
    requestAnimationFrame(() => {
      track.style.transition = `transform ${SPIN_MS}ms cubic-bezier(0.1,0.82,0.12,1)`;
      track.style.transform = `translateX(${endX}px)`;
    });
  }, [reel.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openBox = async () => {
    if (busyRef.current || spinning || spins < 1) return;
    busyRef.current = true; // synchronous lock: blocks rapid double-clicks firing extra /spin calls
    getCtx(); // unlock audio on user gesture
    setSpinning(true);
    setResult(null);
    setFinished(false);
    try {
      const { data } = await api.post("/spin");
      const key = data.result?.key || "retry";
      const cards = makeFiller(REEL_LEN);
      cards[TARGET] = key;
      cards[TARGET - 1] = randKey();
      cards[TARGET + 1] = randKey();
      setReel((r) => ({ cards, target: TARGET, id: r.id + 1 }));
      setSpins(data.spins);
      setTimeout(() => {
        setFinished(true);
        setResult(data.result);
        if (typeof data.points === "number") setPoints(data.points);
        setSpinning(false);
        busyRef.current = false;
        refreshUser().catch(() => {});
        playStop();
        if (data.result.type === "points") {
          setTimeout(() => { playPoints(); flyCoins(); }, 160);
          toast.success(`Ai câștigat ${data.result.points} NIX! 🎉`);
        } else if (data.result.type === "key") {
          setTimeout(playPoints, 160);
          toast.success("Ai câștigat o Cheie Mystery Box! 🔑");
        } else if (data.result.type === "pumpkin") {
          setTimeout(playPoints, 160);
          toast.success("Ai câștigat un Dovleac! 🎃");
        } else if (data.result.type === "plus") {
          setTimeout(playLegendary, 180);
          toast.success("Ai câștigat o Invitație Cartoonix PLUS! 👑");
        } else if (data.result.type === "avatar") {
          setTimeout(playLegendary, 180);
          toast.success("Ai câștigat un Avatar Halloween Special! 🎃👑");
        }
      }, SPIN_MS + 250);
    } catch (err) {
      setSpinning(false);
      busyRef.current = false;
      toast.error(err.response?.data?.detail || "Ceva n-a mers. Încearcă din nou.");
      load();
    }
  };

  // NIX coins flying from the reel toward the header wallet pill.
  const flyCoins = () => {
    const pill = document.querySelector('[data-testid="nav-points-pill"]');
    const vp = vpRef.current;
    if (!pill || !vp) return;
    const to = pill.getBoundingClientRect();
    const from = vp.getBoundingClientRect();
    const sx = from.left + from.width / 2, sy = from.top + from.height / 2;
    const ex = to.left + to.width / 2, ey = to.top + to.height / 2;
    for (let i = 0; i < 12; i++) {
      const img = document.createElement("img");
      img.src = "/nix/coin.png";
      img.style.cssText = `position:fixed;left:${sx - 17}px;top:${sy - 17}px;width:34px;height:34px;z-index:9999;pointer-events:none;transform:scale(0.5);opacity:0;transition:transform .95s cubic-bezier(.5,0,.2,1),opacity .95s;filter:drop-shadow(0 0 6px rgba(168,85,247,.8));`;
      document.body.appendChild(img);
      const jx = (Math.random() * 2 - 1) * 90, jy = (Math.random() * 2 - 1) * 50 - 30;
      requestAnimationFrame(() => {
        img.style.opacity = "1";
        img.style.transform = `translate(${jx}px, ${jy}px) scale(1)`;
        setTimeout(() => {
          img.style.transform = `translate(${ex - sx}px, ${ey - sy}px) scale(0.3)`;
          img.style.opacity = "0.15";
        }, 200 + i * 45);
      });
      setTimeout(() => img.remove(), 1500 + i * 45);
    }
    pill.animate([{ transform: "scale(1)" }, { transform: "scale(1.28)" }, { transform: "scale(1)" }], { duration: 520, easing: "ease-out" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <NavBar />
      <div className="pointer-events-none fixed inset-0 opacity-50" style={{
        background: "radial-gradient(circle at 50% 15%, rgba(255,122,24,0.22), transparent 55%), radial-gradient(circle at 80% 90%, rgba(236,28,36,0.18), transparent 55%)",
      }} />

      <div className="relative pt-24 px-4 pb-16 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full bg-[#ff7a18]/15 border border-[#ff7a18]/40 text-[#ff7a18] text-xs font-bold uppercase tracking-widest">
          <Gift className="h-4 w-4" /> Mystery Box
        </div>
        <h1 className="font-display text-5xl md:text-7xl mb-2 tracking-wide">Deschide cutia</h1>
        <p className="text-white/50 mb-8">Folosește o Cheie Mystery Box și descoperă ce premiu îți iese la reveal!</p>

        {/* keys + points badges */}
        <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
          <span data-testid="spin-count" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141414] border border-[#ff7a18]/40 font-bold">
            <KeyIcon className="h-4 w-4" /> {spins} <span className="text-white/50 font-normal">{spins === 1 ? "cheie" : "chei"} Mystery Box</span>
          </span>
          <span data-testid="spin-points" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141414] border border-white/10 font-bold">
            <NixCoin className="h-4 w-4" /> {points} <span className="text-white/50 font-normal">NIX</span>
          </span>
        </div>

        {/* reel */}
        <div className="relative mx-auto max-w-3xl">
          <div
            ref={vpRef}
            data-testid="reel-viewport"
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#161616] to-[#0d0d0d] py-6"
            style={{ boxShadow: "inset 0 0 40px rgba(0,0,0,0.6)" }}
          >
            {/* center marker */}
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 z-20" style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.6))" }}>
              <div style={{ width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderTop: "16px solid #ff7a18" }} />
            </div>
            <div className={`pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px] z-10 ${finished ? "bg-[#ff7a18]" : "bg-[#ff7a18]/70"}`} style={{ boxShadow: "0 0 12px rgba(255,122,24,0.7)" }} />
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-0 z-20" style={{ filter: "drop-shadow(0 -2px 3px rgba(0,0,0,0.6))" }}>
              <div style={{ width: 0, height: 0, borderLeft: "10px solid transparent", borderRight: "10px solid transparent", borderBottom: "16px solid #ff7a18" }} />
            </div>
            {/* edge fades */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-[#0d0d0d] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-[#0d0d0d] to-transparent" />

            <div ref={trackRef} className="flex flex-nowrap will-change-transform" data-testid="reel-track">
              {reel.cards.map((k, i) => (
                <ReelCard key={i} pkey={k} won={finished && reel.target === i} />
              ))}
            </div>
          </div>
        </div>

        {/* open button */}
        <button
          data-testid="spin-button"
          onClick={openBox}
          disabled={spinning || spins < 1}
          className="mt-8 inline-flex items-center gap-2 px-10 py-4 rounded-full bg-[#ff7a18] text-black text-lg font-extrabold uppercase tracking-wide hover:brightness-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-[0_10px_40px_rgba(255,122,24,0.4)]"
        >
          <KeyIcon className={`h-6 w-6 ${spinning ? "animate-pulse" : ""}`} />
          {spinning ? "Se deschide..." : spins < 1 ? "Nu ai chei" : "Deschide cutia"}
        </button>

        {spins < 1 && !spinning && (
          <p data-testid="spin-empty" className="text-white/40 text-sm mt-4">
            Nu ai nicio Cheie Mystery Box. Câștigă chei din evenimentul Halloween.
          </p>
        )}
      </div>

      {/* result modal */}
      {result && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" data-testid="spin-result" onClick={() => setResult(null)}>
          <div className="relative w-full max-w-sm bg-[#141414] border border-white/10 rounded-3xl p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setResult(null)} data-testid="spin-result-close" className="absolute top-4 right-4 text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
            {result.type === "retry" ? (
              <>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-white/5 border border-white/10 grid place-items-center">
                  <RotateCw className="h-8 w-8 text-white/50" />
                </div>
                <h2 className="font-display text-3xl mb-2">Mai încearcă!</h2>
                <p className="text-white/50">N-a fost de data asta. Mai ai {spins} {spins === 1 ? "cheie" : "chei"}.</p>
              </>
            ) : result.type === "pumpkin" ? (
              <>
                <div className="mx-auto mb-4 h-24 w-24 grid place-items-center">
                  <img src="/halloween/pumpkin-normal.png" alt="Dovleac" className="h-24 w-24 object-contain drop-shadow-[0_0_18px_rgba(255,122,24,0.5)]" />
                </div>
                <h2 className="font-display text-3xl mb-2 text-[#ff7a18]">+1 Dovleac! 🎃</h2>
                <p className="text-white/50">Dovleacul a fost adăugat în inventarul tău de Halloween.</p>
              </>
            ) : result.type === "key" ? (
              <>
                <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 grid place-items-center">
                  <KeyIcon className="h-12 w-12" />
                </div>
                <h2 className="font-display text-3xl mb-2 text-[#ffcc00]">+1 Cheie Mystery Box!</h2>
                <p className="text-white/50">O poți folosi pentru încă o deschidere. Ai acum {spins} {spins === 1 ? "cheie" : "chei"}.</p>
              </>
            ) : result.type === "points" ? (
              <>
                <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-[#a855f7]/15 border border-[#a855f7]/40 grid place-items-center">
                  <NixCoin className="h-12 w-12" />
                </div>
                <h2 className="font-display text-4xl mb-2 text-[#c084fc]">+{result.points} NIX!</h2>
                <p className="text-white/50">NIX-ul a fost adăugat în portofelul tău.</p>
              </>
            ) : result.type === "plus" ? (
              <>
                <div className="mx-auto mb-4 h-24 w-24 grid place-items-center">
                  <img src="/nix/scroll.png" alt="Invitație PLUS" className="h-24 w-24 object-contain drop-shadow-[0_0_18px_rgba(255,204,0,0.4)]" />
                </div>
                <h2 className="font-display text-3xl mb-1">Invitație Cartoonix PLUS! 👑</h2>
                <p className="text-white/50 mb-5">A fost adăugată în inventarul tău. O poți revendica pe contul tău sau dărui codul cuiva — direct din inventar.</p>
                <button data-testid="spin-go-inventory" onClick={() => navigate("/profile")} className="w-full py-3 rounded-xl bg-[#a855f7] text-white font-bold hover:bg-[#9333ea] transition-colors">
                  Vezi în inventar
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 h-24 w-24 rounded-2xl overflow-hidden border border-[#ef4444]/50 shadow-[0_0_24px_rgba(239,68,68,0.5)]">
                  <img src="/avatars/halloween-castle-pumpkin.gif" alt="Avatar Halloween Special" className="h-24 w-24 object-cover" />
                </div>
                <h2 className="font-display text-3xl mb-1 text-[#ef4444]">Avatar Halloween Special! 🎃</h2>
                <p className="text-white/50 mb-5">A fost adăugat în inventarul tău. Apasă „REVENDICĂ" din inventar pentru a-l debloca în Setări → Personalizare.</p>
                <button data-testid="spin-go-inventory" onClick={() => navigate("/profile")} className="w-full py-3 rounded-xl bg-[#ef4444] text-white font-bold hover:bg-[#dc2626] transition-colors">
                  Vezi în inventar
                </button>
              </>
            )}
            {result.type !== "plus" && result.type !== "avatar" && (
              <button
                data-testid="spin-again"
                onClick={() => { setResult(null); setFinished(false); }}
                className="mt-6 w-full py-3 rounded-xl bg-[#ff7a18] text-black font-bold hover:brightness-110 transition-colors"
              >
                {spins >= 1 ? "Continuă" : "Am înțeles"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Spin;
