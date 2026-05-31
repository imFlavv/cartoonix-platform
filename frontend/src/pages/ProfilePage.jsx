import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Heart,
  History as HistoryIcon,
  ListMusic,
  Settings as SettingsIcon,
  Lock,
  ChevronRight,
  Play,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import UserBadges from "@/components/UserBadges";

function Stat({ label, value }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
      <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">{label}</div>
      <div className="mt-2 text-3xl font-display tracking-wider text-white">{value}</div>
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[hsl(var(--accent))]/[0.06] blur-2xl" />
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateMe } = useAuth();
  const navigate = useNavigate();
  const [favs, setFavs] = useState([]);
  const [history, setHistory] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylist, setNewPlaylist] = useState("");
  const [avatars, setAvatars] = useState([]);

  const load = async () => {
    const [{ data: f }, { data: h }, { data: p }, { data: a }] = await Promise.all([
      api.get("/me/favorites"),
      api.get("/me/history"),
      api.get("/me/playlists"),
      api.get("/avatars"),
    ]);
    setFavs(f);
    setHistory(h);
    setPlaylists(p);
    setAvatars(a);
  };

  useEffect(() => {
    if (!user) navigate("/login");
    else load();
    // eslint-disable-next-line
  }, [user]);

  if (!user) return null;

  const isPlus = user.subscription === "plus";

  const createPlaylist = async () => {
    if (!newPlaylist.trim()) return;
    try {
      await api.post("/me/playlists", { name: newPlaylist.trim() });
      setNewPlaylist("");
      toast.success("Playlist creat");
      load();
    } catch (e) {
      toast.error(getErrorMessage(e, "Nu am putut crea playlist-ul"));
    }
  };

  const deletePlaylist = async (playlistId) => {
    if (!window.confirm("Sigur ștergi acest playlist?")) return;
    try {
      await api.delete(`/me/playlists/${playlistId}`);
      toast.success("Playlist șters");
      load();
    } catch (e) {
      toast.error(getErrorMessage(e, "Nu am putut șterge playlist-ul"));
    }
  };

  const onAvatarChange = async (url) => {
    try {
      await updateMe({ avatar_url: url });
      toast.success("Avatar actualizat");
    } catch {
      toast.error("Nu am putut actualiza avatarul");
    }
  };

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* PROFILE HEADER CARD */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent p-6 sm:p-8"
        >
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-[hsl(var(--accent))]/[0.10] blur-3xl" />
          <div className="pointer-events-none absolute inset-0 noise-overlay opacity-50" />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="relative shrink-0">
              <img
                src={mediaUrl(user.avatar_url)}
                alt=""
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover ring-1 ring-white/10"
              />
              {isPlus && (
                <span className="absolute -inset-1 rounded-2xl ring-2 ring-[hsl(var(--accent))]/45" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Profilul meu</div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl sm:text-4xl tracking-wider text-white">
                  {user.nickname}
                </h1>
                <UserBadges isPlus={isPlus} size={30} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    isPlus
                      ? "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))] ring-1 ring-[hsl(var(--accent))]/30"
                      : "bg-white/[0.06] text-white/70 ring-1 ring-white/10"
                  }`}
                >
                  {isPlus ? "Membru PLUS" : "Cont Free"}
                </span>
                {!user.email_verified && (
                  <Link to="/verify">
                    <span className="inline-flex items-center rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 ring-1 ring-red-500/30">
                      Email neverificat
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-8">
          <Stat label="Favorite" value={favs.length} />
          <Stat label="În istoric" value={history.length} />
          <Stat label="Playlist-uri" value={isPlus ? playlists.length : 0} />
          <Stat label="Abonament" value={isPlus ? "PLUS" : "FREE"} />
        </div>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <TabsTrigger value="history" data-testid="dashboard-tab-history"><HistoryIcon className="h-4 w-4 mr-2" /> Istoric</TabsTrigger>
            <TabsTrigger value="favorites" data-testid="dashboard-tab-favorites"><Heart className="h-4 w-4 mr-2" /> Favorite</TabsTrigger>
            <TabsTrigger value="playlists" data-testid="dashboard-tab-playlists"><ListMusic className="h-4 w-4 mr-2" /> Playlist-uri {!isPlus && <Lock className="h-3 w-3 ml-1" />}</TabsTrigger>
            <TabsTrigger value="settings" data-testid="dashboard-tab-settings"><SettingsIcon className="h-4 w-4 mr-2" /> Setări</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-5">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-muted-foreground">Nu ai istoric încă. Pornește un desen!</div>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <Link key={h.episode_id} to={`/cartoon/${h.cartoon_id}`} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.05] transition-colors">
                    <div className="h-12 w-20 rounded-md bg-white/[0.04] overflow-hidden grid place-items-center text-xs">
                      {h.cartoon?.thumbnail_url ? <img src={mediaUrl(h.cartoon.thumbnail_url)} alt="" className="h-full w-full object-cover" /> : <span className="text-muted-foreground">{h.cartoon?.title?.slice(0,2) || "—"}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{h.cartoon?.title || "Necunoscut"}</div>
                      <div className="text-xs text-muted-foreground truncate">{h.episode?.title} · S{h.episode?.season} E{h.episode?.episode_number}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="mt-5">
            {favs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-muted-foreground">Niciun favorit încă. Apasă inimioara de pe un desen pentru a-l salva.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {favs.map((c) => (
                  <Link key={c.id} to={`/cartoon/${c.id}`} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.05] transition-colors">
                    <div className="aspect-[16/10] rounded-lg overflow-hidden bg-white/[0.04] grid place-items-center">
                      {c.thumbnail_url ? <img src={mediaUrl(c.thumbnail_url)} alt="" className="h-full w-full object-cover" /> : <span className="font-display tracking-wider text-2xl opacity-70">{c.title.slice(0,8)}</span>}
                    </div>
                    <div className="mt-2 font-medium truncate">{c.title}</div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="playlists" className="mt-5">
            {!isPlus ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
                <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <h3 className="font-display text-xl tracking-wider">Playlist-urile sunt o funcție Plus</h3>
                <p className="text-sm text-muted-foreground mt-1">Disponibile pentru membrii Cartoonix Plus.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input value={newPlaylist} onChange={(e) => setNewPlaylist(e.target.value)} placeholder="Nume playlist nou" data-testid="playlist-name-input" className="h-11 rounded-xl" />
                  <Button onClick={createPlaylist} className="rounded-xl h-11" data-testid="playlist-create-button">Creează</Button>
                </div>
                {playlists.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-muted-foreground">Niciun playlist încă.</div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {playlists.map((p) => {
                      const epCount = (p.items || []).length;
                      return (
                        <div
                          key={p.id}
                          className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center gap-3"
                          data-testid="playlist-item"
                        >
                          <div className="h-11 w-11 rounded-xl bg-[hsl(var(--accent))]/15 ring-1 ring-[hsl(var(--accent))]/30 grid place-items-center text-[hsl(var(--accent))] shrink-0">
                            <ListMusic className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {epCount} {epCount === 1 ? "episod" : "episoade"}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={epCount === 0}
                            onClick={() => navigate(`/playlist/${p.id}`)}
                            className="rounded-lg"
                            data-testid={`playlist-play-${p.id}`}
                            title={epCount === 0 ? "Playlist gol" : "Redă"}
                          >
                            <Play className="h-4 w-4 mr-1" /> Redă
                          </Button>
                          <button
                            onClick={() => deletePlaylist(p.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 rounded-md grid place-items-center text-white/60 hover:text-red-300 hover:bg-red-500/10"
                            data-testid={`playlist-delete-${p.id}`}
                            title="Șterge playlist"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-5">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <h3 className="font-display text-xl tracking-wider mb-3">Schimbă avatarul</h3>
              <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 gap-3">
                {avatars.map((a) => {
                  const selected = user.avatar_url === a.url;
                  return (
                    <button key={a.slug} onClick={() => onAvatarChange(a.url)} data-testid="settings-avatar-option"
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 ${selected ? "border-[hsl(var(--accent))] ring-2 ring-[hsl(var(--accent))]/40" : "border-white/10 hover:border-white/30"}`}>
                      <img src={mediaUrl(a.url)} alt="" className="h-full w-full object-cover" />
                    </button>
                  );
                })}
              </div>
              <div className="mt-6">
                <Label>Email</Label>
                <Input value={user.email} disabled className="h-11 rounded-xl mt-1" />
              </div>
              <div className="mt-4">
                <Label>Pseudonim</Label>
                <Input value={user.nickname} disabled className="h-11 rounded-xl mt-1" />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </PublicLayout>
  );
}
