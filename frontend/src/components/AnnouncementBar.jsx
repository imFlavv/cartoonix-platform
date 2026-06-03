import React from "react";
import { Megaphone } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

/**
 * A slim, elegant horizontal banner anchored directly below the top navigation.
 * Driven entirely by admin-managed settings:
 *   - `announcement_active` (bool) controls visibility
 *   - `announcement_text` (string) is the message shown
 * No dismiss control — the bar stays until an admin disables it.
 *
 * Visual aligned with the Cartoonix accent palette (red → amber), but kept
 * intentionally restrained so it does not compete with hero content below.
 */
export default function AnnouncementBar() {
  const { settings } = useSettings() || {};
  const active = !!settings?.announcement_active;
  const text = (settings?.announcement_text || "").trim();
  if (!active || !text) return null;

  return (
    <div
      data-testid="announcement-bar"
      role="status"
      aria-live="polite"
      className="relative z-30 border-b border-white/[0.06]"
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
      {/* Soft top highlight to separate from the nav above */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent))]/40 to-transparent" />

      <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8 py-2.5">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff3b3b] to-[#facc15] text-black shadow-sm">
          <Megaphone className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
        <p
          data-testid="announcement-bar-text"
          className="flex-1 truncate text-[13px] sm:text-sm font-medium text-white/90 tracking-wide"
        >
          {text}
        </p>
      </div>
    </div>
  );
}
