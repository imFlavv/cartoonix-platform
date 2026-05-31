import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Play,
  SkipForward,
  SkipBack,
  Repeat,
  ListMusic,
  ChevronLeft,
  X,
} from "lucide-react";

/**
 * Resolve an episode video path to a playable URL.
 * (mirrors logic from CartoonDetailPage.jsx)
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

export default function PlaylistPlayerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [playlist, setPlaylist] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loop, setLoop] = useState(false);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.subscription !== "plus") {
      toast.error("Playlist-urile sunt o funcție Cartoonix PLUS");
      navigate("/profile");
      return;
    }
    (async () => {
      try {
        const { data } = await api.get(`/me/playlists/${id}`);
        setPlaylist(data);
        if (!data.resolved_items?.length) {
          toast.message("Acest playlist este gol");
        }
      } catch {
        toast.error("Nu am putut încărca playlist-ul");
        navigate("/profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user, navigate]);

  const items = useMemo(() => playlist?.resolved_items || [], [playlist]);
  const active = items[activeIdx] || null;

  const goNext = () => {
    if (!items.length) return;
    if (activeIdx < items.length - 1) {
      setActiveIdx(activeIdx + 1);
    } else if (loop) {
      setActiveIdx(0);
    } else {
      toast.message("Ai ajuns la finalul playlist-ului");
    }
  };

  const goPrev = () => {
    if (!items.length) return;
    if (activeIdx > 0) setActiveIdx(activeIdx - 1);
    else if (loop) setActiveIdx(items.length - 1);
  };

  const removeItem = async (episodeId) => {
    try {
      await api.delete(`/me/playlists/${id}/episodes/${episodeId}`);
      const { data } = await api.get(`/me/playlists/${id}`);
      // If we removed the current item, fix the activeIdx
      const wasAt = activeIdx;
      const removedBeforeActive = items
        .slice(0, wasAt)
        .some((it) => it.episode_id === episodeId);
      setPlaylist(data);
      const newLen = (data.resolved_items || []).length;
      if (newLen === 0) {
        setActiveIdx(0);
      } else if (removedBeforeActive) {
        setActiveIdx(Math.max(0, wasAt - 1));
      } else if (wasAt >= newLen) {
        setActiveIdx(newLen - 1);
      }
      toast.success("Episod eliminat din playlist");
    } catch {
      toast.error("Nu am putut elimina episodul");
    }
  };

  // Auto-play when active episode changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !active) return;
    v.load();
    const tryPlay = () => v.play().catch(() => {});
    if (v.readyState >= 2) tryPlay();
    else v.addEventListener("loadeddata", tryPlay, { once: true });
  }, [active?.episode_id]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-7xl px-4 py-10">Se încarcă...</div>
      </PublicLayout>
    );
  }

  if (!playlist) return null;

  const videoSrc = active ? resolveVideoUrl(active.episode.video_url) : "";

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/profile")}
            className="text-white/70 hover:text-white"
            data-testid="playlist-back-button"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Înapoi la profil
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-start gap-3 mb-6 sm:mb-8"
        >
          <div className="h-14 w-14 rounded-2xl bg-[hsl(var(--accent))]/15 ring-1 ring-[hsl(var(--accent))]/30 grid place-items-center shrink-0">
            <ListMusic className="h-6 w-6 text-[hsl(var(--accent))]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">
              Playlist
            </div>
            <h1
              data-testid="playlist-title"
              className="font-display text-3xl sm:text-4xl tracking-wider text-white truncate"
            >
              {playlist.name}
            </h1>
            <div className="mt-1 text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "episod" : "episoade"}
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* PLAYER */}
          <div className="lg:col-span-2">
            {active ? (
              <>
                <div className="tv-bezel scanlines relative overflow-hidden">
                  <div className="aspect-video rounded-xl bg-black overflow-hidden">
                    <video
                      ref={videoRef}
                      key={active.episode_id}
                      src={videoSrc}
                      controls
                      autoPlay
                      playsInline
                      preload="metadata"
                      controlsList="nodownload"
                      className="h-full w-full bg-black object-contain"
                      onEnded={goNext}
                      data-testid="playlist-video-element"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div
                      className="font-medium truncate"
                      data-testid="playlist-now-playing"
                    >
                      {active.episode.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {active.cartoon?.title} · S{active.episode.season} · E
                      {active.episode.episode_number}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={goPrev}
                      disabled={activeIdx === 0 && !loop}
                      data-testid="playlist-prev-button"
                      className="rounded-xl"
                    >
                      <SkipBack className="h-4 w-4 mr-1" /> Anterior
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={goNext}
                      disabled={activeIdx === items.length - 1 && !loop}
                      data-testid="playlist-next-button"
                      className="rounded-xl"
                    >
                      Următor <SkipForward className="h-4 w-4 ml-1" />
                    </Button>
                    <Button
                      variant={loop ? "default" : "outline"}
                      size="sm"
                      onClick={() => setLoop((v) => !v)}
                      data-testid="playlist-loop-button"
                      className="rounded-xl"
                      title={loop ? "Repetare activată" : "Repetare dezactivată"}
                    >
                      <Repeat className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
                Acest playlist nu are episoade.
              </div>
            )}
          </div>

          {/* QUEUE */}
          <aside className="lg:col-span-1">
            <h3 className="font-display text-xl tracking-wider mb-3">
              În coadă
            </h3>
            <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
              <div className="ep-scroll max-h-[70vh] overflow-y-auto p-2 space-y-1.5">
                {items.length === 0 && (
                  <div className="p-6 text-sm text-muted-foreground">
                    Nicio piesă în coadă.
                  </div>
                )}
                {items.map((it, idx) => {
                  const isActive = idx === activeIdx;
                  return (
                    <div
                      key={`${it.episode_id}-${idx}`}
                      className={`group w-full rounded-xl px-3 py-2.5 flex items-center gap-3 transition-colors ${
                        isActive ? "bg-secondary" : "hover:bg-secondary/60"
                      }`}
                      data-testid={`playlist-queue-row-${it.episode_id}`}
                    >
                      <button
                        onClick={() => setActiveIdx(idx)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        data-testid={`playlist-play-row-${it.episode_id}`}
                      >
                        <div
                          className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${
                            isActive
                              ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                              : "bg-white/[0.06] text-white/70"
                          }`}
                        >
                          <Play className="h-3.5 w-3.5 ml-0.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {it.episode.title}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {it.cartoon?.title} · S{it.episode.season} · E
                            {it.episode.episode_number}
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => removeItem(it.episode_id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-md grid place-items-center text-white/60 hover:text-red-300 hover:bg-red-500/10"
                        data-testid={`playlist-remove-${it.episode_id}`}
                        title="Elimină din playlist"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </PublicLayout>
  );
}
