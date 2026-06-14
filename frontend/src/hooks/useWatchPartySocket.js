import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useWatchPartySocket — manages a single authenticated WebSocket connection
 * to /api/watch-parties/ws/{code}. Handles:
 *  - JWT token attachment via ?token=
 *  - automatic reconnect with exponential backoff (max ~30s)
 *  - a `send` helper that queues commands while offline and flushes on connect
 *  - exposes `lastMessage`, `connectionStatus` and `version` for the UI
 *
 * The hook intentionally does *not* parse domain payloads — the room page
 * inspects `lastMessage.type` and decides how to update local state. This
 * keeps the socket layer dumb and the page layer testable.
 */
export default function useWatchPartySocket(publicCode) {
  const [status, setStatus] = useState("idle"); // idle | connecting | open | closed | error
  const [lastMessage, setLastMessage] = useState(null);

  const wsRef = useRef(null);
  const queueRef = useRef([]);
  const reconnectAttemptsRef = useRef(0);
  const closedByUserRef = useRef(false);
  const reconnectTimerRef = useRef(null);

  const buildUrl = useCallback(() => {
    const token = localStorage.getItem("cartoonix_token") || "";
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/api/watch-parties/ws/${encodeURIComponent(
      publicCode
    )}?token=${encodeURIComponent(token)}`;
  }, [publicCode]);

  const flushQueue = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const items = queueRef.current.splice(0);
    items.forEach((msg) => {
      try {
        ws.send(JSON.stringify(msg));
      } catch {
        /* will be retried on next reconnect */
        queueRef.current.unshift(msg);
      }
    });
  }, []);

  const connect = useCallback(() => {
    if (!publicCode) return;
    closedByUserRef.current = false;
    setStatus("connecting");

    let ws;
    try {
      ws = new WebSocket(buildUrl());
    } catch (e) {
      setStatus("error");
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setStatus("open");
      flushQueue();
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setLastMessage(parsed);
      } catch {
        /* ignore malformed server messages */
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = (event) => {
      setStatus("closed");
      wsRef.current = null;
      if (closedByUserRef.current) return;
      // 4401/4403/4404/4410 are auth/state failures — do not auto-reconnect
      // those, the page will react to the close code via state.
      if ([4401, 4403, 4404, 4410].includes(event.code)) {
        return;
      }
      scheduleReconnect();
    };
  }, [publicCode, buildUrl, flushQueue]);

  const scheduleReconnect = useCallback(() => {
    if (closedByUserRef.current) return;
    if (reconnectTimerRef.current) return;
    const attempt = ++reconnectAttemptsRef.current;
    const delay = Math.min(30000, 800 * 2 ** Math.min(attempt, 6));
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connect();
    }, delay);
  }, [connect]);

  const send = useCallback((type, payload = {}) => {
    const msg = {
      type,
      party_id: publicCode,
      sent_at: new Date().toISOString(),
      payload,
    };
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(msg));
        return true;
      } catch {
        queueRef.current.push(msg);
        return false;
      }
    }
    queueRef.current.push(msg);
    return false;
  }, [publicCode]);

  const close = useCallback(() => {
    closedByUserRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    const ws = wsRef.current;
    if (ws) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
    wsRef.current = null;
  }, []);

  useEffect(() => {
    connect();
    return () => close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicCode]);

  return { status, lastMessage, send, close };
}
