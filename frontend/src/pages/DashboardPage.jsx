import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Crown, Heart, History as HistoryIcon, ListMusic, Settings as SettingsIcon, Lock, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Stat({ label, value, color }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5">
      <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-display tracking-wider" style={{ color }}>{value}</div>
    </div>
  );
}

export default function DashboardPage() {
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
      toast.success("Playlist created");
      load();
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not create playlist"));
    }
  };

  const onAvatarChange = async (url) => {
    try {
      await updateMe({ avatar_url: url });
      toast.success("Avatar updated");
    } catch {
      toast.error("Could not update avatar");
    }
  };

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <img src={mediaUrl(user.avatar_url)} alt="" className="h-16 w-16 rounded-xl object-cover" />
          <div className="flex-1">
            <h1 className="font-display text-3xl tracking-wider">Welcome back, {user.nickname}</h1>
            <div className="flex items-center gap-2 mt-1">
              {isPlus ? (
                <Badge className="bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] rounded-full"><Crown className="h-3 w-3 mr-1" /> Plus</Badge>
              ) : (
                <Badge variant="secondary" className="rounded-full">Free</Badge>
              )}
              {!user.email_verified && (
                <Link to="/verify"><Badge variant="destructive">Email not verified</Badge></Link>
              )}
            </div>
          </div>
          {!isPlus && (
            <Link to="/plans"><Button className="rounded-xl" data-testid="dashboard-upgrade-button"><Crown className="h-4 w-4 mr-2" /> Upgrade to Plus</Button></Link>
          )}
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Stat label="Favorites" value={favs.length} color="hsl(var(--primary))" />
          <Stat label="In history" value={history.length} color="hsl(var(--accent))" />
          <Stat label="Playlists" value={isPlus ? playlists.length : 0} color="hsl(var(--brand-minimax))" />
          <Stat label="Plan" value={isPlus ? "PLUS" : "FREE"} color="hsl(var(--brand-cn))" />
        </div>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="rounded-xl">
            <TabsTrigger value="history" data-testid="dashboard-tab-history"><HistoryIcon className="h-4 w-4 mr-2" /> History</TabsTrigger>
            <TabsTrigger value="favorites" data-testid="dashboard-tab-favorites"><Heart className="h-4 w-4 mr-2" /> Favorites</TabsTrigger>
            <TabsTrigger value="playlists" data-testid="dashboard-tab-playlists"><ListMusic className="h-4 w-4 mr-2" /> Playlists {!isPlus && <Lock className="h-3 w-3 ml-1" />}</TabsTrigger>
            <TabsTrigger value="settings" data-testid="dashboard-tab-settings"><SettingsIcon className="h-4 w-4 mr-2" /> Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-5">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">No watch history yet. Start a cartoon!</div>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <Link key={h.episode_id} to={`/cartoon/${h.cartoon_id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3 hover:bg-card transition-colors">
                    <div className="h-12 w-20 rounded-md bg-secondary overflow-hidden grid place-items-center text-xs">
                      {h.cartoon?.thumbnail_url ? <img src={mediaUrl(h.cartoon.thumbnail_url)} alt="" className="h-full w-full object-cover" /> : <span className="text-muted-foreground">{h.cartoon?.title?.slice(0,2) || "—"}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{h.cartoon?.title || "Unknown"}</div>
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
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">No favorites yet. Tap the heart on a cartoon to save it.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {favs.map((c) => (
                  <Link key={c.id} to={`/cartoon/${c.id}`} className="rounded-2xl border border-border bg-card/60 p-3 hover:bg-card transition-colors">
                    <div className="aspect-[16/10] rounded-lg overflow-hidden bg-secondary grid place-items-center">
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
              <div className="rounded-2xl border border-border bg-card/60 p-10 text-center">
                <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <h3 className="font-display text-xl tracking-wider">Playlists are a Plus feature</h3>
                <p className="text-sm text-muted-foreground mt-1">Upgrade to Cartoonix Plus to curate your own collections.</p>
                <Link to="/plans"><Button className="mt-4 rounded-xl" data-testid="playlists-upgrade-button">Go Plus</Button></Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input value={newPlaylist} onChange={(e) => setNewPlaylist(e.target.value)} placeholder="New playlist name" data-testid="playlist-name-input" className="h-11 rounded-xl" />
                  <Button onClick={createPlaylist} className="rounded-xl h-11" data-testid="playlist-create-button">Create</Button>
                </div>
                {playlists.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">No playlists yet.</div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {playlists.map((p) => (
                      <div key={p.id} className="rounded-xl border border-border bg-card/60 p-4" data-testid="playlist-item">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.cartoon_ids?.length || 0} cartoons</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-5">
            <div className="rounded-2xl border border-border bg-card/60 p-6">
              <h3 className="font-display text-xl tracking-wider mb-3">Change avatar</h3>
              <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 gap-3">
                {avatars.map((a) => {
                  const selected = user.avatar_url === a.url;
                  return (
                    <button key={a.slug} onClick={() => onAvatarChange(a.url)} data-testid="settings-avatar-option"
                      className={`relative aspect-square overflow-hidden rounded-lg border-2 ${selected ? "border-[hsl(var(--primary))] ring-2 ring-[hsl(var(--ring))]" : "border-border hover:border-foreground/40"}`}>
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
                <Label>Nickname</Label>
                <Input value={user.nickname} disabled className="h-11 rounded-xl mt-1" />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </PublicLayout>
  );
}
