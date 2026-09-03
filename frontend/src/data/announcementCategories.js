import { Crown, Ghost, PlayCircle, ShieldCheck, Trophy, Megaphone } from "lucide-react";

// Category styling for the announcements section (list + detail).
export const ANN_CATEGORIES = {
  noutate: { label: "Noutate", accent: "#a855f7", grad: "from-[#3a1d63] via-[#241041] to-[#140b26]", icon: Crown },
  eveniment: { label: "Eveniment", accent: "#f97316", grad: "from-[#5a2a10] via-[#3a1a0a] to-[#1f0f05]", icon: Ghost },
  update: { label: "Update", accent: "#3b82f6", grad: "from-[#0f3a63] via-[#0a2340] to-[#061424]", icon: PlayCircle },
  sistem: { label: "Sistem", accent: "#22c55e", grad: "from-[#0f3a26] via-[#0a2618] to-[#05170e]", icon: ShieldCheck },
  concurs: { label: "Concurs", accent: "#eab308", grad: "from-[#5a4610] via-[#3a2e0a] to-[#1f1805]", icon: Trophy },
};

export const DEFAULT_CATEGORY = "noutate";

// Resolve a category key from an announcement (uses explicit field, else infers from text/cta).
export function resolveCategory(n) {
  const raw = (n?.category || "").toString().trim().toLowerCase();
  if (ANN_CATEGORIES[raw]) return raw;
  const hay = `${n?.title || ""} ${n?.body || ""} ${n?.cta_link || ""}`.toLowerCase();
  if (/plus|abonament|premium/.test(hay)) return "noutate";
  if (/halloween|eveniment|concert|petrecere|surpriz/.test(hay)) return "eveniment";
  if (/beta|live tv|update|actualiz|versiune|funcți/.test(hay)) return "update";
  if (/securit|protej|parol|cont|date personale/.test(hay)) return "sistem";
  if (/concurs|premi|castig|câștig|tombol/.test(hay)) return "concurs";
  return DEFAULT_CATEGORY;
}

export function catStyle(n) {
  return ANN_CATEGORIES[resolveCategory(n)] || ANN_CATEGORIES[DEFAULT_CATEGORY];
}

export function fmtDate(iso) {
  try {
    const d = new Date(iso);
    const months = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sept", "Oct", "Nov", "Dec"];
    return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "";
  }
}

export function fmtTime(iso) {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

export function isNew(iso, days = 7) {
  try {
    return (Date.now() - new Date(iso).getTime()) / 86400000 <= days;
  } catch {
    return false;
  }
}

export { Megaphone };
