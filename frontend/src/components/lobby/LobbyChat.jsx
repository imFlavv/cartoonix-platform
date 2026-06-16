import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Send, Loader2, ChevronUp, MoreHorizontal, Trash2, Clock, Ban, ShieldOff, Pin, Smile, X, Lock } from "lucide-react";
import { toast } from "sonner";
import UserBadges from "@/components/UserBadges";
import { EMOTICONS, emoticonUrl, tokenizeMessage } from "@/lib/emoticons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * LobbyChat — slim chat panel for /lobby.
 *
 * Optimised for scale (~500 concurrent users):
 *  - Initial fetch: only the latest 50 messages (REST, paginated).
 *  - Older history: explicit "Load more" button (no auto-load on scroll).
 *  - Live updates: WebSocket subscription (`/api/chat/ws?token=...`),
 *    NOT polling. Server pushes only the slim message payload (no full
 *    user objects, no avatars beyond a tiny path).
 *  - Sending: REST POST (lets the existing rate-limiter + content rules
 *    run in one place). Optimistic UI is intentionally avoided to keep
 *    state simple — the WS echo arrives within ~50ms.
 *  - Rendering: append-only via useReducer; React batches updates and only
 *    the new <li> is mounted. No global re-render on each message.
 *  - Auto-reconnect: exponential backoff capped at 30s.
 *  - No typing indicator / no read receipts / no presence polling here —
 *    presence is owned by the global OnlineUsersWidget at 45s cadence.
 */

const initialState = {
  items: [],
  loadingInitial: true,
  loadingMore: false,
  hasMore: true,
  sending: false,
  connected: false,
};

function reducer(s, a) {
  switch (a.type) {
    case "INIT":
      return { ...s, items: a.items, loadingInitial: false, hasMore: a.hasMore };
    case "PREPEND":
      return { ...s, items: [...a.items, ...s.items], loadingMore: false, hasMore: a.hasMore };
    case "APPEND_ONE": {
      // Dedupe — WS echo of our own send may race with HTTP response.
      if (s.items.some((m) => m.id === a.item.id)) return s;
      return { ...s, items: [...s.items, a.item] };
    }
    case "DELETE":
      return { ...s, items: s.items.filter((m) => m.id !== a.id) };
    case "CLEAR":
      return { ...s, items: [], hasMore: false };
    case "LOAD_MORE":
      return { ...s, loadingMore: true };
    case "SEND_START":
      return { ...s, sending: true };
    case "SEND_END":
      return { ...s, sending: false };
    case "CONN":
      return { ...s, connected: a.value };
    default:
      return s;
  }
}

function NickBadges({ plan, role, isModerator }) {
  // Show every badge the user holds (PLUS crown + Moderator + Admin can stack).
  const isAdmin = role === "admin";
  const isPlus = plan === "plus";
  if (!isAdmin && !isPlus && !isModerator) return null;
  return (
    <UserBadges isAdmin={isAdmin} isPlus={isPlus} isModerator={!!isModerator} size={16} moderatorSize={23} adminSize={20} />
  );
}

