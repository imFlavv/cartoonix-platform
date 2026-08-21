import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, resolveVideoUrl } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { Play, Calendar, Tv, Heart, Plus, Download, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { PlusIcon } from "@/components/PlusIcon";
import { AddToPlaylistDialog } from "@/components/AddToPlaylistDialog";
import { toast } from "sonner";

const ShowDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavorite, isShowFavorite, toggleFavorite } = useLibrary();
  const [show, setShow] = useState(null);
  const [plDialog, setPlDialog] = useState(null);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    api.get(`/shows/${id}`).then((res) => setShow(res.data));
  }, [id]);

  useEffect(() => {
    if (!user) { setProgress({}); return; }
    api.get(`/progress/${id}`).then((res) => setProgress(res.data)).catch(() => {});
  }, [id, user]);

  if (!show)
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <NavBar />
        <div className="pt-24 text-center text-white/40">Se încarcă...</div>
      </div>
    );

  const requireLogin = () => {
    if (!user) {
      toast.error("Conectează-te mai întâi");
      navigate("/login");
      return true;
    }
    return false;
  };

  const playEpisode = (epNumber) => {
    if (requireLogin()) return;
    navigate(`/watch/${show.id}/${epNumber}`);
  };

  const makeRef = (ep) => ({
    show_id: show.id,
    episode_number: ep.number,
    show_title: show.title,
    episode_title: ep.title,
    thumbnail: show.thumbnail,
    channel: show.channel,
  });

  const onFav = async (ep) => {
    if (requireLogin()) return;
    const fav = await toggleFavorite(makeRef(ep));
    toast.success(fav ? "Adăugat la favorite ❤️" : "Eliminat din favorite");
  };

  const showFav = isShowFavorite(show.id);
  const onFavShow = async () => {
    if (requireLogin()) return;
    const fav = await toggleFavorite({
      show_id: show.id,
      episode_number: 0,
      show_title: show.title,
      episode_title: "",
      thumbnail: show.thumbnail,
      channel: show.channel,
    });
    toast.success(fav ? "Desen adăugat la favorite ❤️" : "Desen eliminat din favorite");
  };

  const onDownload = async (ep) => {
    if (requireLogin()) return;
    if (!user.plus) {
      toast.error("Descărcarea e disponibilă doar pentru membrii PLUS");
      navigate("/plus");
      return;
    }
    try {
      const { data } = await api.get(`/download/${show.id}/${ep.number}`);
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

  const renderEpisodeRow = (ep, displayNo) => {
    const locked = false;
    const fav = isFavorite(show.id, ep.number);
    const prog = progress[String(ep.number)];
    const watched = prog?.completed;
    const pct = prog && prog.duration > 0 && !watched ? Math.min(100, (prog.position / prog.duration) * 100) : 0;
    return (
      <div
        key={ep.number}
        data-testid={`episode-${ep.number}`}
        className="group flex items-center gap-4 p-3 rounded-xl bg-[#141414] hover:bg-[#1c1c1c] transition-colors duration-200 border border-white/5"
      >
        <button
          onClick={() => playEpisode(ep.number)}
          className="flex items-center justify-center h-11 w-11 rounded-lg bg-black/50 shrink-0 hover:bg-[#ec1c24] transition-colors duration-200"
          data-testid={`play-episode-${ep.number}`}
        >
          <Play className="h-5 w-5 fill-white" />
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playEpisode(ep.number)}>
          <p className="font-semibold flex items-center gap-2">
            {displayNo}. {ep.title}
            {locked && <PlusIcon className="h-4 w-4" />}
            {watched && (
              <span data-testid={`watched-${ep.number}`} className="flex items-center gap-1 text-[10px] font-bold text-[#22c55e] uppercase">
                <CheckCircle2 className="h-3.5 w-3.5" /> Vizionat
              </span>
            )}
          </p>
          <p className="text-xs text-white/50">{ep.duration}{pct > 0 ? `${ep.duration ? " · " : ""}continuă (${Math.round(pct)}%)` : ""}</p>
          {pct > 0 && (
            <div className="mt-1.5 h-1 w-full max-w-xs rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-[#ec1c24]" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button data-testid={`fav-episode-${ep.number}`} onClick={() => onFav(ep)} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-200" title="Favorite">
            <Heart className={`h-4 w-4 ${fav ? "fill-[#ec1c24] text-[#ec1c24]" : "text-white/70"}`} />
          </button>
          <button data-testid={`playlist-episode-${ep.number}`} onClick={() => (requireLogin() ? null : setPlDialog(makeRef(ep)))} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-200" title="Adaugă în playlist">
            <Plus className="h-4 w-4 text-white/70" />
          </button>
          {!show.download_disabled && (
            <button data-testid={`download-episode-${ep.number}`} onClick={() => onDownload(ep)} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-200 relative" title={user?.plus ? "Descarcă" : "Descărcare PLUS"}>
              <Download className="h-4 w-4 text-white/70" />
              {!user?.plus && <PlusIcon className="h-3 w-3 absolute -top-0.5 -right-0.5" />}
            </button>
          )}
        </div>
      </div>
    );
  };

  const allEpisodes = show.episodes || [];
  const hasSeasons = allEpisodes.some((e) => e.season);
  const seasonGroups = [];
  if (hasSeasons) {
    const map = new Map();
    allEpisodes.forEach((ep) => {
      const key = ep.season || "Alte episoade";
      if (!map.has(key)) {
        const items = [];
        map.set(key, items);
        seasonGroups.push({ season: key, items });
      }
      map.get(key).push(ep);
    });
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="relative h-[55vh] md:h-[65vh]">
        <img src={show.banner || show.thumbnail} alt={show.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
      </div>

      <div className="relative -mt-32 px-4 md:px-12 pb-16">
        <div className="flex flex-col md:flex-row gap-6">
          <img
            src={show.thumbnail}
            alt={show.title}
            className="w-40 md:w-52 rounded-xl shadow-2xl border border-white/10 shrink-0"
          />
          <div className="flex-1">
            <h1 className="font-display text-4xl md:text-6xl leading-none mb-3">{show.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/60 mb-4">
              <span className="flex items-center gap-1"><Tv className="h-4 w-4" /> {show.channel}</span>
              {show.year && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {show.year}</span>}
              <span>{show.episodes?.length || 0} episoade</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              {(show.genres || []).map((g) => (
                <span key={g} className="px-3 py-1 rounded-full bg-white/10 text-xs font-semibold">{g}</span>
              ))}
            </div>
            <p className="text-white/80 max-w-2xl mb-6">{show.description}</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                data-testid="detail-play-first"
                onClick={() => playEpisode(1)}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition-colors duration-200"
              >
                <Play className="h-5 w-5 fill-white" /> Vizionează Ep. 1
              </button>
              <button
                data-testid="detail-fav-show"
                onClick={onFavShow}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-colors duration-200 ${
                  showFav ? "bg-[#ec1c24]/20 text-white border border-[#ec1c24]/60" : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <Heart className={`h-5 w-5 ${showFav ? "fill-[#ec1c24] text-[#ec1c24]" : ""}`} />
                {showFav ? "În favorite" : "Adaugă la favorite"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="font-display text-3xl mb-4">Episoade</h2>
          {hasSeasons ? (
            <div className="space-y-8">
              {seasonGroups.map((grp) => (
                <div key={grp.season} data-testid={`season-${grp.season}`}>
                  <h3 className="font-display text-xl mb-3 text-[#ffcc00] flex items-center gap-2">
                    {grp.season}
                    <span className="text-xs font-normal text-white/40">({grp.items.length} ep.)</span>
                  </h3>
                  <div className="grid gap-3">
                    {grp.items.map((ep, i) => renderEpisodeRow(ep, i + 1))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3">
              {allEpisodes.map((ep) => renderEpisodeRow(ep, ep.number))}
            </div>
          )}
        </div>
      </div>

      <AddToPlaylistDialog open={!!plDialog} onOpenChange={(o) => !o && setPlDialog(null)} itemRef={plDialog} />
    </div>
  );
};

export default ShowDetail;
