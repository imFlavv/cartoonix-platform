import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

const MAINTENANCE_BG =
  "https://customer-assets-agu9un31.emergentagent.net/job_cartoon-redesign/artifacts/de96flow_ChatGPT%20Image%20Jul%2029%2C%202026%2C%2002_32_11%20AM.png";

export const MaintenancePage = () => {
  const navigate = useNavigate();
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-white px-6 relative overflow-hidden bg-[#0a0a0a]"
      style={{
        backgroundImage: `url("${MAINTENANCE_BG}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Subtle vignette so text stays readable over the scene */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      <img
        src="/maintenance-logo.png"
        alt="Cartoonix"
        className="cx-float relative w-64 md:w-80 drop-shadow-[0_10px_40px_rgba(255,204,0,0.35)]"
        data-testid="maintenance-logo"
      />
      <h1 className="relative font-display text-4xl md:text-5xl mt-6 text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
        Suntem în mentenanță
      </h1>
      <p className="relative text-white/80 mt-3 text-center max-w-md drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
        Lucrăm la ceva grozav pentru tine. Revenim în curând cu desenele tale
        preferate!
      </p>
      <button
        data-testid="maintenance-admin-login"
        onClick={() => navigate("/login")}
        className="relative mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-sm font-semibold text-white/90 transition-colors duration-200"
      >
        <ShieldAlert className="h-4 w-4" /> Acces administrator
      </button>
    </div>
  );
};
