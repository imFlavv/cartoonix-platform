import { useNavigate } from "react-router-dom";
import {
  Check, Shield, Tv, MessageSquareHeart, Sparkles, User as UserIcon,
  Rocket, ListMusic, Headphones, Trophy, Download, Crown,
} from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { PlusIcon } from "@/components/PlusIcon";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";

const PERKS = [
  {
    icon: Shield,
    title: "Badge exclusiv",
    desc: "Un badge auriu vizibil peste tot în platforma Cartoonix — lângă numele tău în chat, comentarii și profil.",
    color: "#ffcc00",
  },
  {
    icon: Tv,
    title: "Aplicație TV",
    desc: "Vizionează Cartoonix direct pe televizorul tău Smart TV, prin aplicația dedicată.",
    color: "#ec1c24",
  },
  {
    icon: MessageSquareHeart,
    title: "Cameră chat PLUS",
    desc: "Acces la o cameră de chat exclusivă, doar pentru membrii PLUS. Comunitatea de elită.",
    color: "#ff6a9e",
  },
  {
    icon: Sparkles,
    title: "Efecte speciale pe chat",
    desc: "Personalizează-ți mesajele: font, glow strălucitor, gradient text, bold, italic și efect sparkle.",
    color: "#c084fc",
  },
  {
    icon: UserIcon,
    title: "Avatare premium",
    desc: "10+ avatare elegante disponibile doar pentru membrii Cartoonix PLUS.",
    color: "#60a5fa",
  },
  {
    icon: Rocket,
    title: "Acces anticipat",
    desc: "Ești primul care încearcă funcțiile noi ale platformei, înainte de lansarea publică.",
    color: "#34d399",
  },
  {
    icon: ListMusic,
    title: "Playlisturi nelimitate",
    desc: "Creează câte playlisturi vrei. Fără nicio limită.",
    color: "#f59e0b",
  },
  {
    icon: Headphones,
    title: "Suport prioritar",
    desc: "Solicitările tale de suport sunt tratate primele. Răspuns rapid, garantat.",
    color: "#22d3ee",
  },
  {
    icon: Trophy,
    title: "Concursuri exclusive",
    desc: "Participă la concursuri speciale cu premii rezervate doar membrilor PLUS.",
    color: "#f97316",
  },
  {
    icon: Download,
    title: "Descarcă episoadele",
    desc: "Salvează episoadele preferate pe dispozitivul tău și urmărește-le oriunde, oricând.",
    color: "#a3e635",
  },
];

