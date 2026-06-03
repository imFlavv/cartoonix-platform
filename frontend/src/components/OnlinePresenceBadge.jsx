import React, { useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Elegant, low-cost "online users" badge pinned to the bottom-left corner.
 *
 *  - Reads from the existing lightweight endpoint `GET /api/presence/online`
 *    (a single Mongo count() against the indexed `chat_online.last_seen`).
 *  - Polls every 60s, and only when the tab is visible (auto-pauses in the
 *    background to avoid wasted work).
 *  - Sends a heartbeat for authenticated users so the current session is
 *    reflected in the count even when the chat widget is collapsed.
 */
const POLL_MS = 60000;
const HEARTBEAT_MS = 60000;

export default function OnlinePresenceBadge() {
  const { user } = useAuth();
  const [count, setCount] = useState(null);
  const [ready, setReady] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const isVisible = () =>
      typeof document === "undefined" || document.visibilityState !== "hidden";

    const fetchCount = async () => {
      if (!isVisible()) return;
      try {
        const { data } = await api.get("/presence/online");
        if (!mountedRef.current) return;
        setCount(Number(data?.online_total || 0));
        setReady(true);
      } catch {
        /* keep last good value */
      }
    };

    const sendBeat = async () => {
      if (!user || !isVisible()) return;
      try {
        await api.post("/chat/heartbeat");
      } catch {
        /* ignore */
      }
    };

    // Kick off
    sendBeat();
    fetchCount();

    const tFetch = setInterval(fetchCount, POLL_MS);
    const tBeat = setInterval(sendBeat, HEARTBEAT_MS);

    const onVis = () => {
      if (isVisible()) {
        sendBeat();
        fetchCount();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      mountedRef.current = false;
      clearInterval(tFetch);
      clearInterval(tBeat);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user]);

  if (!ready) return null;

  const label = count === 1 ? "utilizator online" : "utilizatori online";

  return (
    <div
      data-testid="online-presence-badge"
      className="fixed bottom-3 left-3 z-[55] select-none pointer-events-auto"
      aria-live="polite"
    >
      <div
        className="group inline-flex items-center gap-2 rounded-full pl-2 pr-3 py-1.5 backdrop-blur-md transition-all hover:translate-y-[-1px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(18,18,22,0.85) 0%, rgba(10,10,12,0.85) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow:
            "0 10px 30px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
        }}
        title={`${count} ${label} chiar acum`}
      >
        {/* Pulsing dot */}
        <span className="relative inline-flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
        </span>

        <Users className="h-3.5 w-3.5 text-emerald-300/90" strokeWidth={2.2} />

        <span
          data-testid="online-presence-count"
          className="text-[12px] font-semibold tabular-nums text-white/95 leading-none"
        >
          {count}
        </span>
        <span className="text-[10.5px] uppercase tracking-[0.16em] text-white/55 leading-none hidden sm:inline">
          online
        </span>
      </div>
    </div>
  );
}
