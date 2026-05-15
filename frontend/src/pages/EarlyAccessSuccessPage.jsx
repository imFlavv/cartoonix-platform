import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Crown, Sparkles, LogOut, Rocket, ArrowUpRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api, mediaUrl } from "@/lib/api";

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

/**
 * UserBar — avatar (with red glow ring) + nickname + plan badge + optional UPGRADE button.
 * Replaces the lone CARTOONIX FREE / PLUS pill.
 */
function UserBar({ user, isPlus, onUpgrade, upgrading }) {
  const avatarSrc = user?.avatar_url ? mediaUrl(user.avatar_url) : "";

  return (
    <div
      data-testid="ea-user-bar"
      className="mx-auto inline-flex items-center gap-3 sm:gap-4 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md pl-2 pr-3 sm:pl-3 sm:pr-4 py-2 shadow-[0_18px_48px_-18px_rgba(0,0,0,0.6)]"
    >
      {/* Avatar with red glow ring (like the user's reference image) */}
      <div className="relative flex-shrink-0">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full blur-md opacity-80"
          style={{ background: "radial-gradient(closest-side, rgba(239,68,68,0.7), transparent 70%)" }}
        />
        <span
          aria-hidden
          className="absolute -inset-0.5 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, #ef4444, #f97316, #ef4444, #b91c1c, #ef4444)",
          }}
        />
        <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-full overflow-hidden border-2 border-[#0a0a0c]">
          {avatarSrc ? (
            <img src={avatarSrc} alt={user?.nickname || "Avatar"} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center text-sm font-bold">
              {(user?.nickname || "C").slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Nickname */}
      <span
        data-testid="ea-user-nickname"
        className="font-semibold text-white text-sm sm:text-base max-w-[120px] sm:max-w-none truncate"
      >
        {user?.nickname || "Cartoonix Fan"}
      </span>

      {/* Divider */}
      <span className="h-6 w-px bg-white/15" aria-hidden />

      {/* Plan badge */}
      {isPlus ? (
        <span
          data-testid="ea-plan-badge"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-black font-bold shadow-md shadow-amber-400/20"
        >
          <Crown className="h-3.5 w-3.5" />
          <span className="tracking-[0.16em] text-[11px]">PLUS</span>
        </span>
      ) : (
        <span
          data-testid="ea-plan-badge"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white"
        >
          <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
          <span className="tracking-[0.16em] text-[11px] font-semibold">FREE</span>
        </span>
      )}

      {/* Upgrade button — only for FREE users */}
      {!isPlus && (
        <button
          type="button"
          data-testid="ea-upgrade-button"
          onClick={onUpgrade}
          disabled={upgrading}
          className="group relative inline-flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-bold tracking-[0.18em] uppercase text-black bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 hover:from-amber-200 hover:via-yellow-300 hover:to-orange-300 transition-all shadow-[0_8px_22px_-6px_rgba(251,191,36,0.55)] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {upgrading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>...</span>
            </>
          ) : (
            <>
              <span>Upgrade</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function EarlyAccessSuccessPage() {
  const { user, logout, fetchMe } = useAuth() || {};
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const { days, hours, minutes, seconds } = useCountdown(LAUNCH_DATE);
  const [upgrading, setUpgrading] = useState(false);
  const [confirmingUpgrade, setConfirmingUpgrade] = useState(false);
  const confirmedRef = useRef(false);

  const isPlus = user?.subscription === "plus";

  const doLogout = async () => {
    if (logout) await logout();
    navigate("/early-access", { replace: true });
  };

  const handleUpgrade = async () => {
    if (upgrading || isPlus) return;
    setUpgrading(true);
    try {
      const { data } = await api.post("/users/me/upgrade-checkout");
      if (!data?.stripe_url) {
        throw new Error("Stripe URL missing");
      }
      // Mark that we're heading out for an upgrade so we can react on return.
      try {
        localStorage.setItem("cartoonix_upgrade_pending", "1");
      } catch { /* ignore */ }
      toast.message("Redirecționare către Stripe...", { duration: 1800 });
      setTimeout(() => {
        window.location.href = data.stripe_url;
      }, 250);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Nu am putut deschide pagina de plată. Încearcă din nou.";
      toast.error(msg);
      setUpgrading(false);
    }
  };

  // ---- Stripe return: detect session_id and confirm the upgrade ----
  useEffect(() => {
    const sessionId = search.get("session_id");
    if (!sessionId) return;
    if (confirmedRef.current) return;
    if (!user) return; // wait until auth ready
    if (user.subscription === "plus") {
      // Already PLUS — just clean URL.
      const next = new URLSearchParams(search);
      next.delete("session_id");
      setSearch(next, { replace: true });
      return;
    }

    confirmedRef.current = true;
    (async () => {
      setConfirmingUpgrade(true);
      try {
        await api.post("/users/me/confirm-upgrade", { session_id: sessionId });
        if (fetchMe) await fetchMe();
        toast.success("UPGRADE REALIZAT CU SUCCES!", {
          description: "Contul tău este acum CARTOONIX PLUS. Mulțumim!",
          duration: 6000,
        });
      } catch (err) {
        const msg =
          err?.response?.data?.detail ||
          "Nu am putut confirma upgrade-ul. Dacă plata a fost efectuată, contactează suportul.";
        toast.error(msg);
      } finally {
        try { localStorage.removeItem("cartoonix_upgrade_pending"); } catch { /* ignore */ }
        setConfirmingUpgrade(false);
        const next = new URLSearchParams(search);
        next.delete("session_id");
        setSearch(next, { replace: true });
      }
    })();
    // eslint-disable-next-line
  }, [user]);

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

          {/* User bar (replaces the lone plan pill) */}
          <div className="mt-6 flex justify-center">
            <UserBar
              user={user}
              isPlus={isPlus}
              onUpgrade={handleUpgrade}
              upgrading={upgrading || confirmingUpgrade}
            />
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
