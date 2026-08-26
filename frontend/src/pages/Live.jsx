import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, resolveVideoUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { NavBar } from "@/components/NavBar";
import { PlusIcon } from "@/components/PlusIcon";
import { Volume2, VolumeX, Maximize, Radio, Tv, Lock, Sparkles } from "lucide-react";

const POLL_MS = 8000;   // re-sync with the server every 8s
const DRIFT_TOLERANCE = 4; // seconds

const Live = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPlus = !!user?.plus;

  const [nowData, setNowData] = useState(null);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(true); // start muted so autoplay is allowed

  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const nowRef = useRef(null);
  const seekedSrcRef = useRef(null);
  const mutedRef = useRef(true);
  const reportedRef = useRef(new Set());
  const [ended, setEnded] = useState(false);

  useEffect(() => { nowRef.current = nowData; }, [nowData]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const fetchNow = useCallback(async () => {
    try {
      const { data } = await api.get("/live/now");
      setNowData(data);
      return data;
    } catch (_) { return null; }
  }, []);

  useEffect(() => {
    if (!isPlus) return;
    fetchNow();
    const t = setInterval(fetchNow, POLL_MS);
    return () => clearInterval(t);
  }, [isPlus, fetchNow]);

  // Report the real clip length (once/episode). Applied at the next daily rotation so
  // the running broadcast timeline stays frozen (no mid-episode jumps).
  const reportDuration = useCallback(() => {
    const v = videoRef.current;
    const cur = nowRef.current?.current;
    if (!v || !cur) return;
    const dur = v.duration;
    if (!dur || !isFinite(dur) || dur < 120) return; // ignore implausible/short values
    const key = `${cur.show_id}:${cur.episode_number}`;
    if (reportedRef.current.has(key)) return;
    reportedRef.current.add(key);
    if (Math.abs((cur.duration_seconds || 0) - dur) <= 2) return;
    api.post("/live/report_duration", { show_id: cur.show_id, episode_number: cur.episode_number, duration: dur })
      .catch(() => {});
  }, []);

  // Seek ONCE per source (i.e. only when the episode actually changes) to the
  // server offset, then let it play straight through — never re-seek mid-episode.
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
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
  };

  // When a clip ends before its scheduled slot, wait for the schedule to advance
  // (poll a bit faster). The src prop change then loads the next program smoothly.
  const onEnded = () => {
    setEnded(true);
    const startKey = (() => { const c = nowRef.current?.current; return c ? `${c.show_id}:${c.episode_number}` : null; })();
    let tries = 0;
    const tick = async () => {
      const d = await fetchNow();
      tries += 1;
      const k = d?.current ? `${d.current.show_id}:${d.current.episode_number}` : null;
      if (k && k !== startKey) return; // advanced -> src changes -> onLoadedMetadata handles it
      if (tries < 30) setTimeout(tick, 1000);
    };
    tick();
  };
  const onError = () => { /* keep the schedule; next poll / rotation recovers */ };

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
    if (fsEl) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
      return;
    }
    // Prefer fullscreen on the container (keeps our custom controls visible)
    const req = container?.requestFullscreen || container?.webkitRequestFullscreen || container?.webkitRequestFullScreen;
    if (req) {
      try { req.call(container); return; } catch (_) { /* fall through */ }
    }
    // iOS Safari: no Fullscreen API on <div>; only the native <video> can go fullscreen
    if (v?.webkitEnterFullscreen) { try { v.webkitEnterFullscreen(); return; } catch (_) { /* noop */ } }
    if (v?.requestFullscreen) { try { v.requestFullscreen(); } catch (_) { /* noop */ } }
  };

  // BETA gate — Cartoonix TV is PLUS-only for now
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

  const current = nowData?.current;
  const programRows = nowData
    ? [
        { item: nowData.prev, kind: "prev" },
        { item: current, kind: "now" },
        { item: nowData.next?.[0], kind: "next" },
        { item: nowData.next?.[1], kind: "next" },
        { item: nowData.next?.[2], kind: "next" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="live-page">
      <NavBar />
      <div className="pt-20 pb-10 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ec1c24] text-white text-xs font-bold uppercase tracking-wider">
            <Radio className="h-4 w-4 animate-pulse" /> Live
          </span>
          <h1 className="font-display text-3xl md:text-4xl">Cartoonix TV</h1>
          <span className="hidden sm:block text-sm text-white/40">transmisiune sincronizată · aceeași pentru toți · nu poți schimba episodul</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Player */}
          <div className="lg:col-span-2">
            <div ref={playerRef} className="relative rounded-2xl overflow-hidden bg-black aspect-video shadow-[0_0_60px_rgba(236,28,36,0.18)]">
              {current ? (
                <video
                  ref={videoRef}
                  data-testid="live-video"
                  src={resolveVideoUrl(current.video_url)}
                  autoPlay
                  playsInline
                  muted={muted}
                  onLoadedMetadata={onLoadedMetadata}
                  onEnded={onEnded}
                  onError={onError}
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 gap-3">
                  <Tv className="h-10 w-10 animate-pulse" />
                  Se pornește transmisiunea...
                </div>
              )}

              {/* Corner channel bug (top-right) — official Cartoonix Live TV logo */}
              <img
                data-testid="live-logo-bug"
                src="/cartoonix-live-logo.png"
                alt="Cartoonix Live TV"
                draggable={false}
                className="absolute top-3 right-3 h-9 md:h-12 w-auto select-none pointer-events-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
              />

              {/* Brief "up next" overlay between programs (avoids a frozen frame) */}
              {ended && current && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm gap-3" data-testid="live-upnext">
                  <Tv className="h-10 w-10 text-[#ffcc00] animate-pulse" />
                  <p className="text-sm uppercase tracking-widest text-white/50 font-bold">Urmează în scurt timp</p>
                  {nowData?.next?.[0] && (
                    <p className="font-display text-xl text-white">{nowData.next[0].show_title}</p>
                  )}
                </div>
              )}

              {/* Now playing label (bottom-left) */}
              {current && (
                <div className="absolute bottom-14 left-4 max-w-[70%] pointer-events-none">
                  <p className="text-[11px] uppercase tracking-widest text-[#ffcc00] font-bold">Acum se redă</p>
                  <p className="font-display text-xl md:text-2xl leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] truncate">{current.show_title}</p>
                  <p className="text-sm text-white/70 truncate">{current.episode_title || `Ep ${current.episode_number}`} · {current.channel}</p>
                </div>
              )}

              {/* Controls: ONLY volume + fullscreen */}
              <div className="absolute bottom-0 inset-x-0 flex items-center gap-3 px-4 py-2.5 bg-gradient-to-t from-black/85 to-transparent" data-testid="live-controls">
                <button type="button" onClick={toggleMute} data-testid="live-mute" title={muted ? "Activează sunetul" : "Dezactivează sunetul"} className="text-white/90 hover:text-white shrink-0">
                  {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={onVolume} data-testid="live-volume" className="w-28 sm:w-40 accent-[#ec1c24] cursor-pointer" title="Volum" />
                <button type="button" onClick={toggleFullscreen} data-testid="live-fullscreen" title="Ecran complet" className="ml-auto text-white/90 hover:text-white shrink-0">
                  <Maximize className="h-5 w-5" />
                </button>
              </div>
            </div>

            {muted && current && (
              <button data-testid="live-unmute-hint" onClick={toggleMute} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ec1c24] text-white text-sm font-bold hover:bg-[#ff2d36] transition-colors duration-200">
                <VolumeX className="h-4 w-4" /> Apasă pentru sunet
              </button>
            )}
          </div>

          {/* Program (EPG) */}
          <aside className="lg:col-span-1" data-testid="live-program">
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 lg:sticky lg:top-24">
              <h3 className="font-display text-xl flex items-center gap-2 mb-4">
                <Tv className="h-5 w-5 text-[#ec1c24]" /> Program
              </h3>
              <div className="space-y-2">
                {programRows.map((row, ri) => {
                  const item = row.item;
                  const isNow = row.kind === "now";
                  const isPrev = row.kind === "prev";
                  if (!item) {
                    return (
                      <div key={ri} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 opacity-40">
                        <div className="h-12 w-9 rounded bg-white/5 shrink-0" />
                        <div className="flex-1"><p className="text-xs text-white/30">se încarcă...</p></div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={ri}
                      data-testid={isNow ? "live-program-now" : `live-program-${ri}`}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 ${
                        isNow
                          ? "bg-[#ec1c24]/15 border-[#ec1c24] ring-2 ring-[#ec1c24]/50 scale-[1.02] shadow-lg"
                          : isPrev
                          ? "bg-white/[0.03] border-white/5 opacity-60"
                          : "bg-white/5 border-transparent"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img src={item.thumbnail} alt="" className="h-12 w-9 rounded object-cover bg-white/10" />
                        {isNow && (
                          <span className="absolute -top-1.5 -left-1.5 h-4 w-4 rounded-full bg-[#ec1c24] flex items-center justify-center">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[10px] uppercase tracking-wide font-bold ${isNow ? "text-[#ec1c24]" : isPrev ? "text-white/40" : "text-[#ffcc00]"}`}>
                          {isNow ? "Acum" : isPrev ? "A rulat" : "Urmează"}
                        </p>
                        <p className={`text-sm font-semibold truncate ${isNow ? "text-white" : "text-white/80"}`}>{item.show_title}</p>
                        <p className="text-xs text-white/40 truncate">{item.episode_title || `Ep ${item.episode_number}`} · {item.channel}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] text-white/30 text-center">Transmisiune sincronizată pentru toți. Nu poți schimba manual episodul.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Live;
