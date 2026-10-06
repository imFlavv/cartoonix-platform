import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { UPDATES } from "../data/updates";
import { UpdateNoteCard } from "../components/UpdateNoteCard";

const FILTERS = ["Toate", "Platformă", "Conținut", "Cinema", "LIVE", "Evenimente", "Recompense", "Comunitate", "Mentenanță"];

export default function UpdatesPage() {
  const [filter, setFilter] = useState("Toate");
  const [sort, setSort] = useState("newest");
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    let list = [...UPDATES];
    if (filter !== "Toate") list = list.filter((u) => u.tags.includes(filter));
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((u) =>
        u.title.toLowerCase().includes(needle) ||
        [...(u.new || []), ...(u.improved || []), ...(u.fixed || [])].some((t) => t.toLowerCase().includes(needle))
      );
    }
    list.sort((a, b) => (sort === "newest" ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)));
    return list;
  }, [filter, sort, q]);

  return (
    <div data-testid="wiki-updates-page" id="mentenanta">
      <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">Note de Actualizare Cartoonix</h1>
      <p className="text-[#9b93c2] mb-8">Vezi ce este nou, ce s-a îmbunătățit și ce s-a reparat pe Cartoonix.</p>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            data-testid="wiki-updates-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Caută în actualizări..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#a855f7]/50"
          />
        </div>
        <select
          data-testid="wiki-updates-sort"
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
            data-testid={`wiki-updates-filter-${f}`}
            onClick={() => setFilter(f)}
            className={`text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full border transition-colors ${
              filter === f ? "bg-[#a855f7]/20 text-[#c9a3ff] border-[#a855f7]/50" : "bg-white/5 text-white/50 border-white/10 hover:border-white/20"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {items.map((u) => <UpdateNoteCard key={u.id} update={u} />)}
        {items.length === 0 && <p className="text-[#9b93c2]">Nicio actualizare găsită pentru acest filtru.</p>}
      </div>
    </div>
  );
}
