import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { api } from "@/lib/api";
import { setQueue } from "@/lib/queue";
import { AVATAR_SEEDS, PREMIUM_AVATARS } from "@/data/constants";
import { PlusIcon } from "@/components/PlusIcon";
import { Check, Play, Heart, Trash2, ListMusic, Film, Clock, Lock, KeyRound, Eye, EyeOff, User, Gift, PlayCircle, Coins, Ticket, FileText, Building2, Download, Crown, Copy } from "lucide-react";
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
      <p className="text-xs text-white/50 truncate">
        {item.episode_number === 0 ? "Serial complet" : item.episode_title} · {item.channel}
      </p>
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
  const [wallet, setWallet] = useState({ points: user?.points ?? 0, history: [] });
  const [tickets, setTickets] = useState([]);
  const [invoiceData, setInvoiceData] = useState(null);
  const [openInvoice, setOpenInvoice] = useState(null);
  const [rewards, setRewards] = useState(null);

  useEffect(() => {
    refreshUser().catch(() => {});
    api.get("/points/me").then((res) => setWallet(res.data)).catch(() => {});
    api.get("/cinema/tickets").then((res) => setTickets(res.data || [])).catch(() => {});
    api.get("/invoices").then((res) => setInvoiceData(res.data)).catch(() => {});
    api.get("/rewards").then((res) => setRewards(res.data)).catch(() => {});
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

  const play = (i) => navigate(i.episode_number === 0 ? `/show/${i.show_id}` : `/watch/${i.show_id}/${i.episode_number}`);

  // Start continuous playback of only these items (skips whole-show favorites).
  const playQueue = (rawItems, name) => {
    const items = (rawItems || []).filter((i) => i.episode_number && i.episode_number !== 0);
    if (!items.length) {
      toast.error("Nu există episoade redabile în această listă");
      return;
    }
    setQueue({ name, items });
    const first = items[0];
    navigate(`/watch/${first.show_id}/${first.episode_number}?queue=1`);
    toast.success(`Redare: ${name} (${items.length} episoade)`);
  };

  // password change
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdBusy, setPwdBusy] = useState(false);
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false });

  const changePassword = async (e) => {
    e.preventDefault();
    if (!pwd.current || !pwd.next || !pwd.confirm) {
      toast.error("Completează toate câmpurile");
      return;
    }
    if (pwd.next.length < 6) {
      toast.error("Noua parolă trebuie să aibă minim 6 caractere");
      return;
    }
    if (pwd.next !== pwd.confirm) {
      toast.error("Noua parolă și confirmarea nu se potrivesc");
      return;
    }
    if (pwd.current === pwd.next) {
      toast.error("Noua parolă trebuie să fie diferită de cea actuală");
      return;
    }
    setPwdBusy(true);
    try {
      await api.put("/auth/password", { current_password: pwd.current, new_password: pwd.next });
      toast.success("Parola a fost actualizată!");
      setPwd({ current: "", next: "", confirm: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Nu s-a putut actualiza parola");
    } finally {
      setPwdBusy(false);
    }
  };

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
                <User className="h-4 w-4 mr-2" /> Contul meu
              </TabsTrigger>
              <TabsTrigger value="wallet" data-testid="tab-wallet" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
                <Coins className="h-4 w-4 mr-2" /> Wallet
              </TabsTrigger>
              <TabsTrigger value="rewards" data-testid="tab-rewards" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
                <Gift className="h-4 w-4 mr-2" /> Recompense
              </TabsTrigger>
              <TabsTrigger value="cinema" data-testid="tab-cinema" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
                <Ticket className="h-4 w-4 mr-2" /> Bilete
              </TabsTrigger>
              <TabsTrigger value="invoices" data-testid="tab-invoices" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
                <FileText className="h-4 w-4 mr-2" /> Facturi
              </TabsTrigger>
            </TabsList>

            <TabsContent value="favorites" className="mt-6">
              {favorites.length === 0 ? (
                <div className="text-center py-16 text-white/40">
                  <Film className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  Niciun favorit încă. Apasă ❤️ pe un desen sau pe episoade ca să le salvezi aici.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-white/50">{favorites.length} salvate</p>
                    <button
                      data-testid="play-all-favorites"
                      onClick={() => playQueue(favorites, "Favoritele mele")}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ec1c24] font-bold text-sm hover:bg-[#ff2d36] transition-colors duration-200"
                    >
                      <PlayCircle className="h-4 w-4" /> Redă tot
                    </button>
                  </div>
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
                </>
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
                      <div className="flex items-center gap-2">
                        {pl.items?.length ? (
                          <button
                            data-testid={`play-playlist-${pl.id}`}
                            onClick={() => playQueue(pl.items, pl.name)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ec1c24] font-bold text-sm hover:bg-[#ff2d36] transition-colors duration-200"
                          >
                            <PlayCircle className="h-4 w-4" /> Redă tot
                          </button>
                        ) : null}
                        <button data-testid={`delete-playlist-${pl.id}`} onClick={() => { deletePlaylist(pl.id); toast.success("Playlist șters"); }} className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#ec1c24]/20 text-white/60 hover:text-[#ec1c24] transition-colors duration-200">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
                          <span className="absolute -top-1 -right-1 z-20 h-5 w-5 flex items-center justify-center rounded-full bg-[#ffcc00] shadow-md">
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

              {/* -------- Change password -------- */}
              <div className="mt-10 pt-8 border-t border-white/10 max-w-lg">
                <h3 className="font-display text-2xl mb-1 flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-[#ffcc00]" /> Schimbă parola
                </h3>
                <p className="text-sm text-white/50 mb-5">
                  Introdu parola actuală și noua parolă (minim 6 caractere).
                </p>

                <form data-testid="password-form" onSubmit={changePassword} className="space-y-3">
                  {[
                    { key: "current", label: "Parola actuală", testid: "pwd-current" },
                    { key: "next", label: "Parolă nouă", testid: "pwd-new" },
                    { key: "confirm", label: "Confirmă parola nouă", testid: "pwd-confirm" },
                  ].map((f) => (
                    <div key={f.key} className="relative">
                      <label className="block text-xs text-white/50 mb-1">{f.label}</label>
                      <input
                        data-testid={f.testid}
                        type={showPwd[f.key] ? "text" : "password"}
                        value={pwd[f.key]}
                        onChange={(e) => setPwd({ ...pwd, [f.key]: e.target.value })}
                        autoComplete={f.key === "current" ? "current-password" : "new-password"}
                        className="w-full px-4 py-3 pr-11 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => ({ ...s, [f.key]: !s[f.key] }))}
                        tabIndex={-1}
                        className="absolute right-2 top-[30px] h-9 w-9 flex items-center justify-center rounded-md text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
                        aria-label={showPwd[f.key] ? "Ascunde parola" : "Arată parola"}
                      >
                        {showPwd[f.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  ))}
                  <button
                    data-testid="password-submit"
                    type="submit"
                    disabled={pwdBusy}
                    className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-60"
                  >
                    <KeyRound className="h-4 w-4" />
                    {pwdBusy ? "Se actualizează..." : "Schimbă parola"}
                  </button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="wallet" className="mt-6" data-testid="wallet-content">
              <div className="rounded-3xl p-6 sm:p-8 mb-6 relative overflow-hidden bg-gradient-to-br from-[#ffcc00]/15 to-[#ec1c24]/10 border border-[#ffcc00]/30">
                <p className="text-sm uppercase tracking-widest text-[#ffcc00] font-bold mb-2">Punctele mele</p>
                <div className="flex items-center gap-3">
                  <Coins className="h-10 w-10 text-[#ffcc00]" />
                  <span data-testid="wallet-points" className="font-display text-5xl">{wallet.points}</span>
                  <span className="text-white/50 text-lg self-end mb-1">puncte</span>
                </div>
                <button
                  data-testid="wallet-donate-cta"
                  onClick={() => navigate("/doneaza")}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200"
                >
                  <Heart className="h-4 w-4" /> Donează pentru mai multe puncte
                </button>
              </div>

              <h3 className="font-display text-2xl mb-3">Istoric donații</h3>
              {(!wallet.history || wallet.history.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-14 text-center text-white/50">
                  <Coins className="h-10 w-10 text-white/20 mb-3" />
                  <p>Nu ai făcut încă nicio donație.</p>
                  <p className="text-sm">1 RON donat = 1 punct în cont.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {wallet.history.map((h, i) => (
                    <div key={i} data-testid={`wallet-history-${i}`} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#ec1c24]/15 flex items-center justify-center">
                          <Heart className="h-5 w-5 text-[#ec1c24] fill-[#ec1c24]" />
                        </div>
                        <div>
                          <p className="font-semibold">Donație</p>
                          <p className="text-xs text-white/40">{h.created_at ? new Date(h.created_at).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }) : ""}{h.amount ? ` · ${h.amount} ${(h.currency || "RON").toUpperCase()}` : ""}</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1.5 font-bold text-[#ffcc00]">
                        <Coins className="h-4 w-4" /> +{h.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rewards" className="mt-6" data-testid="rewards-content">
              {(() => {
                const claims = rewards?.claims || [];
                const kindMeta = (k) => {
                  if (k === "plus_invite") return { icon: Crown, color: "#a855f7", label: "Invitație PLUS" };
                  if (k === "points") return { icon: Coins, color: "#ffcc00", label: "Puncte" };
                  return { icon: Gift, color: "#ec1c24", label: "Recompensă" };
                };
                const emptySlots = claims.length >= 6 ? 3 : 6 - claims.length;
                const copyCode = async (code) => {
                  try { await navigator.clipboard.writeText(code); toast.success("Cod copiat!"); }
                  catch { toast.error("Nu am putut copia codul"); }
                };
                return (
                  <>
                    <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                      <div>
                        <h3 className="font-display text-2xl">Recompensele mele</h3>
                        <p className="text-sm text-white/50">Codurile și premiile câștigate apar aici.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span data-testid="rewards-points" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141414] border border-white/10 font-bold">
                          <Coins className="h-4 w-4 text-[#ffcc00]" /> {rewards?.points ?? 0} <span className="text-white/50 font-normal">puncte</span>
                        </span>
                        <button data-testid="rewards-go-spin" onClick={() => navigate("/spin")} className="px-4 py-2 rounded-xl bg-[#ec1c24] font-bold text-sm hover:bg-[#ff2d36] transition-colors">
                          Câștigă mai multe
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {claims.map((c, i) => {
                        const m = kindMeta(c.kind);
                        const Icon = m.icon;
                        return (
                          <div key={c.id || i} data-testid="reward-card" className="rounded-2xl bg-[#141414] border border-white/10 p-5 flex flex-col">
                            <div className="flex items-center justify-between mb-3">
                              <span className="grid place-items-center h-11 w-11 rounded-xl shrink-0" style={{ backgroundColor: `${m.color}22`, color: m.color }}>
                                <Icon className="h-6 w-6" />
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                                style={{ backgroundColor: c.status === "fulfilled" ? "#22c55e22" : "#eab30822", color: c.status === "fulfilled" ? "#4ade80" : "#facc15" }}>
                                {c.status === "fulfilled" ? "Activ" : "În așteptare"}
                              </span>
                            </div>
                            <p className="font-bold leading-tight mb-1">{c.product_title || m.label}</p>
                            <p className="text-xs text-white/40 mb-3">{c.created_at ? new Date(c.created_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" }) : ""}</p>
                            {c.voucher_code ? (
                              <div className="mt-auto flex items-center gap-2">
                                <code className="flex-1 min-w-0 truncate px-3 py-2 rounded-lg bg-black/40 border border-[#ffcc00]/40 text-[#ffcc00] font-mono text-sm tracking-wider">{c.voucher_code}</code>
                                <button data-testid="reward-copy" onClick={() => copyCode(c.voucher_code)} className="h-9 w-9 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 transition shrink-0"><Copy className="h-4 w-4" /></button>
                              </div>
                            ) : (
                              <p className="mt-auto text-sm text-white/50">{c.points ? `+${c.points} puncte` : "Revendicată"}</p>
                            )}
                          </div>
                        );
                      })}

                      {Array.from({ length: emptySlots }).map((_, i) => (
                        <div key={`empty-${i}`} data-testid="reward-empty-slot" className="rounded-2xl border-2 border-dashed border-white/10 p-5 flex flex-col items-center justify-center text-center min-h-[168px]">
                          <span className="grid place-items-center h-11 w-11 rounded-xl bg-white/5 text-white/30 mb-3">
                            <Lock className="h-5 w-5" />
                          </span>
                          <p className="text-sm font-semibold text-white/40">Recompensă blocată</p>
                          <p className="text-xs text-white/25 mt-1">Câștigă recompense la roata norocului</p>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </TabsContent>

            <TabsContent value="cinema" className="mt-6" data-testid="cinema-tickets-content">
              {tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 flex items-center justify-center mb-5">
                    <Ticket className="h-9 w-9 text-[#ffcc00]" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Niciun bilet încă</h3>
                  <p className="text-white/50 max-w-sm">
                    Intră la <b>Cartoonix Cinema</b>, alege-ți un loc și primești un bilet suvenir aici, ca o amintire. 🎬
                  </p>
                  <button onClick={() => navigate("/cinema")} data-testid="cinema-go" className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200">
                    <Film className="h-4 w-4" /> Mergi la Cinema
                  </button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-5">
                  {tickets.map((t) => (
                    <div key={`${t.hall}-${t.date}-${t.code}`} data-testid={`cinema-ticket-${t.code}`} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1206] to-[#0f0f0f] border border-[#ffcc00]/40">
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-[#0a0a0a]" />
                      <div className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-[#0a0a0a]" />
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <img src="/cartoonix-logo.png" alt="Cartoonix" className="h-7" />
                          <span className="text-[10px] uppercase tracking-widest text-[#ffcc00] font-bold flex items-center gap-1"><Ticket className="h-3.5 w-3.5" /> Bilet Cinema</span>
                        </div>
                        <p className="font-display text-2xl leading-tight">{t.movie_title}</p>
                        <div className="border-t border-dashed border-white/15 my-3" />
                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                          <div><p className="text-white/40 text-xs">Sala</p><p className="font-semibold">{t.hall_name}</p></div>
                          <div><p className="text-white/40 text-xs">Data</p><p className="font-semibold">{new Date(t.date).toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" })}</p></div>
                          <div className="col-span-2"><p className="text-white/40 text-xs">Locul tău</p><p className="font-semibold text-[#ffcc00]">{t.seat_label}</p></div>
                        </div>
                        <div className="border-t border-dashed border-white/15 my-3" />
                        <p className="font-mono tracking-widest text-white/60 text-sm">{t.code}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="invoices" className="mt-6" data-testid="invoices-content">
              {!invoiceData || invoiceData.invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 flex items-center justify-center mb-5">
                    <FileText className="h-9 w-9 text-[#ffcc00]" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Nicio factură încă</h3>
                  <p className="text-white/50 max-w-sm">
                    Facturile pentru achizițiile tale (de ex. <b>Cartoonix PLUS</b>) vor apărea aici, gata de vizualizat și descărcat.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoiceData.invoices.map((inv) => (
                    <div key={inv.id} data-testid="invoice-row" className="flex items-center gap-4 p-4 rounded-2xl bg-[#141414] border border-white/10 hover:border-white/25 transition-colors">
                      <span className="grid place-items-center h-12 w-12 rounded-xl bg-[#ffcc00]/15 text-[#ffcc00] shrink-0">
                        <FileText className="h-6 w-6" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate">{inv.number}</p>
                        <p className="text-sm text-white/50 truncate">{inv.product} · {new Date(inv.date).toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" })}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold">{inv.amount.toFixed(2)} {inv.currency}</p>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#22c55e]">{inv.status}</span>
                      </div>
                      <button data-testid="invoice-view" onClick={() => setOpenInvoice(inv)} className="px-4 py-2 rounded-lg bg-[#ec1c24] text-white text-sm font-bold hover:bg-[#ff2d36] transition-colors shrink-0">
                        Vezi factura
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Invoice viewer modal */}
      {openInvoice && invoiceData && (
        <div className="fixed inset-0 z-[80] flex items-start md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto" data-testid="invoice-modal" onClick={() => setOpenInvoice(null)}>
          <div className="relative w-full max-w-2xl my-8 bg-white text-[#111] rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button data-testid="invoice-close" onClick={() => setOpenInvoice(null)} className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full bg-black/5 hover:bg-black/10 text-[#111] print:hidden">✕</button>
            <div id="invoice-print" className="p-8 md:p-10">
              <div className="flex items-start justify-between gap-4 mb-8">
                <div>
                  <img src="/cartoonix-logo.png" alt="Cartoonix" className="h-9 mb-2" />
                  <p className="text-xs text-gray-500">cartoonix.ro</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold tracking-tight">FACTURĂ</p>
                  <p className="text-sm text-gray-600">Seria {openInvoice.number}</p>
                  <p className="text-sm text-gray-600">Data: {new Date(openInvoice.date).toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" })}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Furnizor</p>
                  <p className="font-bold">{invoiceData.seller.name}</p>
                  <p className="text-sm text-gray-600">CUI: {invoiceData.seller.cui}</p>
                  <p className="text-sm text-gray-600">Nr. Reg. Com.: {invoiceData.seller.reg_com}</p>
                  <p className="text-sm text-gray-600">{invoiceData.seller.county}, {invoiceData.seller.city}</p>
                  <p className="text-sm text-gray-600">{invoiceData.seller.address}</p>
                </div>
                <div className="sm:text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Client</p>
                  <p className="font-bold">{invoiceData.buyer.name}</p>
                  <p className="text-sm text-gray-600">{invoiceData.buyer.email}</p>
                </div>
              </div>

              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-left text-gray-500">
                    <th className="py-2 font-semibold">Descriere</th>
                    <th className="py-2 font-semibold text-right">Cant.</th>
                    <th className="py-2 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-3">{openInvoice.description}</td>
                    <td className="py-3 text-right">1</td>
                    <td className="py-3 text-right font-semibold">{openInvoice.amount.toFixed(2)} {openInvoice.currency}</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-full sm:w-64 space-y-1">
                  <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{openInvoice.amount.toFixed(2)} {openInvoice.currency}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>TVA</span><span>Neplătitor de TVA</span></div>
                  <div className="flex justify-between text-lg font-extrabold border-t-2 border-gray-200 pt-2 mt-1"><span>Total</span><span>{openInvoice.amount.toFixed(2)} {openInvoice.currency}</span></div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-xs text-gray-400">Factură achitată integral. Mulțumim pentru susținere!</p>
                <span className="text-xs font-bold uppercase tracking-wider text-[#16a34a] border border-[#16a34a]/30 rounded px-2 py-1">{openInvoice.status}</span>
              </div>
            </div>
            <div className="px-8 md:px-10 pb-6 flex justify-end print:hidden">
              <button data-testid="invoice-print-btn" onClick={() => window.print()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#111] text-white font-bold hover:bg-black transition-colors">
                <Download className="h-4 w-4" /> Descarcă / Printează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
