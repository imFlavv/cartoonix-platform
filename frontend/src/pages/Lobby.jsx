import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import {
  MessagesSquare,
  Megaphone,
  Gamepad2,
  Lightbulb,
  Sparkles,
  Lock,
  Send,
  ChevronRight,
  Heart,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

/**
 * Elegant lobby card — colored gradient background, glowing border,
 * decorative icon in the right area, colored CTA button at the bottom.
 */
const LobbyCard = ({
  testid,
  icon: Icon,
  title,
  desc,
  cta,
  accent, // hex like #ec1c24
  locked = false,
  badge,
  onClick,
  span = "lg:col-span-2", // default: 3 cards per row on lg (2+2+2 of 6)
}) => {
  const disabled = locked;

  return (
    <div
      data-testid={testid}
      onClick={disabled ? undefined : onClick}
      role={disabled ? undefined : "button"}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`cx-lobby-card group relative rounded-[28px] border overflow-hidden p-6 sm:p-7 min-h-[240px] flex flex-col transition-all duration-300 ${span} ${
        disabled ? "cursor-not-allowed opacity-95" : "cursor-pointer hover:-translate-y-1"
      }`}
      style={{
        background: `linear-gradient(135deg, ${accent}26 0%, #0a0a0a 55%, ${accent}14 100%)`,
        borderColor: `${accent}66`,
        boxShadow: `0 0 40px ${accent}18, inset 0 0 30px ${accent}10`,
      }}
    >
      {/* Decorative colored radial glow on the right */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-2/3"
        style={{
          background: `radial-gradient(circle at 75% 50%, ${accent}55 0%, transparent 55%)`,
        }}
      />
      {/* Big ghost icon on the right (illustration substitute) */}
      <Icon
        className="pointer-events-none absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 h-40 w-40 sm:h-48 sm:w-48 opacity-25 drop-shadow-[0_0_30px_currentColor] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
        style={{ color: accent }}
        strokeWidth={1.4}
      />
      {/* Subtle sparkle accents */}
      <Sparkles
        className="pointer-events-none absolute top-6 right-8 h-3.5 w-3.5 opacity-70"
        style={{ color: accent }}
      />
      <Sparkles
        className="pointer-events-none absolute bottom-16 right-24 h-2.5 w-2.5 opacity-50"
        style={{ color: accent }}
      />

      {/* --- Content --- */}
      <div className="relative flex items-start justify-between">
        <span
          className="flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-2xl border"
          style={{
            background: `linear-gradient(135deg, ${accent}33, ${accent}0f)`,
            borderColor: `${accent}66`,
            boxShadow: `0 0 18px ${accent}55`,
          }}
        >
          <Icon className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: accent }} strokeWidth={2.2} />
        </span>

        {badge && (
          <span
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffcc00] text-black text-[11px] font-extrabold tracking-wide shadow-[0_0_16px_rgba(255,204,0,0.4)]"
          >
            <Lock className="h-3 w-3" /> {badge}
          </span>
        )}
      </div>

      <h3
        className="relative font-display text-3xl sm:text-4xl leading-tight mt-6 max-w-[55%]"
        style={{ textShadow: `0 2px 20px ${accent}55` }}
      >
        {title}
      </h3>
      <p className="relative text-sm text-white/65 mt-2 max-w-[55%] leading-relaxed">
        {desc}
      </p>

      <div className="relative mt-auto pt-6">
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onClick?.();
          }}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-[13px] tracking-wide uppercase transition-all duration-200 ${
            disabled
              ? "bg-white/10 text-white/40 cursor-not-allowed"
              : "hover:brightness-110 hover:pl-6 shadow-lg"
          }`}
          style={
            disabled
              ? undefined
              : {
                  background: accent,
                  color: "#0a0a0a",
                  boxShadow: `0 6px 22px ${accent}66`,
                }
          }
        >
          {cta}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const Lobby = () => {
  const navigate = useNavigate();
  const [sugOpen, setSugOpen] = useState(false);
  const [text, setText] = useState("");
  const [canSuggest, setCanSuggest] = useState(true);
  const [nextAt, setNextAt] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadCan = () => {
    api
      .get("/suggestions/can")
      .then((res) => {
        setCanSuggest(res.data.can);
        setNextAt(res.data.next_at);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadCan();
  }, []);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api.post("/suggestions", { text: text.trim() });
      toast.success("Mulțumim! Sugestia ta a fost trimisă 💡");
      setText("");
      setSugOpen(false);
      loadCan();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Nu s-a putut trimite");
    } finally {
      setBusy(false);
    }
  };

  const nextTime = nextAt
    ? new Date(nextAt).toLocaleString("ro-RO", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
      <NavBar />

      {/* Faint background TV silhouette in the top-right (nostalgia touch) */}
      <div className="pointer-events-none absolute top-16 right-8 opacity-[0.04] hidden md:block">
        <svg width="360" height="360" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.6">
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M8 3l4 3 4-3" />
          <circle cx="18" cy="20" r="0.5" fill="currentColor" />
        </svg>
      </div>

      <div className="pt-24 px-4 md:px-12 pb-16 max-w-7xl mx-auto relative">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-display text-5xl md:text-6xl tracking-wider">Lobby</h1>
          <Sparkles className="h-6 w-6 text-[#ffcc00] mt-2" />
        </div>
        <p className="text-white/50 mb-10">Alege unde vrei să intri</p>

        {/* 6-column grid → row 1: 3× (col-span-2), row 2: 2× (col-span-3) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
          <LobbyCard
            testid="lobby-chat"
            icon={MessagesSquare}
            title="Chat"
            desc="Discută cu ceilalți fani Cartoonix"
            cta="Intră în chat"
            accent="#ec1c24"
            span="lg:col-span-2"
            onClick={() => navigate("/lobby/chat")}
          />
          <LobbyCard
            testid="lobby-announcements"
            icon={Megaphone}
            title="Anunțuri importante"
            desc="Ultimele noutăți de la echipă"
            cta="Vezi anunțurile"
            accent="#ffcc00"
            span="lg:col-span-2"
            onClick={() => navigate("/lobby/announcements")}
          />
          <LobbyCard
            testid="lobby-cartoonixland"
            icon={Gamepad2}
            title="Cartoonix Land"
            desc="Zonă de joacă și distracție"
            cta="Explorează"
            accent="#8b5cf6"
            span="lg:col-span-2"
            locked
            badge="ÎN CURÂND!"
          />
          <LobbyCard
            testid="lobby-suggestions"
            icon={Lightbulb}
            title="Cutia cu sugestii"
            desc="Trimite-ne ideile tale (o dată la 24h)"
            cta="Trimite o sugestie"
            accent="#22c55e"
            span="lg:col-span-3"
            onClick={() => setSugOpen(true)}
          />
          <LobbyCard
            testid="lobby-soon"
            icon={Sparkles}
            title="Mai multe în curând"
            desc="Pregătim lucruri noi pentru tine"
            cta="Stai aproape"
            accent="#38bdf8"
            span="lg:col-span-3"
            locked
            badge="ÎN CURÂND!"
          />
        </div>

        {/* Footer strip */}
        <div className="mt-12 flex justify-center">
          <div className="flex items-center gap-3 text-sm text-white/60 bg-white/[0.03] border border-white/10 rounded-full px-5 py-2">
            <Heart className="h-4 w-4 text-[#ec1c24] fill-[#ec1c24]" />
            <span>Cartoonix este creat pentru voi.</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8b5cf6]" /> Comunitate
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffcc00]" /> Distracție
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" /> Nostalgie
            </span>
          </div>
        </div>
      </div>

      <Dialog open={sugOpen} onOpenChange={setSugOpen}>
        <DialogContent className="bg-[#141414] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-[#22c55e]" /> Cutia cu sugestii
            </DialogTitle>
          </DialogHeader>
          {canSuggest ? (
            <>
              <textarea
                data-testid="suggestion-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="Ce desen ți-ar plăcea să adăugăm? Ce funcție îți dorești?"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#22c55e] text-sm"
              />
              <button
                data-testid="suggestion-submit"
                onClick={submit}
                disabled={busy}
                className="w-full py-3 rounded-lg bg-[#22c55e] text-black font-bold hover:brightness-110 transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" /> {busy ? "Se trimite..." : "Trimite sugestia"}
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <Lock className="h-8 w-8 mx-auto text-white/40 mb-3" />
              <p className="text-white/70">Ai trimis deja o sugestie recent.</p>
              {nextTime && (
                <p className="text-sm text-white/50 mt-1">
                  Poți trimite din nou pe {nextTime}.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Lobby;
