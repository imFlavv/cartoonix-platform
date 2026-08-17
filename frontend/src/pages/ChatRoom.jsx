import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft, Send, Hash, Lock, Users, Gift, Plus, Star, Megaphone, AlertTriangle,
  CheckCircle2, Info, MoreVertical, Ban, VolumeX, Trash2, Tv, X, Pin, PinOff, Trophy, MessageSquare, Radio, Hexagon,
} from "lucide-react";
import { PlusIcon } from "@/components/PlusIcon";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { MessageText } from "@/components/MessageText";
import { EmojiPicker } from "@/components/EmojiPicker";
import { chatStyleClasses } from "@/lib/chatStyle";
import { SkinnedBubble } from "@/components/SkinnedBubble";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";

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

const QUICK_RULES = [
  "Fii respectuos cu toți utilizatorii",
  "Nu folosi cuvinte jignitoare",
  "Fără spam sau reclame",
  "Respectă moderatorii",
];

const INITIAL_LIMIT = 25;
const PAGE_SIZE = 25;
const REACTIONS = ["👍", "❤️", "😂"];

const compact = (n) => {
  n = n || 0;
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(".0", "") + "K";
  return String(n);
};
const roNum = (n) => (n || 0).toLocaleString("ro-RO");
const fmtTime = (iso) => {
  try { return new Date(iso).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
};

const ChatRoom = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState("global");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [quoting, setQuoting] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [stats, setStats] = useState(null);
  const [board, setBoard] = useState([]);
  const [pinned, setPinned] = useState([]);
  const [dismissed, setDismissed] = useState(() => new Set());

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
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const merged = [...prev, ...incoming.filter((m) => !seen.has(m.id))];
      if (merged.length) lastTs.current = merged[merged.length - 1].created_at;
      return merged;
    });
  }, []);

  const onScroll = () => {
    const c = scrollRef.current;
    if (!c) return;
    const dist = c.scrollHeight - c.scrollTop - c.clientHeight;
    autoScroll.current = dist < 80;
  };

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
    api.get("/chat/pinned", { params: { room } }).then((r) => setPinned(r.data?.pinned || [])).catch(() => {});
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
    if (autoScroll.current) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => { msgIdsRef.current = messages.map((m) => m.id).filter(Boolean); }, [messages]);

  // reactions poll
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

  // chat presence heartbeat
  useEffect(() => {
    const ping = () => api.post("/chat/heartbeat").catch(() => {});
    ping();
    const t = setInterval(ping, 20000);
    return () => clearInterval(t);
  }, []);

  // stats + leaderboard + pinned polling
  useEffect(() => {
    const loadStats = () => api.get("/chat/stats").then((r) => setStats(r.data)).catch(() => {});
    const loadBoard = () => api.get("/chat/leaderboard").then((r) => setBoard(r.data?.top || [])).catch(() => {});
    const loadPinned = () => api.get("/chat/pinned", { params: { room } }).then((r) => setPinned(r.data?.pinned || [])).catch(() => {});
    loadStats(); loadBoard();
    const s = setInterval(loadStats, 30000);
    const b = setInterval(loadBoard, 60000);
    const p = setInterval(loadPinned, 20000);
    return () => { clearInterval(s); clearInterval(b); clearInterval(p); };
  }, [room]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

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
        requestAnimationFrame(() => { if (container) container.scrollTop = container.scrollHeight - prevHeight; });
      }
    } catch { /* ignore */ } finally { setLoadingMore(false); }
  };

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
      autoScroll.current = true;
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

  const insertEmoji = (name) => {
    setText((t) => `${t}${t && !t.endsWith(" ") ? " " : ""}:${name}: `);
    inputRef.current?.focus();
  };

  const quoteMessage = (m) => {
    if (m.deleted || m.is_bot || !m.text) return;
    setQuoting({ id: m.id, name: m.name, text: m.text });
    inputRef.current?.focus();
  };

  const toggleReaction = async (m, emoji) => {
    try {
      const { data } = await api.post(`/chat/${m.id}/react`, { emoji });
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, reaction_counts: data.reaction_counts, my_reaction: data.my_reaction } : x)));
    } catch (err) { toast.error(err.response?.data?.detail || "Nu s-a putut adăuga reacția"); }
  };

  // moderation
  const doMute = async (m, duration) => {
    try {
      await api.post("/admin/chat/mute", { user_id: m.user_id, duration });
      const lbl = MUTE_OPTIONS.find((o) => o.value === duration)?.label || duration;
      toast.success(`${m.name} a primit mute (${lbl})`);
    } catch (err) { toast.error(err.response?.data?.detail || "Eroare la mute"); }
  };
  const doBan = async (m) => {
    try { await api.post("/admin/chat/ban", { user_id: m.user_id }); toast.success(`${m.name} a fost banat`); }
    catch (err) { toast.error(err.response?.data?.detail || "Eroare la ban"); }
  };
  const doDelete = async (m) => {
    try {
      await api.delete(`/admin/chat/message/${m.id}`);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, deleted: true, text: "" } : x)));
    } catch (err) { toast.error(err.response?.data?.detail || "Eroare la ștergere"); }
  };
  const doPin = async (m) => {
    try {
      await api.post("/admin/chat/pin", { msg_id: m.id });
      toast.success("Mesaj fixat");
      const r = await api.get("/chat/pinned", { params: { room } });
      setPinned(r.data?.pinned || []);
    } catch (err) { toast.error(err.response?.data?.detail || "Eroare la fixare"); }
  };
  const doUnpin = async (m) => {
    try {
      await api.post("/admin/chat/unpin", { msg_id: m.id });
      setPinned((prev) => prev.filter((p) => p.id !== m.id));
      toast.success("Fixare anulată");
    } catch (err) { toast.error(err.response?.data?.detail || "Eroare"); }
  };

  const channels = [
    { id: "global", label: "general", icon: Hash, count: stats?.general_total, plus: false },
    { id: "plus", label: "plus", icon: Hash, count: stats?.plus_total, plus: true },
  ];
  const roomDesc = room === "plus"
    ? "Cameră exclusivă pentru membrii Cartoonix PLUS 👑"
    : "Discută despre orice! Respectă regulile și fii prietenos.";

  const NameBadges = ({ m }) => (
    <>
      {m.role === "admin" && <VerifiedBadge className="h-3.5 w-3.5" />}
      {m.plus && <PlusIcon className="h-3.5 w-3.5" />}
    </>
  );

  const visiblePins = pinned.filter((p) => !dismissed.has(p.id));

  return (
    <div className="h-screen overflow-hidden bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="mt-16 h-[calc(100vh-4rem)] flex">
        {/* ---------- LEFT SIDEBAR ---------- */}
        <aside data-testid="chat-left" className="hidden lg:flex flex-col w-64 shrink-0 border-r border-white/10 bg-[#0c0c0f]">
          <div className="px-4 py-4 border-b border-white/10">
            <p className="font-display text-lg tracking-wide">CHAT LOBBY</p>
            <p className="text-xs text-white/50 flex items-center gap-1.5 mt-1">
              <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
              <span data-testid="chat-online-count">{roNum(stats?.online_chat ?? 0)}</span> online
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <p className="text-[11px] font-bold text-white/35 uppercase tracking-wider px-1 mb-2">Canale</p>
            <div className="space-y-1">
              {channels.map((c) => (
                <button
                  key={c.id}
                  data-testid={`channel-${c.id}`}
                  onClick={() => setRoom(c.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    room === c.id ? "bg-[#ec1c24]/15 text-white border border-[#ec1c24]/40" : "text-white/70 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <c.icon className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="flex-1 text-left font-semibold">{c.label}</span>
                  {c.plus && <PlusIcon className="h-3.5 w-3.5" />}
                  <span className="text-xs text-white/40 tabular-nums">{c.count != null ? roNum(c.count) : ""}</span>
                </button>
              ))}
            </div>
          </div>

          {/* current user card */}
          <div className="px-3 py-3 border-t border-white/10">
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5">
              <div className="relative shrink-0">
                <img src={user?.avatar || `https://api.dicebear.com/9.x/bottts/svg?seed=${user?.name}`} alt="" className="h-10 w-10 rounded-full bg-[#141414]" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#22c55e] border-2 border-[#0c0c0f]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate flex items-center gap-1">
                  {user?.name}
                  {isAdmin && <VerifiedBadge className="h-3.5 w-3.5" />}
                  {user?.plus && <PlusIcon className="h-3.5 w-3.5" />}
                </p>
                <p className="text-[11px] text-[#22c55e] font-semibold">Online</p>
              </div>
            </div>
            <div className="mt-2.5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#a855f7]/15 to-white/5 border border-[#a855f7]/25 px-3 py-2" data-testid="my-msg-count">
              <Hexagon className="h-4 w-4 text-[#a855f7]" fill="#a855f7" />
              <span className="text-sm leading-none"><span className="font-bold text-white/85">{compact(stats?.my_count ?? 0)}</span> <span className="text-white/45">mesaje</span></span>
            </div>
          </div>
        </aside>

        {/* ---------- CENTER ---------- */}
        <section className="flex-1 min-w-0 flex flex-col">
          {/* header */}
          <div className="flex items-center gap-3 px-4 md:px-6 h-16 border-b border-white/10 shrink-0">
            <button data-testid="chat-back" onClick={() => navigate("/lobby")} className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors shrink-0">
              <ArrowLeft className="h-5 w-5" /> <span className="hidden sm:inline">Lobby</span>
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-2xl flex items-center gap-1 leading-none">
                <Hash className="h-5 w-5 text-white/40" />{room === "plus" ? "plus" : "general"}
                {room === "plus" && <PlusIcon className="h-4 w-4 ml-1" />}
              </h1>
              <p className="text-xs text-white/50 truncate mt-0.5">{roomDesc}</p>
            </div>
            {visiblePins.length > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs text-[#ffcc00] shrink-0">
                <Pin className="h-4 w-4" /> {visiblePins.length}
              </span>
            )}
          </div>

          {plusLocked ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="cx-float mb-4"><PlusIcon className="h-16 w-16" /></div>
              <h2 className="font-display text-3xl mb-2 flex items-center gap-2"><Lock className="h-6 w-6 text-[#ffcc00]" /> Camera PLUS</h2>
              <p className="text-white/60 mb-6 max-w-sm">Această cameră de chat este exclusiv pentru membrii Cartoonix PLUS.</p>
              <button data-testid="chat-plus-upsell" onClick={() => navigate("/plus")} className="px-7 py-3 rounded-full bg-[#ffcc00] text-black font-bold hover:brightness-110 transition-all duration-200">
                Devino membru PLUS
              </button>
            </div>
          ) : (
            <>
              {/* pinned banners */}
              {visiblePins.length > 0 && (
                <div className="px-4 md:px-6 pt-3 space-y-2 shrink-0">
                  {visiblePins.map((p) => (
                    <div key={p.id} data-testid="chat-pinned-banner" className="flex items-start gap-3 rounded-xl border border-[#7c3aed]/40 bg-[#7c3aed]/10 px-4 py-3">
                      <Pin className="h-5 w-5 text-[#a78bfa] shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#c4b5fd] uppercase tracking-wide mb-0.5">Mesaj fixat · {p.name}</p>
                        <p className="text-sm text-white/90 break-words"><MessageText text={p.text} /></p>
                      </div>
                      {isAdmin && (
                        <button onClick={() => doUnpin(p)} title="Anulează fixarea" className="h-7 w-7 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 shrink-0">
                          <PinOff className="h-4 w-4" />
                        </button>
                      )}
                      <button data-testid="chat-pin-dismiss" onClick={() => setDismissed((s) => new Set(s).add(p.id))} className="h-7 w-7 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 shrink-0">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* messages */}
              <div ref={scrollRef} onScroll={onScroll} className="flex-1 min-h-0 overflow-y-auto space-y-4 px-4 md:px-6 py-4">
                {hasMore && (
                  <div className="flex justify-center pb-1">
                    <button data-testid="chat-load-more" onClick={loadMore} disabled={loadingMore} className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white/70 hover:bg-white/20 transition-colors disabled:opacity-50">
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
                  if (m.is_bot) {
                    if (m.deleted) return null;
                    return (
                      <div key={m.id} data-testid="chat-bot-message" className="flex justify-center px-2 py-1">
                        <div className="cx-bot-banner"><Tv className="h-4 w-4 shrink-0 opacity-80" /><span className="align-middle"><MessageText text={m.text} /></span></div>
                      </div>
                    );
                  }
                  if (m.command && COMMAND_META[m.command]) {
                    if (m.deleted) return null;
                    const meta = COMMAND_META[m.command];
                    const Icon = meta.icon;
                    return (
                      <div key={m.id} data-testid={`chat-cmd-${m.command}`} className="flex justify-center px-2 py-1">
                        <div className={meta.className}><Icon className="cx-cmd-icon h-5 w-5 inline-block" /><span className="align-middle"><MessageText text={m.text} /></span></div>
                      </div>
                    );
                  }
                  return (
                    <div key={m.id} data-testid="chat-message" className="group flex items-start gap-3">
                      {/* left: avatar + online + count */}
                      <div className="flex flex-col items-center gap-1 shrink-0 w-12 pt-5">
                        <div className="relative">
                          <img src={m.avatar || `https://api.dicebear.com/9.x/bottts/svg?seed=${m.name}`} alt="" className="h-10 w-10 rounded-full bg-[#141414]" />
                          {m.sender_online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#22c55e] border-2 border-[#0a0a0a]" />}
                        </div>
                        <span className="text-[11px] font-semibold text-white/45 flex items-center gap-1 leading-none" title="Total mesaje">
                          <Hexagon className="h-2.5 w-2.5 text-white/35" fill="currentColor" />{compact(m.sender_msg_count)}
                        </span>
                      </div>

                      {/* middle */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/40 mb-0.5 px-1 flex items-center gap-1">
                          <span className="text-white/70 font-semibold">{m.name}</span>
                          <NameBadges m={m} />
                        </p>
                        {m.quote && !m.deleted && (
                          <div data-testid="chat-quote-preview" className="mb-1 pl-2.5 border-l-2 border-[#ffcc00]/70 bg-white/5 rounded-r-md px-2 py-1">
                            <span className="block text-[11px] font-semibold text-[#ffcc00]/90 truncate">{m.quote.name}</span>
                            <span className="block text-[11px] text-white/50 line-clamp-2 break-words">{m.quote.text}</span>
                          </div>
                        )}
                        {m.deleted ? (
                          <div data-testid="chat-message-deleted" className="inline-block px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm bg-white/5 text-white/40 italic">Acest mesaj a fost șters.</div>
                        ) : m.plus && m.chat_style?.bubble && m.chat_style.bubble !== "none" ? (
                          <div onClick={() => quoteMessage(m)} className="cursor-pointer" title="Click pentru a cita">
                            <SkinnedBubble testId="chat-bubble-plus-skin" skin={m.chat_style.bubble} textClasses={chatStyleClasses(m.chat_style)}>
                              <MessageText text={m.text} />
                            </SkinnedBubble>
                          </div>
                        ) : (
                          <div data-testid={m.plus ? "chat-bubble-plus" : "chat-bubble"} onClick={() => quoteMessage(m)} title="Click pentru a cita" className="inline-block px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm break-words bg-[#2a2a2a] text-white/90 cursor-pointer hover:bg-[#333] transition-colors">
                            <span className={`relative ${m.plus ? chatStyleClasses(m.chat_style) : ""}`}><MessageText text={m.text} /></span>
                          </div>
                        )}
                        {!m.deleted && (
                          <div className="flex items-center gap-1 mt-1 px-0.5">
                            {REACTIONS.map((emo) => {
                              const count = m.reaction_counts?.[emo] || 0;
                              const mine = m.my_reaction === emo;
                              return (
                                <button key={emo} data-testid={`chat-react-${emo}`} onClick={() => toggleReaction(m, emo)} className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs leading-none transition-all duration-150 ${mine ? "bg-[#ffcc00]/20 ring-1 ring-[#ffcc00]/60" : "bg-white/5 hover:bg-white/15"} ${count === 0 && !mine ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
                                  <span className="text-sm">{emo}</span>{count > 0 && <span className="text-white/60 tabular-nums">{count}</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* right: time + mod */}
                      <span className="text-[11px] text-white/30 shrink-0 pt-5 tabular-nums">{fmtTime(m.created_at)}</span>
                      {isAdmin && !m.deleted && m.user_id && (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <button data-testid="chat-mod-trigger" className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity pt-5 h-7 w-7 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10" title="Moderare">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#141414] border-white/10 text-white">
                            <DropdownMenuItem data-testid="chat-mod-pin" onClick={() => doPin(m)} className="focus:bg-white/10 gap-2">
                              <Pin className="h-4 w-4 text-[#a78bfa]" /> Fixează mesajul
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger data-testid="chat-mod-mute" className="focus:bg-white/10 gap-2"><VolumeX className="h-4 w-4 text-orange-400" /> Mute</DropdownMenuSubTrigger>
                              <DropdownMenuSubContent className="bg-[#141414] border-white/10 text-white">
                                {MUTE_OPTIONS.map((o) => (
                                  <DropdownMenuItem key={o.value} data-testid={`chat-mute-${o.value}`} onClick={() => doMute(m, o.value)} className="focus:bg-white/10">{o.label}</DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuItem data-testid="chat-mod-ban" onClick={() => doBan(m)} className="focus:bg-white/10 gap-2 text-red-400"><Ban className="h-4 w-4" /> Ban utilizator</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem data-testid="chat-mod-delete" onClick={() => doDelete(m)} className="focus:bg-white/10 gap-2"><Trash2 className="h-4 w-4" /> Șterge mesajul</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {/* input */}
              <form onSubmit={send} className="shrink-0 border-t border-white/10 px-4 md:px-6 py-3">
                {quoting && (
                  <div data-testid="chat-quote-bar" className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 pl-3 pr-2 py-2 mb-2">
                    <div className="w-1 self-stretch rounded-full bg-[#ffcc00]/80 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold text-[#ffcc00]/90 truncate">Citezi pe {quoting.name}</span>
                      <span className="block text-xs text-white/50 truncate">{quoting.text}</span>
                    </div>
                    <button type="button" data-testid="chat-quote-cancel" onClick={() => setQuoting(null)} className="h-7 w-7 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 shrink-0" title="Anulează citatul"><X className="h-4 w-4" /></button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button type="button" data-testid="chat-upload" disabled title="Încărcare imagine (în curând)" className="h-11 w-11 shrink-0 flex items-center justify-center rounded-full bg-white/5 text-white/40 cursor-not-allowed">
                      <Plus className="h-5 w-5" />
                    </button>
                  )}
                  <EmojiPicker onSelect={insertEmoji} />
                  <button type="button" data-testid="chat-gift" disabled title="Cadouri (în curând)" className="h-11 w-11 shrink-0 flex items-center justify-center rounded-full bg-white/5 text-white/40 cursor-not-allowed">
                    <Gift className="h-5 w-5" />
                  </button>
                  <div className="relative flex-1">
                    <input ref={inputRef} data-testid="chat-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={room === "plus" ? "Scrie în camera PLUS..." : "Scrie un mesaj..."} maxLength={120} className="w-full pl-4 pr-14 py-3 rounded-full bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-white/30 tabular-nums">{text.length}/120</span>
                  </div>
                  <button data-testid="chat-send" type="submit" disabled={!isAdmin && cooldown > 0} title={!isAdmin && cooldown > 0 ? `Așteaptă ${cooldown}s` : "Trimite"} className="h-11 min-w-11 px-3 shrink-0 flex items-center justify-center rounded-full bg-[#ec1c24] hover:bg-[#ff2d36] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {!isAdmin && cooldown > 0 ? <span data-testid="chat-cooldown" className="text-sm font-bold tabular-nums">{cooldown}s</span> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>

        {/* ---------- RIGHT SIDEBAR ---------- */}
        <aside data-testid="chat-right" className="hidden xl:flex flex-col w-80 shrink-0 border-l border-white/10 bg-[#0c0c0f] overflow-y-auto">
          <div className="px-4 py-4 border-b border-white/10">
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
              Utilizatori <span className="text-white/60">({roNum(stats?.online_platform ?? 0)})</span>
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#ec1c24]/20 via-[#ec1c24]/5 to-transparent border border-[#ec1c24]/25 p-3 text-center">
                <div className="mx-auto mb-2 h-9 w-9 rounded-xl bg-[#ec1c24]/20 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-[#ff5057]" />
                </div>
                <p className="text-xl font-display leading-none text-white" data-testid="stat-messages-today">{roNum(stats?.messages_today ?? 0)}</p>
                <p className="text-[10px] text-white/45 mt-1.5 leading-tight">Mesaje azi</p>
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#22c55e]/20 via-[#22c55e]/5 to-transparent border border-[#22c55e]/25 p-3 text-center">
                <div className="mx-auto mb-2 h-9 w-9 rounded-xl bg-[#22c55e]/20 flex items-center justify-center">
                  <Radio className="h-4 w-4 text-[#4ade80]" />
                </div>
                <p className="text-xl font-display leading-none text-white">{roNum(stats?.online_platform ?? 0)}</p>
                <p className="text-[10px] text-white/45 mt-1.5 leading-tight">Online acum</p>
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#ffcc00]/20 via-[#ffcc00]/5 to-transparent border border-[#ffcc00]/30 p-3 text-center">
                <div className="mx-auto mb-2 h-9 w-9 rounded-xl bg-[#ffcc00]/20 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-[#ffcc00]" />
                </div>
                <p className="text-xs font-bold truncate text-white" data-testid="stat-top-talker">{stats?.top_talker?.name || "—"}</p>
                <p className="text-[10px] text-[#ffcc00]/80 mt-1.5 leading-tight">{stats?.top_talker ? `${compact(stats.top_talker.count)} mesaje` : "Top vorbăreț"}</p>
              </div>
            </div>
          </div>

          {/* leaderboard */}
          <div className="px-3 py-4 border-b border-white/10">
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider px-1 mb-2 flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-[#ffcc00]" /> Clasament</p>
            <div className="space-y-1" data-testid="chat-leaderboard">
              {board.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  <span className={`w-5 text-center text-xs font-bold shrink-0 ${u.rank === 1 ? "text-[#ffcc00]" : u.rank === 2 ? "text-white/70" : u.rank === 3 ? "text-[#cd7f32]" : "text-white/30"}`}>{u.rank}</span>
                  <div className="relative shrink-0">
                    <img src={u.avatar || `https://api.dicebear.com/9.x/bottts/svg?seed=${u.name}`} alt="" className="h-8 w-8 rounded-full bg-[#141414]" />
                    {u.online && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#22c55e] border-2 border-[#0c0c0f]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate flex items-center gap-1">
                      {u.name}
                      {u.role === "admin" && <VerifiedBadge className="h-3 w-3" />}
                      {u.plus && <PlusIcon className="h-3 w-3" />}
                    </p>
                    <p className="text-[11px] text-white/40">{roNum(u.count)} mesaje</p>
                  </div>
                  {u.rank === 1 ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ffcc00]/20 text-[#ffcc00] shrink-0">OWNER</span>
                  ) : u.plus ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#ffcc00]/10 text-[#ffcc00]/80 shrink-0">PLUS</span>
                  ) : null}
                </div>
              ))}
              {board.length === 0 && <p className="text-xs text-white/30 px-2 py-3">Niciun mesaj încă.</p>}
            </div>
          </div>

          {/* quick rules */}
          <div className="px-4 py-4">
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Reguli rapide</p>
            <ol className="space-y-2">
              {QUICK_RULES.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-white/10 text-[11px] font-bold flex items-center justify-center text-white/60">{i + 1}</span>
                  {r}
                </li>
              ))}
            </ol>
            <button onClick={() => navigate("/regulament")} className="mt-4 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-semibold text-white/70 transition-colors">
              Vezi toate regulile
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ChatRoom;
