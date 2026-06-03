import React, { useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Tiny, elegant presence widget anchored bottom-left.
 *
 * - Public endpoint: GET /api/presence/online → { online_total }
 * - Polls every 45s, skips polls when the tab is hidden to save resources.
 * - Sends a heartbeat (POST /api/chat/heartbeat) for the current authenticated
 *   user so they are reflected in the online count even when the chat widget
 *   is collapsed.
 * - Only renders for authenticated users (guests get nothing — keeps the
 *   landing/login pages clean).
 */
const POLL_MS = 45_000;
const HEARTBEAT_MS = 45_000;

export default function OnlineUsersWidget() {
  const { user } = useAuth();
  const [count, setCount] = useState(null);
  const [ready, setReady] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!user) return; // No polling at all for guests.

    const isVisible = () =>
      typeof document === "undefined" || document.visibilityState !== "hidden";

    const fetchCount = async () => {
      if (!isVisible()) return;
      try {
        const { data } = await api.get("/presence/online");
        if (!mountedRef.current) return;
        const n = Math.max(0, Number(data?.online_total ?? 0));
        setCount(n);
        setReady(true);
      } catch {
        /* keep last good value */
      }
    };

    const sendBeat = async () => {
      if (!isVisible()) return;
      try {
        await api.post("/chat/heartbeat");
      } catch {
        /* ignore */
      }
    };

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

  if (!user) return null;
  if (!ready || count == null) return null;

  const label = count === 1 ? "utilizator online" : "utilizatori online";

  return (
    <div
      className="fixed bottom-4 left-4 z-40 pointer-events-none select-none"
      data-testid="online-users-widget"
      aria-live="polite"
      title={`${count.toLocaleString("ro-RO")} ${label}`}
    >
      <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 shadow-lg backdrop-blur-md transition hover:border-emerald-400/40">
        <span className="relative inline-flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <Users className="h-3.5 w-3.5 text-emerald-300/90" strokeWidth={2} />
        <span
          data-testid="online-users-count"
          className="text-[12px] font-semibold text-white tabular-nums leading-none"
        >
          {count.toLocaleString("ro-RO")}
        </span>
        <span className="text-[10px] uppercase tracking-[0.16em] text-white/55 leading-none hidden sm:inline">
          online
        </span>
      </div>
    </div>
  );
}
