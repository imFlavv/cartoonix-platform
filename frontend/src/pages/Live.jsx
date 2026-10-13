import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, resolveVideoUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { NavBar } from "@/components/NavBar";
import { PlusIcon } from "@/components/PlusIcon";
import {
  Volume2, VolumeX, Maximize, Radio, Tv, Lock, Sparkles, Play, Pause, Cast,
  CalendarClock, Heart, Share2, PictureInPicture2, ChevronLeft, ChevronRight,
  Clock, Ghost, Flame, ArrowRight,
} from "lucide-react";

const POLL_MS = 8000;   // re-sync with the server every 8s
const ALL_CHANNEL_KEY = "__all__";
const HALLOWEEN_KEY = "halloween";
const CHAT_ROUTE = "/lobby/chat";

// ---- Per-channel visual identity (custom stylized badges, not official brand logos) ----
const CH_STYLE = {
  general: { bg: "linear-gradient(135deg,#ffd43b,#ff9500)", fg: "#231703", short: "TV", icon: "tv" },
  boomerang: { bg: "linear-gradient(135deg,#2b7bff,#123fb8)", fg: "#fff", short: "B" },
  "cartoon network": { bg: "linear-gradient(135deg,#2a2a2a,#0a0a0a)", fg: "#fff", short: "CN", ring: "#ffffff22" },
  jetix: { bg: "linear-gradient(135deg,#ff4040,#b70d0d)", fg: "#fff", short: "JX" },
  minimax: { bg: "linear-gradient(135deg,#ff9a16,#ff5a00)", fg: "#fff", short: "M" },
  halloween: { bg: "linear-gradient(135deg,#ff7a18,#7a2bd6)", fg: "#fff", icon: "ghost" },
};
const chStyle = (ch) => {
  if (!ch) return CH_STYLE.general;
  if (ch.key === ALL_CHANNEL_KEY) return CH_STYLE.general;
  if (ch.key === HALLOWEEN_KEY || ch.coming_soon) return CH_STYLE.halloween;
  return CH_STYLE[(ch.name || "").toLowerCase()] || CH_STYLE.general;
};
const chStyleByName = (name) => {
  if (!name) return CH_STYLE.general;
  return CH_STYLE[name.toLowerCase()] || CH_STYLE.general;
};

const ChannelBadge = ({ style, size = "h-11 w-11", rounded = "rounded-xl", text = "text-sm" }) => (
  <span
    className={`relative shrink-0 grid place-items-center ${size} ${rounded} font-black shadow-inner`}
    style={{ background: style.bg, color: style.fg, boxShadow: style.ring ? `inset 0 0 0 1px ${style.ring}` : undefined }}
  >
    {style.icon === "ghost" ? (
      <Ghost className="h-5 w-5" />
    ) : style.icon === "tv" ? (
      <Tv className="h-5 w-5" />
    ) : (
      <span className={`${text} tracking-tight leading-none`}>{style.short}</span>
    )}
  </span>
);

