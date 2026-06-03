import React, { useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";
import api from "@/lib/api";

/**
 * Tiny, elegant presence widget anchored bottom-left.
 *
 * - Public endpoint: GET /api/presence/online → { online_total }
 * - Polls every 45s, skips polls when the tab is hidden to save resources.
 * - First load is best-effort; failures are silent (the widget simply stays
 *   in its previous state) so it never blocks the UI.
 */
const POLL_MS = 45_000;

export default function OnlineUsersWidget() {
  const [count, setCount] = useState(null);
  const [ready, setReady] = useState(false);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let aborted = false;

    const fetchCount = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const { data } = await api.get("/presence/online");
        if (aborted || !mountedRef.current) return;
        const n = Math.max(0, Number(data?.online_total ?? 0));
        setCount(n);
        setReady(true);
      } catch {
        // Silent: keep last known value to avoid flicker.
      }
    };

    fetchCount();
    timerRef.current = setInterval(fetchCount, POLL_MS);

    const onVis = () => {
      if (document.visibilityState === "visible") fetchCount();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      aborted = true;
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

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
        <span className="text-[12px] font-semibold text-white tabular-nums leading-none">
          {count.toLocaleString("ro-RO")}
        </span>
      </div>
    </div>
  );
}
