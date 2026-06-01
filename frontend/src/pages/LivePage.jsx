import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api, mediaUrl } from "@/lib/api";
import PublicLayout from "@/components/PublicLayout";
import { RequireAuth } from "@/components/RouteGuards";
import {
  Radio,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  CalendarClock,
  Sparkles,
  ListOrdered,
} from "lucide-react";

const fmtCountdown = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return { days, hours, minutes, seconds };
};

const pad2 = (n) => String(n).padStart(2, "0");

function CountdownDigits({ remaining }) {
  const { days, hours, minutes, seconds } = fmtCountdown(remaining);
  const cells = [
    { v: days, label: "zile" },
    { v: hours, label: "ore" },
    { v: minutes, label: "min" },
    { v: seconds, label: "sec" },
  ];
  return (
    <div
      data-testid="live-countdown"
      className="flex items-center justify-center gap-2 sm:gap-3"
    >
      {cells.map((c, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl px-3 sm:px-5 py-3 sm:py-4 min-w-[64px] sm:min-w-[88px]">
            <div className="font-display text-3xl sm:text-5xl tracking-wider text-white tabular-nums">
              {pad2(c.v)}
            </div>
          </div>
          <span className="mt-1.5 text-[10px] sm:text-xs uppercase tracking-[0.22em] text-white/40">
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function LiveBadge() {
  return (
    <span
      data-testid="live-badge"
      className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-500/40 px-2.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-red-300"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
      Live
    </span>
  );
}

/**
 * Live "no-seek" video player. Wraps a native <video> with custom controls
 * (play/pause + volume + fullscreen). Seeking is disabled — any attempt to
 * scrub is forced back to the server-authoritative elapsed time, which is
 * computed from `startMs` (a wall-clock anchor) so it advances naturally
 * second-by-second together with playback.
 *
 * Props:
 *  - src: video URL
 *  - startMs: epoch ms when the marathon started (server-authoritative anchor)
 *  - durationSeconds: total length in seconds (clamps expected position)
 *  - poster: optional poster URL
 */
function LivePlayer({ src, startMs, durationSeconds, poster }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const initialSyncDoneRef = useRef(false);
  const retryRef = useRef(0);
  const retryTimerRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isFs, setIsFs] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [behindLive, setBehindLive] = useState(false);

  const expectedPosition = useCallback(() => {
    if (!startMs) return 0;
    const elapsed = (Date.now() - startMs) / 1000;
    const max = Number.isFinite(durationSeconds) ? durationSeconds : Infinity;
    return Math.max(0, Math.min(max, elapsed));
  }, [startMs, durationSeconds]);

  // Block user seeks ONLY when they differ meaningfully from natural playback.
  // We allow tiny snaps to expected position when the user attempts to scrub
  // via keyboard / programmatic API. The periodic drift guard is intentionally
  // gone — it was causing constant rebuffering on slow networks because each
  // forward-snap throws away the buffer that was being filled.
  const handleSeeking = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    // Only block if the seek target is AHEAD of current expected (user trying
    // to skip forward) or WAY behind (>60s — likely a scrub). Natural seeks
    // from buffering should remain untouched.
    const allowed = expectedPosition();
    const diff = v.currentTime - allowed;
    if (diff > 2 || diff < -60) {
      try {
        v.currentTime = allowed;
      } catch {
        /* ignore */
      }
    }
  }, [expectedPosition]);

  const handleKeyDown = useCallback((e) => {
    const blocked = [
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "MediaTrackNext",
      "MediaTrackPrevious",
    ];
    if (blocked.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  useEffect(() => {
    const onFs = () => {
      setIsFs(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Try to play once src is ready. Browser may block — show big play overlay.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.volume = volume;
    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        /* user must click */
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Background watchdog: only update the "behind live" indicator. We never
  // forcibly snap forward — that caused 5-10s loops on slow connections.
  useEffect(() => {
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      const allowed = expectedPosition();
      const diff = allowed - (v.currentTime || 0);
      setBehindLive(diff > 30);
    }, 4000);
    return () => clearInterval(id);
  }, [expectedPosition]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.volume === 0) {
      v.volume = 0.6;
      setVolume(0.6);
    }
  };

  const onVolumeChange = (e) => {
    const val = Number(e.target.value);
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    setVolume(val);
    if (val === 0) {
      v.muted = true;
      setMuted(true);
    } else if (v.muted) {
      v.muted = false;
      setMuted(false);
    }
  };

  const toggleFs = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Manual "skip to live" — explicit user action; reseta indicatorul.
  const skipToLive = () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.currentTime = expectedPosition();
      setBehindLive(false);
      if (v.paused) v.play().catch(() => {});
    } catch {
      /* ignore */
    }
  };

  // Resilient error handling: try v.load() a few times before giving up.
  const handleError = () => {
    const v = videoRef.current;
    if (!v) return;
    if (retryRef.current < 4) {
      retryRef.current += 1;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        try {
          v.load();
          v.play().catch(() => {});
        } catch {
          /* ignore */
        }
      }, 1500 * retryRef.current);
    } else {
      setHasError(true);
    }
  };

  return (
    <div
      ref={containerRef}
      data-testid="live-player"
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden ring-1 ring-white/10 group select-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* eslint-disable-next-line */}
      <video
        ref={videoRef}
        src={mediaUrl(src)}
        poster={poster ? mediaUrl(poster) : undefined}
        className="absolute inset-0 w-full h-full object-contain bg-black"
        playsInline
        preload="auto"
        autoPlay
        muted
        onPlay={() => {
          setPlaying(true);
          retryRef.current = 0;
        }}
        onPause={() => setPlaying(false)}
        onSeeking={handleSeeking}
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (!v || initialSyncDoneRef.current) return;
          initialSyncDoneRef.current = true;
          try {
            v.currentTime = expectedPosition();
          } catch {
            /* ignore */
          }
        }}
        onError={handleError}
        onContextMenu={(e) => e.preventDefault()}
        controls={false}
        controlsList="nodownload noremoteplayback noplaybackrate"
      />

      {/* Top-left LIVE badge */}
      <div className="absolute top-3 left-3 z-10">
        <LiveBadge />
      </div>

      {/* Behind-live indicator */}
      {behindLive && playing && !hasError && (
        <button
          type="button"
          onClick={skipToLive}
          data-testid="live-skip-to-live"
          className="absolute top-3 right-3 z-10 inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/20 backdrop-blur-md px-3 h-9 text-[11px] font-bold uppercase tracking-[0.2em] text-red-100 hover:bg-red-500/30 transition-colors"
        >
          <Radio className="h-3.5 w-3.5" />
          Du-mă la live
        </button>
      )}

      {/* Error overlay */}
      {hasError && (
        <div className="absolute inset-0 grid place-items-center bg-black/85 text-center px-6">
          <div>
            <div className="font-display text-2xl tracking-wider text-white">
              Stream-ul nu poate fi încărcat
            </div>
            <p className="mt-2 text-sm text-white/60 max-w-md">
              Verifică conexiunea la internet. Dacă problema persistă, contactează
              un administrator — fișierul video poate să nu fie disponibil.
            </p>
            <button
              type="button"
              onClick={() => {
                retryRef.current = 0;
                setHasError(false);
                const v = videoRef.current;
                if (v) {
                  v.load();
                  v.play().catch(() => {});
                }
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--accent))] text-black px-4 h-10 text-sm font-semibold hover:brightness-110 transition-all"
            >
              Reîncearcă
            </button>
          </div>
        </div>
      )}

      {/* Click-to-play overlay when paused */}
      {!playing && !hasError && (
        <button
          type="button"
          onClick={togglePlay}
          data-testid="live-player-bigplay"
          className="absolute inset-0 grid place-items-center bg-black/30 backdrop-blur-[2px] z-[5]"
          aria-label="Redă"
        >
          <span className="grid h-20 w-20 place-items-center rounded-full bg-[hsl(var(--accent))] text-black shadow-2xl ring-4 ring-white/20 hover:scale-105 transition-transform">
            <Play className="h-9 w-9 fill-black ml-1" />
          </span>
        </button>
      )}

      {/* Bottom controls bar (no progress bar). */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 px-3 sm:px-4 py-2.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center gap-2 sm:gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity"
      >
        <button
          type="button"
          onClick={togglePlay}
          data-testid="live-player-playpause"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label={playing ? "Pauză" : "Redă"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={toggleMute}
          data-testid="live-player-mute"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label={muted ? "Activează sunetul" : "Mut"}
        >
          {muted || volume === 0 ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={onVolumeChange}
          data-testid="live-player-volume"
          aria-label="Volum"
          className="hidden sm:block w-24 accent-[hsl(var(--accent))]"
        />

        <div className="flex-1" />

        <div className="hidden sm:flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/60">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          Transmisiune live
        </div>

        <button
          type="button"
          onClick={toggleFs}
          data-testid="live-player-fullscreen"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label={isFs ? "Ieși din fullscreen" : "Fullscreen"}
        >
          {isFs ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

function LivePageInner() {
  const [status, setStatus] = useState(null);
  const [, setTick] = useState(0);
  const tickStartedRef = useRef(false);

  // Fetch status every 30s for sync with the server (network drift).
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await api.get("/live/status");
        if (mounted) setStatus(data);
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // Local 1s ticker drives countdown + elapsed updates between server polls.
  useEffect(() => {
    if (tickStartedRef.current) return;
    tickStartedRef.current = true;
    const id = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => clearInterval(id);
  }, []);

  const computed = useMemo(() => {
    if (!status) return null;
    const now = Date.now();
    const start = status.start_iso ? new Date(status.start_iso).getTime() : 0;
    const end = status.end_iso ? new Date(status.end_iso).getTime() : 0;
    if (!start || !end) return status;
    let state = status.state;
    if (state !== "disabled") {
      if (now < start) state = "scheduled";
      else if (now >= end) state = "ended";
      else state = "live";
    }
    const elapsed = Math.max(0, Math.min((end - start) / 1000, (now - start) / 1000));
    return {
      ...status,
      state,
      elapsed_seconds: elapsed,
      seconds_until_start: Math.max(0, (start - now) / 1000),
      seconds_until_end: Math.max(0, (end - now) / 1000),
    };
  }, [status]);

  return (
    <PublicLayout>
      <section className="relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(900px circle at 20% 10%, rgba(239,68,68,0.10), transparent 55%), radial-gradient(700px circle at 85% 90%, hsla(46,92%,55%,0.10), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Heading */}
          <div className="mb-6 sm:mb-8 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Radio className="h-5 w-5 text-red-400" />
                <span className="text-[11px] uppercase tracking-[0.3em] text-red-400/80">
                  Cartoonix Live
                </span>
              </div>
              <h1
                data-testid="live-title"
                className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl tracking-wider text-white truncate"
              >
                {computed?.title || "Maraton Cartoonix"}
              </h1>
              {computed?.subtitle && (
                <p className="mt-1 text-sm sm:text-base text-white/55 max-w-2xl">
                  {computed.subtitle}
                </p>
              )}
            </div>
            {computed?.state === "live" && (
              <div className="hidden sm:block">
                <LiveBadge />
              </div>
            )}
          </div>

          {/* Disabled */}
          {(!computed || computed.state === "disabled") && (
            <div
              data-testid="live-disabled"
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center"
            >
              <div className="font-display text-2xl tracking-wider text-white">
                Nicio transmisiune programată
              </div>
              <p className="mt-2 text-white/50 max-w-md mx-auto text-sm">
                Următorul maraton va fi anunțat în curând. Revino mai târziu sau
                urmărește notificările.
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 px-4 h-10 text-sm text-white transition-colors"
              >
                Înapoi la platformă
              </Link>
            </div>
          )}

          {/* Scheduled */}
          {computed?.state === "scheduled" && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              data-testid="live-scheduled"
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-6 sm:p-10"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
              {computed.poster_url ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-6 sm:mb-8 ring-1 ring-white/10">
                  <img
                    src={mediaUrl(computed.poster_url)}
                    alt={computed.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-[hsl(var(--accent))]" />
                    <span className="text-xs uppercase tracking-[0.25em] text-white/70">
                      În curând
                    </span>
                  </div>
                </div>
              ) : (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-6 sm:mb-8 ring-1 ring-white/10 grid place-items-center bg-black">
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(600px circle at 50% 40%, hsla(46,92%,55%,0.12), transparent 60%)",
                    }}
                  />
                  <div className="relative text-center">
                    <Sparkles className="h-8 w-8 mx-auto text-[hsl(var(--accent))]" />
                    <div className="mt-3 font-display text-4xl sm:text-6xl tracking-[0.1em] text-[hsl(var(--accent))]">
                      CARTOONIX
                    </div>
                    <div className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.4em] text-white/40">
                      <CalendarClock className="h-3.5 w-3.5" /> Începe în curând
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center">
                <div className="text-xs uppercase tracking-[0.3em] text-white/45">
                  Începe în
                </div>
                <div className="mt-4">
                  <CountdownDigits remaining={computed.seconds_until_start} />
                </div>
                <p className="mt-6 text-sm text-white/55">
                  Începe la{" "}
                  <span className="text-white">
                    {new Date(computed.start_iso).toLocaleString("ro-RO", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </span>
                </p>
              </div>
            </motion.div>
          )}

          {/* Live */}
          {computed?.state === "live" && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              data-testid="live-active"
            >
              <LivePlayer
                src={computed.video_url}
                startMs={computed.start_iso ? new Date(computed.start_iso).getTime() : 0}
                durationSeconds={computed.duration_seconds}
                poster={computed.poster_url}
              />
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/55">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  Transmisiune în direct
                </span>
                <span className="text-white/30">•</span>
                <span>
                  Se termină la{" "}
                  <span className="text-white">
                    {new Date(computed.end_iso).toLocaleTimeString("ro-RO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
                <span className="text-white/30 hidden sm:inline">•</span>
                <span className="hidden sm:inline">
                  Derularea este dezactivată pe durata maratonului
                </span>
              </div>
            </motion.div>
          )}

          {/* Ended */}
          {computed?.state === "ended" && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              data-testid="live-ended"
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center"
            >
              <div className="mx-auto h-14 w-14 rounded-2xl bg-white/[0.04] grid place-items-center ring-1 ring-white/10">
                <Radio className="h-6 w-6 text-white/60" />
              </div>
              <div className="mt-4 font-display text-2xl sm:text-3xl tracking-wider text-white">
                Maratonul s-a terminat
              </div>
              <p className="mt-2 text-white/55 max-w-md mx-auto text-sm">
                Mulțumim că ai fost alături de noi. Ne vedem la următorul
                maraton — anunțul va apărea în Inbox-ul tău.
              </p>
              <Link
                to="/"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--accent))] text-black hover:brightness-110 px-4 h-10 text-sm font-semibold transition-all"
              >
                Înapoi la platformă
              </Link>
            </motion.div>
          )}

          {/* Program — visible in scheduled, live, ended */}
          {computed && computed.state !== "disabled" && Array.isArray(computed.program) && computed.program.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              data-testid="live-program"
              className="mt-10 sm:mt-12"
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] ring-1 ring-[hsl(var(--accent))]/25">
                  <ListOrdered className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))]/80">
                    Programul maratonului
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl tracking-wider text-white">
                    Ce vei vedea
                  </h2>
                </div>
              </div>

              <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {computed.program.map((title, idx) => (
                  <li
                    key={`${idx}-${title}`}
                    data-testid={`live-program-item-${idx}`}
                    className="group relative flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 sm:px-4 sm:py-3.5 transition-colors hover:border-[hsl(var(--accent))]/35 hover:bg-white/[0.04]"
                  >
                    <span className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-lg bg-black/40 ring-1 ring-white/10 text-[hsl(var(--accent))] font-display text-sm sm:text-base tabular-nums">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm sm:text-[15px] text-white/85 truncate">
                      {title}
                    </span>
                    <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent))]/0 to-transparent group-hover:via-[hsl(var(--accent))]/40 transition-colors" />
                  </li>
                ))}
              </ol>

              <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-white/35">
                Ordinea poate suferi mici ajustări pe durata maratonului
              </p>
            </motion.div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

export default function LivePage() {
  return (
    <RequireAuth>
      <LivePageInner />
    </RequireAuth>
  );
}
