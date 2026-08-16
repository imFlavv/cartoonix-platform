import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { X, MessageCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const HIDDEN_PATHS = ["/login", "/register", "/lobby/chat", "/termeni", "/confidentialitate", "/regulament", "/cookies"];

const ChatWidget = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [cfg, setCfg] = useState(null);
  const [closed, setClosed] = useState(() => sessionStorage.getItem("cx_chat_widget_closed") === "1");

  useEffect(() => {
    api.get("/settings/chat-widget").then((res) => setCfg(res.data)).catch(() => {});
  }, []);

  if (!user || !cfg || !cfg.enabled || closed) return null;
  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  const dismiss = (e) => {
    e.stopPropagation();
    setClosed(true);
    sessionStorage.setItem("cx_chat_widget_closed", "1");
  };

  return (
    <button
      data-testid="chat-widget"
      onClick={() => navigate(cfg.link || "/lobby/chat")}
      className="fixed bottom-4 right-4 z-[60] w-64 h-24 rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(236,28,36,0.35)] border border-[#ec1c24]/40 group animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{
        backgroundImage: `url(${cfg.image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      <span
        onClick={dismiss}
        data-testid="chat-widget-close"
        className="absolute top-1.5 right-1.5 z-10 h-6 w-6 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white transition-colors duration-200"
      >
        <X className="h-3.5 w-3.5" />
      </span>
      <div className="relative h-full flex flex-col justify-center px-4 text-left">
        <div className="flex items-center gap-1.5 mb-1 text-[#ffcc00]">
          <MessageCircle className="h-4 w-4" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Live Chat</span>
        </div>
        <p className="text-white font-display text-lg leading-tight drop-shadow-lg group-hover:text-[#ffcc00] transition-colors duration-200">
          {cfg.text}
        </p>
      </div>
    </button>
  );
};

export default ChatWidget;
