import { useEffect, useRef, useState, useCallback } from "react";
import { api, resolveVideoUrl } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { Volume2, VolumeX, Maximize, Radio, Tv } from "lucide-react";

const BATCH = 60;

// EPG row offsets: previous (-1), NOW (0), and the next three.
const OFFSETS = [-1, 0, 1, 2, 3];

const Live = () => {
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(true); // start muted so autoplay is allowed
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const fetchingRef = useRef(false);

  const fetchBatch = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data } = await api.get(`/live/playlist?count=${BATCH}`);
      setQueue((q) => [...q, ...(data.items || [])]);
    } catch (_) {
      /* ignore */
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => { fetchBatch(); }, [fetchBatch]);

  const current = queue[index];

  // keep the queue topped up so playback never stops
  useEffect(() => {
    if (queue.length && index >= queue.length - 4) fetchBatch();
  }, [index, queue.length, fetchBatch]);

  const skip = useCallback(() => setIndex((i) => i + 1), []);

  // Robustness: auto-skip an episode that fails to start (broken / missing file)
  // so the channel never gets stuck. Cleared as soon as playback actually begins.
  useEffect(() => {
    if (!current) return;
    const v = videoRef.current;
    let started = false;
    const onPlaying = () => { started = true; };
    v?.addEventListener("playing", onPlaying);
    const t = setTimeout(() => {
      if (!started && (!v || v.readyState < 3)) skip();
    }, 12000);
    return () => { clearTimeout(t); v?.removeEventListener("playing", onPlaying); };
  }, [current, skip]);

  const onError = () => { setTimeout(skip, 400); };

  // (re)start playback whenever the current source changes (same <video> element,
  // so fullscreen state is preserved between episodes)
  const handleLoaded = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted; // ensure muted flag is applied before autoplay
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
  };

  // apply volume / mute to the element
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [volume, muted, index]);

  const onEnded = () => { setIndex((i) => i + 1); };

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
    const el = playerRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="live-page">
      <NavBar />
      <div className="pt-20 pb-10 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ec1c24] text-white text-xs font-bold uppercase tracking-wider">
            <Radio className="h-4 w-4 animate-pulse" /> Live
          </span>
          <h1 className="font-display text-3xl md:text-4xl">Cartoonix TV</h1>
          <span className="hidden sm:block text-sm text-white/40">redare non-stop, aleatorie · nu poți schimba episodul</span>
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
                  onLoadedData={handleLoaded}
                  onCanPlay={handleLoaded}
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

              {/* Corner channel bug (top-right) — replace with official logo when provided */}
              <div data-testid="live-logo-bug" className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/45 backdrop-blur-sm border border-white/10 select-none pointer-events-none">
                <span className="font-display text-lg leading-none tracking-tight">
                  <span className="text-[#ffcc00]">Cartoo</span><span className="text-[#ec1c24]">nix</span>
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ec1c24] text-white text-[10px] font-bold uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live
                </span>
              </div>

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
                {OFFSETS.map((off) => {
                  const item = queue[index + off];
                  const isNow = off === 0;
                  const key = `${index + off}`;
                  if (!item) {
                    return (
                      <div key={key} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 opacity-40">
                        <div className="h-12 w-9 rounded bg-white/5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-white/30">{off < 0 ? "— început transmisiune —" : "se încarcă..."}</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={key}
                      data-testid={isNow ? "live-program-now" : `live-program-${off}`}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 ${
                        isNow
                          ? "bg-[#ec1c24]/15 border-[#ec1c24] ring-2 ring-[#ec1c24]/50 scale-[1.02] shadow-lg"
                          : off < 0
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
                        <p className={`text-[10px] uppercase tracking-wide font-bold ${isNow ? "text-[#ec1c24]" : off < 0 ? "text-white/40" : "text-[#ffcc00]"}`}>
                          {isNow ? "Acum" : off < 0 ? "A rulat" : "Urmează"}
                        </p>
                        <p className={`text-sm font-semibold truncate ${isNow ? "text-white" : "text-white/80"}`}>{item.show_title}</p>
                        <p className="text-xs text-white/40 truncate">{item.episode_title || `Ep ${item.episode_number}`} · {item.channel}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] text-white/30 text-center">Programul se derulează automat. Nu poți schimba manual episodul.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Live;
