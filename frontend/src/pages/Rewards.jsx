import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { ArrowLeft, Gift } from "lucide-react";

const Rewards = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-24 px-4 md:px-12 pb-16 max-w-3xl mx-auto">
        <button
          data-testid="rewards-back"
          onClick={() => navigate("/lobby")}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200 mb-4"
        >
          <ArrowLeft className="h-5 w-5" /> Lobby
        </button>
        <h1 className="font-display text-5xl mb-8 flex items-center gap-3">
          <Gift className="h-9 w-9 text-[#ec4899]" /> Recompensele tale
        </h1>

        <div
          data-testid="rewards-empty"
          className="flex flex-col items-center justify-center text-center py-20 bg-[#0f0f0f] border border-white/10 rounded-2xl"
        >
          <div className="cx-float mb-4">
            <Gift className="h-16 w-16 text-white/25" />
          </div>
          <p className="text-white/50 text-lg">Momentan nu ai nimic aici.</p>
        </div>
      </div>
    </div>
  );
};

export default Rewards;
