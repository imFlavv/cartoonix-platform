import React, { useEffect, useState } from "react";

/**
 * Pagina de mentenanță — afișată tuturor vizitatorilor non-admin
 * când maintenance_mode este activ. Suprascrie inclusiv Mod prezentare.
 *
 * Design: fundal elegant — gradient central cald + două orbe colorate
 * în colțuri (roșu sus-stânga, galben jos-dreapta). Logo mare central,
 * mesaj clar.
 */
export default function MaintenancePage() {
  // Micul shimmer pe titlu — efect rafinat, fără să distragă.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 1000), 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0c] text-white">
      {/* ---------- BACKGROUND LAYERS ---------- */}
      {/* Soft central gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 600px at 50% 50%, rgba(255,255,255,0.04), transparent 70%)",
        }}
      />

      {/* Top-left red orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[560px] w-[560px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,59,59,0.42), transparent 70%)",
        }}
      />

      {/* Bottom-right yellow orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-48 h-[620px] w-[620px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(250,204,21,0.32), transparent 70%)",
        }}
      />

      {/* ---------- CONTENT ---------- */}
      <main className="relative z-10 min-h-screen flex items-center justify-center px-6 py-16">
        <div
          data-testid="maintenance-card"
          className="w-full max-w-3xl text-center"
        >
          {/* Logo — varianta maintenance (cu cască + ciocan + cheie), mare central */}
          <div className="flex justify-center mb-10">
            <img
              data-testid="maintenance-logo"
              src="/brand/cartoonix-maintenance.png"
              alt="Cartoonix - Mentenanță"
              draggable={false}
              className="block select-none object-contain w-[clamp(320px,55vw,640px)] h-auto drop-shadow-[0_25px_60px_rgba(255,59,59,0.25)]"
            />
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
