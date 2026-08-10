import { NavBar } from "@/components/NavBar";
import { Film } from "lucide-react";

const Cinema = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-16 min-h-screen relative flex items-center justify-center">
        {/* Attached illustration as background */}
        <div
          className="absolute inset-0 top-16 bg-center bg-cover"
          style={{ backgroundImage: 'url("/cinema-bg.png")' }}
        />
        <div className="absolute inset-0 top-16 bg-gradient-to-b from-black/50 via-black/20 to-black/70" />

        <div className="relative z-10 text-center px-4">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 text-[#ffcc00] text-xs font-bold uppercase tracking-widest">
            <Film className="h-4 w-4" /> Cinema
          </div>
          <h1
            data-testid="cinema-soon"
            className="font-display italic text-6xl md:text-8xl leading-none"
            style={{ textShadow: "0 4px 40px rgba(0,0,0,0.85), 0 0 30px rgba(255,204,0,0.35)" }}
          >
            ÎN CURÂND!
          </h1>
          <p className="mt-4 text-white/80 text-lg max-w-lg mx-auto" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>
            Pregătim sala de cinema Cartoonix. Revino curând!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Cinema;
