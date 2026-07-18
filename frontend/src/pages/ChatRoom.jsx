import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Send } from "lucide-react";

const ChatRoom = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const endRef = useRef(null);

  const load = () => api.get("/chat").then((res) => setMessages(res.data)).catch(() => {});

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const val = text.trim();
    setText("");
    const { data } = await api.post("/chat", { text: val });
    setMessages((m) => [...m, data]);
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
                  <p className="text-xs text-white/40 mb-0.5 px-1">{m.name}</p>
                  <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm ${mine ? "bg-[#ec1c24] rounded-tr-sm" : "bg-[#1c1c1c] rounded-tl-sm"}`}>
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="flex gap-2 py-4">
          <input
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
