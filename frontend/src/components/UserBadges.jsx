import React from "react";
import { levelBadgeUrl, PLUS_BADGE_URL, clampLevel } from "@/lib/badges";

/**
 * <UserBadges /> — renders a user's earned badges inline, aligned to text.
 *
 *  • Level badge (1-10) — always shown unless showLevel={false}
 *  • PLUS badge (gold star) — shown when isPlus is true
 *
 * `size` is the rendered HEIGHT in px; width auto-scales to keep the hex shape.
 */
export default function UserBadges({
  level = 1,
  isPlus = false,
  size = 18,
  showLevel = true,
  gap = 4,
  className = "",
}) {
  const lvl = clampLevel(level);
  return (
    <span
      className={`inline-flex items-center align-middle ${className}`}
      style={{ gap }}
    >
      {showLevel && (
        <img
          src={levelBadgeUrl(lvl)}
          alt={`Nivel ${lvl}`}
          title={`Nivel ${lvl}`}
          draggable={false}
          className="inline-block select-none"
          style={{
            height: size,
            width: "auto",
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.55))",
          }}
        />
      )}
      {isPlus && (
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
      )}
    </span>
  );
}
