import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  Heart,
  History as HistoryIcon,
  ListMusic,
  Lock,
  ChevronRight,
  Play,
  Trash2,
  Crown,
  Clock,
  Calendar,
  Award,
  ImagePlus,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import UserBadges from "@/components/UserBadges";
import InboxPanel from "@/components/InboxPanel";
import CreateWatchPartyButton from "@/components/watchparty/CreateWatchPartyButton";
import {
  RANKS,
  getRank,
  getNextRank,
  formatOnline,
  formatMemberSince,
} from "@/lib/ranks";

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function SectionCard({ icon: Icon, title, action, children, className = "", testid }) {
  return (
    <div
      data-testid={testid}
      className={`relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--accent))]/12 text-[hsl(var(--accent))] ring-1 ring-[hsl(var(--accent))]/25">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <h3 className="font-display text-lg tracking-wider text-white">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, testid }) {
  return (
    <div
      data-testid={testid}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition-colors hover:bg-white/[0.04]"
    >
      <div className="pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full bg-[hsl(var(--accent))]/[0.08] blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[hsl(var(--accent))]/12 text-[hsl(var(--accent))] ring-1 ring-[hsl(var(--accent))]/25">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">{label}</div>
          <div className="mt-0.5 font-display text-2xl leading-none tracking-wider text-white">{value}</div>
        </div>
      </div>
      {sub && <div className="relative mt-3 text-[11px] text-white/45">{sub}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rank card                                                           */
/* ------------------------------------------------------------------ */

function RankCard({ level, className = "" }) {
  const rank = getRank(level);
  const next = getNextRank(level);
  const pct = Math.round((rank.level / RANKS.length) * 100);

  return (
    <div
      data-testid="profile-rank-card"
      className={`relative overflow-hidden rounded-3xl border border-white/[0.08] p-6 sm:p-7 ${className}`}
      style={{
        background: `radial-gradient(120% 120% at 0% 0%, rgba(${rank.glow},0.16), transparent 55%), linear-gradient(135deg, rgba(255,255,255,0.04), transparent)`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
        style={{ background: `rgba(${rank.glow},0.22)` }}
      />

      <div className="relative flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">Rank-ul meu</div>
        <div className="text-[11px] font-semibold tabular-nums text-white/55">
          Nivel {rank.level} / {RANKS.length}
        </div>
      </div>

      <div className="relative mt-5 flex items-center gap-4">
        <div
          className="relative grid h-20 w-20 shrink-0 place-items-center rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${rank.color}, rgba(${rank.glow},0.25))`,
            boxShadow: `0 10px 30px rgba(${rank.glow},0.45)`,
          }}
        >
          <Crown className="h-9 w-9 text-black/80" fill="currentColor" />
          <span className="absolute -bottom-2 -right-2 grid h-7 w-7 place-items-center rounded-full bg-[#0c0c10] text-xs font-black tabular-nums text-white ring-2 ring-white/10">
            {rank.level}
          </span>
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-3xl tracking-wider text-white" style={{ color: rank.color }}>
            {rank.name}
          </h2>
          <p className="mt-1 text-sm text-white/60">{rank.tagline}</p>
        </div>
      </div>

      {/* Ladder */}
      <div className="relative mt-6">
        <div className="flex items-end gap-1.5">
          {RANKS.map((r) => {
            const reached = rank.level >= r.level;
            const current = rank.level === r.level;
            return (
              <div key={r.level} className="group/seg flex-1" title={`${r.name} · Nivel ${r.level}`}>
                <div
                  className="rounded-full transition-all"
                  style={{
                    height: current ? 12 : 8,
                    background: reached ? r.color : "rgba(255,255,255,0.08)",
                    boxShadow: current ? `0 0 12px rgba(${r.glow},0.8)` : "none",
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px]">
          <span className="text-white/45">Progres rank · {pct}%</span>
          {next ? (
            <span className="font-semibold text-white/70">
              Următorul: <span style={{ color: next.color }}>{next.name}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: rank.color }}>
              <Sparkles className="h-3.5 w-3.5" /> Rank maxim atins!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badges card (coming soon)                                           */
/* ------------------------------------------------------------------ */

function BadgesCard({ className = "" }) {
  const placeholders = [
    { icon: Heart, label: "Fan devotat" },
    { icon: Clock, label: "Maraton" },
    { icon: ListMusic, label: "Colecționar" },
    { icon: ShieldCheck, label: "Veteran" },
    { icon: Crown, label: "VIP" },
    { icon: Sparkles, label: "Pionier" },
  ];
  return (
    <SectionCard
      icon={Award}
      title="Insignele mele"
      testid="profile-badges-card"
      className={className}
      action={
        <span className="rounded-full bg-[hsl(var(--accent))]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--accent))] ring-1 ring-[hsl(var(--accent))]/30">
          În curând
        </span>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        {placeholders.map((b, i) => (
          <div
            key={i}
            className="relative flex flex-col items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center"
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-white/[0.04] text-white/25 ring-1 ring-white/10">
              <b.icon className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-medium text-white/30">{b.label}</span>
            <span className="absolute right-2 top-2 text-white/20">
              <Lock className="h-3 w-3" />
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-white/40">
        Vei debloca insigne pe măsură ce explorezi platforma. Revino curând!
      </p>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ProfilePage() {
  const { user, loading, updateMe } = useAuth();
  const navigate = useNavigate();
  const [favs, setFavs] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 10;
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[hsl(var(--accent))]" />
        </div>
      </PublicLayout>
    );
  }

  if (!user) return null;

  const isPlus = user.subscription === "plus";
  const isAdmin = user.role === "admin";
  const canUsePlusAvatars = isPlus || isAdmin;
  const rank = getRank(user.level);
  const ownedCount = avatars.filter((a) => canUsePlusAvatars || a.tier !== "plus").length;

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

  const onAvatarChange = async (a) => {
    const locked = a.tier === "plus" && !canUsePlusAvatars;
    if (locked) {
      toast.error("Acest avatar este disponibil doar pentru membrii Cartoonix PLUS.");
      return;
    }
    try {
      await updateMe({ avatar_url: a.url });
      toast.success("Avatar actualizat");
    } catch {
      toast.error("Nu am putut actualiza avatarul");
    }
  };

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* ============ HERO HEADER ============ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] p-6 sm:p-8"
          style={{
            background: `radial-gradient(130% 130% at 100% 0%, rgba(${rank.glow},0.14), transparent 50%), linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02) 40%, transparent)`,
          }}
        >
          <div className="pointer-events-none absolute inset-0 noise-overlay opacity-50" />
          <div
            className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full blur-3xl"
            style={{ background: `rgba(${rank.glow},0.16)` }}
          />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            {/* Avatar with rank ring + crown */}
            <div className="relative shrink-0 self-start sm:self-auto">
              <div
                className="rounded-[1.5rem] p-[3px]"
                style={{ background: `linear-gradient(135deg, ${rank.color}, rgba(${rank.glow},0.15))` }}
              >
                <img
                  src={mediaUrl(user.avatar_url)}
                  alt=""
                  className="h-24 w-24 rounded-[1.3rem] object-cover sm:h-28 sm:w-28"
                />
              </div>
              <div
                className="absolute -top-3 left-1/2 grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full ring-2 ring-[#0c0c10]"
                style={{ background: rank.color, boxShadow: `0 6px 18px rgba(${rank.glow},0.6)` }}
                title={`${rank.name} · Nivel ${rank.level}`}
              >
                <Crown className="h-4 w-4 text-black/80" fill="currentColor" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Profilul meu</div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl tracking-wider text-white sm:text-4xl">{user.nickname}</h1>
                <UserBadges isPlus={isPlus} isAdmin={isAdmin} size={28} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* Rank pill */}
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                  style={{
                    color: rank.color,
                    background: `rgba(${rank.glow},0.12)`,
                    boxShadow: `inset 0 0 0 1px rgba(${rank.glow},0.3)`,
                  }}
                >
                  <Crown className="h-3.5 w-3.5" fill="currentColor" /> {rank.name} · Nivel {rank.level}
                </span>

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

              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/45">
                <Calendar className="h-3.5 w-3.5" /> Membru din {formatMemberSince(user.created_at)}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============ WATCH PARTY ============ */}
        {(isPlus || isAdmin) && <CreateWatchPartyButton variant="card" />}

        {/* ============ STATS ============ */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={Clock}
            label="Timp Online"
            value={formatOnline(user.presence_seconds)}
            sub="Timp petrecut pe Cartoonix"
            testid="profile-stat-online"
          />
          <StatCard icon={Heart} label="Favorite" value={favs.length} testid="profile-stat-favorites" />
          <StatCard icon={HistoryIcon} label="În istoric" value={history.length} testid="profile-stat-history" />
          <StatCard
            icon={ListMusic}
            label="Playlist-uri"
            value={isPlus ? playlists.length : 0}
            testid="profile-stat-playlists"
          />
        </div>

        {/* ============ RANK + BADGES ============ */}
        <div className="grid gap-5 lg:grid-cols-3">
          <RankCard level={user.level} className="lg:col-span-2" />
          <BadgesCard className="lg:col-span-1" />
        </div>

        {/* ============ ACTIVITY + INBOX ============ */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Activity */}
          <SectionCard
            icon={HistoryIcon}
            title="Activitatea mea"
            className="lg:col-span-2"
            testid="profile-activity-card"
          >
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="rounded-xl border border-white/[0.06] bg-white/[0.03]">
                <TabsTrigger value="history" data-testid="dashboard-tab-history">
                  <HistoryIcon className="mr-2 h-4 w-4" /> Istoric
                </TabsTrigger>
                <TabsTrigger value="favorites" data-testid="dashboard-tab-favorites">
                  <Heart className="mr-2 h-4 w-4" /> Favorite
                </TabsTrigger>
                <TabsTrigger value="playlists" data-testid="dashboard-tab-playlists">
                  <ListMusic className="mr-2 h-4 w-4" /> Playlist-uri {!isPlus && <Lock className="ml-1 h-3 w-3" />}
                </TabsTrigger>
              </TabsList>

              {/* HISTORY */}
              <TabsContent value="history" className="mt-5">
                {history.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-muted-foreground">
                    Nu ai istoric încă. Pornește un desen!
                  </div>
                ) : (
                  (() => {
                    const totalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
                    const safePage = Math.min(historyPage, totalPages);
                    const start = (safePage - 1) * HISTORY_PAGE_SIZE;
                    const slice = history.slice(start, start + HISTORY_PAGE_SIZE);
                    return (
                      <>
                        <div className="space-y-2">
                          {slice.map((h) => (
                            <Link
                              key={h.episode_id}
                              to={`/cartoon/${h.cartoon_id}`}
                              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.05]"
                            >
                              <div className="grid h-12 w-20 place-items-center overflow-hidden rounded-md bg-white/[0.04] text-xs">
                                {h.cartoon?.thumbnail_url ? (
                                  <img src={mediaUrl(h.cartoon.thumbnail_url)} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-muted-foreground">{h.cartoon?.title?.slice(0, 2) || "—"}</span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{h.cartoon?.title || "Necunoscut"}</div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {h.episode?.title} · S{h.episode?.season} E{h.episode?.episode_number}
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                          ))}
                        </div>
                        {totalPages > 1 && (
                          <div
                            data-testid="history-pagination"
                            className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                          >
                            <span className="text-[12px] tabular-nums text-muted-foreground">
                              Pagina {safePage} din {totalPages} · {history.length} total
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                data-testid="history-page-prev"
                                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                                disabled={safePage <= 1}
                                className="rounded-md border border-white/10 px-3 py-1.5 text-[12px] font-medium text-white/80 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                ← Anterior
                              </button>
                              <button
                                type="button"
                                data-testid="history-page-next"
                                onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                                disabled={safePage >= totalPages}
                                className="rounded-md border border-white/10 px-3 py-1.5 text-[12px] font-medium text-white/80 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Următor →
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </TabsContent>

              {/* FAVORITES */}
              <TabsContent value="favorites" className="mt-5">
                {favs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-muted-foreground">
                    Niciun favorit încă. Apasă inimioara de pe un desen pentru a-l salva.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {favs.map((c) => (
                      <Link
                        key={c.id}
                        to={`/cartoon/${c.id}`}
                        className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.05]"
                      >
                        <div className="grid aspect-[16/10] place-items-center overflow-hidden rounded-lg bg-white/[0.04]">
                          {c.thumbnail_url ? (
                            <img src={mediaUrl(c.thumbnail_url)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="font-display text-2xl tracking-wider opacity-70">{c.title.slice(0, 8)}</span>
                          )}
                        </div>
                        <div className="mt-2 truncate font-medium">{c.title}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* PLAYLISTS */}
              <TabsContent value="playlists" className="mt-5">
                {!isPlus ? (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
                    <Lock className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <h3 className="font-display text-xl tracking-wider">Playlist-urile sunt o funcție Plus</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Disponibile pentru membrii Cartoonix Plus.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newPlaylist}
                        onChange={(e) => setNewPlaylist(e.target.value)}
                        placeholder="Nume playlist nou"
                        data-testid="playlist-name-input"
                        className="h-11 rounded-xl"
                      />
                      <Button onClick={createPlaylist} className="h-11 rounded-xl" data-testid="playlist-create-button">
                        Creează
                      </Button>
                    </div>
                    {playlists.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-muted-foreground">
                        Niciun playlist încă.
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {playlists.map((p) => {
                          const epCount = (p.items || []).length;
                          return (
                            <div
                              key={p.id}
                              className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                              data-testid="playlist-item"
                            >
                              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))] ring-1 ring-[hsl(var(--accent))]/30">
                                <ListMusic className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{p.name}</div>
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
                                <Play className="mr-1 h-4 w-4" /> Redă
                              </Button>
                              <button
                                onClick={() => deletePlaylist(p.id)}
                                className="grid h-8 w-8 place-items-center rounded-md text-white/60 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
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
            </Tabs>
          </SectionCard>

          {/* Inbox */}
          <SectionCard icon={Mail} title="Inbox" className="lg:col-span-1" testid="profile-inbox-card">
            <InboxPanel open />
          </SectionCard>
        </div>

        {/* ============ AVATAR LIBRARY ============ */}
        <SectionCard
          icon={ImagePlus}
          title="Avatarele mele"
          testid="profile-avatar-library"
          action={
            <span className="text-[11px] font-semibold text-white/50">
              {ownedCount} {ownedCount === 1 ? "avatar deținut" : "avatare deținute"}
            </span>
          }
        >
          <p className="-mt-1 mb-4 text-xs text-white/45">
            Alege-ți avatarul din librăria ta. Avatarele marcate cu lacăt sunt rezervate membrilor PLUS.
          </p>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-9">
            {avatars.map((a) => {
              const selected = user.avatar_url === a.url;
              const locked = a.tier === "plus" && !canUsePlusAvatars;
              return (
                <button
                  key={a.slug}
                  onClick={() => onAvatarChange(a)}
                  data-testid="settings-avatar-option"
                  title={locked ? "Avatar PLUS" : selected ? "Avatar curent" : "Alege acest avatar"}
                  className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                    selected
                      ? "border-[hsl(var(--accent))] ring-2 ring-[hsl(var(--accent))]/40"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <img
                    src={mediaUrl(a.url)}
                    alt=""
                    className={`h-full w-full object-cover transition-transform group-hover:scale-105 ${
                      locked ? "opacity-40 grayscale" : ""
                    }`}
                  />
                  {locked && (
                    <span className="absolute inset-0 grid place-items-center bg-black/30">
                      <Lock className="h-4 w-4 text-white/80" />
                    </span>
                  )}
                  {a.tier === "plus" && (
                    <span className="absolute right-1 top-1 rounded bg-[hsl(var(--accent))] px-1 py-px text-[8px] font-black uppercase tracking-wide text-black">
                      Plus
                    </span>
                  )}
                  {selected && (
                    <span className="absolute bottom-1 left-1 grid h-4 w-4 place-items-center rounded-full bg-[hsl(var(--accent))] text-black">
                      <Crown className="h-2.5 w-2.5" fill="currentColor" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-white/55">Email</label>
              <Input value={user.email} disabled className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-medium text-white/55">Pseudonim</label>
              <Input value={user.nickname} disabled className="mt-1 h-11 rounded-xl" />
            </div>
          </div>
        </SectionCard>
      </section>
    </PublicLayout>
  );
}
