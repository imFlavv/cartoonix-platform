export const ANNOUNCEMENT_CATEGORY_STYLES = {
  IMPORTANT: "bg-[#ef4444]/15 text-[#f87171] border-[#ef4444]/30",
  NEWS: "bg-[#38bdf8]/15 text-[#7dd3fc] border-[#38bdf8]/30",
  MAINTENANCE: "bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/30",
  EVENT: "bg-[#a855f7]/15 text-[#c9a3ff] border-[#a855f7]/30",
  CINEMA: "bg-[#ec4899]/15 text-[#f9a8d4] border-[#ec4899]/30",
  "NEW CONTENT": "bg-[#22c55e]/15 text-[#86efac] border-[#22c55e]/30",
  COMMUNITY: "bg-[#6366f1]/15 text-[#a5b4fc] border-[#6366f1]/30",
};

export const AnnouncementBadge = ({ category }) => (
  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${ANNOUNCEMENT_CATEGORY_STYLES[category] || "bg-white/10 text-white/70 border-white/20"}`}>
    {category}
  </span>
);
