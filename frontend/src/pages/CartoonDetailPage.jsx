import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { api, mediaUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Play, Tv, Calendar } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ReactPlayer from "react-player";

export default function CartoonDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [activeEp, setActiveEp] = useState(null);
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data: c } = await api.get(`/cartoons/${id}`);
      setData(c);
      setActiveEp(c.episodes?.[0] || null);
      if (user) {
        const { data: fav } = await api.get(`/me/favorites/check/${id}`);
        setFavorited(!!fav.favorited);
      }
    } catch (e) {
      toast.error("Desenul nu a fost găsit");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, user]);

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

  const onProgress = async (state) => {
    if (!user || !activeEp) return;
    // Throttle: record every ~10s
    if (Math.floor(state.playedSeconds) % 10 === 0 && state.playedSeconds > 0) {
      try {
        await api.post("/me/history", {
          cartoon_id: data.id,
          episode_id: activeEp.id,
          progress_seconds: Math.floor(state.playedSeconds),
        });
      } catch {}
    }
  };

  if (loading || !data) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-7xl px-4 py-10">Se încarcă...</div>
      </PublicLayout>
    );
  }

  const videoSrc = activeEp ? mediaUrl(activeEp.video_url) : "";

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <h1 data-testid="cartoon-detail-title" className="font-display text-3xl sm:text-4xl tracking-wider">{data.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {data.year || "—"}</span>
                <span className="inline-flex items-center gap-1"><Tv className="h-3.5 w-3.5" /> {data.episode_count} episoade</span>
                {data.genres?.map((g) => <Badge key={g} variant="secondary" className="rounded-md">{g}</Badge>)}
              </div>
              <p className="mt-4 text-muted-foreground">{data.description || "Un desen animat clasic din epoca de aur."}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={toggleFav} variant={favorited ? "default" : "secondary"} className="rounded-xl" data-testid="cartoon-detail-favorite-button">
                  <Heart className={`mr-2 h-4 w-4 ${favorited ? "fill-current" : ""}`} />
                  {favorited ? "La favorite" : "Adaugă la favorite"}
                </Button>
              </div>
            </motion.div>

            <div className="mt-8">
              {activeEp ? (
                <div data-testid="watch-player" className="tv-bezel scanlines relative overflow-hidden">
                  <div className="aspect-video rounded-xl bg-black overflow-hidden">
                    <ReactPlayer
                      url={videoSrc}
                      controls
                      width="100%"
                      height="100%"
                      onProgress={onProgress}
                      config={{ file: { attributes: { controlsList: "nodownload", crossOrigin: "anonymous" } } }}
                    />
                  </div>
                  <div className="mt-2 px-1 text-sm flex items-center justify-between">
                    <div>
                      <div className="font-medium">{activeEp.title}</div>
                      <div className="text-xs text-muted-foreground">S{activeEp.season} · E{activeEp.episode_number}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
                  Niciun episod disponibil încă.
                </div>
              )}
            </div>
          </div>

          <aside className="lg:col-span-1">
            <h3 className="font-display text-xl tracking-wider mb-3">Episoade</h3>
            <div className="rounded-2xl border border-border bg-card/60">
              <ScrollArea className="max-h-[70vh]">
                <div className="p-2 space-y-1.5">
                  {data.episodes?.length === 0 && (
                    <div className="p-6 text-sm text-muted-foreground">Niciun episod încă.</div>
                  )}
                  {data.episodes?.map((ep) => (
                    <button
                      key={ep.id}
                      data-testid={`episode-row-${ep.id}`}
                      onClick={() => setActiveEp(ep)}
                      className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-colors ${
                        activeEp?.id === ep.id ? "bg-secondary" : "hover:bg-secondary/60"
                      }`}
                    >
                      <div className="h-8 w-8 rounded-lg bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] grid place-items-center">
                        <Play className="h-3.5 w-3.5 ml-0.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{ep.title}</div>
                        <div className="text-xs text-muted-foreground">S{ep.season} · E{ep.episode_number}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </aside>
        </div>
      </section>
    </PublicLayout>
  );
}
