import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Send, Globe, Lock, Star, Megaphone, AlertTriangle, CheckCircle2, Info, HelpCircle, MoreVertical, Ban, VolumeX, Trash2, Tv, X } from "lucide-react";
import { PlusIcon } from "@/components/PlusIcon";
import { MessageText } from "@/components/MessageText";
import { EmojiPicker } from "@/components/EmojiPicker";
import { chatStyleClasses } from "@/lib/chatStyle";
import { SkinnedBubble } from "@/components/SkinnedBubble";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

const ADMIN_COMMANDS = [
  { cmd: "important", label: "/important", desc: "Mesaj evidențiat auriu", icon: Star },
  { cmd: "announce", label: "/announce", desc: "Anunț oficial (roșu)", icon: Megaphone },
  { cmd: "warn", label: "/warn", desc: "Avertisment (portocaliu)", icon: AlertTriangle },
  { cmd: "success", label: "/success", desc: "Confirmare (verde)", icon: CheckCircle2 },
  { cmd: "info", label: "/info", desc: "Informație (albastru)", icon: Info },
];

const COMMAND_META = {
  important: { className: "cx-cmd cx-cmd-important", icon: Star },
  announce: { className: "cx-cmd cx-cmd-announce", icon: Megaphone },
  warn: { className: "cx-cmd cx-cmd-warn", icon: AlertTriangle },
  success: { className: "cx-cmd cx-cmd-success", icon: CheckCircle2 },
  info: { className: "cx-cmd cx-cmd-info", icon: Info },
};

const MUTE_OPTIONS = [
  { value: "5m", label: "5 minute" },
  { value: "1h", label: "1 oră" },
  { value: "24h", label: "24 ore" },
  { value: "perm", label: "Permanent" },
];

const INITIAL_LIMIT = 25;
const PAGE_SIZE = 25;
const REACTIONS = ["👍", "❤️", "😂"];

