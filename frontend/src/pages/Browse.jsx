import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { ShowCard } from "@/components/ShowCard";
import { CHANNELS } from "@/data/constants";
import { useAuth } from "@/context/AuthContext";
import { Ban } from "lucide-react";

const Browse = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [shows, setShows] = useState([]);
  const [filter, setFilter] = useState("Toate");
  const [playersDisabled, setPlayersDisabled] = useState(false);

  useEffect(() => {
    api.get("/shows", { params: q ? { q } : {} }).then((res) => setShows(res.data));
  }, [q]);

  useEffect(() => {
    api.get("/settings/players").then((r) => setPlayersDisabled(!!r.data?.disabled)).catch(() => {});
  }, []);

  const filtered = filter === "Toate" ? shows : shows.filter((s) => s.channel === filter);

  if (playersDisabled && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="browse-disabled">
        <NavBar />
        <div className="pt-24 pb-16 px-4">
          <div className="max-w-md mx-auto text-center bg-[#111] border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl">
            <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Ban className="h-8 w-8 text-white/50" />
            </div>
            <h1 className="font-display text-3xl mb-3">Biblioteca este indisponibilă</h1>
            <p className="text-white/60 mb-6">Momentan nu poți naviga în bibliotecă. Te poți uita la Cartoonix TV live!</p>
            <button onClick={() => navigate("/live")} className="px-7 py-3 rounded-full bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition">Mergi la Live TV</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-24 px-4 md:px-12 pb-16">
        {playersDisabled && isAdmin && (
          <div data-testid="browse-admin-banner" className="mb-5 flex items-center gap-2 rounded-xl bg-[#ec1c24]/15 border border-[#ec1c24]/40 px-4 py-3 text-sm text-[#ff8085]">
            <Ban className="h-4 w-4 shrink-0" /> Biblioteca este <b className="mx-1">indisponibilă</b> pentru membri. Doar tu (admin) o vezi acum.
          </div>
        )}
        <h1 className="font-display text-4xl md:text-5xl mb-6">
          {q ? `Rezultate pentru "${q}"` : "Bibliotecă"}
        </h1>

        <div className="flex flex-wrap gap-2 mb-8">
          {["Toate", ...CHANNELS].map((c) => (
            <button
              key={c}
              data-testid={`filter-${c}`}
              onClick={() => setFilter(c)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                filter === c
                  ? "bg-[#ec1c24] text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-white/40">Niciun desen găsit.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {filtered.map((s) => (
              <ShowCard key={s.id} show={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;
