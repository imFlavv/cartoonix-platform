import React, { useEffect, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import { Wrench } from "lucide-react";

/**
 * Pagina de mentenanță — afișată tuturor vizitatorilor non-admin
 * când maintenance_mode este activ. Suprascrie inclusiv Mod prezentare.
 *
 * Design: fundal elegant (gradient + radial glow + grain subtil),
 * paletă brand Cartoonix (roșu/galben), centered card cu logo + mesaj.
 */
export default function MaintenancePage() {
  // Mic shimmer pe titlu — efect rafinat, fără să distragă.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 1000), 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0c] text-white">
      {/* ---------- BACKGROUND LAYERS ---------- */}
      {/* Base radial gradient — warm brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 700px at 20% 10%, rgba(255,59,59,0.18), transparent 60%), radial-gradient(900px 600px at 85% 90%, rgba(250,204,21,0.12), transparent 60%), radial-gradient(700px 500px at 50% 50%, rgba(255,59,59,0.05), transparent 70%)",
        }}
      />

      {/* Subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      {/* Floating soft orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,59,59,0.35), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(250,204,21,0.28), transparent 70%)",
        }}
      />

      {/* Noise overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      {/* ---------- CONTENT ---------- */}
      <main className="relative z-10 min-h-screen flex items-center justify-center px-6 py-16">
        <div
          data-testid="maintenance-card"
          className="w-full max-w-2xl text-center"
        >
          {/* Logo */}
          <div className="flex justify-center mb-10">
            <BrandLogo variant="stacked" size="lg" />
          </div>

          {/* Status pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-amber-200">
              <Wrench className="inline h-3 w-3 mr-1 -mt-0.5" />
              Mentenanță în curs
            </span>
          </div>

          {/* Main heading */}
          <h1
            key={tick}
            data-testid="maintenance-title"
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-wider leading-tight"
            style={{
              backgroundImage:
                "linear-gradient(92deg, #ff5e5e 0%, #ffb84d 35%, #facc15 55%, #ff5e5e 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              animation: "cx-shimmer 6s ease-in-out infinite",
              textShadow: "0 8px 40px rgba(255, 90, 90, 0.18)",
            }}
          >
            PLATFORMA ÎN MENTENANȚĂ!
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg sm:text-xl text-white/80 font-medium tracking-wide">
            Revenim curând.
          </p>

          {/* Divider */}
          <div className="mx-auto mt-10 mb-10 h-px w-32 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {/* Description */}
          <p className="text-sm sm:text-base text-white/55 max-w-md mx-auto leading-relaxed">
            Lucrăm la îmbunătățiri pentru o experiență și mai bună. Mulțumim
            pentru răbdare!
          </p>

          {/* Footer brand */}
          <p className="mt-16 text-[11px] tracking-[0.3em] text-white/30 uppercase">
            © Cartoonix
          </p>
        </div>
      </main>

      {/* Local keyframes (scoped via style tag — no Tailwind config change) */}
      <style>{`
        @keyframes cx-shimmer {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
