import React, { useMemo } from "react";
import { Megaphone } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

/**
 * Slim horizontal banner anchored under the top navigation.
 *
 * Admin enters one announcement per line in the textarea. When more than one
 * non-empty line is provided, the bar becomes a smooth left-scrolling marquee
 * with a diamond separator between items. With a single item the text is
 * rendered statically (no animation) so it remains perfectly legible.
 *
 * Driven entirely by admin-managed settings:
 *   - `announcement_active` (bool) controls visibility
 *   - `announcement_text` (string) — newline-separated announcements
 *
 * The bar has no dismiss control — it remains until an admin disables it.
 */
export default function AnnouncementBar() {
  const { settings } = useSettings() || {};
  const active = !!settings?.announcement_active;
  const raw = settings?.announcement_text || "";

  const items = useMemo(
    () =>
      String(raw)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    [raw]
  );

  if (!active || items.length === 0) return null;

  const multiple = items.length > 1;

  // Marquee duration scales with total text length so longer strips don't
  // appear to fly past — keeps reading pace comfortable.
  const totalChars = items.reduce((n, s) => n + s.length, 0);
  const duration = Math.max(24, Math.min(70, Math.round(totalChars / 4)));

  const Separator = () => (
    <span
      aria-hidden
      className="mx-5 inline-flex items-center text-[hsl(var(--accent))]/70 select-none"
    >
      <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
        <rect x="0.5" y="0.5" width="5" height="5" transform="rotate(45 3 3)" />
      </svg>
    </span>
  );

  const renderRun = (key) => (
    <div
      key={key}
      className="flex shrink-0 items-center pr-10 text-[13px] sm:text-sm font-medium text-white/90 tracking-wide"
    >
      {items.map((text, i) => (
        <React.Fragment key={`${key}-${i}`}>
          {i > 0 && <Separator />}
          <span>{text}</span>
        </React.Fragment>
      ))}
      {/* Trailing separator before the next loop run for visual continuity */}
      <Separator />
    </div>
  );

  return (
    <div
      data-testid="announcement-bar"
      role="status"
      aria-live="polite"
      className="relative z-30 overflow-hidden border-b border-white/[0.06]"
    >
      {/* Brand-tinted gradient background */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,59,59,0.10) 0%, rgba(250,204,21,0.08) 50%, rgba(255,59,59,0.10) 100%)",
        }}
      />
      {/* Soft top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent))]/40 to-transparent" />

      <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8 py-2.5">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff3b3b] to-[#facc15] text-black shadow-sm">
          <Megaphone className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>

        {multiple ? (
          <div className="relative flex-1 min-w-0 overflow-hidden">
            {/* Fade masks on both sides for a polished look */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-8 z-10"
              style={{
                background:
                  "linear-gradient(to right, rgba(11,12,16,0.85), transparent)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-8 z-10"
              style={{
                background:
                  "linear-gradient(to left, rgba(11,12,16,0.85), transparent)",
              }}
            />
            <div
              className="flex items-center will-change-transform announcement-marquee"
              style={{ animationDuration: `${duration}s` }}
              data-testid="announcement-bar-marquee"
            >
              {renderRun("a")}
              {renderRun("b")}
            </div>
          </div>
        ) : (
          <p
            data-testid="announcement-bar-text"
            className="flex-1 truncate text-[13px] sm:text-sm font-medium text-white/90 tracking-wide"
          >
            {items[0]}
          </p>
        )}
      </div>

      <style>{`
        @keyframes announcement-marquee-kf {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .announcement-marquee {
          animation-name: announcement-marquee-kf;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .announcement-marquee:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .announcement-marquee {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
