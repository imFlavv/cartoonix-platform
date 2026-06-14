import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Play, Tv, Calendar, ListPlus, Plus, Clock3, GripVertical, Download, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import AddToPlaylistDialog from "@/components/AddToPlaylistDialog";
import CreateWatchPartyButton from "@/components/watchparty/CreateWatchPartyButton";

/**
 * Resolve an episode video path to a playable URL.
 *  - absolute http(s) → used as-is
 *  - paths containing "media/videos" (e.g. /media/videos/dexter/s01e01.mp4)
 *    → mapped to the /api/media/videos mount (served by the backend, with
 *      range support for seeking; on the VPS this reads from /media/videos)
 *  - /uploads/... → existing upload mount
 *  - other relative paths → assumed to live under the media/videos library
 */
function resolveVideoUrl(p) {
  if (!p) return "";
  const s = String(p).trim().replace(/\\/g, "/");
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/api/")) return s;
  const idx = s.toLowerCase().indexOf("media/videos");
  if (idx >= 0) {
    const rel = s.slice(idx + "media/videos".length).replace(/^\/+/, "");
    return `/api/media/videos/${rel}`;
  }
  if (s.startsWith("/uploads")) return `/api${s}`;
  if (s.startsWith("/")) return s;
  return `/api/media/videos/${s}`;
}

