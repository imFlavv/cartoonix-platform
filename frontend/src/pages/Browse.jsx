import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { ShowCard } from "@/components/ShowCard";
import { CHANNELS } from "@/data/constants";

const Browse = () => {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [shows, setShows] = useState([]);
  const [filter, setFilter] = useState("Toate");

  useEffect(() => {
    api.get("/shows", { params: q ? { q } : {} }).then((res) => setShows(res.data));
  }, [q]);

  const filtered = filter === "Toate" ? shows : shows.filter((s) => s.channel === filter);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-24 px-4 md:px-12 pb-16">
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
