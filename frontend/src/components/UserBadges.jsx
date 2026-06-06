import React from "react";
import { PLUS_BADGE_URL, ADMIN_BADGE_URL } from "@/lib/badges";

/**
 * <UserBadges /> — renders the user's identity badge(s) inline, aligned to
 * the surrounding text.
 *
 * `size` — height in px for the PLUS badge.
 * `adminSize` — optional override for the ADMIN badge height (defaults to 30
 * because the wider pill shape needs more presence to remain readable).
 *
 * If both `isAdmin` and `isPlus` are true, only the ADMIN badge is shown.
 */
export default function UserBadges({
  isPlus = false,
  isAdmin = false,
  size = 18,
  adminSize,
  className = "",
}) {
  if (!isPlus && !isAdmin) return null;
  const src = isAdmin ? ADMIN_BADGE_URL : PLUS_BADGE_URL;
  const label = isAdmin ? "Administrator Cartoonix" : "Membru Cartoonix PLUS";
  const renderedHeight = isAdmin ? adminSize ?? 30 : size;
  return (
    <span className={`inline-flex items-center align-middle ${className}`}>
      <img
        src={src}
        alt={label}
        title={label}
        draggable={false}
        className="inline-block select-none"
        style={{
          height: renderedHeight,
          width: "auto",
        }}
      />
    </span>
  );
}
