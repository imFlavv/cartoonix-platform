import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { api } from "@/lib/api";
import { AVATAR_SEEDS, PREMIUM_AVATARS } from "@/data/constants";
import { PlusIcon } from "@/components/PlusIcon";
import { Check, Play, Heart, Trash2, ListMusic, Film, Clock, Lock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const formatTime = (sec) => {
  sec = Math.floor(sec || 0);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
};

const EpItem = ({ item, onPlay, right }) => (
  <div className="group flex items-center gap-3 p-2.5 rounded-xl bg-[#141414] border border-white/5 hover:bg-[#1c1c1c] transition-colors duration-200">
    <div className="relative shrink-0 cursor-pointer" onClick={onPlay}>
      <img src={item.thumbnail} alt="" className="h-14 w-10 rounded object-cover" />
      <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Play className="h-4 w-4 fill-white" />
      </span>
    </div>
    <div className="flex-1 min-w-0 cursor-pointer" onClick={onPlay}>
      <p className="font-semibold text-sm truncate">{item.show_title}</p>
      <p className="text-xs text-white/50 truncate">{item.episode_title} · {item.channel}</p>
    </div>
    {right}
  </div>
);

const Profile = () => {
  const { user, setUser, refreshUser } = useAuth();
  const { favorites, playlists, toggleFavorite, deletePlaylist, togglePlaylistItem } = useLibrary();
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState(user?.avatar || AVATAR_SEEDS[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refreshUser().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAvatar = async () => {
    setBusy(true);
    try {
      const { data } = await api.put("/auth/avatar", { avatar });
      setUser(data);
      toast.success("Avatar actualizat!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Nu s-a putut salva");
    } finally {
      setBusy(false);
    }
  };

  const pickPremium = (a) => {
    if (!user?.plus) {
      toast.error("Avatarele premium sunt doar pentru membrii PLUS");
      navigate("/plus");
      return;
    }
    setAvatar(a);
  };

  const play = (i) => navigate(`/watch/${i.show_id}/${i.episode_number}`);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-20">
        {/* header banner */}
        <div className="relative px-4 md:px-12 py-10 border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{
            background: "radial-gradient(circle at 15% 0%, rgba(236,28,36,0.35), transparent 55%), radial-gradient(circle at 85% 100%, rgba(255,204,0,0.2), transparent 55%)",
          }} />
          <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-5 max-w-5xl mx-auto">
            <img src={user?.avatar || avatar} alt="avatar" className="h-28 w-28 rounded-full bg-[#141414] border-2 border-[#ffcc00]" />
            <div className="text-center sm:text-left flex-1">
              <h1 className="font-display text-4xl md:text-5xl">{user?.name}</h1>
              <p className="text-white/50">{user?.email}</p>
              <div className="mt-2 flex items-center justify-center sm:justify-start gap-3">
                {user?.plus ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffcc00]/15 text-[#ffcc00] text-xs font-bold">
                    <PlusIcon className="h-4 w-4" /> Membru PLUS
                  </span>
                ) : (
                  <>
                    <span className="px-3 py-1 rounded-full border border-white/20 text-white/60 text-xs font-bold">Cont FREE</span>
                    <button onClick={() => navigate("/plus")} data-testid="profile-upgrade" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffcc00] text-black text-xs font-bold hover:brightness-110 transition-all duration-200">
                      <PlusIcon className="h-4 w-4" /> Upgrade la PLUS
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <p className="font-display text-3xl text-[#ffcc00]">{favorites.length}</p>
                <p className="text-xs text-white/50">Favorite</p>
              </div>
              <div>
                <p className="font-display text-3xl text-[#ffcc00]">{playlists.length}</p>
                <p className="text-xs text-white/50">Playlist-uri</p>
              </div>
              <div data-testid="time-spent">
                <p className="font-display text-3xl text-[#ffcc00] flex items-center gap-1 justify-center">
                  <Clock className="h-5 w-5" /> {formatTime(user?.total_time_seconds)}
                </p>
                <p className="text-xs text-white/50">Timp petrecut</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-12 py-8">
          <Tabs defaultValue="favorites">
            <TabsList className="bg-[#141414] border border-white/10">
              <TabsTrigger value="favorites" data-testid="tab-favorites" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
                <Heart className="h-4 w-4 mr-2" /> Favorite
              </TabsTrigger>
              <TabsTrigger value="playlists" data-testid="tab-playlists" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
                <ListMusic className="h-4 w-4 mr-2" /> Playlist-uri
              </TabsTrigger>
              <TabsTrigger value="account" data-testid="tab-account" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
                Contul meu
              </TabsTrigger>
            </TabsList>

            <TabsContent value="favorites" className="mt-6">
              {favorites.length === 0 ? (
                <div className="text-center py-16 text-white/40">
                  <Film className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  Niciun episod favorit încă. Apasă ❤️ pe episoade ca să le salvezi aici.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {favorites.map((f) => (
                    <EpItem
                      key={f.id}
                      item={f}
                      onPlay={() => play(f)}
                      right={
                        <button data-testid={`remove-fav-${f.id}`} onClick={() => toggleFavorite(f)} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-200">
                          <Heart className="h-4 w-4 fill-[#ec1c24] text-[#ec1c24]" />
                        </button>
                      }
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="playlists" className="mt-6 space-y-6">
              {playlists.length === 0 ? (
                <div className="text-center py-16 text-white/40">
                  <ListMusic className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  Nu ai niciun playlist. Creează unul din pagina unui desen (butonul +).
                </div>
              ) : (
                playlists.map((pl) => (
                  <div key={pl.id} data-testid={`playlist-${pl.id}`} className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-display text-2xl">{pl.name}</h3>
                        <p className="text-xs text-white/50">{pl.items?.length || 0} episoade</p>
                      </div>
                      <button data-testid={`delete-playlist-${pl.id}`} onClick={() => { deletePlaylist(pl.id); toast.success("Playlist șters"); }} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#ec1c24]/20 text-white/60 hover:text-[#ec1c24] transition-colors duration-200">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {pl.items?.length ? (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {pl.items.map((it) => (
                          <EpItem
                            key={it.key}
                            item={it}
                            onPlay={() => play(it)}
                            right={
                              <button onClick={() => togglePlaylistItem(pl.id, it)} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-200">
                                <Trash2 className="h-4 w-4 text-white/60" />
                              </button>
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-white/40">Playlist gol.</p>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="account" className="mt-6">
              <h3 className="font-display text-2xl mb-4">Schimbă avatarul</h3>
              <div className="grid grid-cols-5 sm:grid-cols-7 gap-3 mb-6 max-w-lg">
                {AVATAR_SEEDS.map((a) => (
                  <button
                    key={a}
                    data-testid="profile-avatar-option"
                    onClick={() => setAvatar(a)}
                    className={`relative rounded-full overflow-hidden bg-white/5 border-2 transition-all duration-200 ${
                      avatar === a ? "border-[#ffcc00] scale-105" : "border-transparent hover:border-white/30"
                    }`}
                  >
                    <img src={a} alt="avatar" className="w-full aspect-square object-cover" />
                    {avatar === a && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Check className="h-4 w-4 text-[#ffcc00]" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button data-testid="profile-save" onClick={saveAvatar} disabled={busy} className="px-7 py-3 rounded-full bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-60">
                {busy ? "Se salvează..." : "Salvează avatarul"}
              </button>

              <div className="mt-8">
                <h3 className="font-display text-2xl mb-1 flex items-center gap-2">
                  <PlusIcon className="h-5 w-5" /> Avatare PLUS
                </h3>
                <p className="text-sm text-white/50 mb-4">Avatare elegante, exclusiv pentru membrii Cartoonix PLUS.</p>
                <div className="grid grid-cols-5 sm:grid-cols-7 gap-4 max-w-lg">
                  {PREMIUM_AVATARS.map((a) => {
                    const selected = avatar === a;
                    return (
                      <button
                        key={a}
                        data-testid="premium-avatar-option"
                        onClick={() => pickPremium(a)}
                        className={`relative rounded-full transition-all duration-200 ${selected ? "scale-105" : ""} ${!user?.plus ? "opacity-90" : ""}`}
                      >
                        <span className={`block rounded-full overflow-hidden ${user?.plus ? "cx-premium-ring" : "border-2 border-white/10"}`}>
                          <img src={a} alt="avatar premium" className="w-full aspect-square object-cover bg-white/5 rounded-full" />
                        </span>
                        {!user?.plus && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                            <Lock className="h-4 w-4 text-[#ffcc00]" />
                          </span>
                        )}
                        {selected && user?.plus && (
                          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-[#ffcc00]">
                            <Check className="h-3 w-3 text-black" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {!user?.plus && (
                  <button onClick={() => navigate("/plus")} data-testid="profile-premium-upsell" className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ffcc00] text-black font-bold hover:brightness-110 transition-all duration-200">
                    <PlusIcon className="h-4 w-4" /> Deblochează cu PLUS
                  </button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Profile;