const ChatRoom = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState("global");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [quoting, setQuoting] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const endRef = useRef(null);
  const scrollRef = useRef(null);
  const lastTs = useRef(null);
  const oldestTs = useRef(null);
  const autoScroll = useRef(true);
  const inputRef = useRef(null);
  const msgIdsRef = useRef([]);

  const isAdmin = user?.role === "admin";
  const plusLocked = room === "plus" && !user?.plus;

  const applyNew = useCallback((incoming) => {
    if (!incoming || !incoming.length) return;
    autoScroll.current = true;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const merged = [...prev, ...incoming.filter((m) => !seen.has(m.id))];
      if (merged.length) lastTs.current = merged[merged.length - 1].created_at;
      return merged;
    });
  }, []);

  // load on room change
  useEffect(() => {
    setMessages([]);
    lastTs.current = null;
    oldestTs.current = null;
    setHasMore(false);
    if (plusLocked) return;
    autoScroll.current = true;
    api.get("/chat", { params: { room, limit: INITIAL_LIMIT } }).then((res) => {
      const data = res.data?.messages || [];
      setMessages(data);
      setHasMore(!!res.data?.has_more);
      if (data.length) {
        lastTs.current = data[data.length - 1].created_at;
        oldestTs.current = data[0].created_at;
      }
    }).catch(() => {});
  }, [room, plusLocked]);

  // incremental polling
  useEffect(() => {
    if (plusLocked) return;
    const t = setInterval(() => {
      const params = { room, ...(lastTs.current ? { after: lastTs.current } : { limit: INITIAL_LIMIT }) };
      api.get("/chat", { params }).then((res) => applyNew(res.data?.messages || [])).catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [applyNew, room, plusLocked]);

  useEffect(() => {
    if (autoScroll.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // keep latest message ids for the reaction poller
  useEffect(() => {
    msgIdsRef.current = messages.map((m) => m.id).filter(Boolean);
  }, [messages]);

  // poll reactions for currently loaded messages
  useEffect(() => {
    if (plusLocked) return;
    const t = setInterval(() => {
      const ids = msgIdsRef.current;
      if (!ids.length) return;
      api.post("/chat/reactions", { ids }).then((res) => {
        const map = res.data || {};
        setMessages((prev) => prev.map((x) => (map[x.id] ? { ...x, reaction_counts: map[x.id].reaction_counts, my_reaction: map[x.id].my_reaction } : x)));
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [plusLocked, room]);

  const toggleReaction = async (m, emoji) => {
    try {
      const { data } = await api.post(`/chat/${m.id}/react`, { emoji });
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, reaction_counts: data.reaction_counts, my_reaction: data.my_reaction } : x)));
    } catch (err) {
      toast.error(err.response?.data?.detail || "Nu s-a putut adăuga reacția");
    }
  };

  const loadMore = async () => {
    if (!oldestTs.current || loadingMore) return;
    setLoadingMore(true);
    autoScroll.current = false;
    const container = scrollRef.current;
    const prevHeight = container ? container.scrollHeight : 0;
    try {
      const res = await api.get("/chat", { params: { room, before: oldestTs.current, limit: PAGE_SIZE } });
      const older = res.data?.messages || [];
      setHasMore(!!res.data?.has_more);
      if (older.length) {
        oldestTs.current = older[0].created_at;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...older.filter((m) => !seen.has(m.id)), ...prev];
        });
        // preserve scroll position after prepend
        requestAnimationFrame(() => {
          if (container) container.scrollTop = container.scrollHeight - prevHeight;
        });
      }
    } catch { /* ignore */ } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || (!isAdmin && cooldown > 0)) return;
    const val = text.trim();
    const q = quoting;
    setText("");
    setQuoting(null);
    try {
      const payload = { text: val, room };
      if (q) payload.quote = { name: q.name, text: q.text };
      const { data } = await api.post("/chat", payload);
      applyNew([data]);
      if (!isAdmin) setCooldown(10);
    } catch (err) {
      if (err.response?.status === 429) {
        const m = /(\d+)/.exec(err.response?.data?.detail || "");
        setCooldown(m ? parseInt(m[1], 10) : 10);
      }
      setText(val);
      if (q) setQuoting(q);
      toast.error(err.response?.data?.detail || "Nu s-a putut trimite mesajul");
    }
  };

  const quoteMessage = (m) => {
    if (m.deleted || m.is_bot || !m.text) return;
    setQuoting({ id: m.id, name: m.name, text: m.text });
    inputRef.current?.focus();
  };

  const insertEmoji = (name) => {
    setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}:${name}: `);
    inputRef.current?.focus();
  };

  // ---- moderation actions ----
  const doMute = async (m, duration) => {
    try {
      await api.post("/admin/chat/mute", { user_id: m.user_id, duration });
      const lbl = MUTE_OPTIONS.find((o) => o.value === duration)?.label || duration;
      toast.success(`${m.name} a primit mute (${lbl})`);
    } catch (err) { toast.error(err.response?.data?.detail || "Eroare la mute"); }
  };
  const doBan = async (m) => {
    try {
      await api.post("/admin/chat/ban", { user_id: m.user_id });
      toast.success(`${m.name} a fost banat`);
    } catch (err) { toast.error(err.response?.data?.detail || "Eroare la ban"); }
  };
  const doDelete = async (m) => {
    try {
      await api.delete(`/admin/chat/message/${m.id}`);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, deleted: true, text: "" } : x)));
    } catch (err) { toast.error(err.response?.data?.detail || "Eroare la ștergere"); }
  };

  const RoomTab = ({ value, icon: Icon, label, plus }) => (
    <button
      data-testid={`room-${value}`}
      onClick={() => setRoom(value)}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors duration-200 ${
        room === value ? (plus ? "bg-[#ffcc00] text-black" : "bg-[#ec1c24] text-white") : "bg-white/10 text-white/70 hover:bg-white/20"
      }`}
    >
      {plus ? <PlusIcon className="h-4 w-4" /> : <Icon className="h-4 w-4" />} {label}
    </button>
  );

  return (
    <div className="h-screen overflow-hidden bg-[#0a0a0a] text-white flex flex-col">
      <NavBar />
      <div className="pt-16 flex-1 min-h-0 flex flex-col max-w-3xl w-full mx-auto px-4">
        <div className="flex items-center gap-3 py-4 flex-wrap">
          <button data-testid="chat-back" onClick={() => navigate("/lobby")} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200">
            <ArrowLeft className="h-5 w-5" /> Lobby
          </button>
          <h1 className="font-display text-3xl">Chat</h1>
          <div className="flex items-center gap-2 ml-auto">
            <RoomTab value="global" icon={Globe} label="Global" />
            <RoomTab value="plus" label="PLUS" plus />
          </div>
        </div>

        {plusLocked ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 border-y border-white/10">
            <div className="cx-float mb-4"><PlusIcon className="h-16 w-16" /></div>
            <h2 className="font-display text-3xl mb-2 flex items-center gap-2"><Lock className="h-6 w-6 text-[#ffcc00]" /> Camera PLUS</h2>
            <p className="text-white/60 mb-6 max-w-sm">Această cameră de chat este exclusiv pentru membrii Cartoonix PLUS.</p>
            <button data-testid="chat-plus-upsell" onClick={() => navigate("/plus")} className="px-7 py-3 rounded-full bg-[#ffcc00] text-black font-bold hover:brightness-110 transition-all duration-200">
              Devino membru PLUS
            </button>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-3 py-4 border-y border-white/10">
              {hasMore && (
                <div className="flex justify-center pb-1">
                  <button
                    data-testid="chat-load-more"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white/70 hover:bg-white/20 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? "Se încarcă..." : "Afișează mai multe"}
                  </button>
                </div>
              )}
              {messages.length === 0 && (
                <p className="text-center text-white/40 py-10">
                  {room === "plus" ? "Camera PLUS e liniștită... scrie primul! 👑" : "Fii primul care scrie ceva! 👋"}
                </p>
              )}
              {messages.map((m) => {
                // CartoonixTV bot message -> centered ad banner, no name/avatar
                if (m.is_bot) {
                  if (m.deleted) return null;
                  return (
                    <div key={m.id} data-testid="chat-bot-message" className="flex justify-center px-2 py-1">
                      <div className="cx-bot-banner">
                        <Tv className="h-4 w-4 shrink-0 opacity-80" />
                        <span className="align-middle"><MessageText text={m.text} /></span>
                      </div>
                    </div>
                  );
                }
                // Admin command messages -> centered highlighted, no avatar/name
                if (m.command && COMMAND_META[m.command]) {
                  if (m.deleted) return null;
                  const meta = COMMAND_META[m.command];
                  const Icon = meta.icon;
                  return (
                    <div key={m.id} data-testid={`chat-cmd-${m.command}`} className="flex justify-center px-2 py-1">
                      <div className={meta.className}>
                        <Icon className="cx-cmd-icon h-5 w-5 inline-block" />
                        <span className="align-middle"><MessageText text={m.text} /></span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} data-testid="chat-message" className="group flex items-start gap-2.5">
                    <img src={m.avatar || `https://api.dicebear.com/9.x/bottts/svg?seed=${m.name}`} alt="" className="h-8 w-8 rounded-full bg-[#141414] shrink-0" />
                    <div className="max-w-[75%]">
                      <p className="text-xs text-white/40 mb-0.5 px-1 flex items-center gap-1">
                        {m.name}
                        {m.plus && <PlusIcon className="h-3.5 w-3.5" />}
                      </p>
                      {m.quote && !m.deleted && (
                        <div data-testid="chat-quote-preview" className="mb-1 pl-2.5 border-l-2 border-[#ffcc00]/70 bg-white/5 rounded-r-md px-2 py-1">
                          <span className="block text-[11px] font-semibold text-[#ffcc00]/90 truncate">{m.quote.name}</span>
                          <span className="block text-[11px] text-white/50 line-clamp-2 break-words">{m.quote.text}</span>
                        </div>
                      )}
                      {m.deleted ? (
                        <div data-testid="chat-message-deleted" className="inline-block px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm bg-white/5 text-white/40 italic">
                          Acest mesaj a fost șters.
                        </div>
                      ) : m.plus && m.chat_style?.bubble && m.chat_style.bubble !== "none" ? (
                        <div onClick={() => quoteMessage(m)} className="cursor-pointer" title="Click pentru a cita">
                          <SkinnedBubble
                            testId="chat-bubble-plus-skin"
                            skin={m.chat_style.bubble}
                            textClasses={chatStyleClasses(m.chat_style)}
                          >
                            <MessageText text={m.text} />
                          </SkinnedBubble>
                        </div>
                      ) : (
                        <div
                          data-testid={m.plus ? "chat-bubble-plus" : "chat-bubble"}
                          onClick={() => quoteMessage(m)}
                          title="Click pentru a cita"
                          className="inline-block px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm break-words bg-[#2a2a2a] text-white/90 cursor-pointer hover:bg-[#333] transition-colors"
                        >
                          <span className={`relative ${m.plus ? chatStyleClasses(m.chat_style) : ""}`}><MessageText text={m.text} /></span>
                        </div>
                      )}
                      {!m.deleted && (
                        <div className="flex items-center gap-1 mt-1 px-0.5">
                          {REACTIONS.map((emo) => {
                            const count = m.reaction_counts?.[emo] || 0;
                            const mine = m.my_reaction === emo;
                            return (
                              <button
                                key={emo}
                                data-testid={`chat-react-${emo}`}
                                onClick={() => toggleReaction(m, emo)}
                                className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs leading-none transition-all duration-150 ${
                                  mine
                                    ? "bg-[#ffcc00]/20 ring-1 ring-[#ffcc00]/60"
                                    : "bg-white/5 hover:bg-white/15"
                                } ${count === 0 && !mine ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}
                              >
                                <span className="text-sm">{emo}</span>
                                {count > 0 && <span className="text-white/60 tabular-nums">{count}</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {isAdmin && !m.deleted && m.user_id && (
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <button
                            data-testid="chat-mod-trigger"
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity mt-4 h-7 w-7 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10"
                            title="Moderare"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#141414] border-white/10 text-white">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger data-testid="chat-mod-mute" className="focus:bg-white/10 gap-2">
                              <VolumeX className="h-4 w-4 text-orange-400" /> Mute
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="bg-[#141414] border-white/10 text-white">
                              {MUTE_OPTIONS.map((o) => (
                                <DropdownMenuItem key={o.value} data-testid={`chat-mute-${o.value}`} onClick={() => doMute(m, o.value)} className="focus:bg-white/10">
                                  {o.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuItem data-testid="chat-mod-ban" onClick={() => doBan(m)} className="focus:bg-white/10 gap-2 text-red-400">
                            <Ban className="h-4 w-4" /> Ban utilizator
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem data-testid="chat-mod-delete" onClick={() => doDelete(m)} className="focus:bg-white/10 gap-2">
                            <Trash2 className="h-4 w-4" /> Șterge mesajul
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {isAdmin && showCommands && (
              <div data-testid="chat-cmd-help" className="mb-2 rounded-xl bg-[#141414] border border-white/10 p-3">
                <p className="text-xs text-white/50 mb-2 font-semibold uppercase tracking-wider">Comenzi admin</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {ADMIN_COMMANDS.map((c) => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.cmd}
                        type="button"
                        onClick={() => {
                          setText(`/${c.cmd} `);
                          setShowCommands(false);
                          setTimeout(() => inputRef.current?.focus(), 30);
                        }}
                        className="flex items-center gap-2 text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <Icon className="h-4 w-4 text-[#ffcc00] shrink-0" />
                        <span className="text-sm font-mono text-white/90">{c.label}</span>
                        <span className="text-xs text-white/50 truncate">— {c.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <form onSubmit={send} className="flex flex-col gap-2 py-4">
              {quoting && (
                <div data-testid="chat-quote-bar" className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 pl-3 pr-2 py-2">
                  <div className="w-1 self-stretch rounded-full bg-[#ffcc00]/80 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-semibold text-[#ffcc00]/90 truncate">Citezi pe {quoting.name}</span>
                    <span className="block text-xs text-white/50 truncate">{quoting.text}</span>
                  </div>
                  <button
                    type="button"
                    data-testid="chat-quote-cancel"
                    onClick={() => setQuoting(null)}
                    className="h-7 w-7 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 shrink-0"
                    title="Anulează citatul"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <EmojiPicker onSelect={insertEmoji} />
                {isAdmin && (
                  <button
                    type="button"
                    data-testid="chat-cmd-toggle"
                    onClick={() => setShowCommands((v) => !v)}
                    title="Comenzi admin"
                    className={`h-12 w-12 flex items-center justify-center rounded-full border border-white/10 transition-colors duration-200 ${showCommands ? "bg-[#ffcc00] text-black" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
                  >
                    <HelpCircle className="h-5 w-5" />
                  </button>
                )}
                <input
                  ref={inputRef}
                  data-testid="chat-input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={isAdmin ? "Scrie un mesaj sau /important, /announce, /warn..." : (room === "plus" ? "Scrie în camera PLUS..." : "Scrie un mesaj...")}
                  maxLength={120}
                  className="flex-1 px-4 py-3 rounded-full bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                />
                <button
                  data-testid="chat-send"
                  type="submit"
                  disabled={!isAdmin && cooldown > 0}
                  title={!isAdmin && cooldown > 0 ? `Așteaptă ${cooldown}s` : "Trimite"}
                  className="h-12 min-w-12 px-3 flex items-center justify-center rounded-full bg-[#ec1c24] hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!isAdmin && cooldown > 0 ? (
                    <span data-testid="chat-cooldown" className="text-sm font-bold tabular-nums">{cooldown}s</span>
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
              <div className="flex justify-end px-2">
                <span className="text-[11px] text-white/30 tabular-nums">{text.length}/120</span>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatRoom;
