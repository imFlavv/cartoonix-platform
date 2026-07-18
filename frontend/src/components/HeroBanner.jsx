import { useNavigate } from "react-router-dom";
import { Play, Plus, Info } from "lucide-react";
import { motion } from "framer-motion";

export const HeroBanner = ({ show }) => {
  const navigate = useNavigate();
  if (!show) return null;
  const bg = show.banner || show.thumbnail;

  return (
    <section
      data-testid="hero-banner"
      className="relative w-full h-[72vh] md:h-[88vh] flex flex-col justify-end pb-20 md:pb-28 px-4 md:px-12"
    >
      <div className="absolute inset-0">
        <img src={bg} alt={show.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/90 via-[#0a0a0a]/30 to-transparent" />
      </div>

      <motion.div
        className="relative max-w-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="inline-block px-3 py-1 rounded-full bg-[#ec1c24] text-xs font-bold uppercase tracking-wider mb-4">
          {show.channel}
        </span>
        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-none mb-4">
          {show.title}
        </h1>
        <p className="text-sm md:text-base text-white/80 mb-6 line-clamp-3 max-w-xl">
          {show.description}
        </p>
        <div className="flex items-center gap-3">
          <button
            data-testid="hero-play-button"
            onClick={() => navigate(`/show/${show.id}`)}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white text-black font-bold hover:bg-[#ffcc00] transition-colors duration-200"
          >
            <Play className="h-5 w-5 fill-black" /> Vizionează
          </button>
          <button
            data-testid="hero-info-button"
            onClick={() => navigate(`/show/${show.id}`)}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white/15 backdrop-blur text-white font-bold hover:bg-white/25 transition-colors duration-200"
          >
            <Info className="h-5 w-5" /> Detalii
          </button>
        </div>
      </motion.div>
    </section>
  );
};
