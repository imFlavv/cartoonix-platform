import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  Users,
  Crown,
  Loader2,
  Lock,
  Globe2,
  ShieldAlert,
  Pin,
  Clock,
  Smile,
  Tv,
  X,
} from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import PremiumAvatarFrame from "@/components/chat/PremiumAvatarFrame";
import EmoticonPicker from "@/components/chat/EmoticonPicker";
import { parseEmoticons } from "@/components/chat/emoticons";
import { PLUS_BADGE_URL } from "@/lib/badges";

const MESSAGE_POLL_MS = 3000;
const PRESENCE_POLL_MS = 30000;

// Cache the set of animated avatar URLs across the app (loaded once).
let _animatedAvatarsCache = null;
async function loadAnimatedAvatars() {
  if (_animatedAvatarsCache) return _animatedAvatarsCache;
  try {
    const { data } = await api.get("/avatars");
    const animated = new Set(
      (data || []).filter((a) => a.animated).map((a) => a.url)
    );
    _animatedAvatarsCache = animated;
    return animated;
  } catch (e) {
    _animatedAvatarsCache = new Set();
    return _animatedAvatarsCache;
  }
}

function PlusBadge({ size = 13 }) {
  return (
    <img
      src={PLUS_BADGE_URL}
      alt="Membru Cartoonix PLUS"
      title="Membru Cartoonix PLUS"
      draggable={false}
      className="inline-block align-middle select-none"
      style={{ height: size, width: "auto" }}
    />
  );
}

function AdminBadge({ size = 28 }) {
  return (
    <img
      src="/badges/admin.png"
      alt="Admin"
      title="Administrator Cartoonix"
      draggable={false}
      className="inline-block align-middle select-none"
      style={{ height: size, width: "auto" }}
    />
  );
}

function BotBadge() {
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider"
      style={{
        background: "linear-gradient(135deg,#22d3ee 0%,#3b82f6 100%)",
        color: "#06121f",
        boxShadow: "0 0 12px -2px rgba(59,130,246,0.5)",
      }}
      title="CartoonixTV bot oficial"
    >
      <Tv className="h-2.5 w-2.5" strokeWidth={2.5} />
      Bot
    </span>
  );
}

function BotAvatar({ size = 32 }) {
  return (
    <div
      className="rounded-lg ring-1 ring-cyan-400/40 grid place-items-center"
      style={{
        width: size,
        height: size,
        background:
          "linear-gradient(135deg, #0c2030 0%, #082135 50%, #06141f 100%)",
        boxShadow:
          "0 0 0 1px rgba(34,211,238,0.25) inset, 0 0 18px -6px rgba(34,211,238,0.55)",
      }}
    >
      <Tv
        className="h-4 w-4 text-cyan-300"
        strokeWidth={2.4}
        style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.7))" }}
      />
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Render message text with inline Yahoo emoticons. Emoticons keep their
 * original GIF dimensions (no resize) per product spec.
 */
function renderMessageContent(text) {
  const parts = parseEmoticons(text || "");
  if (parts.length === 0) return null;
  return parts.map((p, i) => {
    if (p.type === "text") {
      return <span key={i}>{p.value}</span>;
    }
    const { emo } = p;
    return (
      <img
        key={i}
        src={`/emoticons/${emo.file}`}
        alt={`:${emo.code}:`}
        title={`:${emo.code}:`}
        width={emo.w}
        height={emo.h}
        draggable={false}
        className="inline-block align-text-bottom mx-[1px]"
        style={{ verticalAlign: "-3px" }}
      />
    );
  });
}

