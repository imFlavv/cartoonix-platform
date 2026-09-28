import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";
import { useLibrary } from "@/context/LibraryContext";
import { api } from "@/lib/api";
import { setQueue } from "@/lib/queue";
import { AVATAR_SEEDS } from "@/data/constants";
import { PlusIcon } from "@/components/PlusIcon";
import { Check, Play, Heart, Trash2, ListMusic, Film, Clock, Lock, KeyRound, Eye, EyeOff, User, Gift, PlayCircle, Ticket, FileText, Building2, Download, Crown, Copy, Plus, Award, MessageCircle, X } from "lucide-react";
import { NixCoin } from "@/components/NixCoin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rankInfo } from "@/lib/roles";
import { toast } from "sonner";

const formatTime = (sec) => {
  sec = Math.floor(sec || 0);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
};

// --- Envelope reveal chime (Web Audio, no asset files needed) ---
let _envCtx = null;
const _getEnvCtx = () => {
  if (typeof window === "undefined") return null;
  if (!_envCtx) { try { _envCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { _envCtx = null; } }
  if (_envCtx && _envCtx.state === "suspended") _envCtx.resume().catch(() => {});
  return _envCtx;
};
const playEnvelopeChime = () => {
  const ctx = _getEnvCtx(); if (!ctx) return;
  [420, 660, 880].forEach((freq, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime + i * 0.11;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.start(t); o.stop(t + 0.32);
  });
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
      <p className="font-semibold text-sm truncate">{item.show_title || "Titlu indisponibil"}</p>
      <p className="text-xs text-white/50 truncate">
        {item.episode_number === 0 ? "Serial complet" : item.episode_title} · {item.channel}
      </p>
    </div>
    {right}
  </div>
);

const Profile = () => {
  const { user, setUser, refreshUser } = useAuth();
  const { favorites, playlists, toggleFavorite, removeFavorite, deletePlaylist, togglePlaylistItem } = useLibrary();
  const navigate = useNavigate();
  const [avatar] = useState(user?.avatar || AVATAR_SEEDS[0]);
  const [wallet, setWallet] = useState({ points: user?.points ?? 0, history: [] });
  const [tickets, setTickets] = useState([]);
  const [invoiceData, setInvoiceData] = useState(null);
  const [openInvoice, setOpenInvoice] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [chatCount, setChatCount] = useState(null);
  const [hwInv, setHwInv] = useState(null);
  const [invModal, setInvModal] = useState(null);
  const [invStage, setInvStage] = useState("sealed"); // sealed | opening | opened
  const [invBusy, setInvBusy] = useState(false);
  const [avatarModal, setAvatarModal] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const fetchRewards = () => api.get("/rewards").then((res) => setRewards(res.data)).catch(() => {});

  const openEnvelope = () => {
    playEnvelopeChime();
    setInvStage("opening");
    setTimeout(() => setInvStage("opened"), 850);
  };

  const claimAvatar = async (claimId) => {
    setAvatarBusy(true);
    try {
      await api.post("/rewards/claim-avatar", { claim_id: claimId });
      toast.success("Avatar deblocat! Îl găsești în Setări → Personalizare 🎃");
      setAvatarModal((m) => (m ? { ...m, unlocked: true } : m));
      await Promise.all([fetchRewards(), refreshUser().catch(() => {})]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Nu am putut debloca avatarul");
    } finally {
      setAvatarBusy(false);
    }
  };

  const copyInvCode = async (code) => {
    try { await navigator.clipboard.writeText(code); toast.success("Cod copiat! Trimite-l cui dorești."); }
    catch { toast.error("Nu am putut copia codul"); }
  };

  const redeemInvite = async (code) => {
    setInvBusy(true);
    try {
      const { data } = await api.post("/rewards/redeem-code", { code });
      toast.success(data?.plus ? "Felicitări! Ai acum acces Cartoonix PLUS 👑" : "Cod revendicat!");
      setInvModal(null);
      await Promise.all([fetchRewards(), refreshUser().catch(() => {})]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Nu am putut revendica codul");
    } finally {
      setInvBusy(false);
    }
  };

  useEffect(() => {
    refreshUser().catch(() => {});
    api.get("/points/me").then((res) => setWallet(res.data)).catch(() => {});
    api.get("/cinema/tickets").then((res) => setTickets(res.data || [])).catch(() => {});
    api.get("/invoices").then((res) => setInvoiceData(res.data)).catch(() => {});
    fetchRewards();
    api.get("/chat/stats").then((res) => setChatCount(res.data?.my_count ?? 0)).catch(() => {});
    api.get("/halloween/status").then((res) => setHwInv(res.data?.enabled ? res.data : null)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rank = rankInfo(chatCount || 0);

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

          {/* Rank / nivel pe chat — în zona de statistici */}
          <div data-testid="profile-rank" className="relative max-w-5xl mx-auto mt-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-4 md:p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-[#ffcc00]/15 border border-[#ffcc00]/40 flex items-center justify-center shrink-0">
                <Award className="h-5 w-5 text-[#ffcc00]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-white/40 leading-none">Rangul tău</p>
                <h3 className="font-display text-xl md:text-2xl leading-tight">{rank.title}</h3>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-xl text-[#ffcc00] flex items-center gap-1.5 justify-end">
                  <MessageCircle className="h-4 w-4" /> {(chatCount ?? 0).toLocaleString("ro-RO")}
                </p>
                <p className="text-[11px] text-white/50 leading-none">mesaje pe chat</p>
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#ffcc00] to-[#ff8a00] transition-all duration-500" style={{ width: `${rank.progress}%` }} />
            </div>
            <p className="text-xs text-white/50 mt-2">
              {rank.isMax
                ? "Ai atins rangul maxim — o adevărată Legendă Cartoonix! 🏆"
                : <>Încă <span className="text-white font-bold">{rank.remaining.toLocaleString("ro-RO")}</span> mesaje până la <span className="text-[#ffcc00] font-semibold">{rank.nextTitle}</span></>}
            </p>
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
                <NixCoin className="h-4 w-4 mr-2" /> Wallet
              </TabsTrigger>
              <TabsTrigger value="rewards" data-testid="tab-rewards" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
                <Gift className="h-4 w-4 mr-2" /> Inventar
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
                          <button data-testid={`remove-fav-${f.id}`} onClick={() => removeFavorite(f)} title="Scoate de la favorite" className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors duration-200">
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

              {/* -------- Change password -------- */}
              <div className="max-w-lg">
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
                <p className="text-sm uppercase tracking-widest text-[#c084fc] font-bold mb-2">NIX-urile mele</p>
                <div className="flex items-center gap-3">
                  <NixCoin className="h-10 w-10" />
                  <span data-testid="wallet-points" className="font-display text-5xl">{wallet.points}</span>
                  <span className="text-white/50 text-lg self-end mb-1">NIX</span>
                </div>
                <button
                  data-testid="wallet-donate-cta"
                  onClick={() => navigate("/doneaza")}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200"
                >
                  <Heart className="h-4 w-4" /> Donează pentru mai mulți NIX
                </button>
              </div>

              <h3 className="font-display text-2xl mb-3">Istoric donații</h3>
              {(!wallet.history || wallet.history.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-14 text-center text-white/50">
                  <NixCoin className="h-10 w-10 opacity-40 mb-3" />
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
                      <span className="flex items-center gap-1.5 font-bold text-[#c084fc]">
                        <NixCoin className="h-4 w-4" /> +{h.points}
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
                  if (k === "points") return { icon: NixCoin, color: "#c084fc", label: "NIX" };
                  return { icon: Gift, color: "#ec1c24", label: "Recompensă" };
                };
                const pumpkinItems = [];
                if (hwInv?.pumpkins > 0) pumpkinItems.push({ key: "pk-normal", img: "/halloween/pumpkin-normal.png", label: "Dovleci", count: hwInv.pumpkins });
                if (hwInv?.carved > 0) pumpkinItems.push({ key: "pk-carved", img: "/halloween/pumpkin-carved.png", label: "Dovleci sculptați", count: hwInv.carved });
                const occupied = pumpkinItems.length + claims.length;
                const emptySlots = occupied >= 6 ? 3 : 6 - occupied;
                const copyCode = async (code) => {
                  try { await navigator.clipboard.writeText(code); toast.success("Cod copiat!"); }
                  catch { toast.error("Nu am putut copia codul"); }
                };
                return (
                  <>
                    <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                      <div>
                        <h3 className="font-display text-2xl">Inventarul meu</h3>
                        <p className="text-sm text-white/50">Codurile și premiile câștigate apar aici.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span data-testid="rewards-points" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141414] border border-white/10 font-bold">
                          <NixCoin className="h-4 w-4" /> {rewards?.points ?? 0} <span className="text-white/50 font-normal">NIX</span>
                        </span>
                        {hwInv && (
                          <button data-testid="hw-go-event" onClick={() => navigate("/land")} className="px-4 py-2 rounded-xl bg-[#ff7a18] text-black font-bold text-sm hover:brightness-110 transition-colors">
                            🎃 Mergi la eveniment
                          </button>
                        )}
                        <button data-testid="rewards-go-spin" onClick={() => navigate("/spin")} className="px-4 py-2 rounded-xl bg-[#ec1c24] font-bold text-sm hover:bg-[#ff2d36] transition-colors">
                          Câștigă mai multe
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {pumpkinItems.map((p) => (
                        <div key={p.key} data-testid={`hw-slot-${p.key}`} className="relative rounded-2xl bg-[#141414] border border-[#ff7a18]/40 p-5 flex flex-col items-center justify-center min-h-[168px]">
                          {p.count > 1 && (
                            <span data-testid={`hw-count-${p.key}`} className="absolute top-3 right-3 min-w-[28px] h-7 px-2 grid place-items-center rounded-lg bg-[#ff7a18] text-black font-display text-sm leading-none">
                              ×{p.count}
                            </span>
                          )}
                          <img src={p.img} alt={p.label} className="h-16 w-16 object-contain mb-2" />
                          <p className="font-bold text-sm text-center">{p.label}</p>
                          <p className="text-xs text-white/50">{p.count} în total</p>
                        </div>
                      ))}
                      {claims.map((c, i) => {
                        if (c.kind === "avatar_unlock" && c.avatar_path) {
                          return (
                            <button
                              key={c.id || i}
                              data-testid="reward-card-avatar"
                              onClick={() => setAvatarModal(c)}
                              className="relative rounded-2xl bg-[#141414] border border-[#a855f7]/40 p-5 flex flex-col items-center justify-center min-h-[168px] text-center hover:border-[#a855f7] hover:bg-[#a855f7]/5 transition-colors"
                            >
                              {c.unlocked && (
                                <span className="absolute top-3 right-3 h-6 w-6 rounded-full bg-[#22c55e] grid place-items-center">
                                  <Check className="h-3.5 w-3.5 text-black" />
                                </span>
                              )}
                              <img src={c.avatar_path} alt="Avatar Halloween Special" className="h-16 w-16 rounded-xl object-cover mb-2" />
                              <p className="font-bold text-sm">Avatar Halloween</p>
                              <p className="text-xs text-[#c084fc]">{c.unlocked ? "Deblocat" : "Apasă pentru REVENDICĂ"}</p>
                            </button>
                          );
                        }
                        if (c.kind === "plus_invite" && c.voucher_code) {
                          return (
                            <button
                              key={c.id || i}
                              data-testid="reward-card-invite"
                              onClick={() => { setInvModal(c); setInvStage("sealed"); }}
                              className="relative rounded-2xl bg-[#141414] border border-[#a855f7]/40 p-5 flex flex-col items-center justify-center min-h-[168px] text-center hover:border-[#a855f7] hover:bg-[#a855f7]/5 transition-colors"
                            >
                              <img src="/nix/scroll.png" alt="Invitație PLUS" className="h-16 w-16 object-contain mb-2" />
                              <p className="font-bold text-sm">Invitație PLUS</p>
                              <p className="text-xs text-[#c084fc]">Apasă pentru cod</p>
                            </button>
                          );
                        }
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
                              <p className="mt-auto text-sm text-white/50">{c.points ? `+${c.points} NIX` : "Revendicată"}</p>
                            )}
                          </div>
                        );
                      })}

                      {Array.from({ length: emptySlots }).map((_, i) => (
                        <div key={`empty-${i}`} data-testid="reward-empty-slot" className="rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center min-h-[168px]">
                          <Plus className="h-8 w-8 text-white/20" />
                        </div>
                      ))}
                    </div>

                    {invModal && (
                      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" data-testid="invite-modal" onClick={() => setInvModal(null)}>
                        <div className="relative w-full max-w-sm bg-[#141414] border border-[#a855f7]/40 rounded-3xl p-8 text-center shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setInvModal(null)} data-testid="invite-modal-close" className="absolute top-4 right-4 text-white/40 hover:text-white z-10"><X className="h-5 w-5" /></button>

                          {invStage !== "opened" ? (
                            <button
                              data-testid="invite-envelope-open"
                              onClick={invStage === "sealed" ? openEnvelope : undefined}
                              disabled={invStage === "opening"}
                              className="w-full flex flex-col items-center py-4 cursor-pointer"
                            >
                              <div className={`relative h-24 w-24 mb-4 grid place-items-center ${invStage === "opening" ? "cx-env-shake" : ""}`}>
                                {invStage === "opening" && (
                                  <span className="absolute inset-0 rounded-full bg-[#a855f7]/60 cx-env-burst" />
                                )}
                                <img
                                  src="/nix/scroll.png"
                                  alt="Invitație PLUS"
                                  className={`relative h-24 w-24 object-contain drop-shadow-[0_0_18px_rgba(168,85,247,0.5)] ${invStage === "sealed" ? "cx-env-idle" : "cx-env-scroll-out"}`}
                                />
                              </div>
                              <h2 className="font-display text-2xl mb-1">Ai o invitație Cartoonix PLUS!</h2>
                              <p className="text-white/50 text-sm">
                                {invStage === "sealed" ? "Apasă plicul pentru a-l deschide" : "Se deschide..."}
                              </p>
                            </button>
                          ) : (
                            <div className="cx-env-content-in">
                              <img src="/nix/scroll.png" alt="Invitație PLUS" className="mx-auto h-20 w-20 object-contain mb-3 drop-shadow-[0_0_18px_rgba(168,85,247,0.5)]" />
                              <h2 className="font-display text-2xl mb-1">Invitație Cartoonix PLUS</h2>
                              <p className="text-white/50 text-sm mb-5">Trimite acest cod cui dorești sau revendică-l pe contul tău.</p>
                              <div className="flex items-center gap-2 mb-5">
                                <code data-testid="invite-code" className="flex-1 min-w-0 truncate px-4 py-2.5 rounded-lg bg-black/40 border border-[#a855f7]/40 text-[#c084fc] font-mono tracking-widest">{invModal.voucher_code}</code>
                                <button data-testid="invite-copy" onClick={() => copyInvCode(invModal.voucher_code)} className="h-11 w-11 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 transition shrink-0"><Copy className="h-4 w-4" /></button>
                              </div>
                              {rewards?.plus ? (
                                <p className="text-xs text-white/40">Ai deja acces PLUS — poți dărui acest cod altcuiva.</p>
                              ) : (
                                <button
                                  data-testid="invite-redeem"
                                  onClick={() => redeemInvite(invModal.voucher_code)}
                                  disabled={invBusy}
                                  className="w-full py-3 rounded-xl bg-[#a855f7] text-white font-bold hover:bg-[#9333ea] transition-colors disabled:opacity-50"
                                >
                                  {invBusy ? "Se revendică..." : "Revendică pe contul meu"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {avatarModal && (
                      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" data-testid="avatar-modal" onClick={() => setAvatarModal(null)}>
                        <div className="relative w-full max-w-sm bg-[#141414] border border-[#a855f7]/40 rounded-3xl p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setAvatarModal(null)} data-testid="avatar-modal-close" className="absolute top-4 right-4 text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
                          <img src={avatarModal.avatar_path} alt="Avatar Halloween Special" className="mx-auto h-24 w-24 rounded-2xl object-cover mb-4 drop-shadow-[0_0_18px_rgba(168,85,247,0.5)]" />
                          <h2 className="font-display text-2xl mb-1">Avatar Halloween Special</h2>
                          <p className="text-white/50 text-sm mb-5">Un avatar exclusiv câștigat la Cutia Misterioasă. Revendică-l ca să apară în Setări → Personalizare.</p>
                          {avatarModal.unlocked ? (
                            <button data-testid="avatar-go-settings" onClick={() => navigate("/settings")} className="w-full py-3 rounded-xl bg-[#22c55e] text-black font-bold hover:brightness-110 transition-colors">
                              Deblocat — vezi în Setări
                            </button>
                          ) : (
                            <button
                              data-testid="avatar-claim"
                              onClick={() => claimAvatar(avatarModal.id)}
                              disabled={avatarBusy}
                              className="w-full py-3 rounded-xl bg-[#a855f7] text-white font-bold hover:bg-[#9333ea] transition-colors disabled:opacity-50"
                            >
                              {avatarBusy ? "Se revendică..." : "REVENDICĂ"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
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
