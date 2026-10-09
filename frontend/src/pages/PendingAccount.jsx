import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LOGO_TRANSPARENT } from "@/data/constants";
import { Clock, ShieldX, LogOut } from "lucide-react";

const PendingAccount = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const rejected = user?.status === "rejected";

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10 overflow-hidden bg-[#0a0a0a] bg-cover bg-center" style={{ backgroundImage: "url('/auth-bg.webp')" }}>
      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0 opacity-30" style={{
        background: "radial-gradient(circle at 70% 20%, rgba(255,204,0,0.25), transparent 55%), radial-gradient(circle at 20% 80%, rgba(236,28,36,0.3), transparent 55%)",
      }} />

      <div data-testid="pending-account-screen" className="relative w-full max-w-lg bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <img src={LOGO_TRANSPARENT} alt="Cartoonix" className="h-12 mx-auto mb-6" />

        <div className="flex justify-center mb-5">
          <span className={`w-16 h-16 rounded-full flex items-center justify-center border ${rejected ? "bg-[#ec1c24]/15 border-[#ec1c24]/40" : "bg-[#ffcc00]/15 border-[#ffcc00]/40"}`}>
            {rejected ? <ShieldX className="h-8 w-8 text-[#ec1c24]" /> : <Clock className="h-8 w-8 text-[#ffcc00]" />}
          </span>
        </div>

        {rejected ? (
          <>
            <h1 data-testid="pending-title" className="font-display text-2xl sm:text-3xl mb-3 text-[#ff6b71]">
              Contul tău a fost respins
            </h1>
            <p className="text-white/70 text-sm mb-4">
              Din păcate, cererea ta de înregistrare nu a fost aprobată de echipa Cartoonix.
            </p>
            <div data-testid="pending-reason" className="text-left bg-[#ec1c24]/10 border border-[#ec1c24]/30 rounded-xl p-4 mb-6">
              <p className="text-xs uppercase tracking-wide text-[#ff6b71] font-bold mb-1">Motivul respingerii</p>
              <p className="text-sm text-white/85 whitespace-pre-wrap break-words">{user?.rejection_reason || "Nespecificat"}</p>
            </div>
          </>
        ) : (
          <>
            <h1 data-testid="pending-title" className="font-display text-2xl sm:text-3xl mb-3">
              Contul necesită o verificare suplimentară și e în așteptare
            </h1>
            <p className="text-white/70 text-sm mb-6 max-w-md mx-auto">
              Mulțumim că te-ai înregistrat! Un administrator trebuie să îți aprobe contul înainte
              de a putea intra pe platformă. Vei putea să te conectezi imediat ce cererea ta este
              aprobată.
            </p>
          </>
        )}

        <button
          data-testid="pending-logout"
          onClick={onLogout}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/10 border border-white/20 font-bold hover:bg-white/20 transition-colors duration-200"
        >
          <LogOut className="h-4 w-4" /> Înapoi la conectare
        </button>
      </div>
    </div>
  );
};

export default PendingAccount;
