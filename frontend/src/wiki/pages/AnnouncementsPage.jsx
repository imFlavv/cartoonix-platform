import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ANNOUNCEMENTS } from "../data/announcements";
import { AnnouncementCard } from "../components/AnnouncementCard";

const FILTERS = ["Toate", "IMPORTANT", "NEWS", "MAINTENANCE", "EVENT", "CINEMA", "NEW CONTENT", "COMMUNITY"];

export default function AnnouncementsPage() {
  const [filter, setFilter] = useState("Toate");
  const [sort, setSort] = useState("newest");
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    let list = [...ANNOUNCEMENTS];
    if (filter !== "Toate") list = list.filter((a) => a.category === filter);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(needle) || a.excerpt.toLowerCase().includes(needle));
    }
    list.sort((a, b) => (sort === "newest" ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date)));
    const pinned = list.filter((a) => a.pinned);
    const rest = list.filter((a) => !a.pinned);
    return [...pinned, ...rest];
  }, [filter, sort, q]);

  return (
    <div data-testid="wiki-announcements-page">
      <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Anunțuri Cartoonix</h1>
      <p className="text-[#9b93c2] mb-8">Noutăți oficiale, informații de mentenanță, evenimente și anunțuri importante despre platformă.</p>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            data-testid="wiki-announcements-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Caută anunțuri..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#a855f7]/50"
          />
        </div>
        <select
          data-testid="wiki-announcements-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80"
        >
          <option value="newest" className="bg-[#16132e]">Cele mai noi</option>
          <option value="oldest" className="bg-[#16132e]">Cele mai vechi</option>
        </select>
      </div>

      <div className="flex gap-2 flex-wrap mb-8">
        {FILTERS.map((f) => (
          <button
            key={f}
            data-testid={`wiki-announcements-filter-${f}`}
            onClick={() => setFilter(f)}
            className={`text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
              filter === f ? "bg-[#a855f7]/20 text-[#c9a3ff] border-[#a855f7]/50" : "bg-white/5 text-white/50 border-white/10 hover:border-white/20"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((a) => <AnnouncementCard key={a.slug} item={a} />)}
        {items.length === 0 && <p className="text-[#9b93c2] col-span-2">Niciun anunț găsit pentru acest filtru.</p>}
      </div>
    </div>
  );
}
