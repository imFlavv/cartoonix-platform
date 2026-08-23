import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { NavBar } from "@/components/NavBar";
import { ShoppingBag, Coins, Sparkles, Heart } from "lucide-react";

const Shop = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="shop-page">
      <NavBar />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 -z-10 opacity-40 blur-3xl" style={{ background: "radial-gradient(circle at 30% 20%, rgba(255,204,0,0.4), transparent 60%), radial-gradient(circle at 80% 90%, rgba(236,28,36,0.3), transparent 60%)" }} />
            <div className="bg-[#111] border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ffcc00]/15 text-[#ffcc00] border border-[#ffcc00]/40 text-xs font-bold uppercase tracking-wider mb-6">
                <Sparkles className="h-4 w-4" /> În curând
              </span>
              <div className="mx-auto mb-6 h-20 w-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <ShoppingBag className="h-10 w-10 text-[#ffcc00]" />
              </div>
              <h1 className="font-display text-4xl sm:text-5xl mb-4">Magazinul Cartoonix</h1>
              <p className="text-white/60 mb-3">
                Aici vei putea <b className="text-white">cheltui punctele tale</b> pe avataruri premium,
                beneficii exclusive și multe alte surprize.
              </p>
              <p className="text-white/40 text-sm mb-8">
                Lucrăm la el chiar acum — revino curând! 🛍️
              </p>

              <div className="flex items-center justify-center gap-2 rounded-2xl bg-[#ffcc00]/10 border border-[#ffcc00]/30 px-5 py-4 mb-7">
                <Coins className="h-6 w-6 text-[#ffcc00]" />
                <span className="text-sm text-white/70">Ai acum</span>
                <span data-testid="shop-points" className="text-2xl font-extrabold text-[#ffcc00]">{user?.points ?? 0}</span>
                <span className="text-sm text-white/70">puncte</span>
              </div>

              <button
                data-testid="shop-donate-cta"
                onClick={() => navigate("/doneaza")}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200"
              >
                <Heart className="h-5 w-5" /> Strânge puncte donând
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
