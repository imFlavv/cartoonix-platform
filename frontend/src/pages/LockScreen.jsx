import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import { LOGO_TRANSPARENT } from "@/data/constants";

const LockScreen = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden">
      {/* Background room image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/lock-bg.webp')" }}
      />
      {/* Dark gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/85" />

      <div className="relative z-10 w-full max-w-md text-center">
        <img
          src={LOGO_TRANSPARENT}
          alt="Cartoonix"
          className="h-16 mx-auto mb-6 drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
        />
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
          Zonă exclusivă pentru membri
        </h1>
        <p className="text-white/80 text-base md:text-lg mb-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          Trebuie să fii conectat ca să intri în Cartoonix. Conectează-te sau creează
          un cont gratuit ca să descoperi desenele copilăriei.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            data-testid="lock-login"
            onClick={() => navigate("/login")}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#ec1c24] text-white font-bold text-lg hover:bg-[#ff2d36] transition-colors duration-200 shadow-[0_8px_30px_rgba(236,28,36,0.5)]"
          >
            <LogIn className="h-5 w-5" /> Conectează-te
          </button>
          <button
            data-testid="lock-register"
            onClick={() => navigate("/register")}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-white/10 backdrop-blur-md border border-white/25 text-white font-bold text-lg hover:bg-white/20 transition-colors duration-200"
          >
            <UserPlus className="h-5 w-5" /> Creează cont
          </button>
        </div>
      </div>
    </div>
  );
};

export default LockScreen;
