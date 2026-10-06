import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Film, Clapperboard, BarChart3 } from "lucide-react";

export const AdminStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/stats")
      .then(({ data }) => setStats(data))
      .catch(() => setStats({ total_shows: 0, total_episodes: 0 }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6" data-testid="admin-stats">
      <div>
        <h2 className="font-display text-2xl mb-1 flex items-center gap-2"><BarChart3 className="h-6 w-6 text-[#ffcc00]" /> Statistici platformă</h2>
        <p className="text-sm text-white/50">Numărul total de desene și episoade disponibile pe Cartoonix.</p>
      </div>

      {loading ? (
        <p className="text-white/40 text-sm py-6 text-center">Se încarcă...</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
          <div data-testid="admin-stats-shows" className="rounded-2xl border border-[#ffcc00]/30 bg-gradient-to-br from-[#1a1607] to-[#0f0f0f] p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wide text-white/50 font-semibold">Total desene</p>
              <Film className="h-5 w-5 text-[#ffcc00]" />
            </div>
            <span className="font-display text-5xl text-[#ffcc00]">{stats.total_shows}</span>
          </div>
          <div data-testid="admin-stats-episodes" className="rounded-2xl border border-[#ec1c24]/30 bg-gradient-to-br from-[#1a0a0b] to-[#0f0f0f] p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wide text-white/50 font-semibold">Total episoade</p>
              <Clapperboard className="h-5 w-5 text-[#ec1c24]" />
            </div>
            <span className="font-display text-5xl text-[#ec1c24]">{stats.total_episodes}</span>
          </div>
        </div>
      )}
    </div>
  );
};
