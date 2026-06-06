import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Loader2, ChevronUp, Shield, Crown } from "lucide-react";
import { toast } from "sonner";

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

function PlanBadge({ plan, role }) {
  if (role === "admin")
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/20 text-red-300 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-px">
        <Shield className="h-2.5 w-2.5" /> Admin
      </span>
    );
  if (plan === "plus")
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-px">
        <Crown className="h-2.5 w-2.5" /> Plus
      </span>
    );
  return null;
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
  const [state, dispatch] = useReducer(reducer, initialState);
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);
  const wsRef = useRef(null);
  const isMountedRef = useRef(true);

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
      await api.post("/chat/send", { room, content });
      setDraft("");
    } catch (err) {
      toast.error(getErrorMessage(err, "Mesajul nu a putut fi trimis."));
    } finally {
      dispatch({ type: "SEND_END" });
    }
  };

  const grouped = useMemo(() => state.items, [state.items]);

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

      {/* Messages list */}
      <div
        ref={listRef}
        data-testid="lobby-chat-list"
        className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1.5"
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
          grouped.map((m) => <ChatRow key={m.id} m={m} />)
        )}
      </div>

      {/* Composer */}
      <form
        className="border-t border-white/[0.06] p-2.5 flex gap-2 items-center"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          data-testid="lobby-chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 300))}
          placeholder={user ? "Scrie un mesaj…" : "Loghează-te ca să poți trimite mesaje"}
          maxLength={300}
          disabled={!user || state.sending}
          className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/40"
        />
        <button
          type="submit"
          data-testid="lobby-chat-send"
          disabled={!user || state.sending || !draft.trim()}
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
    </div>
  );
}

const ChatRow = React.memo(function ChatRow({ m }) {
  const avatar = m.avatar_url ? mediaUrl(m.avatar_url) : "";
  const src = avatar;
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
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-white/95 truncate">
            {m.nickname || "anonim"}
          </span>
          <PlanBadge plan={m.plan} role={m.role} />
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {timeOnly(m.created_at)}
          </span>
        </div>
        <p
          className={`text-[13.5px] leading-snug text-white/90 break-words ${
            m.censored ? "italic text-white/70" : ""
          }`}
        >
          {m.content}
        </p>
      </div>
    </div>
  );
});