function timeOnly(iso) {
  try {
    return new Date(iso).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function LobbyChat({ room = "global" }) {
  const { user } = useAuth();
  const { settings } = useSettings() || {};
  const [state, dispatch] = useReducer(reducer, initialState);
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const wsRef = useRef(null);
  const isMountedRef = useRef(true);

  const chatEnabled = settings?.chat_enabled !== false;
  const messagesEnabled = settings?.chat_messages_enabled !== false;
  const maxLength = Math.max(50, Math.min(1000, Number(settings?.chat_max_length) || 300));
  const pinned = settings?.chat_pinned_message;
  const isAdmin = user?.role === "admin";
  const canSend = !!user && chatEnabled && (messagesEnabled || isAdmin);

  // ---- Load initial 50 ----
  useEffect(() => {
    isMountedRef.current = true;
    (async () => {
      try {
        const { data } = await api.get(`/chat/messages?room=${encodeURIComponent(room)}&limit=50`);
        if (!isMountedRef.current) return;
        dispatch({ type: "INIT", items: data.items || [], hasMore: !!data.has_more });
        // Scroll to bottom after first paint
        requestAnimationFrame(() => {
          if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
        });
      } catch {
        if (isMountedRef.current) dispatch({ type: "INIT", items: [], hasMore: false });
      }
    })();
    return () => {
      isMountedRef.current = false;
    };
  }, [room]);

  // ---- Server-Sent Events for live updates (WebSocket equivalent that
  //      works across all proxies). EventSource auto-reconnects natively. ----
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("cartoonix_token");
    if (!token) return;

    // Same-origin URL — avoids cross-host issues with the preview proxy.
    const url = `/api/chat/stream?room=${encodeURIComponent(room)}&token=${encodeURIComponent(
      token
    )}`;

    let es;
    try {
      es = new EventSource(url);
    } catch {
      return;
    }
    wsRef.current = es;

    const onAny = (ev) => {
      if (!isMountedRef.current) return;
      let payload;
      try {
        payload = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (!payload || !payload.type) return;
      if (payload.type === "message" && payload.data) {
        dispatch({ type: "APPEND_ONE", item: payload.data });
        const el = listRef.current;
        if (el) {
          const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
          if (distance < 120) {
            requestAnimationFrame(() => {
              el.scrollTop = el.scrollHeight;
            });
          }
        }
      } else if (payload.type === "delete" && payload.id) {
        dispatch({ type: "DELETE", id: payload.id });
      } else if (payload.type === "clear") {
        dispatch({ type: "CLEAR" });
      }
    };

    es.addEventListener("message", onAny);
    es.addEventListener("hello", () => {
      if (isMountedRef.current) dispatch({ type: "CONN", value: true });
    });
    es.onopen = () => {
      if (isMountedRef.current) dispatch({ type: "CONN", value: true });
    };
    es.onerror = () => {
      if (isMountedRef.current) dispatch({ type: "CONN", value: false });
      // EventSource auto-reconnects with built-in backoff — no manual code.
    };

    return () => {
      try {
        es.close();
      } catch (_) {
        /* noop */
      }
    };
  }, [user, room]);

  // ---- Load older history on demand ----
  const loadMore = useCallback(async () => {
    if (state.loadingMore || !state.hasMore || !state.items.length) return;
    dispatch({ type: "LOAD_MORE" });
    const oldest = state.items[0]?.created_at;
    try {
      const { data } = await api.get(
        `/chat/messages?room=${encodeURIComponent(room)}&before=${encodeURIComponent(
          oldest || ""
        )}&limit=50`
      );
      const before = listRef.current?.scrollHeight || 0;
      dispatch({ type: "PREPEND", items: data.items || [], hasMore: !!data.has_more });
      // Preserve scroll position after prepending older history.
      requestAnimationFrame(() => {
        if (listRef.current) {
          const after = listRef.current.scrollHeight;
          listRef.current.scrollTop = after - before;
        }
      });
    } catch {
      dispatch({ type: "PREPEND", items: [], hasMore: state.hasMore });
    }
  }, [room, state.loadingMore, state.hasMore, state.items]);

  const send = async () => {
    const content = draft.trim();
    if (!content || state.sending) return;
    dispatch({ type: "SEND_START" });
    try {
      const { data } = await api.post("/chat/send", { room, content });
      setDraft("");
      // Append the canonical message returned by the server so it appears
      // instantly even if the SSE echo is delayed. The reducer dedupes by
      // `id`, so the later SSE echo will be a no-op.
      if (data?.message?.id) {
        dispatch({ type: "APPEND_ONE", item: data.message });
        const el = listRef.current;
        if (el) {
          requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight;
          });
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Mesajul nu a putut fi trimis."));
    } finally {
      dispatch({ type: "SEND_END" });
    }
  };

  const grouped = useMemo(() => state.items, [state.items]);

  const insertEmoticon = (name) => {
    const token = `:${name}:`;
    setDraft((d) => {
      // Ensure a space separator if the previous char isn't whitespace already.
      const sep = d.length === 0 || /\s$/.test(d) ? "" : " ";
      return (d + sep + token + " ").slice(0, maxLength);
    });
    inputRef.current?.focus();
  };

  // Chat fully off: show a centered message instead of rendering anything.
  if (!chatEnabled && !isAdmin) {
    return (
      <div
        data-testid="lobby-chat"
        className="flex h-full min-h-0 flex-col rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#0e0f14] to-[#0a0b0f] overflow-hidden"
      >
        <div className="flex-1 grid place-items-center px-6 text-center">
          <div className="space-y-2">
            <Lock className="h-7 w-7 text-muted-foreground mx-auto" />
            <h3 className="text-sm font-semibold text-white/90">Chat-ul este dezactivat</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Administratorii au pus chat-ul în pauză temporară. Revenim curând!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="lobby-chat"
      className="flex h-full min-h-0 flex-col rounded-2xl border border-white/[0.06] bg-gradient-to-b from-[#0e0f14] to-[#0a0b0f] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              state.connected ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" : "bg-muted-foreground"
            }`}
          />
          <h3 className="text-sm font-semibold text-white/90 tracking-wide">
            Chat live · {room === "plus" ? "Cameră PLUS" : "Global"}
          </h3>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {state.connected ? "conectat" : "se reconectează…"}
        </span>
      </div>

      {/* Pinned message (admin-managed) */}
      {pinned && pinned.content && (
        <PinnedBanner pin={pinned} isAdmin={isAdmin} />
      )}

      {/* Messages list */}
      <div
        ref={listRef}
        data-testid="lobby-chat-list"
        className="cartoonix-scroll flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1.5"
      >
        {state.hasMore && state.items.length > 0 && (
          <div className="flex justify-center pb-2">
            <button
              onClick={loadMore}
              disabled={state.loadingMore}
              data-testid="lobby-chat-load-more"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-medium text-white/80 hover:bg-black/50 disabled:opacity-60"
            >
              {state.loadingMore ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ChevronUp className="h-3 w-3" />
              )}
              Încarcă mai multe
            </button>
          </div>
        )}

        {state.loadingInitial ? (
          <div className="h-full grid place-items-center text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="h-full grid place-items-center text-muted-foreground text-sm">
            Niciun mesaj încă. Fii primul.
          </div>
        ) : (
          grouped.map((m) => (
            <ChatRow
              key={m.id}
              m={m}
              viewerIsAdmin={isAdmin}
              viewerIsModerator={!!user?.is_moderator}
              viewerId={user?.id}
            />
          ))
        )}
      </div>

      {/* Messages-disabled banner for non-admins when admins paused sending */}
      {!messagesEnabled && !isAdmin && (
        <div className="border-t border-white/[0.06] px-4 py-2 text-center text-[12px] text-muted-foreground">
          Admin-ii au pus în pauză trimiterea de mesaje. Vei putea posta din nou în scurt timp.
        </div>
      )}

      {/* Composer */}
      {(messagesEnabled || isAdmin) && (
        <form
          className="border-t border-white/[0.06] p-2.5 flex gap-2 items-center"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          {/* Emoji picker */}
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Inserează emoji"
                data-testid="lobby-chat-emoji-trigger"
                className="inline-flex items-center justify-center h-9 w-9 rounded-full text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
              >
                <Smile className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="w-[320px] p-0 bg-[#0e0f14] border-white/10"
              data-testid="lobby-chat-emoji-panel"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Yahoo Classic · {EMOTICONS.length}
                </span>
                <button
                  onClick={() => setEmojiOpen(false)}
                  aria-label="Închide"
                  className="text-muted-foreground hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="cartoonix-scroll max-h-[260px] overflow-y-auto p-2 grid grid-cols-8 gap-1">
                {EMOTICONS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => insertEmoticon(name)}
                    title={`:${name}:`}
                    data-testid={`lobby-chat-emoji-${name}`}
                    className="h-8 w-8 grid place-items-center rounded-md hover:bg-white/10 transition-colors"
                  >
                    <img
                      src={emoticonUrl(name)}
                      alt={name}
                      draggable={false}
                      className="h-5 w-5 object-contain"
                    />
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <input
            ref={inputRef}
            data-testid="lobby-chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, maxLength))}
            placeholder={canSend ? "Scrie un mesaj…" : "Loghează-te ca să poți trimite mesaje"}
            maxLength={maxLength}
            disabled={!canSend || state.sending}
            className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/40 disabled:opacity-60"
          />
          <button
            type="submit"
            data-testid="lobby-chat-send"
            disabled={!canSend || state.sending || !draft.trim()}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-br from-[#ff3b3b] to-[#facc15] text-black shadow-md hover:opacity-95 disabled:opacity-50"
            aria-label="Trimite"
          >
            {state.sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * Slim pin banner shown above the message list. Admin viewers get an inline
 * "unpin" affordance — clicking it clears the global pinned message.
 */
function PinnedBanner({ pin, isAdmin }) {
  const unpin = async () => {
    try {
      await api.post("/chat/admin/pin", { message_id: null });
    } catch {
      toast.error("Nu am putut elimina mesajul fixat.");
    }
  };
  return (
    <div
      data-testid="lobby-chat-pinned"
      className="relative border-b border-white/[0.06] px-3 py-2 bg-gradient-to-r from-amber-500/[0.12] via-orange-500/[0.08] to-transparent"
    >
      <div className="flex items-start gap-2.5">
        <Pin className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-amber-300/90 mb-0.5">
            Mesaj fixat · {pin.nickname || "Admin"}
          </div>
          <p className="text-[13px] text-white/90 break-words">
            <MessageContent text={pin.content || ""} />
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={unpin}
            aria-label="Elimină mesajul fixat"
            data-testid="lobby-chat-pin-remove"
            className="shrink-0 text-muted-foreground hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

const ChatRow = React.memo(function ChatRow({ m, viewerIsAdmin, viewerIsModerator, viewerId }) {
  const avatar = m.avatar_url ? mediaUrl(m.avatar_url) : "";
  const src = avatar;
  const isOwn = viewerId && m.user_id === viewerId;
  // Admins moderate everyone (except self / other admins). Moderators may also
  // moderate, but NOT admins and NOT other moderators.
  const canModerate =
    (viewerIsAdmin || viewerIsModerator) &&
    !isOwn &&
    m.role !== "admin" &&
    !(m.is_moderator && !viewerIsAdmin);
  return (
    <div className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/[0.025] transition-colors">
      <div className="shrink-0 h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-rose-600/60 to-amber-400/40 grid place-items-center text-[11px] font-bold text-white/90">
        {src ? (
          <img src={mediaUrl(src)} alt="" className="h-full w-full object-cover" />
        ) : (
          (m.nickname || "?").slice(0, 2).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] font-semibold text-white/95 truncate leading-none">
            {m.nickname || "anonim"}
          </span>
          <NickBadges plan={m.plan} role={m.role} isModerator={m.is_moderator} />
          <span className="text-[10px] text-muted-foreground tabular-nums leading-none">
            {timeOnly(m.created_at)}
          </span>
        </div>
        <p
          className={`text-[13.5px] leading-snug text-white/90 break-words ${
            m.censored ? "italic text-white/70" : ""
          }`}
        >
          <MessageContent text={m.content || ""} />
        </p>
      </div>
      {canModerate && <ModerationMenu m={m} viewerIsAdmin={viewerIsAdmin} />}
    </div>
  );
});

/**
 * Render a message body, replacing known `:name:` tokens with the matching
 * Yahoo-style emoticon GIF. Anything else falls through as plain text so
 * URLs and ratios containing colons are not corrupted.
 */
const MessageContent = React.memo(function MessageContent({ text }) {
  const parts = useMemo(() => tokenizeMessage(text), [text]);
  if (parts.length === 0) return text;
  return parts.map((p, i) =>
    p.type === "emo" ? (
      <img
        key={i}
        src={emoticonUrl(p.name)}
        alt={`:${p.name}:`}
        title={`:${p.name}:`}
        draggable={false}
        className="inline-block align-text-bottom mx-0.5"
        style={{ height: "1.25em", width: "auto" }}
      />
    ) : (
      <React.Fragment key={i}>{p.value}</React.Fragment>
    )
  );
});

/**
 * Compact moderation dropdown shown on hover for admin viewers only.
 * Avoids cluttering the row with always-visible icons — discoverable but
 * non-intrusive. All actions hit the existing `/chat/admin/*` endpoints,
 * so backend authorisation stays the single source of truth.
 */
function ModerationMenu({ m, viewerIsAdmin }) {
  const [busy, setBusy] = useState(false);

  const run = async (label, doIt) => {
    if (busy) return;
    setBusy(true);
    try {
      await doIt();
      toast.success(label);
    } catch (err) {
      toast.error(getErrorMessage(err, "Acțiunea a eșuat."));
    } finally {
      setBusy(false);
    }
  };

  // Admins use the full admin endpoint; moderators use the mute-only endpoint.
  const moderateEndpoint = viewerIsAdmin ? "/chat/admin/moderate" : "/chat/mod/moderate";

  const deleteMessage = () =>
    run("Mesaj șters", () => api.delete(`/chat/admin/messages/${m.id}`));

  const moderate = (action, label) =>
    run(label, () => api.post(moderateEndpoint, { user_id: m.user_id, action }));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Moderare"
          data-testid={`chat-mod-trigger-${m.id}`}
          disabled={busy}
          className="self-start opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity h-6 w-6 grid place-items-center rounded-md text-muted-foreground hover:text-white hover:bg-white/10"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 bg-[#0e0f14] border-white/10 text-white"
        data-testid={`chat-mod-menu-${m.id}`}
      >
        <DropdownMenuLabel className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
          Moderare · {m.nickname}
        </DropdownMenuLabel>

        {/* Admin-only message actions */}
        {viewerIsAdmin && (
          <>
            <DropdownMenuItem
              onClick={deleteMessage}
              data-testid={`chat-mod-delete-${m.id}`}
              className="text-[13px] focus:bg-red-500/20 focus:text-red-200"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Șterge mesaj
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                run("Mesaj fixat în chat", () =>
                  api.post("/chat/admin/pin", { message_id: m.id })
                )
              }
              data-testid={`chat-mod-pin-${m.id}`}
              className="text-[13px] focus:bg-amber-500/20"
            >
              <Pin className="mr-2 h-3.5 w-3.5" /> Fixează în chat
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
          </>
        )}

        {/* Mute durations — available to moderators and admins */}
        <DropdownMenuItem
          onClick={() => moderate("mute_5m", "Mute 5 minute aplicat")}
          className="text-[13px] focus:bg-amber-500/20"
        >
          <Clock className="mr-2 h-3.5 w-3.5" /> Mute 5 minute
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => moderate("mute_1h", "Mute 1 oră aplicat")}
          className="text-[13px] focus:bg-amber-500/20"
        >
          <Clock className="mr-2 h-3.5 w-3.5" /> Mute 1 oră
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => moderate("mute_24h", "Mute 24 ore aplicat")}
          className="text-[13px] focus:bg-amber-500/20"
        >
          <Clock className="mr-2 h-3.5 w-3.5" /> Mute 24 ore
        </DropdownMenuItem>

        {/* Admin-only: permanent mute + ban */}
        {viewerIsAdmin && (
          <>
            <DropdownMenuItem
              onClick={() => moderate("mute_perm", "Mute permanent aplicat")}
              className="text-[13px] focus:bg-amber-500/20"
            >
              <Ban className="mr-2 h-3.5 w-3.5" /> Mute permanent
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
            <DropdownMenuItem
              onClick={() => {
                if (window.confirm(`Vrei să dai BAN la ${m.nickname}?`)) {
                  moderate("ban", "Ban aplicat");
                }
              }}
              data-testid={`chat-mod-ban-${m.id}`}
              className="text-[13px] focus:bg-red-500/20 text-red-300"
            >
              <Ban className="mr-2 h-3.5 w-3.5" /> Ban definitiv
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="bg-white/[0.06]" />
        <DropdownMenuItem
          onClick={() => moderate("unmute", viewerIsAdmin ? "Sancțiune anulată" : "Mut scos")}
          className="text-[13px] text-emerald-300 focus:bg-emerald-500/15"
        >
          <ShieldOff className="mr-2 h-3.5 w-3.5" /> {viewerIsAdmin ? "Anulează mute / ban" : "Scoate mut"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
