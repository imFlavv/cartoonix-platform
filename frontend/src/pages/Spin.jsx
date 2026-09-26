import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Copy, X, KeyRound, RotateCw, Gift } from "lucide-react";
import { NixCoin } from "@/components/NixCoin";

// --- Reward visual catalogue (odds are NEVER shown / sent to the client) ---
const PRIZES = {
  retry: { label: "Mai încearcă", short: "MAI ÎNCEARCĂ", img: null, color: "#8b8f98", tint: "rgba(139,143,152,0.16)", rarity: "COMUN" },
  p5:    { label: "5 NIX",  short: "5 NIX",  img: "/nix/coin.png", color: "#c084fc", tint: "rgba(168,85,247,0.12)", rarity: "COMUN" },
  p10:   { label: "10 NIX", short: "10 NIX", img: "/nix/coin.png", color: "#c084fc", tint: "rgba(168,85,247,0.18)", rarity: "NECOMUN" },
  p15:   { label: "15 NIX", short: "15 NIX", img: "/nix/coin.png", color: "#c084fc", tint: "rgba(168,85,247,0.24)", rarity: "RAR" },
  p50:   { label: "50 NIX", short: "50 NIX", img: "/nix/pile.png", color: "#d8b4fe", tint: "rgba(192,132,252,0.24)", rarity: "EPIC" },
  plus:  { label: "Invitație PLUS", short: "INVITAȚIE PLUS", img: "/nix/scroll.png", color: "#ffcc00", tint: "rgba(255,204,0,0.20)", rarity: "LEGENDAR" },
};
const PRIZE_KEYS = Object.keys(PRIZES);

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
      <span className="absolute top-1.5 left-2 text-[9px] font-mono tracking-wider text-white/30">VLT</span>
      <span className="absolute top-1.5 right-2 text-[9px] font-bold tracking-wider" style={{ color: p.color }}>{p.rarity}</span>
      {p.img ? (
        <img src={p.img} alt={p.label} draggable={false} className="h-14 w-14 object-contain mb-2 select-none" />
      ) : (
        <span className="grid place-items-center h-14 w-14 rounded-full mb-2" style={{ background: p.tint, color: p.color }}>
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
    if (spinning || spins < 1) return;
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
        refreshUser().catch(() => {});
        if (data.result.type === "points") toast.success(`Ai câștigat ${data.result.points} NIX! 🎉`);
        else if (data.result.type === "plus") toast.success("Ai câștigat o Invitație Cartoonix PLUS! 👑");
      }, SPIN_MS + 250);
    } catch (err) {
      setSpinning(false);
      toast.error(err.response?.data?.detail || "Ceva n-a mers. Încearcă din nou.");
      load();
    }
  };

  const copyCode = async (code) => {
    try { await navigator.clipboard.writeText(code); toast.success("Cod copiat!"); }
    catch { toast.error("Nu am putut copia codul"); }
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
            <KeyRound className="h-4 w-4 text-[#ff7a18]" /> {spins} <span className="text-white/50 font-normal">{spins === 1 ? "cheie" : "chei"} Mystery Box</span>
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
          <KeyRound className={`h-6 w-6 ${spinning ? "animate-pulse" : ""}`} />
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
            ) : result.type === "points" ? (
              <>
                <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-[#a855f7]/15 border border-[#a855f7]/40 grid place-items-center">
                  <NixCoin className="h-12 w-12" />
                </div>
                <h2 className="font-display text-4xl mb-2 text-[#c084fc]">+{result.points} NIX!</h2>
                <p className="text-white/50">NIX-ul a fost adăugat în portofelul tău.</p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 h-24 w-24 grid place-items-center">
                  <img src="/nix/scroll.png" alt="Invitație PLUS" className="h-24 w-24 object-contain drop-shadow-[0_0_18px_rgba(255,204,0,0.4)]" />
                </div>
                <h2 className="font-display text-3xl mb-1">Invitație Cartoonix PLUS! 👑</h2>
                <p className="text-white/50 mb-4">Ai câștigat un cod PLUS. Îl poți folosi tu sau dărui unui prieten.</p>
                <div className="flex items-center gap-2 justify-center mb-4">
                  <code data-testid="spin-voucher-code" className="px-4 py-2 rounded-lg bg-black/40 border border-[#ffcc00]/40 text-[#ffcc00] font-mono tracking-widest text-lg">{result.voucher_code}</code>
                  <button onClick={() => copyCode(result.voucher_code)} data-testid="spin-copy-code" className="h-10 w-10 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 transition"><Copy className="h-4 w-4" /></button>
                </div>
                <button onClick={() => navigate("/rewards")} className="text-[#ffcc00] font-semibold hover:underline text-sm">Mergi la Recompense pentru a-l folosi</button>
              </>
            )}
            {result.type !== "plus" && (
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
