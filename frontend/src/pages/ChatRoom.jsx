import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { PlusIcon } from "@/components/PlusIcon";
import { MessageText } from "@/components/MessageText";
import { EmojiPicker } from "@/components/EmojiPicker";

const ChatRoom = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const endRef = useRef(null);
  const lastTs = useRef(null);
  const inputRef = useRef(null);

  const applyNew = useCallback((incoming) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const merged = [...prev, ...incoming.filter((m) => !seen.has(m.id))];
      if (merged.length) lastTs.current = merged[merged.length - 1].created_at;
      return merged;
    });
  }, []);

  // initial load
  useEffect(() => {
    api.get("/chat").then((res) => {
      setMessages(res.data);
      if (res.data.length) lastTs.current = res.data[res.data.length - 1].created_at;
    }).catch(() => {});
  }, []);

  // incremental polling (only fetches new messages -> lightweight even with many users)
  useEffect(() => {
    const t = setInterval(() => {
      const params = lastTs.current ? { after: lastTs.current } : {};
      api.get("/chat", { params }).then((res) => applyNew(res.data)).catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [applyNew]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const val = text.trim();
    setText("");
    const { data } = await api.post("/chat", { text: val });
    applyNew([data]);
  };

  const insertEmoji = (name) => {
    setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}:${name}: `);
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <NavBar />
      <div className="pt-16 flex-1 flex flex-col max-w-3xl w-full mx-auto px-4">
        <div className="flex items-center gap-3 py-4">
          <button data-testid="chat-back" onClick={() => navigate("/lobby")} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200">
            <ArrowLeft className="h-5 w-5" /> Lobby
          </button>
          <h1 className="font-display text-3xl">Chat comunitate</h1>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 py-4 border-y border-white/10">
          {messages.length === 0 && (
            <p className="text-center text-white/40 py-10">Fii primul care scrie ceva! 👋</p>
          )}
          {messages.map((m) => {
            const mine = m.user_id === user?.id;
            return (
              <div key={m.id} data-testid="chat-message" className={`flex items-start gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
                <img src={m.avatar || `https://api.dicebear.com/9.x/bottts/svg?seed=${m.name}`} alt="" className="h-8 w-8 rounded-full bg-[#141414] shrink-0" />
                <div className={`max-w-[75%] ${mine ? "text-right" : ""}`}>
                  <p className={`text-xs text-white/40 mb-0.5 px-1 flex items-center gap-1 ${mine ? "justify-end" : ""}`}>
                    {m.name}
                    {m.plus && <PlusIcon className="h-3.5 w-3.5" />}
                  </p>
                  <div
                    data-testid={m.plus ? "chat-bubble-plus" : "chat-bubble"}
                    className={`inline-block px-4 py-2.5 rounded-2xl text-sm break-words ${
                      m.plus
                        ? `cx-plus-bubble font-semibold ${mine ? "rounded-tr-sm" : "rounded-tl-sm"}`
                        : `bg-[#2a2a2a] text-white/90 ${mine ? "rounded-tr-sm" : "rounded-tl-sm"}`
                    }`}
                  >
                    {m.plus && (
                      <>
                        <Sparkles className="cx-sparkle h-3 w-3" style={{ top: 4, right: 6, animationDelay: "0s" }} />
                        <Sparkles className="cx-sparkle h-2.5 w-2.5" style={{ bottom: 5, left: 8, animationDelay: "0.9s" }} />
                      </>
                    )}
                    <span className="relative">
                      <MessageText text={m.text} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="flex gap-2 py-4">
          <EmojiPicker onSelect={insertEmoji} />
          <input
            ref={inputRef}
            data-testid="chat-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Scrie un mesaj..."
            maxLength={500}
            className="flex-1 px-4 py-3 rounded-full bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
          />
          <button data-testid="chat-send" type="submit" className="h-12 w-12 flex items-center justify-center rounded-full bg-[#ec1c24] hover:bg-[#ff2d36] transition-colors duration-200">
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatRoom;
