import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Sparkles, RotateCw, Coins, Copy, PartyPopper, X } from "lucide-react";

const SEG = 8;
const STEP = 360 / SEG;
const CX = 160, CY = 160, R = 152;

const rad = (a) => (a * Math.PI) / 180;
const pt = (a, r = R) => [CX + r * Math.sin(rad(a)), CY - r * Math.cos(rad(a))];

function sectorPath(i) {
  const [x1, y1] = pt(i * STEP);
  const [x2, y2] = pt((i + 1) * STEP);
  return `M ${CX} ${CY} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

const Spin = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [segments, setSegments] = useState([]);
  const [spins, setSpins] = useState(0);
  const [points, setPoints] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const rotRef = useRef(0);

  const load = useCallback(() => {
    api.get("/spin").then((res) => { setSegments(res.data.segments || []); setSpins(res.data.spins || 0); }).catch(() => {});
    api.get("/points/me").then((res) => setPoints(res.data.points || 0)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const spin = async () => {
    if (spinning || spins < 1) return;
    setSpinning(true);
    setResult(null);
    try {
      const { data } = await api.post("/spin");
      const i = data.segment_index;
      // land segment i center under the top pointer, spinning forward 6 full turns
      const targetWithin = (360 - (i * STEP + STEP / 2));
      const delta = 360 * 6 + (((targetWithin - (rotRef.current % 360)) % 360) + 360) % 360;
      rotRef.current += delta;
      setRotation(rotRef.current);
      setSpins(data.spins);
      // reveal after the CSS transition (5s)
      setTimeout(() => {
        setResult(data.result);
        if (typeof data.points === "number") setPoints(data.points);
        setSpinning(false);
        refreshUser().catch(() => {});
        if (data.result.type === "points") toast.success(`Ai câștigat ${data.result.points} puncte! 🎉`);
        else if (data.result.type === "plus") toast.success("Ai câștigat o Invitație Cartoonix PLUS! 👑");
      }, 5100);
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
      {/* ambient glow */}
      <div className="pointer-events-none fixed inset-0 opacity-50" style={{
        background: "radial-gradient(circle at 50% 25%, rgba(236,28,36,0.25), transparent 55%), radial-gradient(circle at 80% 90%, rgba(255,204,0,0.18), transparent 55%)",
      }} />

      <div className="relative pt-24 px-4 pb-16 max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 text-[#ffcc00] text-xs font-bold uppercase tracking-widest">
          <Sparkles className="h-4 w-4" /> Roata Norocului
        </div>
        <h1 className="font-display text-5xl md:text-7xl mb-2 tracking-wide">Învârte roata</h1>
        <p className="text-white/50 mb-8">Fiecare rotire îți poate aduce puncte sau chiar o Invitație Cartoonix PLUS!</p>

        {/* spins + points badges */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span data-testid="spin-count" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141414] border border-white/10 font-bold">
            <RotateCw className="h-4 w-4 text-[#ffcc00]" /> {spins} <span className="text-white/50 font-normal">rotiri</span>
          </span>
          <span data-testid="spin-points" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141414] border border-white/10 font-bold">
            <Coins className="h-4 w-4 text-[#ffcc00]" /> {points} <span className="text-white/50 font-normal">puncte</span>
          </span>
        </div>

        {/* wheel */}
        <div className="relative mx-auto w-[320px] h-[360px] select-none">
          {/* pointer */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 z-20" style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.5))" }}>
            <div style={{ width: 0, height: 0, borderLeft: "16px solid transparent", borderRight: "16px solid transparent", borderTop: "26px solid #ffcc00" }} />
          </div>

          <svg
            width="320" height="320" viewBox="0 0 320 320"
            className="absolute top-5 left-0"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? "transform 5s cubic-bezier(0.17,0.67,0.16,0.99)" : "none",
              filter: "drop-shadow(0 0 30px rgba(236,28,36,0.35))",
            }}
          >
            <circle cx={CX} cy={CY} r={R + 6} fill="#1a1a1a" stroke="#ffcc00" strokeWidth="4" />
            {segments.map((s, i) => {
              const mid = i * STEP + STEP / 2;
              const [tx, ty] = pt(mid, R * 0.62);
              let rotText = mid;
              if (mid > 90 && mid < 270) rotText = mid + 180;
              return (
                <g key={i}>
                  <path d={sectorPath(i)} fill={s.color} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                  <text
                    x={tx} y={ty} fill={s.text} fontSize="14" fontWeight="700"
                    textAnchor="middle" dominantBaseline="middle"
                    transform={`rotate(${rotText} ${tx} ${ty})`}
                    style={{ pointerEvents: "none" }}
                  >
                    {s.label}
                  </text>
                </g>
              );
            })}
            {/* hub */}
            <circle cx={CX} cy={CY} r="26" fill="#0a0a0a" stroke="#ffcc00" strokeWidth="3" />
          </svg>
        </div>

        {/* spin button */}
        <button
          data-testid="spin-button"
          onClick={spin}
          disabled={spinning || spins < 1}
          className="mt-8 inline-flex items-center gap-2 px-10 py-4 rounded-full bg-[#ec1c24] text-white text-lg font-extrabold uppercase tracking-wide hover:bg-[#ff2d36] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-[0_10px_40px_rgba(236,28,36,0.4)]"
        >
          <RotateCw className={`h-6 w-6 ${spinning ? "animate-spin" : ""}`} />
          {spinning ? "Se învârte..." : spins < 1 ? "Nu ai rotiri" : "Învârte!"}
        </button>

        {spins < 1 && !spinning && (
          <p data-testid="spin-empty" className="text-white/40 text-sm mt-4">
            Nu mai ai rotiri. Rotirile pot fi oferite de un administrator.
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
                <p className="text-white/50">N-a fost de data asta. Mai ai {spins} {spins === 1 ? "rotire" : "rotiri"}.</p>
              </>
            ) : result.type === "points" ? (
              <>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 grid place-items-center">
                  <Coins className="h-8 w-8 text-[#ffcc00]" />
                </div>
                <h2 className="font-display text-4xl mb-2 text-[#ffcc00]">+{result.points} puncte!</h2>
                <p className="text-white/50">Punctele au fost adăugate în portofelul tău.</p>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-[#ec1c24]/15 border border-[#ec1c24]/40 grid place-items-center">
                  <PartyPopper className="h-8 w-8 text-[#ec1c24]" />
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
                onClick={() => { setResult(null); }}
                className="mt-6 w-full py-3 rounded-xl bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors"
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