const fmtClock = (ms) => {
  if (!ms || !isFinite(ms)) return "--:--";
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const roNum = (n) => (n || 0).toLocaleString("ro-RO");

const Live = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPlus = !!user?.plus;

  const [nowData, setNowData] = useState(null);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(true); // start muted so autoplay is allowed
  const [channels, setChannels] = useState([]);
  const [channel, setChannel] = useState(ALL_CHANNEL_KEY);
  const [chatOnline, setChatOnline] = useState(0);
  const [, setTick] = useState(0); // 1s ticker for the live progress clock
  const [favs, setFavs] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("cx_live_favs") || "[]")); } catch (_) { return new Set(); }
  });

  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const carouselRef = useRef(null);
  const nowRef = useRef(null);
  const fetchedAtRef = useRef(0);
  const seekedSrcRef = useRef(null);
  const mutedRef = useRef(true);
  const reportedRef = useRef(new Set());
  const [ended, setEnded] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [uiVisible, setUiVisible] = useState(true);
  const hideTimerRef = useRef(null);
  const [castAvailable, setCastAvailable] = useState(false);
  const [deviceHint, setDeviceHint] = useState(null);
  const castKindRef = useRef(null);
  const castSetupRef = useRef(false);

  const showUi = useCallback(() => {
    setUiVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused) setUiVisible(false);
    }, 3000);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); } else { v.pause(); }
    showUi();
  }, [showUi]);

  useEffect(() => () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }, []);
  useEffect(() => { nowRef.current = nowData; if (nowData) fetchedAtRef.current = Date.now(); }, [nowData]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { const t = setInterval(() => setTick((x) => (x + 1) % 100000), 1000); return () => clearInterval(t); }, []);

  const fetchNow = useCallback(async () => {
    try {
      const { data } = await api.get("/live/now", { params: { channel } });
      setNowData(data);
      return data;
    } catch (_) { return null; }
  }, [channel]);

  useEffect(() => {
    if (!isPlus) return;
    api.get("/live/channels").then(({ data }) => setChannels(data.channels || [])).catch(() => {});
  }, [isPlus]);

  useEffect(() => {
    if (!isPlus) return;
    const load = () => api.get("/chat/stats").then((r) => setChatOnline(r.data?.online_chat ?? 0)).catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [isPlus]);

  useEffect(() => {
    seekedSrcRef.current = null;
    reportedRef.current = new Set();
    setEnded(false);
    setNowData(null);
  }, [channel]);

  useEffect(() => {
    if (!isPlus) return;
    fetchNow();
    const t = setInterval(fetchNow, POLL_MS);
    return () => clearInterval(t);
  }, [isPlus, fetchNow]);

  const reportDuration = useCallback(() => {
    const v = videoRef.current;
    const cur = nowRef.current?.current;
    if (!v || !cur) return;
    const dur = v.duration;
    if (!dur || !isFinite(dur) || dur < 120) return;
    const key = `${cur.show_id}:${cur.episode_number}`;
    if (reportedRef.current.has(key)) return;
    reportedRef.current.add(key);
    if (Math.abs((cur.duration_seconds || 0) - dur) <= 2) return;
    api.post("/live/report_duration", { show_id: cur.show_id, episode_number: cur.episode_number, duration: dur })
      .catch(() => {});
  }, []);

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setEnded(false);
    reportDuration();
    const src = v.currentSrc || v.src;
    if (seekedSrcRef.current !== src) {
      seekedSrcRef.current = src;
      const nd = nowRef.current;
      if (isFinite(v.duration) && v.duration > 0 && nd?.current) {
        const target = Math.min(Math.max(0, nd.offset || 0), v.duration - 0.3);
        try { v.currentTime = target; } catch (_) { /* ignore */ }
      }
    }
    v.muted = mutedRef.current;
    v.play().catch(() => { v.muted = true; setMuted(true); v.play().catch(() => {}); });
  };

  const onEnded = () => {
    setEnded(true);
    const startKey = (() => { const c = nowRef.current?.current; return c ? `${c.show_id}:${c.episode_number}` : null; })();
    let tries = 0;
    const tick = async () => {
      const d = await fetchNow();
      tries += 1;
      const k = d?.current ? `${d.current.show_id}:${d.current.episode_number}` : null;
      if (k && k !== startKey) return;
      if (tries < 30) setTimeout(tick, 1000);
    };
    tick();
  };
  const onError = () => { /* keep the schedule; next poll / rotation recovers */ };

  useEffect(() => {
    const v = videoRef.current;
    if (!v || castSetupRef.current) return;
    castSetupRef.current = true;
    if (typeof v.webkitShowPlaybackTargetPicker === "function") {
      castKindRef.current = "airplay";
      setCastAvailable(true);
    } else if (v.remote && typeof v.remote.prompt === "function") {
      castKindRef.current = "remote";
      setCastAvailable(true);
      if (typeof v.remote.watchAvailability === "function") {
        v.remote.watchAvailability((available) => setDeviceHint(available)).catch(() => {});
      }
    }
  }, [nowData]);

  const handleCast = () => {
    const v = videoRef.current;
    if (!v) return;
    if (castKindRef.current === "airplay" && v.webkitShowPlaybackTargetPicker) {
      v.webkitShowPlaybackTargetPicker();
    } else if (v.remote?.prompt) {
      v.remote.prompt().catch(() => {});
    }
  };

  const handlePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (v.requestPictureInPicture) await v.requestPictureInPicture();
    } catch (_) { /* noop */ }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: "Cartoonix TV", url });
      else await navigator.clipboard.writeText(url);
    } catch (_) { /* noop */ }
  };

  const toggleFav = () => {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) next.delete(channel); else next.add(channel);
      try { localStorage.setItem("cx_live_favs", JSON.stringify([...next])); } catch (_) { /* noop */ }
      return next;
    });
  };

  const onVolume = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setMuted(val === 0);
    if (videoRef.current) { videoRef.current.volume = val; videoRef.current.muted = val === 0; }
  };
  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    if (videoRef.current) videoRef.current.muted = m;
  };
  const toggleFullscreen = () => {
    const container = playerRef.current;
    const v = videoRef.current;
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) { (document.exitFullscreen || document.webkitExitFullscreen)?.call(document); return; }
    const req = container?.requestFullscreen || container?.webkitRequestFullscreen || container?.webkitRequestFullScreen;
    if (req) { try { req.call(container); return; } catch (_) { /* fall through */ } }
    if (v?.webkitEnterFullscreen) { try { v.webkitEnterFullscreen(); return; } catch (_) { /* noop */ } }
    if (v?.requestFullscreen) { try { v.requestFullscreen(); } catch (_) { /* noop */ } }
  };

  // ---- BETA gate — Cartoonix TV is PLUS-only for now ----
  if (!isPlus) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="live-beta-gate">
        <NavBar />
        <div className="pt-20 min-h-screen flex items-center justify-center px-4">
          <div className="relative max-w-lg w-full text-center">
            <div className="absolute inset-0 -z-10 opacity-40 blur-3xl" style={{ background: "radial-gradient(circle at 30% 20%, rgba(236,28,36,0.5), transparent 60%), radial-gradient(circle at 80% 90%, rgba(255,204,0,0.35), transparent 60%)" }} />
            <div className="bg-[#111] border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl">
              <div className="flex items-center justify-center gap-2 mb-5">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ec1c24] text-white text-xs font-bold uppercase tracking-wider">
                  <Radio className="h-4 w-4 animate-pulse" /> Live
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ffcc00]/15 text-[#ffcc00] border border-[#ffcc00]/40 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" /> Beta
                </span>
              </div>
              <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Lock className="h-8 w-8 text-[#ffcc00]" />
              </div>
              <h1 className="font-display text-3xl md:text-4xl mb-3">Cartoonix TV este în BETA</h1>
              <p className="text-white/60 mb-2">
                Canalul nostru non-stop care redă desene ca la televizor, sincronizat pentru toți, este
                momentan disponibil <b className="text-white">exclusiv pentru membrii Cartoonix PLUS</b>.
              </p>
              <p className="text-white/40 text-sm mb-7">
                Testăm funcționalitatea și o vom deschide pentru toată lumea în curând. Mulțumim pentru răbdare! 📺
              </p>
              <button
                data-testid="live-beta-upsell"
                onClick={() => navigate("/plus")}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#ffcc00] text-black font-bold hover:brightness-110 transition-all duration-200"
              >
                <PlusIcon className="h-5 w-5" /> Deblochează cu Cartoonix PLUS
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Derived state ----
  const current = nowData?.current;
  const comingSoon = !!nowData?.coming_soon;
  const selCh = channels.find((c) => c.key === channel);
  const chDisplay = channel === ALL_CHANNEL_KEY ? "Cartoonix TV" : (selCh?.name || current?.channel || "Cartoonix TV");
  const playingChStyle = chStyleByName(current?.channel) || chStyle(selCh);
  const liveCount = channels.length;

  // Live progress clock (episode position) — derived from server offset + elapsed since fetch
  const dur = current?.duration_seconds || 0;
  const liveOffset = current
    ? Math.min(Math.max(0, (nowData.offset || 0) + (Date.now() - fetchedAtRef.current) / 1000), Math.max(1, dur))
    : 0;
  const progressPct = dur > 0 ? Math.min(100, (liveOffset / dur) * 100) : 0;
  const remainingMin = Math.max(0, Math.ceil((dur - liveOffset) / 60));
  const curStartMs = current ? Date.now() - liveOffset * 1000 : 0;
  const curEndMs = current ? curStartMs + dur * 1000 : 0;

  // Build the upcoming timeline from server "next" list
  let cursor = curEndMs;
  const upcoming = (nowData?.next || []).map((it) => {
    const d = (it.duration_seconds || 1320) * 1000;
    const start = cursor;
    cursor += d;
    return { ...it, start, end: start + d };
  });
  const carouselItems = current
    ? [{ ...current, start: curStartMs, end: curEndMs, status: "now" }, ...upcoming.slice(0, 3).map((u) => ({ ...u, status: "next" }))]
    : [];

  const scrollCarousel = (dir) => {
    const el = carouselRef.current;
    if (el) el.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen bg-[#070309] text-white overflow-hidden" data-testid="live-page">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden>
        <div className="absolute inset-0" style={{ background: "radial-gradient(900px circle at 15% 10%, rgba(236,28,36,0.18), transparent 55%), radial-gradient(900px circle at 85% 20%, rgba(122,43,214,0.16), transparent 55%), radial-gradient(1100px circle at 50% 110%, rgba(236,28,36,0.14), transparent 60%)" }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>

      <NavBar />

      <div className="relative z-10 pt-20 pb-12 px-3 sm:px-5 lg:px-8 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
          {/* ===================== LEFT: player + info + schedule ===================== */}
          <div className="min-w-0 space-y-5">
            {/* Top row: player | info panel */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-5">
              {/* --- Player --- */}
              <div
                ref={playerRef}
                onMouseMove={showUi}
                onTouchStart={showUi}
                onMouseLeave={() => { const v = videoRef.current; if (v && !v.paused) setUiVisible(false); }}
                className={`relative rounded-[22px] overflow-hidden bg-black aspect-video ring-1 ring-white/10 shadow-[0_0_70px_rgba(236,28,36,0.22)] ${uiVisible ? "" : "cursor-none"}`}
              >
                {comingSoon ? (
                  <div data-testid="live-halloween-coming-soon" className="absolute inset-0 flex flex-col items-center justify-center text-center gap-4 px-6" style={{ background: "radial-gradient(circle at 50% 30%, rgba(255,122,24,0.22), transparent 60%), #120a1e" }}>
                    <span className="text-6xl leading-none">🎃</span>
                    <h2 className="font-display text-2xl md:text-3xl text-white">Canalul Halloween</h2>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff7a18]/15 border border-[#ff7a18]/40 text-[#ff7a18] font-bold text-sm">
                      <CalendarClock className="h-4 w-4" /> Transmisiunea începe pe {nowData?.launch_date || "30 Octombrie"}
                    </div>
                    <p className="text-white/40 text-sm max-w-sm">Pregătim un program special de Halloween, non-stop. Revino pe {nowData?.launch_date || "30 Octombrie"}!</p>
                  </div>
                ) : current ? (
                  <video
                    ref={videoRef}
                    data-testid="live-video"
                    src={resolveVideoUrl(current.video_url)}
                    autoPlay
                    playsInline
                    muted={muted}
                    x-webkit-airplay="allow"
                    onLoadedMetadata={onLoadedMetadata}
                    onEnded={onEnded}
                    onError={onError}
                    onClick={togglePlay}
                    onPlay={() => { setPlaying(true); showUi(); }}
                    onPause={() => { setPlaying(false); setUiVisible(true); if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }}
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 gap-3">
                    <Tv className="h-10 w-10 animate-pulse" /> Se pornește transmisiunea...
                  </div>
                )}

                {/* LIVE TV badge (top-left) */}
                {!comingSoon && (
                  <div className={`absolute top-3.5 left-3.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/55 backdrop-blur-md ring-1 ring-white/10 transition-opacity duration-300 ${uiVisible ? "opacity-100" : "opacity-0"}`} data-testid="live-badge">
                    <span className="h-2 w-2 rounded-full bg-[#ec1c24] animate-pulse shadow-[0_0_8px_#ec1c24]" />
                    <span className="text-[11px] font-black uppercase tracking-wider">Live TV</span>
                  </div>
                )}

                {/* Channel badge (top-right) */}
                {!comingSoon && current && (
                  <div className="absolute top-3 right-3">
                    <ChannelBadge style={playingChStyle} size="h-10 w-10 md:h-12 md:w-12" text="text-base" />
                  </div>
                )}

                {/* Up-next overlay */}
                {!comingSoon && ended && current && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm gap-3" data-testid="live-upnext">
                    <Tv className="h-10 w-10 text-[#ffcc00] animate-pulse" />
                    <p className="text-sm uppercase tracking-widest text-white/50 font-bold">Urmează în scurt timp</p>
                    {nowData?.next?.[0] && <p className="font-display text-xl text-white">{nowData.next[0].show_title}</p>}
                  </div>
                )}

                {/* Center play/pause */}
                {!comingSoon && current && !ended && (
                  <button
                    type="button" onClick={togglePlay} data-testid="live-center-toggle"
                    aria-label={playing ? "Pauză" : "Redă"}
                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center h-16 w-16 md:h-20 md:w-20 rounded-full bg-black/50 backdrop-blur-sm text-white transition-all duration-200 hover:bg-black/70 hover:scale-105 ${uiVisible || !playing ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                  >
                    {playing ? <Pause className="h-8 w-8 md:h-9 md:w-9" /> : <Play className="h-8 w-8 md:h-9 md:w-9 translate-x-0.5" />}
                  </button>
                )}

                {/* Bottom controls */}
                {!comingSoon && (
                  <div className={`absolute bottom-0 inset-x-0 px-3.5 pt-8 pb-2.5 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${uiVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`} data-testid="live-controls">
                    {/* live progress bar */}
                    <div className="mb-2 h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
                      <div className="h-full rounded-full bg-[#ec1c24] shadow-[0_0_10px_#ec1c24] transition-[width] duration-1000 ease-linear" style={{ width: `${progressPct}%` }} />
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={togglePlay} data-testid="live-play" className="text-white/90 hover:text-white shrink-0">
                        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </button>
                      <button type="button" onClick={toggleMute} data-testid="live-mute" title={muted ? "Activează sunetul" : "Dezactivează sunetul"} className="text-white/90 hover:text-white shrink-0">
                        {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                      </button>
                      <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={onVolume} data-testid="live-volume" className="w-20 sm:w-28 accent-[#ec1c24] cursor-pointer" title="Volum" />
                      <span className="text-[11px] font-mono text-white/60 tabular-nums">{fmtClock(curStartMs)} / {fmtClock(curEndMs)}</span>
                      <div className="ml-auto flex items-center gap-3">
                        {castAvailable && (
                          <button type="button" onClick={handleCast} data-testid="live-cast" title={deviceHint === false ? "Niciun TV/Chromecast găsit — apasă pentru a căuta" : "Transmite pe TV"} className={`shrink-0 ${deviceHint === false ? "text-white/50 hover:text-white/80" : "text-white/90 hover:text-white"}`}>
                            <Cast className="h-5 w-5" />
                          </button>
                        )}
                        <button type="button" onClick={handlePip} data-testid="live-pip" title="Picture in Picture" className="text-white/90 hover:text-white shrink-0 hidden sm:block">
                          <PictureInPicture2 className="h-5 w-5" />
                        </button>
                        <button type="button" onClick={toggleFullscreen} data-testid="live-fullscreen" title="Ecran complet" className="text-white/90 hover:text-white shrink-0">
                          <Maximize className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* --- Now-playing info panel --- */}
              <div className="rounded-[22px] bg-[#0f0a12]/80 backdrop-blur-xl ring-1 ring-white/10 p-5 flex flex-col" data-testid="live-info-panel">
                {comingSoon ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
                    <Ghost className="h-10 w-10 text-[#ff7a18]" />
                    <h2 className="font-display text-2xl">Canalul Halloween</h2>
                    <p className="text-sm text-white/60">Transmisiunea începe pe <b className="text-[#ff7a18]">{nowData?.launch_date || "30 Octombrie"}</b>.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#ec1c24] text-white text-[11px] font-black uppercase tracking-wide">
                        <Radio className="h-3.5 w-3.5" /> Acum la TV
                      </span>
                      <ChannelBadge style={playingChStyle} size="h-11 w-11" text="text-base" />
                    </div>

                    <h1 className="font-display text-2xl md:text-3xl leading-tight truncate">{current?.show_title || "Se încarcă..."}</h1>
                    {current && (
                      <>
                        <p className="mt-1 text-sm font-semibold text-white/80">Episodul {current.episode_number}</p>
                        <p className="text-sm text-white/55 truncate">{current.episode_title || `Episodul ${current.episode_number}`}</p>

                        {/* progress */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs text-white/60 font-medium mb-1.5">
                            <span className="tabular-nums">{fmtClock(curStartMs)}</span>
                            <span className="tabular-nums">{fmtClock(curEndMs)}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#ff5a00] to-[#ec1c24] transition-[width] duration-1000 ease-linear" style={{ width: `${progressPct}%` }} />
                          </div>
                          <p className="mt-1.5 text-xs text-white/45">Mai sunt {remainingMin} {remainingMin === 1 ? "minut" : "minute"}</p>
                        </div>
                      </>
                    )}

                    <div className="mt-auto pt-5 space-y-3">
                      {muted && current && (
                        <button data-testid="live-unmute-hint" onClick={toggleMute} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#ec1c24] text-white text-sm font-bold hover:bg-[#ff2d36] transition-colors duration-200">
                          <VolumeX className="h-4 w-4" /> Apasă pentru sunet
                        </button>
                      )}
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={toggleFav} data-testid="live-fav" title="Favorite" className={`grid place-items-center h-11 flex-1 rounded-xl ring-1 transition-colors duration-200 ${favs.has(channel) ? "bg-[#ec1c24]/15 ring-[#ec1c24] text-[#ec1c24]" : "bg-white/[0.04] ring-white/10 text-white/70 hover:text-white hover:ring-white/25"}`}>
                          <Heart className={`h-5 w-5 ${favs.has(channel) ? "fill-current" : ""}`} />
                        </button>
                        <button type="button" onClick={handleShare} data-testid="live-share" title="Distribuie" className="grid place-items-center h-11 flex-1 rounded-xl bg-white/[0.04] ring-1 ring-white/10 text-white/70 hover:text-white hover:ring-white/25 transition-colors duration-200">
                          <Share2 className="h-5 w-5" />
                        </button>
                        <button type="button" onClick={toggleFullscreen} data-testid="live-fullscreen-info" title="Ecran complet" className="grid place-items-center h-11 flex-1 rounded-xl bg-white/[0.04] ring-1 ring-white/10 text-white/70 hover:text-white hover:ring-white/25 transition-colors duration-200">
                          <Maximize className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom row: carousel | schedule */}
            {!comingSoon && (
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-5">
                {/* --- Acum urmează carousel --- */}
                <div data-testid="live-upnext-carousel">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 font-display text-lg">
                      <Clock className="h-5 w-5 text-[#ec1c24]" /> Acum urmează la {chDisplay}
                    </h3>
                    <button type="button" onClick={() => scrollCarousel(1)} className="hidden sm:inline-flex items-center gap-1 text-xs text-white/55 hover:text-white transition-colors">
                      Vezi tot programul <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="relative">
                    <button type="button" onClick={() => scrollCarousel(-1)} aria-label="Înapoi" className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 hidden md:grid place-items-center h-9 w-9 rounded-full bg-black/70 ring-1 ring-white/15 text-white hover:bg-[#ec1c24] transition-colors">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={() => scrollCarousel(1)} aria-label="Înainte" className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 hidden md:grid place-items-center h-9 w-9 rounded-full bg-black/70 ring-1 ring-white/15 text-white hover:bg-[#ec1c24] transition-colors">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div ref={carouselRef} className="flex gap-3 overflow-x-auto pb-2 snap-x scrollbar-hide" style={{ scrollbarWidth: "none" }}>
                      {(carouselItems.length ? carouselItems : Array.from({ length: 4 })).map((it, i) => {
                        if (!it) return <div key={i} className="shrink-0 w-[160px] rounded-2xl bg-white/[0.03] ring-1 ring-white/10 h-[150px] animate-pulse" />;
                        const isNow = it.status === "now";
                        const isUpNext = i === 1;
                        return (
                          <div key={i} data-testid={isNow ? "live-carousel-now" : `live-carousel-${i}`} className={`group shrink-0 w-[160px] sm:w-[180px] snap-start rounded-2xl overflow-hidden ring-1 transition-all duration-300 ${isNow ? "ring-[#ec1c24] shadow-[0_0_24px_rgba(236,28,36,0.3)]" : "ring-white/10 hover:ring-white/30"}`}>
                            <div className="relative">
                              <img src={it.thumbnail} alt="" className="w-full h-[100px] object-cover bg-white/5" />
                              <span className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${isNow ? "bg-[#ec1c24] text-white" : isUpNext ? "bg-[#ffcc00] text-black" : "bg-black/70 text-white/80"}`}>
                                {isNow ? "● Live" : isUpNext ? "Urmează" : fmtClock(it.start)}
                              </span>
                            </div>
                            <div className="p-2.5 bg-[#0f0a12]">
                              <p className="text-[10px] text-white/45 tabular-nums">{fmtClock(it.start)} – {fmtClock(it.end)}</p>
                              <p className="text-sm font-bold truncate">{it.show_title}</p>
                              <p className="text-[11px] text-white/50 truncate">Ep {it.episode_number}{it.episode_title ? ` · ${it.episode_title}` : ""}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* --- Urmează pe (schedule list) --- */}
                <div className="rounded-2xl bg-[#0f0a12]/80 backdrop-blur-xl ring-1 ring-white/10 p-4" data-testid="live-schedule">
                  <h3 className="font-display text-base mb-3 text-white/90">Urmează pe {chDisplay}</h3>
                  <div className="space-y-1.5">
                    {(upcoming.length ? upcoming : Array.from({ length: 4 })).map((it, i) => {
                      if (!it) return <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse" />;
                      return (
                        <div key={i} data-testid={`live-schedule-${i}`} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-colors">
                          <span className="text-xs font-mono font-bold text-[#ffcc00] tabular-nums w-10 shrink-0">{fmtClock(it.start)}</span>
                          <img src={it.thumbnail} alt="" className="h-9 w-14 rounded-md object-cover bg-white/5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{it.show_title}</p>
                            <p className="text-[11px] text-white/45 truncate">Ep {it.episode_number}{it.episode_title ? ` · ${it.episode_title}` : ""}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {castAvailable && deviceHint === false && !comingSoon && (
              <p className="text-[11px] text-white/35" data-testid="live-cast-hint">
                Niciun TV/Chromecast detectat pe rețeaua ta încă — apasă totuși pe <Cast className="inline h-3 w-3 -mt-0.5" />, Chrome mai poate găsi dispozitivul. Ai nevoie de un TV/dongle cu Chromecast (Google Cast) încorporat.
              </p>
            )}
          </div>

          {/* ===================== RIGHT: channels + chat ===================== */}
          <aside className="xl:w-[360px] space-y-5" data-testid="live-channels">
            {/* Channels */}
            <div className="rounded-[22px] bg-[#0f0a12]/80 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
                <h3 className="flex items-center gap-2 font-display text-lg">
                  <Tv className="h-5 w-5 text-[#ec1c24]" /> Canale Live
                </h3>
                {liveCount > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-white/5 text-[11px] font-semibold text-white/55">{liveCount} canale</span>
                )}
              </div>
              {channels.length > 0 ? (
                <div className="p-2.5 space-y-1.5 max-h-[520px] overflow-y-auto">
                  {channels.map((ch) => {
                    const active = ch.key === channel;
                    const style = chStyle(ch);
                    const num = (String(ch.label || "").match(/\d+/) || ["01"])[0];
                    return (
                      <button
                        key={ch.key} type="button" data-testid={`live-channel-${ch.key}`} onClick={() => setChannel(ch.key)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ring-1 text-left transition-all duration-200 ${active ? "bg-[#ec1c24]/12 ring-[#ec1c24] shadow-[0_0_20px_rgba(236,28,36,0.2)]" : "bg-white/[0.02] ring-white/5 hover:ring-white/20 hover:bg-white/[0.05]"}`}
                      >
                        <ChannelBadge style={style} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold truncate ${active ? "text-white" : "text-white/90"}`}>{ch.name}</p>
                          <p className="text-[10px] uppercase tracking-wide text-white/40 truncate">
                            Canalul {num} · {ch.coming_soon ? "Pornește 30 Octombrie" : `${roNum(ch.count)} episoade`}
                          </p>
                        </div>
                        {ch.coming_soon ? (
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 text-[10px] font-bold text-white/45">
                            <span className="h-1.5 w-1.5 rounded-full bg-white/30" /> Offline
                          </span>
                        ) : (
                          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${active ? "bg-[#ec1c24] text-white" : "bg-white/5 text-white/55"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white animate-pulse" : "bg-[#ec1c24]"}`} /> Live
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-white/30 p-4">Niciun canal disponibil momentan.</p>
              )}
            </div>

            {/* Live Chat */}
            <div className="relative rounded-[22px] overflow-hidden ring-1 ring-[#ec1c24]/40 bg-gradient-to-br from-[#1a0609] to-[#0f0a12] p-5" data-testid="live-chat-card">
              <div className="absolute inset-0 -z-0 opacity-50" style={{ background: "radial-gradient(400px circle at 90% 90%, rgba(236,28,36,0.35), transparent 60%)" }} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#ff6b6b]">
                    <Flame className="h-4 w-4" /> Live Chat
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 text-[11px] font-semibold text-white/70">
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" /> <span data-testid="live-chat-online">{roNum(chatOnline)}</span> online
                  </span>
                </div>
                <div className="flex items-end gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-2xl leading-tight">Hai la discuție,<br />hai pe chat!</h3>
                    <p className="mt-2 text-xs text-white/55">Discută despre episoade, personaje și multe altele cu alți fani Cartoonix.</p>
                  </div>
                  <img src="/chat-mascot.png?v=2" alt="" className="h-20 w-20 object-contain shrink-0 drop-shadow-[0_6px_16px_rgba(236,28,36,0.5)] animate-bounce-slow" draggable={false} />
                </div>
                <button
                  type="button" onClick={() => navigate(CHAT_ROUTE)} data-testid="live-open-chat"
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition-colors duration-200"
                >
                  Deschide chat <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Live;
