import React from "react";
import { PLUS_BADGE_URL, ADMIN_BADGE_URL, MODERATOR_BADGE_URL } from "@/lib/badges";

/**
 * <UserBadges /> — renders ALL identity badges a user holds, inline and aligned
 * to the surrounding text. A user can stack several (e.g. PLUS + Moderator).
 *
 * Order: PLUS crown → Moderator crown → Admin pill.
 *
 * `size` — height in px for the square/crown badges (PLUS, Moderator).
 * `adminSize` — optional override for the wider ADMIN pill (defaults to 30).
 */
export default function UserBadges({
  isPlus = false,
  isAdmin = false,
  isModerator = false,
  size = 18,
  adminSize,
  moderatorSize,
  className = "",
}) {
  if (!isPlus && !isAdmin && !isModerator) return null;
  const adminHeight = adminSize ?? 30;
  const modHeight = moderatorSize ?? size;
  return (
    <span className={`inline-flex items-center gap-0.5 align-middle ${className}`}>
      {isPlus && (
        <img
          src={PLUS_BADGE_URL}
          alt="Membru Cartoonix PLUS"
          title="Membru Cartoonix PLUS"
          draggable={false}
          className="inline-block select-none"
          style={{ height: size, width: "auto" }}
        />
      )}
      {isModerator && (
        <img
          src={MODERATOR_BADGE_URL}
          alt="Moderator Cartoonix"
          title="Moderator Cartoonix"
          draggable={false}
          className="inline-block select-none"
          style={{ height: modHeight, width: "auto" }}
        />
      )}
      {isAdmin && (
        <img
          src={ADMIN_BADGE_URL}
          alt="Administrator Cartoonix"
          title="Administrator Cartoonix"
          draggable={false}
          className="inline-block select-none"
          style={{ height: adminHeight, width: "auto" }}
        />
      )}
    </span>
  );
}
