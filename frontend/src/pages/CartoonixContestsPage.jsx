import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Trophy,
  Sparkles,
  Crown,
  Lock,
  CheckCircle2,
  Loader2,
  Users,
  Gift,
  Ticket,
  Tv,
  Blocks,
  Clock,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const ICONS = {
  cinema_toystory5: Ticket,
  lego_set: Blocks,
  emag_voucher_500: Gift,
  media_player_xiaomi: Tv,
};

const ACCENTS = {
  cinema_toystory5: {
    glow: "rgba(244, 114, 182, 0.45)",
    ring: "from-pink-500/80 via-rose-400/60 to-fuchsia-500/80",
    chip: "bg-pink-500/15 text-pink-200 border-pink-400/30",
  },
  lego_set: {
    glow: "rgba(96, 165, 250, 0.45)",
    ring: "from-sky-400/80 via-blue-400/60 to-indigo-500/80",
    chip: "bg-sky-500/15 text-sky-200 border-sky-400/30",
  },
  emag_voucher_500: {
    glow: "rgba(251, 191, 36, 0.55)",
    ring: "from-amber-300/90 via-yellow-400/70 to-orange-400/90",
    chip: "bg-amber-500/15 text-amber-200 border-amber-400/30",
  },
  media_player_xiaomi: {
    glow: "rgba(251, 191, 36, 0.55)",
    ring: "from-amber-300/90 via-yellow-400/70 to-orange-400/90",
    chip: "bg-amber-500/15 text-amber-200 border-amber-400/30",
  },
};

