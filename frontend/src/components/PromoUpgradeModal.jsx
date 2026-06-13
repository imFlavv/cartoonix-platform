import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useLocation } from "react-router-dom";
import { Crown, X, Sparkles, Copy, Check, ArrowRight } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";

/**
 * PromoUpgradeModal
 * Shows a one-time, elegant promo dialog to FREE users advertising the
 * WEEKEND20 promo code. Dismissal is persisted in localStorage so the
 * modal never re-appears for the same browser/account combination.
 *
 * Visibility rules:
 *  - User must be logged in and on a FREE plan (subscription !== 'plus').
 *  - Admins never see it.
 *  - Hidden on auth, admin, festival and other "out-of-platform" routes.
 *  - Hidden during maintenance / early-access modes (the user is not really
 *    "on the platform" yet).
 */

const STORAGE_KEY = "cartoonix_promo_weekend20_v1";
const PROMO_CODE = "WEEKEND20";

const HIDDEN_PREFIXES = [
  "/login",
  "/register",
  "/verify",
  "/reset-password",
  "/forgot-password",
  "/early-access",
  "/admin",
  "/festival",
  "/terms-and-conditions",
  "/gdpr",
];

function dismissedFor(userId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return !!data[userId];
  } catch {
    return false;
  }
}

function markDismissed(userId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[userId] = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export default function PromoUpgradeModal() {
  const { user, loading: authLoading } = useAuth() || {};
  const { settings, loading: settingsLoading } = useSettings() || {};
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (authLoading || settingsLoading) return;
    if (!user) return;
    if (user.role === "admin") return;
    if (user.subscription === "plus") return;
    if (settings?.maintenance_mode && user.role !== "admin") return;
    if (settings?.early_access_mode && user.role !== "admin") return;

    const path = location.pathname;
    if (HIDDEN_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) {
      return;
    }
    if (dismissedFor(user.id)) return;

    // Small delay so it doesn't slap users in the face on first load.
    const t = setTimeout(() => setOpen(true), 1400);
    return () => clearTimeout(t);
  }, [user, authLoading, settings, settingsLoading, location.pathname]);

  if (!open || !user) return null;

  const close = () => {
    markDismissed(user.id);
    setOpen(false);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
      setCopied(true);
      toast.success("Cod copiat în clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Nu am putut copia codul. Selectează-l manual.");
    }
  };

  const goUpgrade = async () => {
    if (upgrading) return;
    setUpgrading(true);
    try {
      const { data } = await api.post("/users/me/upgrade-checkout");
      if (!data?.stripe_url) throw new Error("Stripe URL missing");
      // Persist a "promo applied" hint and mark this popup as dismissed so it
      // doesn't pop up again right after the user returns from Stripe.
      try {
        localStorage.setItem("cartoonix_upgrade_pending", "1");
        await navigator.clipboard.writeText(PROMO_CODE);
      } catch {
        /* ignore */
      }
      markDismissed(user.id);
      toast.message("Redirecționare către Stripe... codul a fost copiat în clipboard.", {
        duration: 2400,
      });
      setTimeout(() => {
        window.location.href = data.stripe_url;
      }, 350);
    } catch (err) {
      toast.error(getErrorMessage(err, "Nu am putut deschide pagina de plată."));
      setUpgrading(false);
    }
  };

  return (
    <div
      data-testid="promo-upgrade-modal"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-upgrade-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Închide reclama"
        data-testid="promo-upgrade-backdrop"
        onClick={close}
        className="absolute inset-0 bg-black/72 backdrop-blur-md animate-[promoFade_280ms_ease-out_both]"
      />

      {/* Card */}
      <div
        className="relative w-full max-w-[480px] rounded-2xl overflow-hidden animate-[promoPop_360ms_cubic-bezier(0.22,1,0.36,1)_both]"
        style={{
          background:
            "linear-gradient(180deg, #1a1226 0%, #0d0816 100%)",
          border: "1px solid rgba(250,204,21,0.30)",
          boxShadow:
            "0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), 0 0 90px -20px rgba(250,204,21,0.25)",
        }}
      >
        {/* Decorative top glow */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-12 h-32 opacity-70"
          style={{
            background:
              "radial-gradient(60% 100% at 50% 100%, rgba(250,204,21,0.40), transparent 70%)",
            filter: "blur(20px)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(250,204,21,0.7), transparent)",
          }}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={close}
          data-testid="promo-upgrade-close"
          aria-label="Închide"
          className="absolute top-3 right-3 z-10 grid h-9 w-9 place-items-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative px-6 sm:px-8 pt-8 pb-7">
          {/* Crown badge */}
          <div className="flex items-center gap-3 mb-5">
            <span
              className="inline-grid place-items-center h-11 w-11 rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(250,204,21,0.20), rgba(245,158,11,0.20))",
                border: "1px solid rgba(250,204,21,0.40)",
                boxShadow: "0 0 24px -6px rgba(250,204,21,0.55)",
              }}
            >
              <Crown className="h-5 w-5 text-amber-300" strokeWidth={2.2} />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.32em] text-amber-200/80 font-semibold inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                Ofertă de weekend
              </span>
              <span className="text-[11px] text-white/55 mt-0.5">
                Numai pentru tine, doar acum
              </span>
            </div>
          </div>

          <h2
            id="promo-upgrade-title"
            data-testid="promo-upgrade-title"
            className="font-display tracking-tight leading-[1.05] text-white"
            style={{ fontSize: "clamp(1.6rem, 2.4vw, 2rem)" }}
          >
            Treci pe{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #facc15, #f59e0b 60%, #f97316)",
              }}
            >
              Cartoonix PLUS
            </span>{" "}
            cu <span className="text-amber-300">−20%</span>
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-white/75">
            Maratoane fără reclame, camere PLUS, descărcări și badge-ul auriu lângă
            nickname. Aplică codul la checkout și prinde reducerea înainte să expire.
          </p>

          {/* Promo code box */}
          <div
            className="mt-6 flex items-center gap-2 rounded-xl p-1.5 pl-4"
            style={{
              background:
                "linear-gradient(90deg, rgba(250,204,21,0.10), rgba(245,158,11,0.10))",
              border: "1px dashed rgba(250,204,21,0.55)",
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.28em] text-amber-200/70 mb-0.5">
                Codul tău
              </div>
              <div
                data-testid="promo-upgrade-code"
                className="font-display tabular-nums text-white text-[22px] sm:text-[26px] leading-none tracking-[0.18em] select-all"
                style={{ textShadow: "0 0 18px rgba(250,204,21,0.45)" }}
              >
                {PROMO_CODE}
              </div>
            </div>
            <button
              type="button"
              onClick={copyCode}
              data-testid="promo-upgrade-copy"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-black bg-amber-300 hover:bg-amber-200 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Copiat
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copiază
                </>
              )}
            </button>
          </div>

          {/* CTA buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={goUpgrade}
              disabled={upgrading}
              data-testid="promo-upgrade-cta"
              className="group flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 h-11 text-[13px] font-bold uppercase tracking-[0.14em] text-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-wait shadow-[0_10px_26px_-10px_rgba(245,194,66,0.7)]"
            >
              <Crown className="h-4 w-4" />
              {upgrading ? "Se deschide..." : "Aplică reducerea"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={close}
              data-testid="promo-upgrade-later"
              className="flex-1 sm:flex-none rounded-xl px-4 h-11 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Poate altă dată
            </button>
          </div>

          <p className="mt-4 text-[11px] text-white/45">
            Codul se introduce în câmpul „Add promotion code" din pagina de plată Stripe.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes promoFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes promoPop {
          0%   { opacity: 0; transform: translateY(16px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
