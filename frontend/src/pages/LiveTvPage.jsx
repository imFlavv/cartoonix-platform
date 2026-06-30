import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { motion } from "framer-motion";
import PublicLayout from "@/components/PublicLayout";
import { RequireAuth } from "@/components/RouteGuards";
import {
  Radio,
  Sparkles,
  MonitorPlay,
  SignalHigh,
  Clock3,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

// IMPORTANT: stream URL kept EXACTLY as provided by the client.
const STREAM_URL = "https://stream.cartoonix.ro/iptv/channel/1.m3u8?mode=segmenter";

function LiveTvPageInner() {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const retryTimerRef = useRef(null);
  const manualRetryRef = useRef(0);

  const [status, setStatus] = useState("loading"); // loading | playing | error
  const [clock, setClock] = useState("--:--");
  const [viewers, setViewers] = useState(1284);

  // ---- overlay helpers (mirrors original showLoading / showError / hide) ----
  const showLoading = useCallback(() => setStatus("loading"), []);
  const showError = useCallback(() => setStatus("error"), []);
  const hideOverlays = useCallback(() => setStatus("playing"), []);

  const safePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video
      .play()
      .then(() => hideOverlays())
      .catch(() => {
        // Browser may block autoplay. Because the <video> has controls,
        // the user can press Play manually.
        hideOverlays();
      });
  }, [hideOverlays]);

  const cleanupPlayer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }, []);

  const loadStream = useCallback(() => {
    showLoading();
    cleanupPlayer();

    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: false,
        enableWorker: true,
        // Larger buffer for live stream so it doesn't drop on
        // segment / ErsatzTV fluctuations.
        liveSyncDurationCount: 6,
        liveMaxLatencyDurationCount: 12,
        maxBufferLength: 45,
        maxMaxBufferLength: 90,
        // More tolerant timeout/retry for live.
        manifestLoadingTimeOut: 20000,
        manifestLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 20000,
        levelLoadingMaxRetry: 6,
        levelLoadingRetryDelay: 1000,
        fragLoadingTimeOut: 30000,
        fragLoadingMaxRetry: 8,
        fragLoadingRetryDelay: 1000,
      });
      hlsRef.current = hls;

      hls.loadSource(STREAM_URL);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        safePlay();
      });

      hls.on(Hls.Events.LEVEL_LOADED, () => {
        hideOverlays();
      });

      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        hideOverlays();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.log("HLS error:", data);

        if (!data.fatal) {
          return;
        }

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          console.log("HLS network error, incerc reconectare...");
          try {
            hls.startLoad();
          } catch (e) {
            console.log("startLoad failed:", e);
          }
          retryTimerRef.current = setTimeout(() => {
            if (video.readyState === 0 && manualRetryRef.current < 3) {
              manualRetryRef.current += 1;
              loadStream();
            } else if (video.readyState === 0) {
              showError();
            }
          }, 8000);
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          console.log("HLS media error, incerc recoverMediaError...");
          try {
            hls.recoverMediaError();
          } catch (e) {
            console.log("recoverMediaError failed:", e);
            showError();
          }
          return;
        }

        showError();
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari / iOS)
      video.src = STREAM_URL;
      video.addEventListener("loadedmetadata", safePlay, { once: true });
      video.addEventListener("playing", hideOverlays);
      video.addEventListener("canplay", hideOverlays);
      video.addEventListener("error", showError, { once: true });
    } else {
      showError();
    }
  }, [cleanupPlayer, hideOverlays, safePlay, showError, showLoading]);

  // ---- mount: wire video events + start the stream ----
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const onPlaying = () => hideOverlays();
    const onCanPlay = () => hideOverlays();
    const onWaiting = () => showLoading();
    const onStalled = () => showLoading();

    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("stalled", onStalled);

    loadStream();

    return () => {
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("stalled", onStalled);
      cleanupPlayer();
    };
  }, []);

  // ---- clock ----
  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleTimeString("ro-RO", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // ---- fake viewers counter (same behaviour as original) ----
  useEffect(() => {
    const id = setInterval(() => {
      setViewers((v) => Math.max(900, v + Math.floor(Math.random() * 21) - 10));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const handleRetry = () => {
    manualRetryRef.current = 0;
    loadStream();
  };

  const stats = [
    { ic: SignalHigh, v: "În direct", l: "Status" },
    { ic: Sparkles, v: viewers.toLocaleString("ro-RO"), l: "Spectatori" },
    { ic: MonitorPlay, v: "Live HD", l: "Calitate" },
    { ic: Radio, v: "Cartoonix 1", l: "Canal" },
  ];

  return (
    <PublicLayout>
      <section className="relative overflow-hidden">
        {/* ambient background */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at top, hsla(var(--accent) / 0.10), transparent 55%)",
          }}
        />
        <div className="pointer-events-none absolute left-1/2 top-[28%] -z-10 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[hsl(var(--accent))]/15 blur-[130px]" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          {/* Header row */}
          <div className="flex flex-col items-center text-center">
            <div className="flex w-full items-center justify-between">
              <span
                data-testid="livetv-kicker"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl px-3.5 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-white/75"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--accent))] opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
                </span>
                Transmisiune în direct
              </span>

              <span
                data-testid="livetv-clock"
                className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl px-3.5 py-1.5 text-xs font-semibold text-white/70"
              >
                <Clock3 className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                {clock}
              </span>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-7 font-display text-4xl sm:text-6xl tracking-tight leading-[1.05]"
            >
              <span className="bg-gradient-to-r from-white via-[hsl(var(--accent))] to-white bg-[length:200%_auto] bg-clip-text text-transparent animate-[shimmer_6s_linear_infinite]">
                Cartoonix Live
              </span>
            </motion.h1>

            <p className="mt-4 max-w-xl text-base sm:text-lg text-white/55">
              Distracție non-stop, în calitate cristalină. Urmărește canalul tău
              preferat oriunde, oricând.
            </p>
          </div>

          {/* Player */}
          <div className="relative mx-auto mt-10 w-full max-w-4xl">
            <div className="pointer-events-none absolute -inset-6 rounded-[40px] bg-[hsl(var(--accent))]/15 blur-[48px] opacity-70" />

            <div
              data-testid="livetv-player"
              className="relative aspect-video w-full overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[0_0_90px_-15px_hsla(var(--accent)/0.4)]"
            >
              <video
                ref={videoRef}
                className="h-full w-full bg-black object-cover"
                controls
                autoPlay
                muted
                playsInline
              />

              {/* scanline + frame ring */}
              <div
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  background:
                    "repeating-linear-gradient(to bottom, rgba(255,255,255,.02) 0, rgba(255,255,255,.02) 1px, transparent 1px, transparent 3px)",
                }}
              />
              <div className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]" />

              {/* Live badge */}
              <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 backdrop-blur-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--accent))] opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
                </span>
                În direct
              </div>

              {/* Loading overlay */}
              {status === "loading" && (
                <div
                  data-testid="livetv-loading"
                  className="absolute inset-0 z-10 grid place-items-center bg-black/85 backdrop-blur-sm"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-white/15 border-t-[hsl(var(--accent))]" />
                    <p className="text-sm text-white/75">
                      Se conectează la transmisiune...
                    </p>
                  </div>
                </div>
              )}

              {/* Error overlay */}
              {status === "error" && (
                <div
                  data-testid="livetv-error"
                  className="absolute inset-0 z-10 grid place-items-center bg-black/85 backdrop-blur-sm p-6"
                >
                  <div className="flex max-w-md flex-col items-center gap-4 text-center">
                    <div className="grid h-14 w-14 place-items-center rounded-full border border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/15">
                      <AlertTriangle className="h-6 w-6 text-[hsl(var(--accent))]" />
                    </div>
                    <p className="font-display text-lg font-bold text-white">
                      Transmisiunea nu este disponibilă
                    </p>
                    <p className="text-sm text-white/55">
                      Nu am putut încărca semnalul live momentan. Verifică
                      conexiunea și încearcă din nou.
                    </p>
                    <button
                      type="button"
                      onClick={handleRetry}
                      data-testid="livetv-retry"
                      className="mt-1 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--accent))] px-5 py-2.5 text-sm font-bold text-[hsl(var(--accent-foreground))] transition-transform hover:scale-105"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reîncearcă
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-8 grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s, i) => {
              const Icon = s.ic;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md px-4 py-3 transition-colors hover:border-[hsl(var(--accent))]/40"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                  <div className="min-w-0">
                    <div className="font-display text-sm font-bold text-white truncate">
                      {s.v}
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.08em] text-white/40">
                      {s.l}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-8 text-center text-[11px] uppercase tracking-[0.22em] text-white/30">
            © {new Date().getFullYear()} Cartoonix Live · Toate drepturile rezervate
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}

export default function LiveTvPage() {
  return (
    <RequireAuth>
      <LiveTvPageInner />
    </RequireAuth>
  );
}
