import React, { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";

/**
 * UpdateAnnouncementPopup
 * --------------------------------------
 * Shows the latest platform announcement to the user exactly once.
 * The user dismisses it by clicking "AM ÎNȚELES" which persists the
 * dismissal server-side (users.seen_announcements).
 *
 * Props:
 *  - enabled (bool): only fetch when user is authenticated.
 *  - onDismiss (fn): called after a successful dismiss (for badge refresh).
 */
export default function UpdateAnnouncementPopup({ enabled = true, onDismiss }) {
  const [ann, setAnn] = useState(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/announcements/latest");
        if (!cancelled && data?.announcement) {
          // Small delay so the page hero animation runs first.
          setTimeout(() => {
            if (!cancelled) setAnn(data.announcement);
          }, 600);
        }
      } catch {
        /* ignore — popup is non-critical */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const handleDismiss = async () => {
    if (!ann || dismissing) return;
    setDismissing(true);
    try {
      await api.post(`/announcements/${ann.id}/dismiss`);
      setAnn(null);
      onDismiss?.();
    } catch {
      // Even on failure, close locally so it isn't blocking.
      setAnn(null);
    } finally {
      setDismissing(false);
    }
  };

  if (!ann) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6"
      data-testid="update-announcement-overlay"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Închide"
        onClick={handleDismiss}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* Card */}
      <div
        className="relative w-full max-w-lg rounded-3xl overflow-hidden border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] animate-[ua-pop_320ms_ease-out]"
        style={{
          background:
            "linear-gradient(160deg, #16121f 0%, #0f1019 55%, #0a0a0c 100%)",
        }}
        data-testid="update-announcement-card"
      >
        {/* Decorative gradients */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full blur-3xl opacity-70"
          style={{
            background:
              "radial-gradient(closest-side, rgba(217,70,239,0.55), transparent 70%)",
          }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full blur-3xl opacity-60"
          style={{
            background:
              "radial-gradient(closest-side, rgba(251,191,36,0.5), transparent 70%)",
          }}
        />

        {/* Close (top-right) */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Închide"
          className="absolute top-3 right-3 z-10 h-9 w-9 inline-flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/70 hover:text-white transition"
          data-testid="update-announcement-close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative px-7 sm:px-9 pt-9 pb-7 text-white">
          {/* Version chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 mb-5">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-[10px] font-semibold tracking-[0.24em] uppercase text-white/70">
              {ann.version ? `${ann.version} · ` : ""}{ann.date || "Ultimul update"}
            </span>
          </div>

          {/* Title */}
          <h2
            className="font-display text-3xl sm:text-4xl font-bold leading-tight tracking-wide"
            style={{
              backgroundImage:
                "linear-gradient(92deg,#ff5e5e 0%,#d946ef 35%,#818cf8 70%,#facc15 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {ann.title || "Ultimul update"}
          </h2>

          {ann.subtitle && (
            <p className="mt-2 text-sm sm:text-base text-white/70">
              {ann.subtitle}
            </p>
          )}

          {/* Highlights */}
          {Array.isArray(ann.highlights) && ann.highlights.length > 0 && (
            <ul className="mt-6 space-y-3" data-testid="update-announcement-highlights">
              {ann.highlights.map((line, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 hover:bg-white/[0.06] transition-colors"
                >
                  <span className="text-base sm:text-lg leading-tight">
                    {line}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Body fallback */}
          {ann.body && (!Array.isArray(ann.highlights) || ann.highlights.length === 0) && (
            <p className="mt-6 text-sm text-white/80 leading-relaxed whitespace-pre-line">
              {ann.body}
            </p>
          )}

          {/* CTA */}
          <div className="mt-7 flex justify-end">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={dismissing}
              data-testid="update-announcement-acknowledge"
              className="relative inline-flex items-center justify-center px-6 py-3 rounded-full font-bold text-xs tracking-[0.22em] uppercase text-black bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 hover:from-amber-200 hover:via-yellow-300 hover:to-orange-300 shadow-[0_14px_36px_-10px_rgba(251,191,36,0.65)] disabled:opacity-70 transition-all"
            >
              {dismissing ? "..." : "Am înțeles"}
            </button>
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes ua-pop {
          0%   { opacity: 0; transform: translateY(16px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0)    scale(1);     }
        }
      `}</style>
    </div>
  );
}
