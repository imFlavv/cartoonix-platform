import { NavBar } from "@/components/NavBar";
import { Tv, Popcorn } from "lucide-react";

const WatchParty = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-24 px-4 flex flex-col items-center justify-center text-center min-h-[70vh]">
        <div className="relative mb-8">
          <div className="absolute inset-0 blur-3xl bg-[#06b6d4]/30 rounded-full" />
          <Tv className="relative h-24 w-24 text-[#06b6d4]" strokeWidth={1.5} />
        </div>
        <h1 className="font-display italic text-5xl md:text-6xl mb-4" style={{ textShadow: "0 2px 40px rgba(6,182,212,0.5)" }}>
          Watch Party
        </h1>
        <p className="text-3xl md:text-4xl font-display text-[#06b6d4]" data-testid="watchparty-soon">
          În curând!
        </p>
        <p className="text-white/50 mt-4 max-w-md flex items-center gap-2 justify-center">
          <Popcorn className="h-4 w-4" /> Vei putea viziona desene împreună cu prietenii, sincronizat, în timp real.
        </p>
      </div>
    </div>
  );
};

export default WatchParty;
