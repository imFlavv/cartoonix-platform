import React from "react";
import { PLUS_BADGE_URL, ADMIN_BADGE_URL } from "@/lib/badges";

/**
 * <UserBadges /> — renders the user's identity badge(s) inline, aligned to
 * the surrounding text.
 *
 * `size` is the rendered HEIGHT in px; width auto-scales.
 *
 * If both `isAdmin` and `isPlus` are true, only the ADMIN badge is shown
 * (admin always supersedes the PLUS pill).
 */
export default function UserBadges({
  isPlus = false,
  isAdmin = false,
  size = 18,
  className = "",
}) {
  if (!isPlus && !isAdmin) return null;
  const src = isAdmin ? ADMIN_BADGE_URL : PLUS_BADGE_URL;
  const label = isAdmin ? "Administrator Cartoonix" : "Membru Cartoonix PLUS";
  return (
    <span className={`inline-flex items-center align-middle ${className}`}>
      <img
        src={src}
        alt={label}
        title={label}
        draggable={false}
        className="inline-block select-none"
        style={{
          height: size,
          width: "auto",
        }}
      />
    </span>
  );
}
