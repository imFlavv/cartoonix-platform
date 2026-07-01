import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { motion } from "framer-motion";
import PublicLayout from "@/components/PublicLayout";
import { RequireAuth } from "@/components/RouteGuards";
import {
  Radio,
  SignalHigh,
  Clock3,
  RotateCcw,
  AlertTriangle,
  Tv,
  Wifi,
  Gauge,
  ShieldCheck,
} from "lucide-react";

// Broadcast-style animated equalizer (uses framer-motion, no extra CSS).
function Equalizer({ bars = 5, className = "" }) {
  return (
    <div className={`flex items-end gap-[3px] ${className}`}>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-[hsl(var(--accent))]"
          initial={{ height: 6 }}
          animate={{ height: [6, 18, 9, 22, 7] }}
          transition={{
            duration: 1.05 + (i % 3) * 0.28,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.12,
          }}
        />
      ))}
    </div>
  );
}

// IMPORTANT: stream URL kept EXACTLY as provided by the client.
const STREAM_URL = "https://stream.cartoonix.ro/iptv/channel/1.m3u8?mode=segmenter";

function LiveTvPageInner() {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const retryTimerRef = useRef(null);
  const manualRetryRef = useRef(0);

  const [status, setStatus] = useState("loading"); // loading | playing | error
  const [clock, setClock] = useState("--:--");

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

  const handleRetry = () => {
    manualRetryRef.current = 0;
    loadStream();
  };

  const details = [
    { ic: Tv, label: "Canal", value: "Cartoonix 1" },
    { ic: Gauge, label: "Calitate", value: "Live HD", accentValue: true },
    { ic: SignalHigh, label: "Status", value: "În direct", dot: true },
  ];

  return (
    <PublicLayout>
      <section className="relative overflow-hidden">
        {/* ---- ambient background ---- */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 90% 55% at 50% 0%, hsla(var(--accent) / 0.12), transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 55% at 50% 25%, #000 30%, transparent 78%)",
            maskImage:
              "radial-gradient(ellipse 75% 55% at 50% 25%, #000 30%, transparent 78%)",
          }}
        />
        <div className="pointer-events-none absolute left-[62%] top-[18%] -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[hsl(var(--accent))]/12 blur-[140px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* ---- Header row ---- */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span
                  data-testid="livetv-kicker"
                  className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-[hsl(var(--accent))]"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--accent))] opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
                  </span>
                  On Air
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/35">
                  Transmisiune în direct
                </span>
              </div>

              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="mt-4 font-display text-4xl sm:text-6xl lg:text-7xl tracking-tight leading-[0.98]"
              >
                <span className="bg-gradient-to-r from-white via-[hsl(var(--accent))] to-white bg-[length:200%_auto] bg-clip-text text-transparent animate-[shimmer_6s_linear_infinite]">
                  Cartoonix Live
                </span>
              </motion.h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-4 py-2.5">
                <Wifi className="h-4 w-4 text-[hsl(var(--accent))]" />
                <div className="leading-tight">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                    Semnal
                  </div>
                  <div className="text-xs font-bold text-white">Stabil</div>
                </div>
                <Equalizer className="h-5 ml-1" />
              </div>

              <div
                data-testid="livetv-clock"
                className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-4 py-2.5 leading-tight"
              >
                <Clock3 className="h-4 w-4 text-[hsl(var(--accent))]" />
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                    Ora
                  </div>
                  <div className="text-xs font-bold text-white tabular-nums">
                    {clock}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---- Main grid: player + side rail ---- */}
          <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
            {/* Player */}
            <div className="relative lg:col-span-8">
              <div className="pointer-events-none absolute -inset-5 rounded-[40px] bg-[hsl(var(--accent))]/12 blur-[52px] opacity-70" />

              <div
                data-testid="livetv-player"
                className="relative aspect-video w-full overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[0_30px_90px_-30px_hsla(var(--accent)/0.5)]"
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

                {/* Bottom info bar */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 bg-gradient-to-t from-black/80 via-black/25 to-transparent px-4 pb-12 pt-16 sm:px-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(var(--accent))]/15 ring-1 ring-[hsl(var(--accent))]/30">
                      <Tv className="h-4 w-4 text-[hsl(var(--accent))]" />
                    </span>
                    <div className="leading-tight">
                      <div className="text-sm font-bold text-white">
                        Cartoonix 1
                      </div>
                      <div className="text-[11px] text-white/55">
                        Acum în direct
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Equalizer className="h-5" />
                    <span className="rounded-md border border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.15em] text-[hsl(var(--accent))]">
                      Live HD
                    </span>
                  </div>
                </div>

                {/* Loading overlay */}
                {status === "loading" && (
                  <div
                    data-testid="livetv-loading"
                    className="absolute inset-0 z-30 grid place-items-center bg-black/85 backdrop-blur-sm"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/15 border-t-[hsl(var(--accent))]" />
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
                    className="absolute inset-0 z-30 grid place-items-center bg-black/85 backdrop-blur-sm p-6"
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

            {/* Side rail */}
            <div className="flex flex-col gap-4 lg:col-span-4">
              {/* Signal card */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(var(--accent))]/12 ring-1 ring-[hsl(var(--accent))]/25">
                      <Radio className="h-4 w-4 text-[hsl(var(--accent))]" />
                    </span>
                    <div className="leading-tight">
                      <div className="text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--accent))]/80">
                        Semnal live
                      </div>
                      <div className="font-display text-lg tracking-wide text-white">
                        În emisie
                      </div>
                    </div>
                  </div>
                  <Equalizer bars={7} className="h-6" />
                </div>
                <div className="mt-4 h-px w-full bg-white/[0.06]" />
                <p className="mt-3 flex items-center gap-2 text-[12px] text-white/50">
                  <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                  Conexiune securizată · redare adaptivă HLS
                </p>
              </div>

              {/* Details card */}
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-2.5">
                <div className="px-3 pb-2 pt-3 text-[10px] uppercase tracking-[0.24em] text-white/35">
                  Detalii transmisiune
                </div>
                <div className="flex flex-col">
                  {details.map((d, i) => {
                    const Icon = d.ic;
                    return (
                      <div
                        key={i}
                        className="group flex items-center justify-between rounded-2xl px-3 py-3 transition-colors hover:bg-white/[0.03]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-black/40 ring-1 ring-white/10 text-[hsl(var(--accent))] transition-colors group-hover:ring-[hsl(var(--accent))]/30">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="text-[11px] uppercase tracking-[0.08em] text-white/45">
                            {d.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {d.pulse && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--accent))] opacity-75 animate-ping" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
                            </span>
                          )}
                          {d.dot && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_theme(colors.emerald.400)]" />
                          )}
                          <span
                            className={`font-display text-sm tabular-nums ${
                              d.accentValue
                                ? "text-[hsl(var(--accent))]"
                                : "text-white"
                            }`}
                          >
                            {d.value}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Note card */}
              <div className="rounded-3xl border border-[hsl(var(--accent))]/15 bg-gradient-to-br from-[hsl(var(--accent))]/[0.08] to-transparent p-5">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[hsl(var(--accent))]/85">
                  <Gauge className="h-3.5 w-3.5" />
                  Sfat
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  Redarea se adaptează automat la viteza conexiunii tale. Dacă
                  imaginea se întrerupe, apasă{" "}
                  <span className="font-semibold text-white">Reîncearcă</span> —
                  ne reconectăm în câteva secunde.
                </p>
              </div>
            </div>
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
