import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Sparkles, LogOut, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const LAUNCH_DATE = new Date("2026-06-01T00:00:00+03:00");

function useCountdown(target) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, done: diff <= 0 };
}

function Cell({ value, label }) {
  const text = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative rounded-2xl bg-gradient-to-br from-[#1a1d24] to-[#101218] border border-white/10 px-4 sm:px-6 py-4 sm:py-6 min-w-[72px] sm:min-w-[110px] shadow-[0_18px_48px_-12px_rgba(0,0,0,0.6)]"
      >
        <span
          className="block text-center font-display text-4xl sm:text-6xl font-bold tabular-nums tracking-tight"
          style={{
            backgroundImage:
              "linear-gradient(180deg,#ffffff 0%,#cbd5e1 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {text}
        </span>
      </div>
      <span className="mt-2 text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-white/40 font-semibold">
        {label}
      </span>
    </div>
  );
}

export default function EarlyAccessSuccessPage() {
  const { user, logout } = useAuth() || {};
  const navigate = useNavigate();
  const { days, hours, minutes, seconds } = useCountdown(LAUNCH_DATE);

  const isPlus = user?.subscription === "plus";

  const doLogout = async () => {
    if (logout) await logout();
    navigate("/early-access", { replace: true });
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0c] text-white">
      {/* ---------- BACKGROUND LAYERS ---------- */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 600px at 50% 0%, rgba(217,70,239,0.14), transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(217,70,239,0.32), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-48 h-[580px] w-[580px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(250,204,21,0.22), transparent 70%)",
        }}
      />

      <main className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-3xl text-center" data-testid="early-access-success">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-emerald-200">
              Cont activat
            </span>
          </div>

          {/* Heading */}
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
            EȘTI ÎNREGISTRAT!
          </h1>

          {/* Welcome message */}
          <p className="mt-6 text-base sm:text-lg text-white/80">
            Bun venit, <span className="font-semibold text-white">{user?.nickname || "Cartoonix Fan"}</span>!
            Locul tău e rezervat.
          </p>

          {/* Plan badge */}
          <div className="mt-6 flex justify-center">
            {isPlus ? (
              <div
                data-testid="ea-plan-badge"
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-black font-bold shadow-lg shadow-amber-400/20"
              >
                <Crown className="h-4 w-4" />
                <span className="tracking-[0.18em] text-sm">CARTOONIX PLUS</span>
                <Sparkles className="h-4 w-4" />
              </div>
            ) : (
              <div
                data-testid="ea-plan-badge"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-white"
              >
                <Sparkles className="h-4 w-4 text-fuchsia-300" />
                <span className="tracking-[0.18em] text-sm font-semibold">CARTOONIX FREE</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="mx-auto mt-12 mb-8 h-px w-32 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {/* Countdown label */}
          <p className="text-[11px] sm:text-xs tracking-[0.32em] uppercase text-white/40 font-semibold mb-6">
            <Rocket className="inline h-3.5 w-3.5 mr-2 -mt-0.5 text-fuchsia-300" />
            Lansare oficială · 1 Iunie 2026
          </p>

          {/* Countdown */}
          <div
            data-testid="ea-countdown"
            className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap"
          >
            <Cell value={days} label="Zile" />
            <Cell value={hours} label="Ore" />
            <Cell value={minutes} label="Minute" />
            <Cell value={seconds} label="Secunde" />
          </div>

          {/* Closing message */}
          <p className="mt-12 text-sm text-white/55 max-w-md mx-auto leading-relaxed">
            Te vom anunța pe email când platforma e gata. Până atunci, mulțumim
            că ne ești alături!
          </p>

          {/* Logout */}
          <div className="mt-10">
            <Button
              variant="ghost"
              onClick={doLogout}
              data-testid="ea-logout-button"
              className="text-white/50 hover:text-white text-xs uppercase tracking-[0.22em]"
            >
              <LogOut className="h-3.5 w-3.5 mr-2" />
              Deconectează-te
            </Button>
          </div>

          {/* Footer */}
          <p className="mt-16 text-[10px] tracking-[0.32em] text-white/25 uppercase">
            © Cartoonix
          </p>
        </div>
      </main>
    </div>
  );
}
