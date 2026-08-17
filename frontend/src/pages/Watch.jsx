import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, resolveVideoUrl } from "@/lib/api";
import { ArrowLeft, ChevronRight, Download, Heart, Plus, Check, Play, ListVideo } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { PlusIcon } from "@/components/PlusIcon";
import { AddToPlaylistDialog } from "@/components/AddToPlaylistDialog";
import { toast } from "sonner";

const Watch = () => {
  const { id, ep } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useLibrary();
  const [show, setShow] = useState(null);
  const [plDialog, setPlDialog] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const epNumber = parseInt(ep, 10);
  const videoRef = useRef(null);
  const resumeRef = useRef(0);
  const lastSaveRef = useRef(0);
  const activeEpRef = useRef(null);

  useEffect(() => {
    api.get(`/shows/${id}`).then((res) => setShow(res.data));
  }, [id]);

  // scroll the active episode into view within its list
  useEffect(() => {
    activeEpRef.current?.scrollIntoView({ block: "nearest" });
  }, [show, epNumber]);

  const episode = show?.episodes?.find((e) => e.number === epNumber);
  const locked = false;
  const next = show?.episodes?.find((e) => e.number === epNumber + 1);
  const fav = show ? isFavorite(show.id, epNumber) : false;

  // fetch resume position
  useEffect(() => {
    resumeRef.current = 0;
    if (!show || locked) return;
    api.get(`/progress/${show.id}`).then((res) => {
      const p = res.data[String(epNumber)];
      if (p && !p.completed && p.position > 5) resumeRef.current = p.position;
    }).catch(() => {});
  }, [show, epNumber, locked]);

  const saveProgress = useCallback((completed = false) => {
    const v = videoRef.current;
    if (!show || !v) return;
    api.post("/progress", {
      show_id: show.id,
      episode_number: epNumber,
      position: completed ? 0 : Math.floor(v.currentTime || 0),
      duration: Math.floor(v.duration || 0),
      completed,
    }).catch(() => {});
  }, [show, epNumber]);

  const onLoadedMeta = () => {
    if (resumeRef.current > 0 && videoRef.current) {
      videoRef.current.currentTime = resumeRef.current;
      toast.info("Reluăm de unde ai rămas ▶");
    }
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const now = Date.now();
    if (now - lastSaveRef.current > 5000) {
      lastSaveRef.current = now;
      saveProgress(false);
    }
  };

  const onEnded = () => {
    saveProgress(true);
    if (autoplay && next) {
      toast.success("Trecem la episodul următor ▶");
      navigate(`/watch/${id}/${next.number}`);
    }
  };

  // save on unmount / navigation
  useEffect(() => {
    return () => saveProgress(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epNumber, show]);

  if (!show)
    return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">Se încarcă...</div>;

  const makeRef = () => ({
    show_id: show.id,
    episode_number: epNumber,
    show_title: show.title,
    episode_title: episode?.title,
    thumbnail: show.thumbnail,
    channel: show.channel,
  });

  const onFav = async () => {
    const f = await toggleFavorite(makeRef());
    toast.success(f ? "Adăugat la favorite ❤️" : "Eliminat din favorite");
  };

  const onDownload = async () => {
    if (!user?.plus) {
      toast.error("Descărcarea e disponibilă doar pentru membrii PLUS");
      navigate("/plus");
      return;
    }
    try {
      const { data } = await api.get(`/download/${show.id}/${epNumber}`);
      const a = document.createElement("a");
      a.href = resolveVideoUrl(data.url);
      a.download = data.filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Descărcare pornită");
    } catch {
      toast.error("Nu s-a putut descărca");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex items-center gap-4 px-4 md:px-12 h-16 border-b border-white/10">
        <button data-testid="watch-back" onClick={() => navigate(`/show/${id}`)} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200">
          <ArrowLeft className="h-5 w-5" /> Înapoi
        </button>
        <p className="font-semibold truncate">{show.title} — Ep. {epNumber}</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
        {locked ? (
          <div className="aspect-video rounded-xl bg-[#141414] flex flex-col items-center justify-center text-center px-6 border border-[#ffcc00]/30">
            <PlusIcon className="h-14 w-14 mb-4" />
            <h2 className="font-display text-3xl mb-2">Episod exclusiv Cartoonix PLUS</h2>
            <p className="text-white/60 mb-6 max-w-md">Abonează-te la Cartoonix PLUS pentru acces la toate episoadele.</p>
            <button data-testid="watch-upsell" onClick={() => navigate("/plus")} className="px-7 py-3 rounded-full bg-[#ffcc00] text-black font-bold hover:brightness-110 transition-all duration-200">
              Vezi Cartoonix PLUS
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            data-testid="video-player"
            key={episode?.video_url}
            src={resolveVideoUrl(episode?.video_url)}
            controls
            autoPlay
            onLoadedMetadata={onLoadedMeta}
            onTimeUpdate={onTimeUpdate}
            onEnded={onEnded}
            onPause={() => saveProgress(false)}
            className="w-full aspect-video rounded-xl bg-black shadow-[0_0_60px_rgba(236,28,36,0.15)]"
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
          <div>
            <h1 className="font-display text-3xl">{episode?.title}</h1>
            <p className="text-white/50 text-sm">{show.channel} · {episode?.duration}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 text-sm font-semibold cursor-pointer select-none" data-testid="watch-autoplay-toggle">
              <input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} className="accent-[#ec1c24]" />
              Auto-play
            </label>
            <button data-testid="watch-fav" onClick={onFav} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 font-semibold transition-colors duration-200">
              <Heart className={`h-4 w-4 ${fav ? "fill-[#ec1c24] text-[#ec1c24]" : ""}`} /> Favorite
            </button>
            <button data-testid="watch-playlist" onClick={() => setPlDialog(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 font-semibold transition-colors duration-200">
              <Plus className="h-4 w-4" /> Playlist
            </button>
            <button data-testid="watch-download" onClick={onDownload} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 font-semibold transition-colors duration-200">
              <Download className="h-4 w-4" /> Descarcă {!user?.plus && <PlusIcon className="h-4 w-4" />}
            </button>
            {next && (
              <button data-testid="watch-next" onClick={() => navigate(`/watch/${id}/${next.number}`)} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ec1c24] hover:bg-[#ff2d36] font-semibold transition-colors duration-200">
                Următorul <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        </div>

        {/* Episode list sidebar */}
        <aside className="lg:col-span-1" data-testid="watch-episode-list">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 lg:sticky lg:top-6 flex flex-col lg:max-h-[calc(100vh-3rem)]">
            <h3 className="font-display text-xl flex items-center gap-2 mb-3 shrink-0">
              <ListVideo className="h-5 w-5 text-[#ec1c24]" /> Episoade
              <span className="ml-auto text-xs text-white/40 font-sans">{show.episodes?.length || 0}</span>
            </h3>
            <div className="space-y-1.5 overflow-y-auto pr-1 max-h-[60vh] lg:max-h-none">
              {(show.episodes || []).map((e) => {
                const active = e.number === epNumber;
                return (
                  <button
                    key={e.number}
                    ref={active ? activeEpRef : null}
                    data-testid={`watch-ep-${e.number}`}
                    onClick={() => navigate(`/watch/${id}/${e.number}`)}
                    className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-xl border transition-colors duration-150 ${
                      active ? "bg-[#ec1c24]/20 border-[#ec1c24]/70" : "bg-white/5 hover:bg-white/10 border-transparent"
                    }`}
                  >
                    <span className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-sm font-bold ${active ? "bg-[#ec1c24] text-white" : "bg-white/10 text-white/70"}`}>
                      {active ? <Play className="h-4 w-4 fill-white" /> : e.number}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-sm font-semibold truncate ${active ? "text-white" : "text-white/80"}`}>
                        {e.season ? `${e.season} · ` : ""}Ep {e.number}
                      </span>
                      <span className="block text-xs text-white/40 truncate">{e.title}{e.duration ? ` · ${e.duration}` : ""}</span>
                    </span>
                  </button>
                );
              })}
              {(!show.episodes || show.episodes.length === 0) && (
                <p className="text-white/40 text-sm py-4 text-center">Niciun episod disponibil.</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <AddToPlaylistDialog open={plDialog} onOpenChange={setPlDialog} itemRef={makeRef()} />
    </div>
  );
};

export default Watch;
