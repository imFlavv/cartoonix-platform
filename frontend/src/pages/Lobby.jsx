import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { MessagesSquare, Megaphone, Gamepad2, Lightbulb, Sparkles, Lock, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const Card = ({ testid, icon: Icon, title, desc, accent, locked, badge, onClick }) => (
  <button
    data-testid={testid}
    onClick={locked ? undefined : onClick}
    className={`group relative text-left rounded-3xl p-7 border border-white/10 overflow-hidden transition-all duration-300 ${
      locked ? "cursor-not-allowed opacity-70" : "hover:scale-[1.02] hover:border-white/20"
    }`}
    style={{ background: "#101010" }}
  >
    <div
      className="absolute -top-16 -right-16 h-40 w-40 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"
      style={{ background: accent }}
    />
    <div className="relative flex items-start justify-between">
      <span className="flex items-center justify-center h-14 w-14 rounded-2xl" style={{ background: `${accent}22` }}>
        <Icon className="h-7 w-7" style={{ color: accent }} />
      </span>
      {badge && (
        <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#ffcc00] text-black text-xs font-bold">
          {locked && <Lock className="h-3 w-3" />} {badge}
        </span>
      )}
    </div>
    <h3 className="relative font-display text-3xl mt-5">{title}</h3>
    <p className="relative text-sm text-white/60 mt-1">{desc}</p>
  </button>
);

const Lobby = () => {
  const navigate = useNavigate();
  const [sugOpen, setSugOpen] = useState(false);
  const [text, setText] = useState("");
  const [canSuggest, setCanSuggest] = useState(true);
  const [nextAt, setNextAt] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadCan = () => {
    api.get("/suggestions/can").then((res) => {
      setCanSuggest(res.data.can);
      setNextAt(res.data.next_at);
    }).catch(() => {});
  };

  useEffect(() => { loadCan(); }, []);

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
    ? new Date(nextAt).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-24 px-4 md:px-12 pb-16 max-w-6xl mx-auto">
        <h1 className="font-display text-5xl md:text-6xl mb-2">Lobby</h1>
        <p className="text-white/50 mb-10">Alege unde vrei să intri</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Card testid="lobby-chat" icon={MessagesSquare} title="Chat" desc="Discută cu ceilalți fani Cartoonix" accent="#ec1c24" onClick={() => navigate("/lobby/chat")} />
          <Card testid="lobby-announcements" icon={Megaphone} title="Anunțuri importante" desc="Ultimele noutăți de la echipă" accent="#ffcc00" onClick={() => navigate("/lobby/announcements")} />
          <Card testid="lobby-cartoonixland" icon={Gamepad2} title="Cartoonix Land" desc="Zonă de joacă și distracție" accent="#8b5cf6" locked badge="ÎN CURÂND!" />
          <Card testid="lobby-suggestions" icon={Lightbulb} title="Cutia cu sugestii" desc="Trimite-ne ideile tale (o dată la 24h)" accent="#22c55e" onClick={() => setSugOpen(true)} />
          <Card testid="lobby-soon" icon={Sparkles} title="Mai multe în curând" desc="Pregătim lucruri noi pentru tine" accent="#38bdf8" locked badge="ÎN CURÂND!" />
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
              <button data-testid="suggestion-submit" onClick={submit} disabled={busy} className="w-full py-3 rounded-lg bg-[#22c55e] text-black font-bold hover:brightness-110 transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2">
                <Send className="h-4 w-4" /> {busy ? "Se trimite..." : "Trimite sugestia"}
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <Lock className="h-8 w-8 mx-auto text-white/40 mb-3" />
              <p className="text-white/70">Ai trimis deja o sugestie recent.</p>
              {nextTime && <p className="text-sm text-white/50 mt-1">Poți trimite din nou pe {nextTime}.</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Lobby;
