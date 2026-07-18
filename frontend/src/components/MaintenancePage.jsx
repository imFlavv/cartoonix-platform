import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export const MaintenancePage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white px-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30" style={{
        background: "radial-gradient(circle at 50% 30%, rgba(255,204,0,0.2), transparent 55%), radial-gradient(circle at 50% 90%, rgba(236,28,36,0.2), transparent 55%)",
      }} />
      <img
        src="/maintenance-logo.png"
        alt="Cartoonix"
        className="cx-float relative w-72 md:w-96 drop-shadow-[0_10px_40px_rgba(255,204,0,0.25)]"
        data-testid="maintenance-logo"
      />
      <h1 className="relative font-display text-4xl md:text-5xl mt-6 text-center">Suntem în mentenanță</h1>
      <p className="relative text-white/60 mt-3 text-center max-w-md">
        Lucrăm la ceva grozav pentru tine. Revenim în curând cu desenele tale preferate!
      </p>
      <button
        data-testid="maintenance-admin-login"
        onClick={() => navigate("/login")}
        className="relative mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold text-white/70 transition-colors duration-200"
      >
        <ShieldAlert className="h-4 w-4" /> Acces administrator
      </button>
    </div>
  );
};
