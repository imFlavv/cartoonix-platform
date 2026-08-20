import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, MessageCircle, Crown } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const HIDDEN_PATHS = ["/login", "/register", "/lobby/chat", "/land", "/termeni", "/confidentialitate", "/regulament", "/cookies"];

const META = {
  chat: { label: "Live Chat", Icon: MessageCircle, accent: "#ec1c24", border: "rgba(236,28,36,0.4)", glow: "rgba(236,28,36,0.35)" },
  plus: { label: "Cartoonix PLUS", Icon: Crown, accent: "#ffcc00", border: "rgba(255,204,0,0.45)", glow: "rgba(255,204,0,0.3)" },
};

const WidgetCard = ({ w, front, onClick, onClose }) => {
  const meta = META[w.id];
  const { Icon } = meta;
  return (
    <div
      className="absolute bottom-0 right-0 w-64 h-24 transition-all duration-500 ease-out"
      style={{
        zIndex: front ? 20 : 10,
        transform: front ? "translate(0,0) scale(1)" : "translate(10px,-12px) scale(0.95)",
        opacity: front ? 1 : 0.55,
        pointerEvents: front ? "auto" : "none",
      }}
    >
      <button
        data-testid={`widget-${w.id}`}
        onClick={onClick}
        className="relative w-full h-full rounded-2xl overflow-hidden group block"
        style={{
          backgroundImage: `url(${w.image_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          border: `1px solid ${meta.border}`,
          boxShadow: front ? `0 10px 40px ${meta.glow}` : "0 6px 20px rgba(0,0,0,0.4)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="relative h-full flex flex-col justify-center px-4 text-left">
          <div className="flex items-center gap-1.5 mb-1" style={{ color: meta.accent }}>
            <Icon className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{meta.label}</span>
          </div>
          <p className="text-white font-display text-lg leading-tight drop-shadow-lg group-hover:opacity-90 transition-opacity duration-200">
            {w.text}
          </p>
        </div>
      </button>
      {front && (
        <span
          onClick={onClose}
          data-testid={`widget-${w.id}-close`}
          className="absolute top-1.5 right-1.5 z-10 h-6 w-6 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white cursor-pointer transition-colors duration-200"
        >
          <X className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
};

const ChatWidget = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [widgets, setWidgets] = useState([]);
  const [closed, setClosed] = useState({}); // in-memory only -> reappears on refresh
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get("/settings/chat-widget").then((r) => ({ id: "chat", ...r.data })).catch(() => null),
      api.get("/settings/plus-widget").then((r) => ({ id: "plus", ...r.data })).catch(() => null),
    ]).then((res) => setWidgets(res.filter((w) => w && w.enabled)));
  }, []);

  const visible = widgets.filter((w) => !closed[w.id]);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (visible.length > 1) {
      timerRef.current = setInterval(() => {
        setActive((a) => (a + 1) % visible.length);
      }, 6000);
    }
    return () => clearInterval(timerRef.current);
  }, [visible.length]);

  if (!user || visible.length === 0) return null;
  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  const frontIdx = active % visible.length;
  const frontW = visible[frontIdx];
  const backW = visible.length > 1 ? visible[(frontIdx + 1) % visible.length] : null;

  const closeWidget = (e, id) => {
    e.stopPropagation();
    setClosed((c) => ({ ...c, [id]: true }));
    setActive(0);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-64 h-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {backW && <WidgetCard w={backW} front={false} onClick={() => {}} onClose={() => {}} />}
      <WidgetCard
        w={frontW}
        front
        onClick={() => navigate(frontW.link || "/home")}
        onClose={(e) => closeWidget(e, frontW.id)}
      />
    </div>
  );
};

export default ChatWidget;
