import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { HeroBanner } from "@/components/HeroBanner";
import { ContentCarousel } from "@/components/ContentCarousel";
import { LOGO_TRANSPARENT, CHANNELS } from "@/data/constants";
import { OnlineCounter } from "@/components/OnlineCounter";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import PromoPopup from "@/components/PromoPopup";
import { Link } from "react-router-dom";

const Home = () => {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    api.get("/shows").then((res) => {
      setShows(res.data);
      setLoading(false);
    });
  }, []);

  // Hero: max 5 shows, randomized once per page load
  const heroShows = useMemo(() => {
    const arr = [...shows];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 5);
  }, [shows]);

  // rotating hero (Netflix style)
  useEffect(() => {
    if (heroShows.length < 2) return;
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroShows.length);
    }, 6000);
    return () => clearInterval(t);
  }, [heroShows.length]);

  // Ultimele adaugate: sorted by created_at desc
  const latest = [...shows].sort((a, b) =>
    (b.created_at || "").localeCompare(a.created_at || "")
  );

  const featured = heroShows[heroIndex];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      <NavBar />
      <PromoPopup />
      <AnnouncementBar />
      {loading ? (
        <div className="h-screen flex items-center justify-center text-white/40">Se încarcă...</div>
      ) : (
        <>
          <div className="relative">
            <HeroBanner key={featured?.id} show={featured} />
            {/* hero indicators */}
            {heroShows.length > 1 && (
              <div className="absolute bottom-6 right-6 md:right-12 z-20 flex gap-2">
                {heroShows.map((s, i) => (
                  <button
                    key={s.id}
                    data-testid={`hero-dot-${i}`}
                    onClick={() => setHeroIndex(i)}
                    aria-label={`Slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === heroIndex ? "w-7 bg-[#ec1c24]" : "w-3 bg-white/40 hover:bg-white/70"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="relative z-10 -mt-16 pb-16">
            <ContentCarousel title="Ultimele Adăugate" shows={latest} />
            {CHANNELS.map((ch) => {
              const list = shows.filter((s) => s.channel === ch);
              return <ContentCarousel key={ch} title={ch} shows={list} />;
            })}
          </div>
        </>
      )}

      <footer className="border-t border-white/10 px-4 md:px-12 py-10">
        <img src={LOGO_TRANSPARENT} alt="Cartoonix" className="h-10 mb-4" />
        <p className="text-sm text-white/40 max-w-md">
          Cartoonix — biblioteca ta cu desenele copilăriei de pe Cartoon Network, Jetix, Minimax și Boomerang.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 text-sm">
          <Link data-testid="footer-terms-link" to="/termeni" className="text-white/60 hover:text-[#ffcc00] transition-colors duration-200">Termeni și Condiții</Link>
          <Link data-testid="footer-privacy-link" to="/confidentialitate" className="text-white/60 hover:text-[#ffcc00] transition-colors duration-200">Politica de Confidențialitate</Link>
          <Link data-testid="footer-help-link" to="/help" className="text-white/60 hover:text-[#ffcc00] transition-colors duration-200">Suport</Link>
        </div>
        <p className="text-xs text-white/30 mt-4">© 2026 Cartoonix. Toate drepturile rezervate.</p>
      </footer>

      <OnlineCounter />
    </div>
  );
};

export default Home;
