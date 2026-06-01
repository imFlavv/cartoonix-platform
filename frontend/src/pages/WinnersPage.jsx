import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { api, mediaUrl } from "@/lib/api";
import PublicLayout from "@/components/PublicLayout";
import { RequireAuth } from "@/components/RouteGuards";
import {
  Trophy,
  Ticket,
  Boxes,
  ShoppingBag,
  Tv2,
  Sparkles,
  Crown,
  ArrowLeft,
} from "lucide-react";

const ICON_MAP = {
  ticket: Ticket,
  blocks: Boxes,
  "shopping-bag": ShoppingBag,
  tv: Tv2,
};

const ACCENT_BY_ID = {
  cinema: {
    ring: "ring-pink-500/35 hover:ring-pink-500/55",
    glow: "rgba(244,114,182,0.16)",
    pill: "bg-pink-500/15 border-pink-500/40 text-pink-200",
    chip: "text-pink-300",
  },
  lego: {
    ring: "ring-amber-400/35 hover:ring-amber-400/55",
    glow: "hsla(46,92%,55%,0.16)",
    pill: "bg-amber-400/15 border-amber-400/40 text-amber-200",
    chip: "text-amber-300",
  },
  emag: {
    ring: "ring-blue-400/35 hover:ring-blue-400/55",
    glow: "rgba(96,165,250,0.16)",
    pill: "bg-blue-400/15 border-blue-400/40 text-blue-200",
    chip: "text-blue-300",
  },
  xiaomi: {
    ring: "ring-emerald-400/35 hover:ring-emerald-400/55",
    glow: "rgba(52,211,153,0.16)",
    pill: "bg-emerald-400/15 border-emerald-400/40 text-emerald-200",
    chip: "text-emerald-300",
  },
};

function WinnerAvatar({ src, nickname, accent }) {
  const initials = (nickname || "?")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");
  return (
    <div
      className={`relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-2xl overflow-hidden ring-2 ${accent.ring} bg-black/40 grid place-items-center`}
    >
      {src ? (
        <img
          src={mediaUrl(src)}
          alt={nickname}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      {!src && (
        <span className={`font-display text-base ${accent.chip}`}>
          {initials || "★"}
        </span>
      )}
    </div>
  );
}

function ContestCard({ contest }) {
  const accent = ACCENT_BY_ID[contest.id] || ACCENT_BY_ID.lego;
  const Icon = ICON_MAP[contest.icon] || Trophy;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      data-testid={`contest-card-${contest.id}`}
      className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-7"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(700px circle at 95% -10%, ${accent.glow}, transparent 55%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-center gap-3 mb-5">
          <span className={`grid h-11 w-11 place-items-center rounded-2xl border ${accent.pill}`}>
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl sm:text-2xl tracking-wider text-white truncate">
              {contest.title}
            </h2>
            <p className="text-xs uppercase tracking-[0.22em] text-white/45 mt-0.5 truncate">
              {contest.subtitle}
            </p>
          </div>
        </div>

        <ul className="space-y-2.5">
          {contest.winners.map((w, idx) => (
            <li
              key={`${w.nickname}-${idx}`}
              data-testid={`winner-${contest.id}-${idx}`}
              className="group flex items-center gap-3 sm:gap-4 rounded-2xl border border-white/[0.06] bg-black/30 px-3 sm:px-4 py-2.5 sm:py-3 hover:border-white/15 transition-colors"
            >
              <WinnerAvatar
                src={w.avatar_url}
                nickname={w.nickname}
                accent={accent}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-base sm:text-lg tracking-wide text-white truncate">
                    {w.nickname}
                  </span>
                  <Crown
                    className={`h-3.5 w-3.5 ${accent.chip} shrink-0`}
                    strokeWidth={2.4}
                  />
                </div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40 mt-0.5">
                  Câștigător
                </div>
              </div>
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${accent.pill}`}
              >
                <Sparkles className="h-3 w-3" />
                Premiu
              </span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function WinnersPageInner() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: payload } = await api.get("/winners");
        if (mounted) setData(payload);
      } catch {
        if (mounted) setError(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const total = useMemo(
    () =>
      (data?.contests || []).reduce(
        (acc, c) => acc + (c.winners?.length || 0),
        0
      ),
    [data]
  );

  return (
    <PublicLayout>
      <section className="relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(1100px circle at 50% -10%, hsla(46,92%,55%,0.12), transparent 60%), radial-gradient(700px circle at 90% 110%, rgba(244,114,182,0.10), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="mb-6">
            <Link
              to="/"
              data-testid="winners-back-link"
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-white/45 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Înapoi
            </Link>
          </div>

          <motion.header
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10 sm:mb-14"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-[hsl(var(--accent))]">
              <Trophy className="h-3.5 w-3.5" />
              Hall of Fame
            </div>
            <h1
              data-testid="winners-title"
              className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl leading-[1] tracking-wide text-white"
            >
              Câștigătorii noștri
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-sm sm:text-base text-white/50 leading-relaxed">
              Felicitări tuturor celor care au câștigat la concursurile
              Cartoonix. Mulțumim pentru participare — și rămâneți pe
              recepție, urmează altele!
            </p>
            {total > 0 && (
              <div className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/40">
                <Crown className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
                {total} câștigători
              </div>
            )}
          </motion.header>

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-red-200/80 text-sm">
              Nu am putut încărca lista. Reîncarcă pagina.
            </div>
          )}

          {!data && !error && (
            <div className="grid sm:grid-cols-2 gap-5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-56 rounded-3xl bg-white/[0.02] animate-pulse"
                />
              ))}
            </div>
          )}

          {data?.contests?.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
              {data.contests.map((c) => (
                <ContestCard key={c.id} contest={c} />
              ))}
            </div>
          )}

          {data?.contests?.length === 0 && !error && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center text-white/45">
              Niciun câștigător încă. Revino după primul concurs!
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

export default function WinnersPage() {
  return (
    <RequireAuth>
      <WinnersPageInner />
    </RequireAuth>
  );
}