function MessageRow({ msg, isMine, animatedAvatars }) {
  if (msg.deleted) {
    return (
      <div className="px-3 py-1 text-[11px] italic text-muted-foreground/60">
        — Mesaj șters de moderator —
      </div>
    );
  }
  const isAnimated = animatedAvatars && animatedAvatars.has(msg.avatar_url);
  const isBot = msg.role === "bot" || msg.is_bot;
  return (
    <div
      className={`group flex items-start gap-2 px-3 py-1.5 hover:bg-white/[0.03] transition-colors ${
        isMine ? "bg-[#facc15]/[0.025]" : ""
      } ${isBot ? "bg-cyan-500/[0.04]" : ""}`}
    >
      <div className="shrink-0 mt-0.5">
        {isBot ? (
          <BotAvatar size={32} />
        ) : (
          <PremiumAvatarFrame
            url={msg.avatar_url}
            alt={msg.nickname}
            size={32}
            rounded="rounded-lg"
            animated={isAnimated}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap leading-none">
          <span
            className={`text-[12px] font-semibold leading-none ${
              isBot
                ? "text-cyan-300"
                : msg.role === "admin"
                ? "text-red-300"
                : msg.plan === "plus"
                ? "text-amber-200"
                : "text-white"
            }`}
          >
            {msg.nickname}
          </span>
          {!isBot && msg.plan === "plus" && <PlusBadge size={13} />}
          {isBot ? <BotBadge /> : msg.role === "admin" ? <AdminBadge /> : null}
          <span className="text-[10px] text-muted-foreground/70 ml-auto pl-2">
            {formatTime(msg.created_at)}
          </span>
        </div>
        <div
          className={`text-[13px] break-words whitespace-pre-wrap leading-snug mt-0.5 ${
            isBot ? "text-cyan-100/95" : "text-white/90"
          }`}
        >
          {renderMessageContent(msg.content)}
        </div>
      </div>
    </div>
  );
}

function CollapsedBar({ onOpen, onlineCount, hasUnread }) {
  return (
    <button
      onClick={onOpen}
      data-testid="chat-collapsed-bar"
      className="group relative flex flex-col items-center gap-3 rounded-l-2xl px-2.5 py-4 cursor-pointer select-none transition-all"
      style={{
        background:
          "linear-gradient(180deg, rgba(20,20,24,0.95) 0%, rgba(12,12,14,0.95) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRight: "none",
        boxShadow:
          "0 12px 40px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
      }}
    >
      {/* Glow */}
      <span
        className="pointer-events-none absolute inset-0 rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,59,59,0.10) 0%, rgba(250,204,21,0.10) 100%)",
        }}
      />
      <div className="relative flex items-center gap-1.5">
        <MessageCircle className="h-4 w-4 text-[#facc15]" strokeWidth={2.5} />
        {hasUnread && (
          <span className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-[#ff3b3b] ring-2 ring-background animate-pulse" />
        )}
      </div>
      <span
        className="relative font-display tracking-[0.18em] text-[12px] font-semibold text-white"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
      >
        CHAT ({onlineCount})
      </span>
      <div className="relative flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      </div>
    </button>
  );
}

export default function ChatWidget() {
  const { user } = useAuth();
  const { settings } = useSettings() || {};

  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState("global");
  const [messages, setMessages] = useState([]);
  const [state, setState] = useState(null); // /chat/state
  const [presence, setPresence] = useState({ online_total: 0, online_plus: 0 });
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [hasUnread, setHasUnread] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [animatedAvatars, setAnimatedAvatars] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const scrollRef = useRef(null);
  const lastSeenIdRef = useRef(null);
  const inputRef = useRef(null);

  // Load animated avatar set once on mount
  useEffect(() => {
    loadAnimatedAvatars().then(setAnimatedAvatars);
  }, []);

  // ---- Polling helpers ----
  const refreshState = useCallback(async () => {
    try {
      const { data } = await api.get("/chat/state");
      setState(data);
      setCooldownRemaining(data?.you?.cooldown_remaining || 0);
    } catch (e) {
      /* ignore */
    }
  }, []);

  const refreshMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/chat/messages?room=${room}&limit=200`);
      setMessages((prev) => {
        const next = (data?.items || []).slice(-200);
        // Mark unread if last message changed and chat is collapsed
        if (
          next.length > 0 &&
          lastSeenIdRef.current &&
          next[next.length - 1].id !== lastSeenIdRef.current &&
          !open
        ) {
          setHasUnread(true);
        }
        return next;
      });
    } catch (e) {
      /* ignore */
    }
  }, [room, open]);

  const refreshPresence = useCallback(async () => {
    try {
      const { data } = await api.get("/chat/presence");
      setPresence(data || { online_total: 0, online_plus: 0 });
    } catch (e) {
      /* ignore */
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    try {
      await api.post("/chat/heartbeat");
    } catch (e) {
      /* ignore */
    }
  }, []);

  // ---- Initial load + polling ----
  useEffect(() => {
    if (!user) return;
    refreshState();
    refreshPresence();
    sendHeartbeat();
    refreshMessages();
    const t1 = setInterval(refreshMessages, MESSAGE_POLL_MS);
    const t2 = setInterval(() => {
      refreshPresence();
      sendHeartbeat();
    }, PRESENCE_POLL_MS);
    const t3 = setInterval(refreshState, 5000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearInterval(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, room]);

  // ---- Auto-scroll to bottom on new messages when open ----
  useEffect(() => {
    if (!open) return;
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    // Only auto-scroll if user is near the bottom
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) {
      el.scrollTop = el.scrollHeight;
    }
    if (messages.length > 0) {
      lastSeenIdRef.current = messages[messages.length - 1].id;
    }
  }, [messages, open]);

  // ---- Clear unread when opened ----
  useEffect(() => {
    if (open) {
      setHasUnread(false);
      if (messages.length > 0) {
        lastSeenIdRef.current = messages[messages.length - 1].id;
      }
      // Force a fresh refresh
      refreshState();
      refreshMessages();
      refreshPresence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ---- Local cooldown tick ----
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const t = setInterval(() => {
      setCooldownRemaining((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownRemaining]);

  // ---- Don't render at all if chat is globally off or user not logged in ----
  const chatEnabled = settings?.chat_enabled !== false;
  if (!user || !chatEnabled) return null;

  const isPlus = user.subscription === "plus" || user.role === "admin";
  const messagesEnabled = settings?.chat_messages_enabled !== false;
  const you = state?.you || {};
  const pinned = state?.settings?.chat_pinned_message || settings?.chat_pinned_message;

  // Reason for read-only
  let readonlyReason = null;
  if (!messagesEnabled) {
    readonlyReason = "Mesajele sunt momentan oprite de administratori.";
  } else if (you.banned) {
    readonlyReason = "Ai fost exclus permanent din chat.";
  } else if (you.mute_until) {
    if (you.mute_until === "permanent") {
      readonlyReason = "Ești silențiat permanent.";
    } else {
      try {
        const until = new Date(you.mute_until);
        const min = Math.max(1, Math.round((until - new Date()) / 60000));
        readonlyReason = `Ești silențiat încă ~${min} minut(e).`;
      } catch {
        readonlyReason = "Ești silențiat momentan.";
      }
    }
  } else if (you.restricted_new_user) {
    const days = state?.settings?.chat_new_user_days || 3;
    readonlyReason = `Vei putea scrie după ${days} zile de la înregistrare.`;
  }

  async function handleSend(e) {
    e?.preventDefault?.();
    setError("");
    const text = draft.trim();
    if (!text) return;
    if (sending || cooldownRemaining > 0) return;
    setSending(true);
    try {
      const { data } = await api.post("/chat/send", { room, content: text });
      setDraft("");
      // Optimistically append message
      if (data?.message) {
        setMessages((prev) => [...prev, data.message].slice(-200));
      }
      // Pull fresh state for accurate cooldown
      refreshState();
    } catch (err) {
      const detail = err?.response?.data?.detail || "Nu am putut trimite mesajul.";
      setError(detail);
      // refresh state in case the server escalated cooldown/ban
      refreshState();
    } finally {
      setSending(false);
    }
  }

  const maxLen = state?.settings?.chat_max_length || 300;
  const remaining = maxLen - draft.length;

  function insertEmoticon(code) {
    const token = `:${code}:`;
    const el = inputRef.current;
    setDraft((prev) => {
      if (!el) {
        const next = (prev + token).slice(0, maxLen);
        return next;
      }
      const start = el.selectionStart ?? prev.length;
      const end = el.selectionEnd ?? prev.length;
      const next = (prev.slice(0, start) + token + prev.slice(end)).slice(
        0,
        maxLen
      );
      // Restore caret after the inserted token on next paint
      requestAnimationFrame(() => {
        if (inputRef.current) {
          const pos = Math.min(start + token.length, maxLen);
          inputRef.current.focus();
          inputRef.current.setSelectionRange(pos, pos);
        }
      });
      return next;
    });
  }

  return (
    <div
      className="fixed bottom-0 right-0 z-[60]"
      style={{ pointerEvents: "auto" }}
      data-testid="chat-widget"
    >
      <AnimatePresence mode="wait" initial={false}>
        {!open ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="mr-0 mb-24 sm:mb-6"
          >
            <CollapsedBar
              onOpen={() => setOpen(true)}
              onlineCount={presence.online_total}
              hasUnread={hasUnread}
            />
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mr-3 mb-24 sm:mb-3 w-[92vw] sm:w-[380px] max-h-[78vh] sm:max-h-[600px] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(18,18,22,0.96) 0%, rgba(10,10,12,0.96) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow:
                "0 30px 80px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset",
              backdropFilter: "blur(10px)",
            }}
          >
            {/* Header */}
            <div
              className="relative flex items-center gap-2 px-3 py-2.5 border-b border-white/5"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,59,59,0.10) 0%, rgba(250,204,21,0.08) 100%)",
              }}
            >
              <MessageCircle className="h-4 w-4 text-[#facc15]" />
              <span className="font-display tracking-wider text-sm font-semibold">
                Chat Cartoonix
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <Users className="h-3 w-3 ml-1" />
                {room === "plus" ? presence.online_plus : presence.online_total}
              </span>
              <button
                onClick={() => setOpen(false)}
                className="ml-1 p-1 rounded-md hover:bg-white/10 transition-colors"
                aria-label="Închide chat"
                data-testid="chat-close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-2 pt-2">
              <button
                onClick={() => setRoom("global")}
                data-testid="chat-tab-global"
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                  room === "global"
                    ? "bg-white/10 text-white"
                    : "text-muted-foreground hover:bg-white/5"
                }`}
              >
                <Globe2 className="h-3.5 w-3.5" />
                Global
              </button>
              <button
                onClick={() => isPlus && setRoom("plus")}
                disabled={!isPlus}
                data-testid="chat-tab-plus"
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                  room === "plus"
                    ? "text-black"
                    : isPlus
                    ? "text-amber-200 hover:bg-white/5"
                    : "text-muted-foreground/50 cursor-not-allowed"
                }`}
                style={
                  room === "plus"
                    ? {
                        background:
                          "linear-gradient(135deg,#ff7a1a 0%,#facc15 100%)",
                      }
                    : undefined
                }
              >
                {isPlus ? (
                  <Crown className="h-3.5 w-3.5" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                Plus
              </button>
            </div>

            {/* Pinned */}
            {pinned && pinned.content && (
              <div className="mx-2 mt-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2 flex items-start gap-2">
                <Pin className="h-3.5 w-3.5 text-amber-300 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider text-amber-300/80 font-semibold">
                    Fixat de admin
                  </div>
                  <div className="text-[12px] text-amber-100 leading-snug break-words">
                    {renderMessageContent(pinned.content)}
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto py-2 mt-1 chat-scroll"
              style={{ scrollBehavior: "smooth" }}
            >
              {loading ? (
                <div className="grid place-items-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="grid place-items-center py-10 text-center px-4">
                  <MessageCircle className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-[12px] text-muted-foreground">
                    Niciun mesaj încă. Fii primul care salută! 👋
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <MessageRow
                    key={m.id}
                    msg={m}
                    isMine={m.user_id === user.id}
                    animatedAvatars={animatedAvatars}
                  />
                ))
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-white/5 bg-black/30">
              {readonlyReason ? (
                <div className="flex items-center gap-2 px-3 py-2.5 text-[11px] text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{readonlyReason}</span>
                </div>
              ) : (
                <form onSubmit={handleSend} className="p-2.5 space-y-1.5">
                  {error && (
                    <div className="px-2 py-1 rounded-md bg-red-500/10 text-red-300 text-[11px] flex items-center gap-1.5">
                      <ShieldAlert className="h-3 w-3" />
                      {error}
                    </div>
                  )}
                  <div className="flex items-end gap-2 relative">
                    <textarea
                      ref={inputRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value.slice(0, maxLen))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend(e);
                        }
                      }}
                      rows={1}
                      placeholder={
                        cooldownRemaining > 0
                          ? `Așteaptă ${cooldownRemaining}s…`
                          : "Scrie un mesaj..."
                      }
                      disabled={sending || cooldownRemaining > 0}
                      data-testid="chat-input"
                      className="flex-1 resize-none rounded-xl bg-white/5 border border-white/10 px-3 py-2 pr-9 text-[13px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[#facc15]/50 focus:border-transparent transition-all max-h-24 min-h-[36px] disabled:opacity-60"
                      style={{
                        scrollbarWidth: "thin",
                      }}
                    />
                    {/* Emoticon picker trigger (inside textarea on the right) */}
                    <button
                      type="button"
                      onClick={() => setPickerOpen((v) => !v)}
                      disabled={sending}
                      data-testid="chat-emoticon-btn"
                      aria-label="Deschide emoticoane"
                      className={`absolute right-[52px] bottom-1.5 h-7 w-7 grid place-items-center rounded-md transition-all ${
                        pickerOpen
                          ? "bg-amber-400/20 text-amber-300"
                          : "text-muted-foreground hover:bg-white/10 hover:text-amber-300"
                      }`}
                    >
                      <Smile className="h-4 w-4" />
                    </button>
                    {pickerOpen && (
                      <EmoticonPicker
                        onPick={(code) => {
                          insertEmoticon(code);
                        }}
                        onClose={() => setPickerOpen(false)}
                      />
                    )}
                    <button
                      type="submit"
                      disabled={
                        sending || cooldownRemaining > 0 || !draft.trim()
                      }
                      data-testid="chat-send-btn"
                      className="shrink-0 h-9 w-9 grid place-items-center rounded-xl font-semibold text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.04] active:scale-95"
                      style={{
                        background:
                          "linear-gradient(135deg,#ff3b3b 0%,#ff7a1a 50%,#facc15 100%)",
                        boxShadow:
                          cooldownRemaining > 0
                            ? "none"
                            : "0 6px 20px -4px rgba(250,204,21,0.45)",
                      }}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : cooldownRemaining > 0 ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 px-1">
                    <span>
                      {cooldownRemaining > 0 ? (
                        <span className="text-amber-300/80">
                          Cooldown: {cooldownRemaining}s
                        </span>
                      ) : (
                        <span>Enter pentru trimitere · Shift+Enter rând nou</span>
                      )}
                    </span>
                    <span className={remaining < 20 ? "text-red-300" : ""}>
                      {remaining}
                    </span>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
