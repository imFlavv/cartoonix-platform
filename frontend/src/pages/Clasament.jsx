import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { Trophy, Search, Crown, Medal, Coins } from "lucide-react";

const rankStyle = (rank) => {
  if (rank === 1) return { color: "#ffcc00", ring: "ring-[#ffcc00]" };
  if (rank === 2) return { color: "#c0c0c0", ring: "ring-[#c0c0c0]" };
  if (rank === 3) return { color: "#cd7f32", ring: "ring-[#cd7f32]" };
  return { color: "#ffffff55", ring: "ring-white/10" };
};

const Row = ({ e, highlight = false }) => {
  const rs = rankStyle(e.rank);
  return (
    <div
      data-testid={`lb-row-${e.rank}`}
      className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-colors duration-200 ${
        highlight ? "bg-[#ffcc00]/10 border-[#ffcc00]/40" : "bg-[#141414] border-white/5 hover:bg-[#1c1c1c]"
      }`}
    >
      <div className="w-7 flex items-center justify-center shrink-0">
        {e.rank <= 3 ? (
          e.rank === 1 ? <Crown className="h-5 w-5" style={{ color: rs.color }} /> : <Medal className="h-5 w-5" style={{ color: rs.color }} />
        ) : (
          <span className="text-white/50 font-bold text-sm">{e.rank}</span>
        )}
      </div>
      <img src={e.avatar} alt={e.name} className={`h-9 w-9 rounded-full object-cover ring-2 ${rs.ring}`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate flex items-center gap-2">
          {e.name}
          {e.online && <span className="h-2 w-2 rounded-full bg-[#22c55e] shrink-0" title="Online" />}
        </p>
      </div>
      <p className="font-display text-base text-[#ffcc00] shrink-0">{e.hours_label}</p>
    </div>
  );
};

const PointsRow = ({ e, highlight = false }) => {
  const rs = rankStyle(e.rank);
  return (
    <div
      data-testid={`lb-points-row-${e.rank}`}
      className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-colors duration-200 ${
        highlight ? "bg-[#ec4899]/10 border-[#ec4899]/40" : "bg-[#141414] border-white/5 hover:bg-[#1c1c1c]"
      }`}
    >
      <div className="w-7 flex items-center justify-center shrink-0">
        {e.rank <= 3 ? (
          e.rank === 1 ? <Crown className="h-5 w-5" style={{ color: rs.color }} /> : <Medal className="h-5 w-5" style={{ color: rs.color }} />
        ) : (
          <span className="text-white/50 font-bold text-sm">{e.rank}</span>
        )}
      </div>
      <img src={e.avatar} alt={e.name} className={`h-9 w-9 rounded-full object-cover ring-2 ${rs.ring}`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate flex items-center gap-2">
          {e.name}
          {e.online && <span className="h-2 w-2 rounded-full bg-[#22c55e] shrink-0" title="Online" />}
        </p>
      </div>
      <p className="font-display text-base text-[#ec4899] shrink-0 flex items-center gap-1">
        <Coins className="h-4 w-4" /> {Number(e.points || 0).toLocaleString("ro-RO")}
      </p>
    </div>
  );
};

const Clasament = () => {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const load = () => api.get("/leaderboard").then((res) => setData(res.data)).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const doSearch = async (e) => {
    e?.preventDefault();
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setSearching(true);
    try {
      const { data: d } = await api.get(`/leaderboard?q=${encodeURIComponent(q.trim())}`);
      setResults(d.results || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-20 px-4 md:px-12 pb-6 max-w-5xl mx-auto">
        <h1 className="font-display italic text-3xl mb-1 flex items-center gap-3">
          <Trophy className="h-7 w-7 text-[#ffcc00]" /> Clasament
        </h1>
        <p className="text-white/50 text-sm mb-4">Top utilizatori după timpul petrecut online și după puncte.</p>

        {/* Search */}
        <form onSubmit={doSearch} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              data-testid="lb-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Caută-te după nume..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]"
            />
          </div>
          <button data-testid="lb-search-btn" type="submit" disabled={searching} className="px-5 rounded-xl bg-[#ffcc00] text-black font-bold hover:brightness-110 transition-all duration-200 disabled:opacity-60">
            {searching ? "..." : "Caută"}
          </button>
        </form>

        {/* Search results */}
        {results !== null && (
          <div className="mb-4" data-testid="lb-search-results">
            <h2 className="font-display text-lg mb-2">Rezultate căutare</h2>
            {results.length === 0 ? (
              <p className="text-white/40 text-sm">Niciun utilizator găsit pentru „{q}".</p>
            ) : (
              <div className="space-y-1.5">
                {results.map((e) => <Row key={`s-${e.id}`} e={e} highlight={e.id === data?.me?.id} />)}
              </div>
            )}
          </div>
        )}

        {/* Your position — compact banner */}
        {data?.me && (
          <div data-testid="lb-me" className="mb-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#ffcc00]/10 border border-[#ffcc00]/40">
            <div className="flex items-center gap-3 min-w-0">
              <img src={data.me.avatar} alt={data.me.name} className="h-9 w-9 rounded-full object-cover ring-2 ring-[#ffcc00]" />
              <div className="min-w-0">
                <p className="text-[11px] text-white/50 uppercase tracking-wide leading-none mb-0.5">Poziția ta</p>
                <p className="font-semibold text-sm truncate">{data.me.name} · locul #{data.me.rank}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-lg text-[#ffcc00] leading-none">{data.me.hours_label}</p>
              <p className="text-[10px] text-white/40 uppercase">online</p>
            </div>
          </div>
        )}

        {/* Two leaderboards side by side */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top online time */}
          <div>
            <h2 className="font-display text-lg mb-2 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#ffcc00]" /> Top Timp Online
            </h2>
            <div className="space-y-1.5" data-testid="lb-top">
              {(data?.top || []).map((e) => <Row key={e.id} e={e} highlight={e.id === data?.me?.id} />)}
              {data && data.top.length === 0 && <p className="text-white/40 text-sm">Încă nu există date de clasament.</p>}
            </div>
          </div>

          {/* Top points */}
          <div>
            <h2 className="font-display text-lg mb-2 flex items-center gap-2">
              <Coins className="h-5 w-5 text-[#ec4899]" /> Top Puncte
            </h2>
            <div className="space-y-1.5" data-testid="lb-top-points">
              {(data?.top_points || []).map((e) => <PointsRow key={`p-${e.id}`} e={e} highlight={e.id === data?.me?.id} />)}
              {data && (!data.top_points || data.top_points.length === 0) && <p className="text-white/40 text-sm">Încă nimeni nu are puncte. Donează sau câștigă recompense!</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Clasament;