/** Hook: returns countdown to a target ISO date. Updates every second. */
function useCountdown(targetIso) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!targetIso) return null;
  const target = new Date(targetIso);
  const diff = target.getTime() - now.getTime();
  if (Number.isNaN(target.getTime())) return null;
  const done = diff <= 0;
  const abs = Math.max(0, diff);
  return {
    done,
    days: Math.floor(abs / (1000 * 60 * 60 * 24)),
    hours: Math.floor((abs / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((abs / (1000 * 60)) % 60),
    seconds: Math.floor((abs / 1000) % 60),
  };
}

function ContestCountdown({ deadlineIso }) {
  const cd = useCountdown(deadlineIso);
  if (!cd) return null;

  const pad = (n) => String(n).padStart(2, "0");

  if (cd.done) {
    return (
      <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] uppercase tracking-[0.18em] font-semibold text-white/55">
        <Flag className="h-3.5 w-3.5" />
        Concurs finalizat
      </div>
    );
  }

  const Block = ({ value, label }) => (
    <div className="flex flex-col items-center min-w-[40px]">
      <span
        className="font-display text-base sm:text-lg font-bold tabular-nums leading-none"
        style={{
          backgroundImage: "linear-gradient(180deg,#ffffff 0%,#cbd5e1 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {pad(value)}
      </span>
      <span className="mt-1 text-[9px] tracking-[0.22em] uppercase text-white/40 font-semibold">
        {label}
      </span>
    </div>
  );

  return (
    <div
      className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md px-3 py-2.5"
      data-testid="contest-countdown"
    >
      <div className="flex items-center gap-1.5 mb-1.5 text-[9px] tracking-[0.24em] uppercase text-white/45 font-semibold">
        <Clock className="h-3 w-3" />
        Mai sunt
      </div>
      <div className="flex items-center justify-between gap-1">
        <Block value={cd.days} label="Zile" />
        <span className="text-white/30 -mt-3">:</span>
        <Block value={cd.hours} label="Ore" />
        <span className="text-white/30 -mt-3">:</span>
        <Block value={cd.minutes} label="Min" />
        <span className="text-white/30 -mt-3">:</span>
        <Block value={cd.seconds} label="Sec" />
      </div>
    </div>
  );
}

function ContestCard({ contest, onEnter, busy }) {
  const Icon = ICONS[contest.id] || Trophy;
  const accent = ACCENTS[contest.id] || ACCENTS.cinema_toystory5;
  const isPlus = contest.plan === "plus";
  const locked = contest.locked_for_plan;
  const entered = contest.entered;

  return (
    <div
      data-testid={`contest-card-${contest.id}`}
      className="relative group rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] backdrop-blur-md p-6 sm:p-7 flex flex-col transition-all duration-300 hover:-translate-y-1"
      style={{
        boxShadow: `0 28px 80px -32px ${accent.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      {/* Subtle background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-64 w-64 rounded-full blur-3xl opacity-60 group-hover:opacity-90 transition-opacity duration-500"
        style={{ background: `radial-gradient(closest-side, ${accent.glow}, transparent 70%)` }}
      />

      {/* Plan ribbon (top-right) */}
      <div className="absolute top-4 right-4 z-10">
        {isPlus ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-black shadow-md">
            <Crown className="h-3 w-3" /> Plus
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase bg-white/10 border border-white/15 text-white">
            <Sparkles className="h-3 w-3 text-fuchsia-300" /> Free
          </span>
        )}
      </div>

      {/* Icon */}
      <div className="relative z-10 mb-5">
        <div className="relative inline-flex">
          <span
            aria-hidden
            className={`absolute -inset-1 rounded-2xl bg-gradient-to-br ${accent.ring} blur-md opacity-70 group-hover:opacity-100 transition-opacity`}
          />
          <div className="relative h-14 w-14 rounded-2xl bg-[#0a0a0c] border border-white/10 flex items-center justify-center">
            <Icon className="h-7 w-7 text-white" strokeWidth={2.2} />
          </div>
        </div>
      </div>

      {/* Title + emoji */}
      <h3 className="relative z-10 font-display text-xl sm:text-2xl font-bold tracking-wide text-white leading-snug mb-2">
        <span className="mr-2">{contest.emoji}</span>
        {contest.title}
      </h3>

      {/* Description */}
      <p className="relative z-10 text-sm text-white/65 leading-relaxed mb-4 flex-1">
        {contest.description}
      </p>

      {/* Prize chip */}
      <div className="relative z-10 mb-4">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${accent.chip}`}>
          <Trophy className="h-3.5 w-3.5" />
          <span>{contest.prize}</span>
        </div>
      </div>

      {/* Countdown to deadline */}
      {contest.deadline_iso && (
        <div className="relative z-10 mb-4">
          <ContestCountdown deadlineIso={contest.deadline_iso} />
        </div>
      )}

      {/* Entry count */}
      <div className="relative z-10 flex items-center justify-between mb-4 text-xs text-white/45">
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {contest.entry_count}{" "}
          {contest.entry_count === 1 ? "participant" : "participanți"}
        </span>
      </div>

      {/* CTA */}
      <div className="relative z-10">
        {entered ? (
          <Button
            disabled
            className="w-full h-12 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-100 font-semibold tracking-[0.18em] uppercase text-xs cursor-default"
            data-testid={`contest-entered-${contest.id}`}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" /> Înscris
          </Button>
        ) : locked ? (
          <Button
            disabled
            className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:bg-white/5 disabled:opacity-100 font-semibold tracking-[0.18em] uppercase text-xs cursor-not-allowed"
            data-testid={`contest-locked-${contest.id}`}
          >
            <Lock className="h-4 w-4 mr-2" /> Doar pentru Plus
          </Button>
        ) : (
          <Button
            onClick={() => onEnter(contest.id)}
            disabled={busy}
            className="w-full h-12 rounded-xl font-bold tracking-[0.22em] uppercase text-xs text-black bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 hover:from-amber-200 hover:via-yellow-300 hover:to-orange-300 shadow-[0_10px_28px_-8px_rgba(251,191,36,0.5)] disabled:opacity-70"
            data-testid={`contest-enter-${contest.id}`}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Se înscrie...
              </>
            ) : (
              <>Participă</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function CartoonixContestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const [items, setItems] = useState([]);
  const [userPlan, setUserPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/contests");
      setItems(data?.items || []);
      setUserPlan(data?.user_plan || "free");
    } catch (e) {
      toast.error(getErrorMessage(e, "Nu am putut încărca concursurile."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const enter = async (contestId) => {
    setBusyId(contestId);
    try {
      const { data } = await api.post(`/contests/${contestId}/enter`);
      if (data?.already_entered) {
        toast.message("Ești deja înscris la acest concurs.", { duration: 2500 });
      } else {
        toast.success("Te-ai înscris cu succes!", {
          description: "Mult succes! Câștigătorii vor fi anunțați la finalul concursului.",
          duration: 5000,
        });
      }
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e, "Înscrierea a eșuat. Încearcă din nou."));
    } finally {
      setBusyId(null);
    }
  };

  const freeContests = items.filter((c) => c.plan === "free");
  const plusContests = items.filter((c) => c.plan === "plus");

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0c] text-white">
      {/* Background layers */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 600px at 50% -10%, rgba(217,70,239,0.16), transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(217,70,239,0.30), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-48 h-[580px] w-[580px] rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(250,204,21,0.22), transparent 70%)" }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 text-white/55 hover:text-white text-xs tracking-[0.22em] uppercase mb-10 transition-colors"
          data-testid="contests-back"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Înapoi
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 mb-6">
            <Trophy className="h-3.5 w-3.5 text-fuchsia-300" />
            <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-fuchsia-200">
              Concursuri Cartoonix
            </span>
          </div>

          <h1
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-wider leading-tight"
            style={{
              backgroundImage:
                "linear-gradient(92deg, #ff5e5e 0%, #d946ef 35%, #818cf8 70%, #ff5e5e 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            CÂȘTIGĂ CU CARTOONIX
          </h1>

          <p className="mt-6 text-base sm:text-lg text-white/75 max-w-2xl mx-auto leading-relaxed">
            Pregătim <span className="font-semibold text-white">4 concursuri speciale</span> pentru
            comunitate. Două sunt deschise tuturor, iar celelalte două sunt rezervate exclusiv
            membrilor <span className="font-semibold text-amber-300">Cartoonix PLUS</span>.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : (
          <>
            {/* FREE section */}
            <section className="mb-14">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/15" />
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-semibold tracking-[0.24em] uppercase text-white/80">
                  <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
                  Concursuri gratuite
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/15" />
              </div>

              <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
                {freeContests.map((c) => (
                  <ContestCard
                    key={c.id}
                    contest={c}
                    onEnter={enter}
                    busy={busyId === c.id}
                  />
                ))}
              </div>
            </section>

            {/* PLUS section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-400/30" />
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-400/30 text-[11px] font-bold tracking-[0.24em] uppercase text-amber-200">
                  <Crown className="h-3.5 w-3.5" />
                  Exclusiv Cartoonix Plus
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-400/30" />
              </div>

              {userPlan !== "plus" && (
                <div className="mb-6 rounded-2xl border border-amber-400/25 bg-amber-500/[0.06] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                  <div className="flex items-center gap-3 text-amber-100">
                    <Lock className="h-4 w-4 shrink-0" />
                    <span>
                      Concursurile de mai jos sunt rezervate membrilor{" "}
                      <span className="font-semibold">Cartoonix PLUS</span>. Fă upgrade pentru a participa.
                    </span>
                  </div>
                  <Button
                    onClick={() => navigate("/")}
                    className="rounded-full px-5 h-10 text-xs font-bold tracking-[0.2em] uppercase text-black bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 hover:from-amber-200 hover:via-yellow-300 hover:to-orange-300 shadow-[0_10px_28px_-8px_rgba(251,191,36,0.5)]"
                    data-testid="contests-upgrade-cta"
                  >
                    Vezi opțiunea de upgrade
                  </Button>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
                {plusContests.map((c) => (
                  <ContestCard
                    key={c.id}
                    contest={c}
                    onEnter={enter}
                    busy={busyId === c.id}
                  />
                ))}
              </div>
            </section>

            {/* Footer note */}
            <p className="mt-14 text-center text-xs text-white/35 max-w-xl mx-auto leading-relaxed">
              Câștigătorii vor fi contactați pe adresa de email cu care sunt înregistrați. Mult succes,{" "}
              <span className="text-white/55 font-medium">{user?.nickname || "Cartoonix Fan"}</span>!
            </p>
          </>
        )}
      </div>
    </div>
  );
}
