import React from "react";
import { PLUS_BADGE_URL } from "@/lib/badges";

/**
 * <UserBadges /> — renders the user's PLUS badge inline, aligned to text.
 *
 * `size` is the rendered HEIGHT in px; width auto-scales.
 */
export default function UserBadges({
  isPlus = false,
  size = 18,
  className = "",
}) {
  if (!isPlus) return null;
  return (
    <span className={`inline-flex items-center align-middle ${className}`}>
      <img
        src={PLUS_BADGE_URL}
        alt="Membru Cartoonix PLUS"
        title="Membru Cartoonix PLUS"
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
