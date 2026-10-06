const TAG_STYLES = {
  NEW: "bg-[#22c55e]/15 text-[#86efac] border-[#22c55e]/30",
  IMPROVED: "bg-[#38bdf8]/15 text-[#7dd3fc] border-[#38bdf8]/30",
  FIXED: "bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/30",
  REMOVED: "bg-[#ef4444]/15 text-[#f87171] border-[#ef4444]/30",
  "COMING SOON": "bg-[#a855f7]/15 text-[#c9a3ff] border-[#a855f7]/30",
};

const Badge = ({ label }) => (
  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${TAG_STYLES[label] || "bg-white/10 text-white/70 border-white/20"}`}>
    {label}
  </span>
);

const Section = ({ label, items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-4">
      <div className="mb-2"><Badge label={label} /></div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-[#9b93c2] flex gap-2">
            <span className="text-white/30">—</span> {it}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const UpdateNoteCard = ({ update }) => (
  <div data-testid={`wiki-update-card-${update.id}`} className="cx-wiki-card cx-wiki-fade-up p-6">
    <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
      <h3 className="font-black text-xl text-white">{update.title}</h3>
      <span className="text-sm font-semibold text-[#c9a3ff]">{update.period}</span>
    </div>
    <div className="flex gap-1.5 flex-wrap mb-5">
      {update.tags.map((t) => (
        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#9b93c2] border border-white/10">{t}</span>
      ))}
    </div>
    <Section label="NEW" items={update.new} />
    <Section label="IMPROVED" items={update.improved} />
    <Section label="FIXED" items={update.fixed} />
    <Section label="REMOVED" items={update.removed} />
    <Section label="COMING SOON" items={update.comingNext} />
  </div>
);
