import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import {
  Lightbulb,
  Lock,
  Send,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// Illustrations (uploaded assets)
const IMG = {
  chat: "https://customer-assets-agu9un31.emergentagent.net/job_cartoon-redesign/artifacts/7yo0g6nv_ChatGPT%20Image%20Jul%2029%2C%202026%2C%2001_56_02%20AM.png",
  announcements: "https://customer-assets-agu9un31.emergentagent.net/job_cartoon-redesign/artifacts/nx3w6e5h_ChatGPT%20Image%20Jul%2029%2C%202026%2C%2001_56_56%20AM.png",
  cartoonixland: "https://customer-assets-agu9un31.emergentagent.net/job_cartoon-redesign/artifacts/fr8dlxsa_ChatGPT%20Image%20Jul%2029%2C%202026%2C%2001_57_54%20AM.png",
  suggestions: "https://customer-assets-agu9un31.emergentagent.net/job_cartoon-redesign/artifacts/avepv8cx_ChatGPT%20Image%20Jul%2029%2C%202026%2C%2001_58_56%20AM.png",
  soon: "https://customer-assets-agu9un31.emergentagent.net/job_cartoon-redesign/artifacts/o2f2d6go_ChatGPT%20Image%20Jul%2029%2C%202026%2C%2001_59_48%20AM.png",
};

/**
 * Elegant lobby card — illustration as full background,
 * left-aligned content overlay, glowing colored border,
 * bold CTA button in the accent color.
 */
const LobbyCard = ({
  testid,
  title,
  desc,
  cta,
  accent,
  image,
  locked = false,
  badge,
  onClick,
  span = "lg:col-span-2",
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
      className={`cx-lobby-card group relative rounded-[28px] border overflow-hidden min-h-[260px] sm:min-h-[280px] flex transition-all duration-300 ${span} ${
        disabled ? "cursor-not-allowed" : "cursor-pointer hover:-translate-y-1"
      }`}
      style={{
        borderColor: `${accent}55`,
        boxShadow: `0 0 42px ${accent}20, inset 0 0 0 1px ${accent}22`,
        backgroundColor: "#0a0a0a",
      }}
    >
      {/* Background illustration — right-anchored, covers full card */}
      <div
        className="absolute inset-0 bg-no-repeat transition-transform duration-500 group-hover:scale-[1.03]"
        style={{
          backgroundImage: `url("${image}")`,
          backgroundPosition: "right center",
          backgroundSize: "cover",
        }}
      />
      {/* Left-side gradient overlay so the content stays readable */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.75) 35%, rgba(10,10,10,0.25) 65%, rgba(10,10,10,0) 100%)",
        }}
      />
      {/* Very subtle accent tint overall */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay"
        style={{
          background: `linear-gradient(135deg, ${accent}18 0%, transparent 50%, ${accent}12 100%)`,
        }}
      />

      {/* Badge (top-right) */}
      {badge && (
        <span className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffcc00] text-black text-[11px] font-extrabold tracking-wide shadow-[0_0_18px_rgba(255,204,0,0.45)]">
          <Lock className="h-3 w-3" /> {badge}
        </span>
      )}

      {/* --- Content --- */}
      <div className="relative z-10 flex flex-col p-6 sm:p-7 w-full">
        <h3
          className="font-display italic text-3xl sm:text-4xl leading-[1.05] max-w-[55%]"
          style={{ textShadow: `0 2px 24px ${accent}70` }}
        >
          {title}
        </h3>
        <p className="text-sm text-white/70 mt-3 max-w-[52%] leading-relaxed">
          {desc}
        </p>

        <div className="mt-auto pt-6">
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
                : "hover:brightness-110 hover:pl-6"
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

      <div className="pt-24 px-4 md:px-12 pb-16 max-w-7xl mx-auto relative">
        {/* 6-col grid → row 1: 3× (col-span-2), row 2: 2× (col-span-3) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
          <LobbyCard
            testid="lobby-chat"
            title="Chat"
            desc="Discută cu ceilalți fani Cartoonix"
            cta="Intră în chat"
            accent="#ec1c24"
            image={IMG.chat}
            span="lg:col-span-2"
            onClick={() => navigate("/lobby/chat")}
          />
          <LobbyCard
            testid="lobby-announcements"
            title="Anunțuri importante"
            desc="Ultimele noutăți de la echipă"
            cta="Vezi anunțurile"
            accent="#ffcc00"
            image={IMG.announcements}
            span="lg:col-span-2"
            onClick={() => navigate("/lobby/announcements")}
          />
          <LobbyCard
            testid="lobby-cartoonixland"
            title="Cartoonix Land"
            desc="Zonă de joacă și distracție"
            cta="Explorează"
            accent="#8b5cf6"
            image={IMG.cartoonixland}
            span="lg:col-span-2"
            locked
            badge="ÎN CURÂND!"
          />
          <LobbyCard
            testid="lobby-suggestions"
            title="Cutia cu sugestii"
            desc="Trimite-ne ideile tale (o dată la 24h)"
            cta="Trimite o sugestie"
            accent="#22c55e"
            image={IMG.suggestions}
            span="lg:col-span-3"
            onClick={() => setSugOpen(true)}
          />
          <LobbyCard
            testid="lobby-soon"
            title="Mai multe în curând"
            desc="Pregătim lucruri noi pentru tine"
            cta="Stai aproape"
            accent="#38bdf8"
            image={IMG.soon}
            span="lg:col-span-3"
            locked
            badge="ÎN CURÂND!"
          />
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
                <Send className="h-4 w-4" />{" "}
                {busy ? "Se trimite..." : "Trimite sugestia"}
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
