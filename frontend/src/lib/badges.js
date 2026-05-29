/**
 * Cartoonix badge system.
 *
 * Levels 1-10 — every user starts at level 1. Only the level-1 artwork is
 * available right now; higher levels gracefully fall back to it until the
 * dedicated art is supplied. Drop new files at /public/badges/level-N.png and
 * register them in LEVEL_IMAGES to light them up.
 */
const LEVEL_IMAGES = {
  1: "/badges/level-1.png",
  // 2: "/badges/level-2.png",
  // ... up to 10
};

export const MAX_LEVEL = 10;

export function clampLevel(level) {
  const n = Number(level);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(MAX_LEVEL, Math.round(n)));
}

export function levelBadgeUrl(level) {
  const lvl = clampLevel(level);
  return LEVEL_IMAGES[lvl] || LEVEL_IMAGES[1];
}

export const PLUS_BADGE_URL = "/badges/plus.png";
