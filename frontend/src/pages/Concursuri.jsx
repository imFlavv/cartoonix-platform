import { NavBar } from "@/components/NavBar";
import { Trophy } from "lucide-react";

const Concursuri = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-16 min-h-screen relative flex items-center justify-center">
        <div
          className="absolute inset-0 top-16 bg-center bg-cover"
          style={{ backgroundImage: 'url("/concursuri-card2.png")' }}
        />
        <div className="absolute inset-0 top-16 bg-gradient-to-b from-black/50 via-black/25 to-black/75" />
        <div className="relative z-10 text-center px-4">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-[#a855f7]/20 border border-[#a855f7]/50 text-[#c084fc] text-xs font-bold uppercase tracking-widest">
            <Trophy className="h-4 w-4" /> Concursuri
          </div>
          <h1
            data-testid="concursuri-soon"
            className="font-display italic text-6xl md:text-8xl leading-none"
            style={{ textShadow: "0 4px 40px rgba(0,0,0,0.85), 0 0 30px rgba(168,85,247,0.4)" }}
          >
            ÎN CURÂND!
          </h1>
          <p className="mt-4 text-white/80 text-lg max-w-lg mx-auto" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>
            Pregătim concursuri cu premii Cartoonix. Revino curând!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Concursuri;