const Plus = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const subscribe = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/payments/checkout", {
        origin_url: window.location.origin,
      });
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error("Nu am putut iniția plata. Încearcă din nou.");
        setBusy(false);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Ceva n-a mers. Încearcă din nou.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <NavBar />

      {/* ---------- HERO ---------- */}
      <div className="relative pt-24 pb-16 px-4 md:px-12">
        {/* Background glows */}
        <div className="absolute inset-0 opacity-70 pointer-events-none" style={{
          background: `
            radial-gradient(circle at 20% 20%, rgba(236,28,36,0.25), transparent 45%),
            radial-gradient(circle at 80% 30%, rgba(255,204,0,0.28), transparent 50%),
            radial-gradient(circle at 50% 90%, rgba(255,204,0,0.15), transparent 55%)
          `,
        }} />
        {/* Twinkle stars */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                top: `${(i * 37) % 100}%`,
                left: `${(i * 53) % 100}%`,
                width: `${(i % 3) + 1}px`,
                height: `${(i % 3) + 1}px`,
                opacity: 0.35,
                animation: `cx-twinkle ${2 + (i % 5) * 0.5}s ease-in-out ${i * 0.1}s infinite`,
              }}
            />
          ))}
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            {/* Left: text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 mb-5">
                <Crown className="h-4 w-4 text-[#ffcc00]" />
                <span className="text-xs font-bold tracking-wider text-[#ffcc00] uppercase">Membru exclusiv</span>
              </div>
              <h1 className="font-display text-5xl md:text-7xl leading-[0.95] mb-5">
                Devino <span className="text-[#ffcc00]">membru</span><br />
                <span className="text-[#ec1c24]">Cartoonix PLUS</span>
              </h1>
              <p className="text-white/70 text-lg mb-2 max-w-lg">
                Un singur pas te desparte de întreaga experiență premium: efecte speciale, comunitate exclusivă și acces total.
              </p>
              <p className="text-white/50 text-sm mb-8">
                Plătești o singură dată. Beneficii pe viață.
              </p>

              {/* Price + CTA */}
              <div className="inline-flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-end gap-1">
                  <span className="font-display text-6xl leading-none">50</span>
                  <span className="text-2xl font-bold text-[#ffcc00] mb-2">RON</span>
                  <span className="ml-2 mb-2.5 text-xs text-white/50 uppercase tracking-wider">lifetime</span>
                </div>
                {user?.plus ? (
                  <div data-testid="plus-active" className="px-6 py-3.5 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 text-[#ffcc00] font-bold flex items-center gap-2">
                    <PlusIcon className="h-5 w-5" /> Ești deja PLUS
                  </div>
                ) : (
                  <button
                    data-testid="plus-subscribe"
                    onClick={subscribe}
                    disabled={busy}
                    className="px-8 py-3.5 rounded-full bg-[#ffcc00] text-black font-bold text-lg hover:brightness-110 hover:shadow-[0_10px_40px_rgba(255,204,0,0.35)] transition-all duration-200 disabled:opacity-60"
                  >
                    {busy ? "Se procesează..." : "Devino PLUS acum"}
                  </button>
                )}
              </div>

              <div className="mt-6 flex items-center gap-4 text-xs text-white/40">
                <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Plată sigură Stripe</span>
                <span>•</span>
                <span>Acces instant după plată</span>
              </div>
            </div>

            {/* Right: PLUS logo */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-[420px] w-[420px] rounded-full opacity-40" style={{
                  background: "radial-gradient(circle, rgba(255,204,0,0.4), transparent 60%)",
                  filter: "blur(20px)",
                }} />
              </div>
              <img
                src="/plus/cartoonix-plus-logo.png"
                alt="Cartoonix PLUS"
                className="relative w-full max-w-[420px] drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                style={{ animation: "cx-float 5s ease-in-out infinite" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- PERKS GRID ---------- */}
      <div className="relative px-4 md:px-12 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-4xl md:text-5xl mb-3">Tot ce primești ca PLUS</h2>
            <p className="text-white/60 max-w-xl mx-auto">10 beneficii exclusive, disponibile pentru totdeauna după o singură plată.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PERKS.map((perk) => {
              const Icon = perk.icon;
              return (
                <div
                  key={perk.title}
                  data-testid={`perk-${perk.title.toLowerCase().replace(/\s+/g, "-")}`}
                  className="group relative bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 hover:border-[#ffcc00]/40 hover:bg-[#141414] transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
                    background: `radial-gradient(circle, ${perk.color}30, transparent 70%)`,
                  }} />
                  <div className="relative">
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center mb-3 border"
                      style={{ background: `${perk.color}18`, borderColor: `${perk.color}55` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: perk.color }} />
                    </div>
                    <h3 className="font-bold text-base mb-1 flex items-center gap-1.5">
                      {perk.title}
                      <Check className="h-3.5 w-3.5 text-[#22c55e]" />
                    </h3>
                    <p className="text-sm text-white/60 leading-relaxed">{perk.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          {!user?.plus && (
            <div className="mt-12 relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-[#ffcc00]/25 p-8 md:p-12 text-center">
              <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
                background: "radial-gradient(circle at 50% 50%, rgba(255,204,0,0.2), transparent 60%)",
              }} />
              <div className="relative">
                <Crown className="h-10 w-10 text-[#ffcc00] mx-auto mb-4" />
                <h3 className="font-display text-3xl md:text-4xl mb-2">Ești gata să faci upgrade?</h3>
                <p className="text-white/60 mb-6 max-w-md mx-auto">
                  50 RON, o singură dată. Toate beneficiile PLUS, pe viață.
                </p>
                <button
                  data-testid="plus-subscribe-bottom"
                  onClick={subscribe}
                  disabled={busy}
                  className="px-8 py-3.5 rounded-full bg-[#ffcc00] text-black font-bold text-lg hover:brightness-110 hover:shadow-[0_10px_40px_rgba(255,204,0,0.35)] transition-all duration-200 disabled:opacity-60"
                >
                  {busy ? "Se procesează..." : "Devino PLUS acum · 50 RON"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Plus;