export default function CartoonDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [activeEp, setActiveEp] = useState(null);
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playlistDialog, setPlaylistDialog] = useState({
    open: false,
    mode: "episode",
    episodeId: null,
    episodeTitle: "",
  });
  const isPlus = user?.subscription === "plus";
  const isAdmin = user?.role === "admin";

  // Set of episode ids the current user has already watched (for "Vizionat" badge).
  const [watchedIds, setWatchedIds] = useState(() => new Set());
  // Ref to the <video> so autoplay-next can survive fullscreen and other state.
  const videoRef = React.useRef(null);
  // Track which episode id we already persisted history for, to avoid spamming
  // POST /me/history on every timeupdate tick.
  const savedEpRef = React.useRef(null);

  // Computed playable URL for the currently active episode. We pass this to
  // the <video src> declaratively so the first episode loads correctly on
  // first mount (the previous purely-imperative approach left the element
  // without a source until the user clicked another episode).
  const videoSrc = activeEp ? resolveVideoUrl(activeEp.video_url) : "";

  // Local drag-and-drop state (admin-only)
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [reorderSaving, setReorderSaving] = useState(false);

  const reorderEpisodes = async (sourceId, targetId) => {
    if (!data?.episodes || sourceId === targetId) return;
    const current = data.episodes;
    const srcIdx = current.findIndex((e) => e.id === sourceId);
    const tgtIdx = current.findIndex((e) => e.id === targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;
    const next = [...current];
    const [moved] = next.splice(srcIdx, 1);
    next.splice(tgtIdx, 0, moved);
    setData({ ...data, episodes: next }); // optimistic
    setReorderSaving(true);
    try {
      await api.post(`/admin/cartoons/${id}/episodes/reorder`, {
        episode_ids: next.map((e) => e.id),
      });
    } catch (e) {
      toast.error("Nu am putut salva ordinea — reîncarc.");
      load();
    } finally {
      setReorderSaving(false);
    }
  };

  // Per-episode download lock (avoid double-clicks generating multiple links).
  const [downloadingEpId, setDownloadingEpId] = useState(null);

  const handleDownload = async (ep) => {
    if (!ep || downloadingEpId) return;
    setDownloadingEpId(ep.id);
    try {
      const { data: linkInfo } = await api.post(
        `/me/episodes/${ep.id}/download-link`
      );
      // The signed URL carries its own short-lived token, so a plain anchor
      // download works without an auth header (and avoids loading the whole
      // file into memory). `linkInfo.url` already starts with `/api/...`.
      const a = document.createElement("a");
      a.href = linkInfo.url;
      a.download = linkInfo.filename || "episod.mp4";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success(`Se descarcă: ${linkInfo.filename}`);
    } catch (e) {
      toast.error(getErrorMessage(e, "Descărcarea nu a putut fi pornită."));
    } finally {
      setDownloadingEpId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data: c } = await api.get(`/cartoons/${id}`);
      setData(c);
      setActiveEp(c.episodes?.[0] || null);
      if (user) {
        const [favRes, watchedRes] = await Promise.all([
          api.get(`/me/favorites/check/${id}`).catch(() => ({ data: { favorited: false } })),
          api
            .get(`/me/cartoons/${id}/watched-episodes`)
            .catch(() => ({ data: { episode_ids: [] } })),
        ]);
        setFavorited(!!favRes.data.favorited);
        setWatchedIds(new Set(watchedRes.data.episode_ids || []));
      } else {
        setWatchedIds(new Set());
      }
    } catch (e) {
      toast.error("Desenul nu a fost găsit");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, user]);

  // Ensure playback starts when the active episode changes. The <video src>
  // is set declaratively in JSX, so React updates the same element in place
  // (preserving fullscreen). We just trigger load()+play() to overcome the
  // browser autoplay heuristics on src changes after the initial mount.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !activeEp) return;
    // Reset the per-episode "history saved" flag so a new episode can record.
    savedEpRef.current = null;
    try {
      v.load();
    } catch {
      /* ignore */
    }
    const p = v.play?.();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, [activeEp?.id]);

  const toggleFav = async () => {
    if (!user) {
      toast.message("Autentifică-te pentru a salva favorite");
      navigate("/login");
      return;
    }
    try {
      const { data: r } = await api.post("/me/favorites/toggle", { cartoon_id: id });
      setFavorited(r.favorited);
      toast.success(r.favorited ? "Adăugat la favorite" : "Eliminat din favorite");
    } catch {
      toast.error("Nu am putut actualiza favoritele");
    }
  };

  /**
   * Persist watched state for the current episode. Called from `onPlay` (the
   * moment playback actually starts) so even very short viewings are recorded.
   * The local "Vizionat" badge is updated only after the backend write
   * succeeds, so the badge reflects real persisted state — surviving refresh,
   * logout, and a switch to a different browser.
   */
  const persistWatched = async (epId, progress = 0) => {
    if (!user || !data?.id || !epId) return;
    try {
      await api.post("/me/history", {
        cartoon_id: data.id,
        episode_id: epId,
        progress_seconds: progress,
      });
      setWatchedIds((prev) => {
        if (prev.has(epId)) return prev;
        const next = new Set(prev);
        next.add(epId);
        return next;
      });
    } catch (err) {
      // Surface a soft toast so the user knows persistence failed — better
      // than silently lying with a local-only "Vizionat" badge.
      toast.error("Nu am putut salva progresul. Verifică conexiunea.");
    }
  };

  const onPlay = () => {
    if (!activeEp) return;
    const epId = activeEp.id;
    if (savedEpRef.current === epId) return;
    savedEpRef.current = epId;
    persistWatched(epId, 0);
  };

  const onProgress = (e) => {
    if (!user || !activeEp || !data?.id) return;
    const t = Math.floor(e?.target?.currentTime || 0);
    const epId = activeEp.id;
    // Refresh the persisted progress every ~30s so users can resume later.
    if (savedEpRef.current === epId && t > 0 && t % 30 === 0) {
      api
        .post("/me/history", {
          cartoon_id: data.id,
          episode_id: epId,
          progress_seconds: t,
        })
        .catch(() => {});
    }
  };

  /**
   * Auto-play the next episode when the current one finishes.
   * Works in fullscreen too — we just swap `src` on the same <video>
   * element (preserving its fullscreen state) and call play().
   */
  const handleEpisodeEnded = () => {
    // Persist watched state immediately for the just-finished episode.
    if (user && activeEp && data?.id) {
      api.post("/me/history", {
        cartoon_id: data.id,
        episode_id: activeEp.id,
        progress_seconds: 0,
      }).catch(() => {});
      setWatchedIds((prev) => {
        const next = new Set(prev);
        next.add(activeEp.id);
        return next;
      });
    }

    const list = data?.episodes || [];
    if (!activeEp || list.length === 0) return;
    const idx = list.findIndex((e) => e.id === activeEp.id);
    if (idx < 0 || idx >= list.length - 1) {
      toast.message("Ai terminat toate episoadele!", {
        description: "Felicitări — ai vizionat ultimul episod din această colecție.",
      });
      return;
    }
    const next = list[idx + 1];
    setActiveEp(next);
    // After React re-renders the <video> with the new key+src, autoplay it
    // and try to resume the fullscreen state if it was active. We do this on
    // the next animation frame so the new <video> exists in the DOM.
    requestAnimationFrame(() => {
      const v = videoRef.current;
      if (!v) return;
      // Most browsers retain fullscreen on src change for the same element.
      // If we re-keyed and lost the element, just try to play.
      const p = v.play?.();
      if (p && typeof p.catch === "function") p.catch(() => {});
    });
  };

  if (loading || !data) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-7xl px-4 py-10">Se încarcă...</div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <h1 data-testid="cartoon-detail-title" className="font-display text-3xl sm:text-4xl tracking-wider">{data.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {data.year || "—"}</span>
                <span className="inline-flex items-center gap-1">
                  <Tv className="h-3.5 w-3.5" />
                  {data.episode_count > 0
                    ? `${data.episode_count} episoade`
                    : "Disponibil în curând"}
                </span>
                {data.genres?.map((g) => <Badge key={g} variant="secondary" className="rounded-md">{g}</Badge>)}
              </div>
              <p className="mt-4 text-muted-foreground">{data.description || "Un desen animat clasic din epoca de aur."}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={toggleFav} variant={favorited ? "default" : "secondary"} className="rounded-xl" data-testid="cartoon-detail-favorite-button">
                  <Heart className={`mr-2 h-4 w-4 ${favorited ? "fill-current" : ""}`} />
                  {favorited ? "La favorite" : "Adaugă la favorite"}
                </Button>
                {isPlus && (
                  <Button
                    onClick={() =>
                      setPlaylistDialog({
                        open: true,
                        mode: "cartoon",
                        episodeId: null,
                        episodeTitle: "",
                      })
                    }
                    variant="secondary"
                    className="rounded-xl"
                    data-testid="cartoon-detail-add-to-playlist-button"
                  >
                    <ListPlus className="mr-2 h-4 w-4" />
                    Adaugă în playlist
                  </Button>
                )}
              </div>
            </motion.div>

            <div className="mt-8">
              {activeEp && (isPlus || user?.role === "admin") && (
                <div className="mb-3">
                  <CreateWatchPartyButton
                    variant="card"
                    episodeId={activeEp.id}
                    cartoonId={id}
                    label={`Watch ${data.cartoon?.title || ""} cu prietenii`}
                  />
                </div>
              )}
              {activeEp ? (
                <div data-testid="watch-player" className="tv-bezel scanlines relative overflow-hidden">
                  <div className="aspect-video rounded-xl bg-black overflow-hidden">
                    <video
                      ref={videoRef}
                      src={videoSrc}
                      controls
                      playsInline
                      autoPlay
                      preload="metadata"
                      controlsList="nodownload"
                      className="h-full w-full bg-black object-contain"
                      onPlay={onPlay}
                      onTimeUpdate={onProgress}
                      onEnded={handleEpisodeEnded}
                      data-testid="watch-video-element"
                    />
                  </div>
                  <div className="mt-2 px-1 text-sm flex items-center gap-2">
                    <div className="font-medium truncate flex-1">{activeEp.title}</div>
                    {watchedIds.has(activeEp.id) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--accent))]/15 border border-[hsl(var(--accent))]/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--accent))]">
                        <CheckCircle2 className="h-3 w-3" />
                        Vizionat
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground px-1">S{activeEp.season} · E{activeEp.episode_number}</div>
                </div>
              ) : (
                <div
                  data-testid="cartoon-detail-coming-soon"
                  className="relative rounded-2xl border border-[hsl(var(--accent))]/30 bg-gradient-to-br from-[hsl(var(--accent))]/[0.08] via-white/[0.02] to-transparent p-10 text-center overflow-hidden"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full"
                    style={{
                      background:
                        "radial-gradient(closest-side, hsla(var(--accent) / 0.35), transparent 70%)",
                    }}
                  />
                  <div className="relative">
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-[hsl(var(--accent))]/15 ring-1 ring-[hsl(var(--accent))]/30 grid place-items-center text-[hsl(var(--accent))]">
                      <Clock3 className="h-6 w-6" strokeWidth={2} />
                    </div>
                    <div className="mt-4 text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))]">
                      În curând
                    </div>
                    <h3 className="mt-2 font-display text-2xl sm:text-3xl tracking-wider text-white">
                      Episoadele sunt pe drum
                    </h3>
                    <p className="mt-2 max-w-md mx-auto text-sm text-white/55">
                      Acest desen va fi disponibil în curând. Echipa noastră urmează să adauge episoadele — revino în câteva zile.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="lg:col-span-1">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xl tracking-wider">Episoade</h3>
              {isAdmin && data.episodes?.length > 1 && (
                <span
                  className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--accent))]/80 inline-flex items-center gap-1"
                  data-testid="episodes-admin-reorder-hint"
                >
                  <GripVertical className="h-3 w-3" />
                  {reorderSaving ? "Se salvează…" : "Trage pentru a reordona"}
                </span>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
              <div className="ep-scroll max-h-[70vh] overflow-y-auto p-2 space-y-1.5">
                {data.episodes?.length === 0 && (
                  <div className="p-6 text-sm text-muted-foreground">Niciun episod încă.</div>
                )}
                {data.episodes?.map((ep) => {
                  const isDragOver = isAdmin && dragOverId === ep.id && dragId && dragId !== ep.id;
                  const isDragging = isAdmin && dragId === ep.id;
                  const isWatched = watchedIds.has(ep.id);
                  const isActive = activeEp?.id === ep.id;
                  return (
                  <div
                    key={ep.id}
                    draggable={isAdmin}
                    onDragStart={(e) => {
                      if (!isAdmin) return;
                      setDragId(ep.id);
                      e.dataTransfer.effectAllowed = "move";
                      try { e.dataTransfer.setData("text/plain", ep.id); } catch { /* noop */ }
                    }}
                    onDragOver={(e) => {
                      if (!isAdmin || !dragId) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverId !== ep.id) setDragOverId(ep.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverId === ep.id) setDragOverId(null);
                    }}
                    onDrop={(e) => {
                      if (!isAdmin) return;
                      e.preventDefault();
                      const src = dragId;
                      setDragId(null);
                      setDragOverId(null);
                      if (src && src !== ep.id) reorderEpisodes(src, ep.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragOverId(null);
                    }}
                    data-testid={`episode-card-${ep.id}`}
                    className={`group w-full rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all ${
                      activeEp?.id === ep.id ? "bg-secondary" : "hover:bg-secondary/60"
                    } ${isDragging ? "opacity-40 scale-[0.98]" : ""} ${
                      isDragOver ? "ring-2 ring-[hsl(var(--accent))] ring-offset-2 ring-offset-background" : ""
                    }`}
                  >
                    {isAdmin && (
                      <div
                        className="text-white/30 group-hover:text-white/60 cursor-grab active:cursor-grabbing shrink-0"
                        title="Trage pentru reordonare"
                        data-testid={`episode-drag-handle-${ep.id}`}
                      >
                        <GripVertical className="h-4 w-4" />
                      </div>
                    )}
                    <button
                      data-testid={`episode-row-${ep.id}`}
                      onClick={() => setActiveEp(ep)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div
                        className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 transition-colors ${
                          isWatched && !isActive
                            ? "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))] ring-1 ring-[hsl(var(--accent))]/40"
                            : "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                        }`}
                      >
                        {isWatched && !isActive ? (
                          <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
                        ) : (
                          <Play className="h-3.5 w-3.5 ml-0.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-medium truncate ${isWatched && !isActive ? "text-white/55" : ""}`}>
                          {ep.title}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>S{ep.season} · E{ep.episode_number}</span>
                          {isWatched && (
                            <span
                              data-testid={`episode-watched-${ep.id}`}
                              className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--accent))]/12 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[hsl(var(--accent))]/90"
                            >
                              Vizionat
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    {isPlus && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(ep);
                        }}
                        disabled={downloadingEpId === ep.id}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity h-7 w-7 rounded-md grid place-items-center text-white/60 hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/10 shrink-0 disabled:opacity-50"
                        data-testid={`episode-download-${ep.id}`}
                        title={downloadingEpId === ep.id ? "Se pregătește..." : "Descarcă episodul"}
                      >
                        <Download className={`h-4 w-4 ${downloadingEpId === ep.id ? "animate-pulse" : ""}`} />
                      </button>
                    )}
                    {isPlus && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylistDialog({
                            open: true,
                            mode: "episode",
                            episodeId: ep.id,
                            episodeTitle: ep.title,
                          });
                        }}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity h-7 w-7 rounded-md grid place-items-center text-white/60 hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/10 shrink-0"
                        data-testid={`episode-add-to-playlist-${ep.id}`}
                        title="Adaugă în playlist"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <AddToPlaylistDialog
        open={playlistDialog.open}
        onOpenChange={(open) =>
          setPlaylistDialog((s) => ({ ...s, open }))
        }
        mode={playlistDialog.mode}
        cartoonId={data.id}
        cartoonTitle={data.title}
        episodeId={playlistDialog.episodeId}
        episodeTitle={playlistDialog.episodeTitle}
      />
    </PublicLayout>
  );
}
