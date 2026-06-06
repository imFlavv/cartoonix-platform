import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import LobbyChat from "@/components/lobby/LobbyChat";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import {
  Users,
  Tv,
  Trophy,
  BarChart3,
  Sparkles,
  Lightbulb,
  RefreshCcw,
  Loader2,
  Check,
  Clock,
  Lock,
} from "lucide-react";
import UserBadges from "@/components/UserBadges";
import { toast } from "sonner";

/**
 * /lobby — community hub.
 *
 * Layout (desktop):  [ left sidebar (online + top fans) | chat (centre) | right sidebar (next live, poll, winners, recommendation, suggestion) ]
 * Stacks gracefully on tablet / mobile.
 *
 * Each side panel fetches independently and is memoised — the chat column
 * re-renders on every new message without touching the surrounding cards.
 */

function SectionCard({ icon: Icon, title, action, children, tone = "default", testId }) {
  const accents = {
    default: "from-white/[0.04] to-white/[0.01]",
    warm: "from-rose-500/[0.07] to-amber-400/[0.04]",
    cool: "from-sky-500/[0.07] to-emerald-400/[0.04]",
  };
  return (
    <section
      data-testid={testId}
      className={`rounded-2xl border border-white/[0.06] bg-gradient-to-b ${accents[tone] || accents.default} backdrop-blur-sm overflow-hidden`}
    >
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2 text-white/90">
          {Icon && <Icon className="h-4 w-4 text-[hsl(var(--accent))]" strokeWidth={2.2} />}
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.18em]">{title}</h3>
        </div>
        {action}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

function Avatar({ src, name, plan, role, size = 32 }) {
  const initials = (name || "?").slice(0, 2).toUpperCase();
  return (
    <div className="shrink-0">
      <div
        className="rounded-full overflow-hidden bg-gradient-to-br from-rose-600/50 to-amber-400/40 grid place-items-center text-[11px] font-bold text-white/90"
        style={{ height: size, width: size }}
      >
        {src ? (
          <img src={mediaUrl(src)} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
    </div>
  );
}

function NickWithBadge({ nickname, plan, role, className = "", size = 14 }) {
  return (
    <span className={`inline-flex items-center gap-1 min-w-0 ${className}`}>
      <span className="truncate">{nickname || "anonim"}</span>
      {role === "admin" ? (
        <UserBadges isAdmin size={size} />
      ) : plan === "plus" ? (
        <UserBadges isPlus size={size} />
      ) : null}
    </span>
  );
}

// ---------- Online sidebar ----------
function OnlinePanel() {
  const [data, setData] = useState({ items: [], total: 0 });
  useEffect(() => {
    let alive = true;
    const fetchOnce = async () => {
      try {
        const { data } = await api.get("/lobby/online?limit=20");
        if (alive) setData(data || { items: [], total: 0 });
      } catch (_) { /* noop */ }
    };
    fetchOnce();
    // 45s cadence – matches the global presence widget so we don't add load
    const t = setInterval(fetchOnce, 45_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return (
    <SectionCard
      icon={Users}
      title={`Cine e online · ${data.total || 0}`}
      testId="lobby-online-panel"
    >
      {data.items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Nimeni încă. Spune ceva în chat ca să dai startul.</p>
      ) : (
        <ul className="cartoonix-scroll space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {data.items.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-white/[0.03]"
            >
              <Avatar src={u.avatar_url} name={u.nickname} plan={u.plan} size={28} />
              <NickWithBadge
                nickname={u.nickname}
                plan={u.plan}
                role={u.role}
                size={14}
                className="text-[13px] font-medium text-white/90"
              />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

// ---------- Top time online (cumulative platform time) ----------
function TopOnlinePanel() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let alive = true;
    api
      .get("/lobby/top-online?limit=5")
      .then(({ data }) => {
        if (alive) setItems(data.items || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (items.length === 0) return null;
  const fmt = (s) => {
    s = Math.max(0, Number(s) || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };
  return (
    <SectionCard icon={Clock} title="Top timp online" testId="lobby-toponline-panel" tone="cool">
      <ol className="space-y-1.5">
        {items.map((f, i) => (
          <li key={f.user_id} className="flex items-center gap-2.5">
            <span className="shrink-0 h-5 w-5 grid place-items-center rounded-full bg-white/5 text-[10px] font-bold tabular-nums">
              {i + 1}
            </span>
            <Avatar src={f.avatar_url} name={f.nickname} plan={f.plan} size={24} />
            <NickWithBadge
              nickname={f.nickname}
              plan={f.plan}
              role={f.role}
              size={12}
              className="flex-1 text-[13px] text-white/90 font-medium"
            />
            <span className="text-[11px] tabular-nums text-muted-foreground">{fmt(f.seconds)}</span>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

// ---------- Top fans ----------
function TopFansPanel() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/lobby/top-fans?limit=5");
        if (alive) setItems(data.items || []);
      } catch (_) { /* noop */ }
    })();
  }, []);
  return (
    <SectionCard icon={BarChart3} title="Top fani · 24h" testId="lobby-topfans-panel" tone="warm">
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Nu sunt date suficiente azi.</p>
      ) : (
        <ol className="space-y-1.5">
          {items.map((f, i) => (
            <li key={f.user_id} className="flex items-center gap-2.5">
              <span className="shrink-0 h-5 w-5 grid place-items-center rounded-full bg-white/5 text-[10px] font-bold tabular-nums">
                {i + 1}
              </span>
              <Avatar src={f.avatar_url} name={f.nickname} plan={f.plan} size={24} />
              <NickWithBadge
                nickname={f.nickname}
                plan={f.plan}
                role={f.role}
                size={12}
                className="flex-1 text-[13px] text-white/90 font-medium"
              />
              <span className="text-[11px] tabular-nums text-muted-foreground">{f.messages}</span>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

// ---------- Next live ----------
function NextLivePanel() {
  const [s, setS] = useState(null);
  useEffect(() => {
    let alive = true;
    const fetchOnce = async () => {
      try {
        const { data } = await api.get("/lobby/next-live");
        if (alive) setS(data);
      } catch (_) { /* noop */ }
    };
    fetchOnce();
    const t = setInterval(fetchOnce, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!s) return null;
  const live = s.state === "live";
  const startsAt = s.start_iso ? new Date(s.start_iso) : null;
  const labelDate = startsAt
    ? startsAt.toLocaleString("ro-RO", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })
    : "—";
  return (
    <SectionCard icon={Tv} title="Cartoonix TV" testId="lobby-nextlive-panel" tone="cool">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
              live ? "bg-red-500 text-white animate-pulse" : "bg-white/10 text-white/70"
            }`}
          >
            {live ? "● LIVE" : s.state === "upcoming" ? "Urmează" : "Încheiat"}
          </span>
        </div>
        <p className="text-[15px] font-semibold text-white">{s.title || "Maraton Cartoonix"}</p>
        {s.subtitle && (
          <p className="text-[12px] text-muted-foreground">{s.subtitle}</p>
        )}
        <div className="flex items-center gap-1.5 text-[11px] text-white/70">
          <Clock className="h-3 w-3" />
          <span className="tabular-nums">{labelDate}</span>
        </div>
        {live && (
          <Link
            to="/live"
            data-testid="lobby-nextlive-cta"
            className="block text-center text-[12px] font-semibold mt-1 rounded-full bg-red-500/90 hover:bg-red-500 text-white py-1.5"
          >
            Intră acum →
          </Link>
        )}
      </div>
    </SectionCard>
  );
}

// ---------- Poll ----------
function PollPanel() {
  const [poll, setPoll] = useState(null);
  const [voting, setVoting] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/lobby/poll");
        setPoll(data.poll);
      } catch (_) { /* noop */ }
    })();
  }, []);

  const vote = async (option) => {
    if (voting || !poll) return;
    setVoting(true);
    try {
      await api.post(`/lobby/poll/${poll.id}/vote`, { option });
      const { data } = await api.get("/lobby/poll");
      setPoll(data.poll);
    } catch (err) {
      toast.error(getErrorMessage(err, "Votul nu a putut fi salvat."));
    } finally {
      setVoting(false);
    }
  };

  if (!poll) return null;
  const total = Math.max(1, poll.total_votes || 0);
  const youVoted = !!poll.your_vote;
  return (
    <SectionCard icon={BarChart3} title="Sondaj rapid" testId="lobby-poll-panel" tone="warm">
      <p className="text-[14px] font-semibold text-white/95 mb-2">{poll.question}</p>
      <ul className="space-y-1.5">
        {poll.options.map((opt) => {
          const count = poll.counts?.[opt] || 0;
          const pct = Math.round((count / total) * 100);
          const isYours = poll.your_vote === opt;
          return (
            <li key={opt}>
              <button
                onClick={() => vote(opt)}
                disabled={voting || youVoted}
                data-testid={`lobby-poll-vote-${opt.replace(/\s+/g, "-").toLowerCase()}`}
                className="group relative w-full overflow-hidden rounded-lg border border-white/10 bg-black/30 text-left px-3 py-1.5 text-[13px] text-white/90 hover:bg-black/50 disabled:cursor-default"
              >
                {/* fill bar */}
                <div
                  aria-hidden
                  className={`absolute inset-y-0 left-0 transition-all ${
                    isYours ? "bg-emerald-500/30" : "bg-white/[0.06]"
                  }`}
                  style={{ width: youVoted ? `${pct}%` : 0 }}
                />
                <span className="relative flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    {isYours && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                    <span>{opt}</span>
                  </span>
                  {youVoted && (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {pct}% · {count}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        {poll.total_votes} {poll.total_votes === 1 ? "vot" : "voturi"}
      </p>
    </SectionCard>
  );
}

// ---------- Recent winners ----------
function WinnersPanel() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/lobby/winners?limit=3");
        setItems(data.items || []);
      } catch (_) { /* noop */ }
    })();
  }, []);
  if (!items.length) return null;
  return (
    <SectionCard icon={Trophy} title="Ultimii câștigători" testId="lobby-winners-panel">
      <ul className="space-y-1.5">
        {items.map((w, i) => (
          <li key={i} className="flex items-center gap-2 text-[13px]">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-semibold text-white">{w.nickname || "anonim"}</span>
            {w.prize && <span className="text-muted-foreground truncate">— {w.prize}</span>}
          </li>
        ))}
      </ul>
      <Link
        to="/castigatori"
        className="mt-2 inline-block text-[11px] font-semibold text-[hsl(var(--accent))] hover:underline"
      >
        Vezi toți câștigătorii →
      </Link>
    </SectionCard>
  );
}

// ---------- Random recommendation ----------
function RecommendationPanel() {
  const [cartoon, setCartoon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const { data } = await api.get("/lobby/recommendation");
        if (alive) setCartoon(data.cartoon);
      } catch (_) {
        /* noop */
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [reloadKey]);
  const refresh = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };
  if (!cartoon) return null;
  return (
    <SectionCard
      icon={Sparkles}
      title="Recomandarea zilei"
      testId="lobby-recommendation-panel"
      action={
        <button
          onClick={refresh}
          disabled={loading}
          data-testid="lobby-recommendation-refresh"
          className="text-muted-foreground hover:text-white"
          aria-label="Schimbă recomandarea"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
        </button>
      }
    >
      <Link to={`/cartoon/${cartoon.id}`} className="block group">
        <div className="aspect-video rounded-lg overflow-hidden bg-black/40 mb-2">
          {cartoon.thumbnail_url ? (
            <img
              src={mediaUrl(cartoon.thumbnail_url)}
              alt={cartoon.title}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-muted-foreground text-xs">
              fără poster
            </div>
          )}
        </div>
        <p className="text-[14px] font-semibold text-white/95 truncate group-hover:text-[hsl(var(--accent))]">
          {cartoon.title}
        </p>
        {cartoon.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
            {cartoon.description}
          </p>
        )}
      </Link>
    </SectionCard>
  );
}

// ---------- Suggestion box ----------
function SuggestionPanel() {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await api.post("/lobby/suggestion", { text: t });
      toast.success("Mulțumim! Sugestia a fost trimisă către echipă.");
      setText("");
    } catch (err) {
      toast.error(getErrorMessage(err, "Sugestia nu a putut fi trimisă."));
    } finally {
      setSending(false);
    }
  };
  return (
    <SectionCard icon={Lightbulb} title="Cutie sugestii" testId="lobby-suggestion-panel">
      <form onSubmit={submit} className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 600))}
          placeholder="Ce desen ai vrea? O îmbunătățire pentru platformă?"
          rows={3}
          data-testid="lobby-suggestion-text"
          className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/40"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground tabular-nums">{text.length}/600</span>
          <button
            type="submit"
            disabled={sending || !text.trim()}
            data-testid="lobby-suggestion-send"
            className="text-[11px] font-semibold rounded-full bg-gradient-to-r from-[#ff3b3b] to-[#facc15] text-black px-3 py-1 hover:opacity-95 disabled:opacity-50"
          >
            {sending ? "Se trimite…" : "Trimite"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

export default function LobbyPage() {
  const { user } = useAuth();
  const { settings } = useSettings() || {};
  const isPlus = user?.subscription === "plus" || user?.role === "admin";
  const isAdmin = user?.role === "admin";
  const lobbyEnabled = settings?.lobby_enabled !== false;
  const [room, setRoom] = useState("global");
  const title = useMemo(
    () => `Lobby${user?.nickname ? ` · Bun venit, ${user.nickname}` : ""}`,
    [user?.nickname]
  );

  // Lobby disabled for non-admins → friendly maintenance card.
  if (!lobbyEnabled && !isAdmin) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-20">
          <div
            data-testid="lobby-disabled-card"
            className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#15161d] to-[#0a0b0f] p-10 text-center space-y-4 shadow-2xl"
          >
            <div className="mx-auto h-14 w-14 rounded-full bg-gradient-to-br from-[#ff3b3b] to-[#facc15] grid place-items-center text-black">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="font-display text-3xl tracking-wide text-white">
              Lobby-ul este închis temporar
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Lucrăm la îmbunătățiri pentru ca experiența să fie cât mai bună la
              revenire. Reîncearcă în scurt timp — revenim curând!
            </p>
            <Link
              to="/"
              className="inline-block mt-2 text-[12px] font-semibold uppercase tracking-widest text-[hsl(var(--accent))] hover:underline"
            >
              ← Înapoi la dashboard
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Admin-only banner when lobby is "disabled" but they still see it */}
        {!lobbyEnabled && isAdmin && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[12px] text-amber-200 flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            Lobby este dezactivat pentru utilizatori. Doar adminii îl pot vedea acum.
          </div>
        )}

        {/* Title strip */}
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-white">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#ff3b3b] to-[#facc15]">
                Lobby
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{title}</p>
          </div>

          {/* Room toggle: Global / PLUS */}
          <RoomSwitcher room={room} setRoom={setRoom} isPlus={isPlus} />
        </div>

        {/* 3-col layout: left meta · chat centre · right meta */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left rail */}
          <aside className="lg:col-span-3 space-y-4 order-2 lg:order-1">
            <OnlinePanel />
            <TopFansPanel />
            <TopOnlinePanel />
            <WinnersPanel />
          </aside>

          {/* Centre column: chat */}
          <main className="lg:col-span-6 order-1 lg:order-2">
            <div className="h-[calc(100vh-260px)] min-h-[520px]">
              <LobbyChat room={room} key={room} />
            </div>
          </main>

          {/* Right rail */}
          <aside className="lg:col-span-3 space-y-4 order-3">
            <NextLivePanel />
            <PollPanel />
            <RecommendationPanel />
            <SuggestionPanel />
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
}

function RoomSwitcher({ room, setRoom, isPlus }) {
  return (
    <div
      data-testid="lobby-room-switcher"
      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/40 p-1 shadow-sm"
    >
      <button
        onClick={() => setRoom("global")}
        data-testid="lobby-room-global"
        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest transition ${
          room === "global"
            ? "bg-white/10 text-white shadow-inner"
            : "text-white/60 hover:text-white"
        }`}
      >
        Global
      </button>
      <button
        onClick={() => {
          if (!isPlus) {
            toast.info("Camera PLUS este rezervată membrilor PLUS.", {
              description: "Devino PLUS din pagina ta de profil pentru acces exclusiv.",
            });
            return;
          }
          setRoom("plus");
        }}
        data-testid="lobby-room-plus"
        className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest transition ${
          room === "plus"
            ? "bg-gradient-to-r from-amber-500/40 to-yellow-400/30 text-white shadow-inner"
            : "text-white/60 hover:text-white"
        }`}
      >
        <UserBadges isPlus size={14} />
        <span>Cameră PLUS</span>
        {!isPlus && <Lock className="h-3 w-3 text-muted-foreground" />}
      </button>
    </div>
  );
}
