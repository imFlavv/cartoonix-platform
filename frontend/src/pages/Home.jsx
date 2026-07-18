import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { HeroBanner } from "@/components/HeroBanner";
import { ContentCarousel } from "@/components/ContentCarousel";
import { LOGO_TRANSPARENT } from "@/data/constants";
import { motion } from "framer-motion";

const Home = () => {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/shows").then((res) => {
      setShows(res.data);
      setLoading(false);
    });
  }, []);

  const featured = shows[0];
  const byCategory = shows.reduce((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});
  const byChannel = shows.reduce((acc, s) => {
    (acc[s.channel] = acc[s.channel] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <NavBar />
      {loading ? (
        <div className="h-screen flex items-center justify-center text-white/40">Se încarcă...</div>
      ) : (
        <>
          <HeroBanner show={featured} />
          <div className="relative z-10 -mt-16 pb-16">
            <ContentCarousel title="Populare acum" shows={shows.slice(0, 8)} />
            {Object.entries(byChannel).map(([ch, list]) => (
              <ContentCarousel key={ch} title={ch} shows={list} />
            ))}
            {Object.entries(byCategory).map(([cat, list]) => (
              <ContentCarousel key={cat} title={cat} shows={list} />
            ))}
          </div>
        </>
      )}

      <footer className="border-t border-white/10 px-4 md:px-12 py-10">
        <img src={LOGO_TRANSPARENT} alt="Cartoonix" className="h-10 mb-4" />
        <p className="text-sm text-white/40 max-w-md">
          Cartoonix — biblioteca ta cu desenele copilăriei de pe Cartoon Network, Jetix, Minimax și Boomerang.
        </p>
        <p className="text-xs text-white/30 mt-4">© 2026 Cartoonix. Toate drepturile rezervate.</p>
      </footer>
    </div>
  );
};

export default Home;
