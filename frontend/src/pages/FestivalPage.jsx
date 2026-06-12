import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  Tv,
  Gamepad2,
  Users,
  Ticket,
  ScanLine,
  Star,
  Zap,
} from "lucide-react";

/**
 * /festival — Cartoonix Fest standalone reveal experience (v2).
 *
 * Rendered without PublicLayout. Session is preserved via RequireAuth.
 *
 * Design language (v2):
 *  - No italic tilted typography. Everything reads horizontally with weight
 *    and color carrying the hierarchy.
 *  - Layered, "festival floor" aesthetic: artwork backdrop + grid overlay +
 *    neon accents that echo the All-Access pass artwork.
 *  - Countdown is presented as illuminated stat boxes, not flowing text.
 *  - Dedicated PASS section that mirrors the lanyard image with detail chips.
 *  - Pillars are richer cards with iconography and neon hairlines.
 */

const FEST_TARGET = new Date("2026-07-01T00:00:00+03:00").getTime();

function useCountdown(target) {
  const compute = () => Math.max(0, target - Date.now());
  const [ms, setMs] = useState(compute);
  useEffect(() => {
    const id = setInterval(() => setMs(compute()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    expired: ms <= 0,
  };
}

function StatBox({ value, label, accent = "#ff7a5a", testid }) {
  const padded = String(value).padStart(2, "0");
  return (
    <div
      data-testid={testid}
      className="relative rounded-2xl overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, rgba(28,12,46,0.72) 0%, rgba(10,4,22,0.85) 100%)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow:
          "0 20px 50px -20px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.06)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      {/* Top neon hairline */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          opacity: 0.7,
        }}
      />
      {/* Soft glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px"
        style={{
          background: `radial-gradient(80% 60% at 50% 0%, ${accent}22, transparent 60%)`,
        }}
      />
      <div className="relative px-5 sm:px-7 py-6 sm:py-7 text-center min-w-[88px] sm:min-w-[120px]">
        <span
          className="font-display tabular-nums leading-none text-white block"
          style={{
            fontSize: "clamp(2.4rem, 5vw, 4rem)",
            textShadow: `0 0 24px ${accent}55, 0 2px 12px rgba(0,0,0,0.55)`,
          }}
        >
          {padded}
        </span>
        <span className="mt-3 block text-[10px] sm:text-[11px] uppercase tracking-[0.32em] text-white/55 font-semibold">
          {label}
        </span>
      </div>
    </div>
  );
}

const PILLARS = [
  {
    n: "01",
    icon: Tv,
    accent: "#ff7a5a",
    title: "Cinema Retro",
    body: "Maratoane și proiecții cu desenele care au definit copilăria.",
  },
  {
    n: "02",
    icon: Sparkles,
    accent: "#facc15",
    title: "Scena Live",
    body: "Programe speciale, transmisiuni și momente create pentru festival.",
  },
  {
    n: "03",
    icon: Gamepad2,
    accent: "#f472b6",
    title: "Lobby & Watch Party",
    body: "Camere comune, quiz-uri și seri tematice alături de comunitate.",
  },
  {
    n: "04",
    icon: Ticket,
    accent: "#a855f7",
    title: "Festival Pass",
    body: "Misiuni, insigne exclusive și surprize care se deblochează zi de zi.",
  },
];

const PASS_PERKS = [
  { icon: ScanLine, text: "Cod QR personal pentru misiuni și unlock-uri" },
  { icon: Star, text: "Tier-uri: Standard, Creator, MVP — cu insigne unice" },
  { icon: Users, text: "Acces în camere PLUS, Watch Parties și quiz-uri" },
  { icon: Zap, text: "Boost-uri zilnice și obiecte ascunse de colecționat" },
];

export default function FestivalPage() {
  const { days, hours, minutes, seconds, expired } = useCountdown(FEST_TARGET);
  const ctaLabel = useMemo(
    () => (expired ? "Festivalul este LIVE" : "Începe în"),
    [expired]
  );

  return (
    <div
      data-testid="festival-page"
      className="relative min-h-screen w-full overflow-x-hidden text-white antialiased selection:bg-amber-200/30 selection:text-white"
      style={{
        backgroundImage: "url(/festival/bg.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        backgroundColor: "#0a0612",
      }}
    >
      {/* Vignette */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 30%, rgba(8,4,18,0.0) 0%, rgba(8,4,18,0.35) 55%, rgba(8,4,18,0.85) 100%)",
        }}
      />
      {/* Subtle grid overlay — festival floor feel */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(80% 60% at 50% 35%, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(80% 60% at 50% 35%, black 30%, transparent 80%)",
        }}
      />
      {/* Bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 h-[55vh]"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,4,18,0) 0%, rgba(8,4,18,0.55) 55%, rgba(8,4,18,0.95) 100%)",
        }}
      />

      {/* Back link */}
      <Link
        to="/"
        data-testid="festival-back-link"
        className="fixed top-5 left-5 z-30 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3.5 py-1.5 text-[11px] uppercase tracking-[0.22em] text-white/75 backdrop-blur-md hover:text-white hover:border-white/30 hover:bg-black/45 transition-all"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Înapoi la Cartoonix
      </Link>

      {/* ============================ HERO ============================ */}
      <section
        data-testid="festival-hero"
        className="relative min-h-screen w-full flex flex-col"
      >
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-20 pt-24 pb-16">
          <div className="max-w-[1280px] mx-auto w-full">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-7 animate-[festFadeUp_900ms_ease-out_both]">
              <span
                aria-hidden
                className="h-px w-10 sm:w-16"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,200,120,0.65))",
                }}
              />
              <span className="inline-flex items-center gap-2 text-[10.5px] sm:text-[12px] uppercase tracking-[0.42em] text-amber-200/85 font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                Prima ediție · 1—4 iulie 2026
              </span>
            </div>

            {/* Title */}
            <h1
              data-testid="festival-title"
              className="font-display leading-[0.92] tracking-[-0.02em] animate-[festFadeUp_1100ms_ease-out_140ms_both]"
              style={{
                fontSize: "clamp(3rem, 11vw, 9rem)",
              }}
            >
              <span
                className="block bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(180deg, #fff3d4 0%, #ffb56b 55%, #ff7a5a 100%)",
                  filter:
                    "drop-shadow(0 4px 22px rgba(255,140,70,0.22))",
                }}
              >
                CARTOONIX
              </span>
              <span
                className="block font-display text-white mt-1 sm:mt-2 relative"
                style={{
                  fontSize: "clamp(2.4rem, 8.5vw, 7rem)",
                  textShadow:
                    "0 2px 18px rgba(0,0,0,0.45), 0 0 60px rgba(244,114,182,0.18)",
                  letterSpacing: "0.02em",
                }}
              >
                FEST
                <span
                  aria-hidden
                  className="ml-3 sm:ml-5 inline-block align-middle h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, #facc15 0%, #f97316 60%, transparent 75%)",
                    boxShadow:
                      "0 0 24px rgba(250,204,21,0.85), 0 0 48px rgba(249,115,22,0.55)",
                  }}
                />
              </span>
            </h1>

            {/* Sub */}
            <p
              data-testid="festival-tagline"
              className="mt-7 max-w-xl text-[15px] sm:text-[17px] leading-relaxed text-white/82 animate-[festFadeUp_1100ms_ease-out_260ms_both]"
            >
              Patru zile în care nostalgia iese din ecran. Un festival digital
              pentru cei care au crescut cu telecomanda în mână și au învățat
              dorul de la următorul episod.
            </p>

            {/* Countdown stats */}
            <div className="mt-12 sm:mt-14 animate-[festFadeUp_1200ms_ease-out_380ms_both]">
              <div className="flex items-center gap-3 text-[10px] sm:text-[11px] uppercase tracking-[0.42em] text-white/50 mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
                {ctaLabel}
              </div>
              <div
                data-testid="festival-countdown"
                className="flex flex-wrap items-stretch gap-3 sm:gap-4"
              >
                <StatBox value={days} label="Zile" accent="#ff7a5a" testid="countdown-days" />
                <StatBox value={hours} label="Ore" accent="#facc15" testid="countdown-hours" />
                <StatBox value={minutes} label="Minute" accent="#f472b6" testid="countdown-minutes" />
                <StatBox value={seconds} label="Secunde" accent="#a855f7" testid="countdown-seconds" />
              </div>
            </div>

            {/* Quick info chips */}
            <div className="mt-9 flex flex-wrap items-center gap-2.5 animate-[festFadeUp_1200ms_ease-out_500ms_both]">
              {[
                { label: "1 — 4 Iulie" },
                { label: "Online · Cartoonix" },
                { label: "Acces din cont" },
              ].map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-white/75 border border-white/[0.12] bg-white/[0.04]"
                >
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="relative pb-6 flex justify-center">
          <div
            aria-hidden
            className="flex flex-col items-center gap-2 text-white/40 animate-[festPulse_2.6s_ease-in-out_infinite]"
          >
            <span className="text-[10px] uppercase tracking-[0.36em]">Scroll</span>
            <span
              className="h-9 w-px"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.55), transparent)",
              }}
            />
          </div>
        </div>
      </section>

      {/* ============================ MANIFESTO ============================ */}
      <section
        data-testid="festival-manifesto"
        className="relative px-6 sm:px-10 lg:px-20 py-24 sm:py-32"
      >
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-5">
              <div className="text-[10.5px] uppercase tracking-[0.42em] text-amber-200/80 mb-5">
                Manifest
              </div>
              <h2
                className="font-display leading-[1.02] tracking-tight text-white"
                style={{ fontSize: "clamp(2rem, 4.6vw, 3.4rem)" }}
              >
                Vara aceasta,
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, #ffb56b 0%, #f472b6 60%, #a855f7 100%)",
                  }}
                >
                  ne întoarcem acasă.
                </span>
              </h2>
              <div
                aria-hidden
                className="mt-7 h-px w-24"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(255,200,120,0.6), transparent)",
                }}
              />
            </div>
            <div className="lg:col-span-7 lg:pt-3">
              <div
                className="rounded-2xl p-6 sm:p-8 border border-white/[0.08]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(20,12,32,0.55) 0%, rgba(8,4,18,0.72) 100%)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                <p className="text-[16px] sm:text-[18px] leading-[1.75] text-white/85">
                  Cartoonix Fest nu e doar un maraton de desene. E o serie de
                  seri în care timpul se oprește, telecomanda redevine cel mai
                  important obiect din cameră, iar singura grijă e următorul
                  episod.
                </p>
                <p className="mt-5 text-[15px] sm:text-[16px] leading-[1.8] text-white/65">
                  Patru zile, patru atmosfere, o singură comunitate. Programul
                  complet va fi anunțat în zilele dinaintea festivalului — fii
                  pregătit, va fi greu să stai liniștit pe canapea.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ PASS ============================ */}
      <section
        data-testid="festival-pass-section"
        className="relative px-6 sm:px-10 lg:px-20 py-20 sm:py-28"
      >
        <div className="max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Pass image with animated halo */}
            <div className="lg:col-span-5 flex justify-center order-2 lg:order-1">
              <div className="relative">
                {/* Conic halo */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -inset-10 rounded-full opacity-60 animate-[festSpin_22s_linear_infinite]"
                  style={{
                    background:
                      "conic-gradient(from 0deg, rgba(168,85,247,0.0), rgba(244,114,182,0.35), rgba(250,204,21,0.25), rgba(255,122,90,0.30), rgba(168,85,247,0.35), rgba(244,114,182,0.0))",
                    filter: "blur(40px)",
                  }}
                />
                {/* Spot under the pass */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 h-16 w-[70%] rounded-full"
                  style={{
                    background:
                      "radial-gradient(closest-side, rgba(168,85,247,0.45), transparent)",
                    filter: "blur(18px)",
                  }}
                />
                <img
                  src="/festival/pass-lanyard.png"
                  alt="Cartoonix Fest — All Access Pass"
                  data-testid="festival-pass-image"
                  className="relative block w-[280px] sm:w-[360px] lg:w-[420px] h-auto select-none animate-[festPassSway_7s_ease-in-out_infinite]"
                  draggable={false}
                />
              </div>
            </div>

            {/* Pass info card */}
            <div className="lg:col-span-7 order-1 lg:order-2">
              <div className="text-[10.5px] uppercase tracking-[0.42em] text-amber-200/80 mb-4">
                Festival Pass
              </div>
              <h3
                className="font-display leading-[1.02] tracking-tight text-white"
                style={{ fontSize: "clamp(1.9rem, 4.4vw, 3.2rem)" }}
              >
                Trecerea ta în spatele cortinei.
              </h3>
              <p className="mt-4 max-w-xl text-[15px] sm:text-[16px] leading-relaxed text-white/75">
                Fiecare participant primește un{" "}
                <span className="text-white font-semibold">All-Access Pass</span>{" "}
                digital — cu QR, tier și insigne exclusive. Îți deblochează
                misiuni, camere și surprize pe durata festivalului.
              </p>

              {/* Perks grid */}
              <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PASS_PERKS.map(({ icon: Icon, text }, i) => (
                  <div
                    key={i}
                    className="group flex items-start gap-3 rounded-xl px-4 py-3 border border-white/[0.08] hover:border-amber-200/30 transition-colors"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(22,10,38,0.55) 0%, rgba(8,4,18,0.75) 100%)",
                    }}
                  >
                    <span
                      className="grid place-items-center h-8 w-8 shrink-0 rounded-lg"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(244,114,182,0.25), rgba(168,85,247,0.25))",
                        border: "1px solid rgba(244,114,182,0.30)",
                      }}
                    >
                      <Icon className="h-4 w-4 text-pink-200" strokeWidth={2.2} />
                    </span>
                    <span className="text-[13.5px] leading-snug text-white/85">
                      {text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Tier strip */}
              <div className="mt-7 flex flex-wrap items-center gap-2.5">
                {[
                  { label: "STANDARD", color: "#94a3b8" },
                  { label: "CREATOR", color: "#facc15" },
                  { label: "MVP", color: "#f472b6" },
                ].map((t) => (
                  <span
                    key={t.label}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10.5px] uppercase tracking-[0.28em] font-bold"
                    style={{
                      color: t.color,
                      border: `1px solid ${t.color}55`,
                      background: `${t.color}10`,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: t.color, boxShadow: `0 0 10px ${t.color}` }}
                    />
                    {t.label}
                  </span>
                ))}
              </div>

              <p className="mt-6 text-[12px] uppercase tracking-[0.30em] text-white/45">
                Pass-ul se activează automat în contul tău în prima zi a festivalului.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================ PILLARS ============================ */}
      <section
        data-testid="festival-pillars"
        className="relative px-6 sm:px-10 lg:px-20 pb-28 sm:pb-36"
      >
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.42em] text-amber-200/80 mb-3">
                Ce te așteaptă
              </div>
              <h3
                className="font-display tracking-tight text-white"
                style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.6rem)" }}
              >
                Patru piloni.{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, #ffb56b, #f472b6 70%, #a855f7)",
                  }}
                >
                  Patru seri.
                </span>
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PILLARS.map((p, i) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.n}
                  data-testid={`festival-pillar-${i}`}
                  className="group relative rounded-2xl p-6 sm:p-7 border border-white/[0.08] transition-all duration-500 hover:-translate-y-1.5"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(20,10,30,0.62) 0%, rgba(8,4,18,0.82) 100%)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                  }}
                >
                  {/* Hover halo */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      boxShadow: `0 0 0 1px ${p.accent}55, 0 20px 50px -20px ${p.accent}55`,
                    }}
                  />
                  {/* Icon */}
                  <div
                    className="inline-grid place-items-center h-11 w-11 rounded-xl mb-5"
                    style={{
                      background: `linear-gradient(135deg, ${p.accent}33, ${p.accent}11)`,
                      border: `1px solid ${p.accent}55`,
                      boxShadow: `0 0 24px -8px ${p.accent}55`,
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: p.accent }} strokeWidth={2.2} />
                  </div>
                  {/* Watermark number */}
                  <span
                    aria-hidden
                    className="absolute right-5 top-4 font-display text-[3.2rem] leading-none transition-colors duration-500"
                    style={{
                      color: "rgba(255,255,255,0.06)",
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {p.n}
                  </span>

                  <div className="text-[11px] uppercase tracking-[0.3em] mb-2" style={{ color: `${p.accent}cc` }}>
                    Ziua {p.n}
                  </div>
                  <h4 className="font-display text-2xl sm:text-[1.7rem] leading-tight tracking-tight text-white">
                    {p.title}
                  </h4>
                  <p className="mt-3 text-[14px] leading-relaxed text-white/65">
                    {p.body}
                  </p>

                  <span
                    aria-hidden
                    className="absolute left-6 right-6 bottom-5 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${p.accent}, transparent)`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================ CLOSING ============================ */}
      <section
        data-testid="festival-closing"
        className="relative px-6 sm:px-10 lg:px-20 pb-32"
      >
        <div className="max-w-[860px] mx-auto text-center">
          <div
            aria-hidden
            className="mx-auto h-px w-24 mb-10"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,200,120,0.6), transparent)",
            }}
          />
          <p
            className="font-display leading-tight tracking-tight text-white"
            style={{ fontSize: "clamp(1.6rem, 3.6vw, 2.5rem)" }}
          >
            „Cei care au stat lipiți de televizor știu deja despre ce e vorba.&rdquo;
          </p>
          <div
            className="mt-10 inline-flex items-center gap-3 rounded-full border border-amber-200/25 px-5 py-2.5"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,122,90,0.10), rgba(255,180,90,0.08))",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.36em] text-amber-100 font-semibold">
              Pregătește-ți Festival Pass-ul
            </span>
          </div>
          <p className="mt-6 text-[12px] uppercase tracking-[0.36em] text-white/40">
            1 — 4 Iulie · Exclusiv pe Cartoonix
          </p>
        </div>
      </section>

      <style>{`
        @keyframes festFadeUp {
          0%   { opacity: 0; transform: translateY(18px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes festPulse {
          0%, 100% { opacity: 0.35; transform: translateY(0); }
          50%      { opacity: 0.85; transform: translateY(4px); }
        }
        @keyframes festPassSway {
          0%, 100% { transform: translateY(0) rotate(-1.2deg); }
          50%      { transform: translateY(-10px) rotate(1.2deg); }
        }
        @keyframes festSpin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          [data-testid="festival-page"] {
            background-attachment: scroll !important;
          }
        }
      `}</style>
    </div>
  );
}
