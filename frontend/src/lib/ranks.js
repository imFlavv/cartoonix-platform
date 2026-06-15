/**
 * Cartoonix rank ladder.
 *
 * Each user has a gamification `level` (1-10). We map that level to a themed
 * rank with a display name, a short tagline and a color identity used to paint
 * the crown, rings and progress bar on the profile page.
 *
 * Colors are plain hex/rgb so they can be used both in Tailwind arbitrary
 * values (`style`) and inline gradients.
 */
export const RANKS = [
  { level: 1, name: "Spectator", tagline: "Abia ai intrat în lumea Cartoonix", color: "#94a3b8", glow: "148, 163, 184" },
  { level: 2, name: "Curios", tagline: "Descoperi desene noi în fiecare zi", color: "#22d3ee", glow: "34, 211, 238" },
  { level: 3, name: "Explorator", tagline: "Cunoști deja toate categoriile", color: "#34d399", glow: "52, 211, 153" },
  { level: 4, name: "Aventurier", tagline: "Mereu pregătit pentru un episod nou", color: "#38bdf8", glow: "56, 189, 248" },
  { level: 5, name: "Erou", tagline: "Un nume cunoscut în comunitate", color: "#818cf8", glow: "129, 140, 248" },
  { level: 6, name: "Campion", tagline: "Printre cei mai activi fani", color: "#a78bfa", glow: "167, 139, 250" },
  { level: 7, name: "Maestru", tagline: "Stăpânești perfect platforma", color: "#c084fc", glow: "192, 132, 252" },
  { level: 8, name: "Superstar", tagline: "Strălucești în întreaga comunitate", color: "#f472b6", glow: "244, 114, 182" },
  { level: 9, name: "Legendă", tagline: "Povești se spun despre tine", color: "#fb923c", glow: "251, 146, 60" },
  { level: 10, name: "Mit Cartoonix", tagline: "Ai atins vârful absolut", color: "#fbbf24", glow: "251, 191, 36" },
];

export function getRank(level) {
  const lvl = Math.max(1, Math.min(10, Number(level) || 1));
  return RANKS[lvl - 1];
}

export function getNextRank(level) {
  const lvl = Math.max(1, Math.min(10, Number(level) || 1));
  return lvl >= 10 ? null : RANKS[lvl];
}

/**
 * Format a number of seconds into a friendly Romanian "time online" string.
 *  - < 1 min  -> "câteva secunde"
 *  - minutes  -> "Xm"
 *  - hours    -> "Xh Ym"
 *  - days     -> "Xz Yh"
 */
export function formatOnline(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (s < 60) return s <= 5 ? "câteva secunde" : `${s}s`;
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}z ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Long form member-since date in Romanian. */
export function formatMemberSince(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });
}
