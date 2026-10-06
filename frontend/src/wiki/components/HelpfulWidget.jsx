import { useState } from "react";
import { ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const HelpfulWidget = () => {
  const navigate = useNavigate();
  const [answer, setAnswer] = useState(null);

  return (
    <div className="mt-12 cx-wiki-card p-6 text-center">
      {answer === null ? (
        <>
          <p className="font-semibold text-white mb-3">Această pagină a fost utilă?</p>
          <div className="flex items-center justify-center gap-3">
            <button
              data-testid="wiki-helpful-yes"
              onClick={() => setAnswer("yes")}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-[#22c55e]/50 hover:text-[#86efac] transition-colors text-sm font-semibold"
            >
              <ThumbsUp className="h-4 w-4" /> DA
            </button>
            <button
              data-testid="wiki-helpful-no"
              onClick={() => setAnswer("no")}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-[#ef4444]/50 hover:text-[#f87171] transition-colors text-sm font-semibold"
            >
              <ThumbsDown className="h-4 w-4" /> NU
            </button>
          </div>
        </>
      ) : (
        <p data-testid="wiki-helpful-thanks" className="text-sm text-[#9b93c2]">Mulțumim pentru feedback!</p>
      )}

      <div className="mt-6 pt-6 border-t border-white/10">
        <p className="text-sm text-[#9b93c2] mb-3">Ai nevoie de ajutor suplimentar?</p>
        <button
          data-testid="wiki-visit-cartoonix-btn"
          onClick={() => navigate("/home")}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white text-sm font-bold hover:brightness-110 transition-all"
        >
          Vizitează Cartoonix <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
