import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

/**
 * /festival — Cartoonix Fest standalone reveal experience.
 *
 * Intentionally rendered WITHOUT PublicLayout (no TopNav, no AnnouncementBar,
 * no Footer). The page is full-bleed and cinematic. The user's session is
 * preserved by RequireAuth at the route level; we just hide the chrome to
 * let the artwork carry the moment.
 *
 * Design language:
 *  - Full-viewport static artwork backdrop with a soft vignette so foreground
 *    typography always has just enough contrast without crushing the colors.
 *  - Editorial, asymmetric layout. Big serif/display headline, generous
 *    spacing, a single elegant countdown row and a quietly typed "tag line".
 *  - A discreet "Înapoi la Cartoonix" link top-left is the only nav element,
 *    so users can return without feeling trapped.
 */

const FEST_TARGET = new Date("2026-07-01T00:00:00+03:00").getTime(); // Bucharest

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

function CountdownCell({ value, label, last }) {
  const padded = String(value).padStart(2, "0");
  return (
    <div className="flex items-center">
      <div className="flex flex-col items-center">
        <span
          className="font-display tabular-nums leading-none text-white"
          style={{
            fontSize: "clamp(2.6rem, 6.5vw, 5.5rem)",
            textShadow:
              "0 2px 12px rgba(0,0,0,0.55), 0 0 38px rgba(255,180,90,0.18)",
            letterSpacing: "-0.02em",
          }}
        >
          {padded}
        </span>
        <span className="mt-2 text-[10px] sm:text-[11px] uppercase tracking-[0.34em] text-white/55 font-medium">
          {label}
        </span>
      </div>
      {!last && (
        <span
          aria-hidden
          className="mx-3 sm:mx-5 lg:mx-7 font-display leading-none text-white/15"
          style={{ fontSize: "clamp(2rem, 4.5vw, 3.8rem)" }}
        >
          ·
        </span>
      )}
    </div>
  );
}

const PILLARS = [
  {
    n: "01",
    title: "Cinema Retro",
    body: "Maratoane și proiecții cu desenele care au definit copilăria.",
  },
  {
    n: "02",
    title: "Scena Live",
    body: "Programe speciale, transmisiuni și momente create pentru festival.",
  },
  {
    n: "03",
    title: "Lobby & Watch Party",
    body: "Camere comune, quiz-uri și seri tematice alături de comunitate.",
  },
  {
    n: "04",
    title: "Festival Pass",
    body: "Misiuni, insigne exclusive și surprize care se deblochează zi de zi.",
  },
];

export default function FestivalPage() {
  const { days, hours, minutes, seconds, expired } = useCountdown(FEST_TARGET);
  const label = useMemo(
    () => (expired ? "Cartoonix Fest este LIVE" : "Începe în"),
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
      {/* Soft vignette — keeps the corners moody without losing the artwork. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 35%, rgba(8,4,18,0.0) 0%, rgba(8,4,18,0.30) 55%, rgba(8,4,18,0.85) 100%)",
        }}
      />
      {/* Bottom fade so scrolled sections sit on a darker stage. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 h-[55vh]"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,4,18,0) 0%, rgba(8,4,18,0.55) 55%, rgba(8,4,18,0.95) 100%)",
        }}
      />

      {/* Discreet back link — the only chrome we keep, so users aren't trapped. */}
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
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-20 pt-24 pb-20">
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
                Prima ediție · 1—4 iulie
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
                Cartoonix
              </span>
              <span
                className="block italic font-light text-white/90 mt-1 sm:mt-2"
                style={{
                  fontSize: "clamp(2.2rem, 8.5vw, 7rem)",
                  textShadow: "0 2px 18px rgba(0,0,0,0.45)",
                }}
              >
                Fest
              </span>
            </h1>

            {/* Sub */}
            <p
              data-testid="festival-tagline"
              className="mt-7 max-w-xl text-[15px] sm:text-[17px] leading-relaxed text-white/80 animate-[festFadeUp_1100ms_ease-out_260ms_both]"
            >
              Patru zile în care nostalgia iese din ecran. Un festival digital
              pentru cei care au crescut cu telecomanda în mână și au învățat
              dorul de la următorul episod.
            </p>

            {/* Countdown */}
            <div className="mt-12 sm:mt-14 animate-[festFadeUp_1200ms_ease-out_380ms_both]">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.42em] text-white/45 mb-4">
                {label}
              </div>
              <div
                data-testid="festival-countdown"
                className="flex items-center flex-wrap"
              >
                <CountdownCell value={days} label="Zile" />
                <CountdownCell value={hours} label="Ore" />
                <CountdownCell value={minutes} label="Minute" />
                <CountdownCell value={seconds} label="Secunde" last />
              </div>
            </div>
          </div>
        </div>

        {/* Quiet scroll cue */}
        <div className="relative pb-6 flex justify-center">
          <div
            aria-hidden
            className="flex flex-col items-center gap-2 text-white/40 animate-[festPulse_2.6s_ease-in-out_infinite]"
          >
            <span className="text-[10px] uppercase tracking-[0.36em]">
              Scroll
            </span>
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
                className="font-display leading-[1.02] tracking-tight"
                style={{
                  fontSize: "clamp(2rem, 4.6vw, 3.5rem)",
                }}
              >
                Vara aceasta,
                <br />
                <span className="italic font-light text-white/85">
                  ne întoarcem acasă.
                </span>
              </h2>
            </div>
            <div className="lg:col-span-7 lg:pt-3">
              <p className="text-[16px] sm:text-[18px] leading-[1.75] text-white/82">
                Cartoonix Fest nu e doar un maraton de desene. E o serie de
                seri în care timpul se oprește, telecomanda redevine cel mai
                important obiect din cameră, iar singura grijă e următorul
                episod.
              </p>
              <p className="mt-5 text-[15px] sm:text-[16px] leading-[1.8] text-white/65">
                Patru zile, patru atmosfere, o comunitate. Programul complet va
                fi anunțat în zilele dinaintea festivalului — fii pregătit, va
                fi greu să stai liniștit pe canapea.
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
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.42em] text-amber-200/80 mb-3">
                Ce te așteaptă
              </div>
              <h3
                className="font-display tracking-tight"
                style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.6rem)" }}
              >
                Patru piloni. Patru seri. <span className="italic font-light text-white/70">O singură rezervare în calendar.</span>
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PILLARS.map((p, i) => (
              <div
                key={p.n}
                data-testid={`festival-pillar-${i}`}
                className="group relative rounded-2xl p-6 sm:p-7 border border-white/[0.08] hover:border-amber-200/30 transition-all duration-500 hover:-translate-y-1"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(20,10,30,0.55) 0%, rgba(8,4,18,0.78) 100%)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                }}
              >
                {/* number watermark */}
                <span
                  aria-hidden
                  className="absolute right-5 top-4 font-display text-[3.5rem] leading-none text-white/[0.05] group-hover:text-amber-200/20 transition-colors"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {p.n}
                </span>

                <div className="text-[11px] uppercase tracking-[0.3em] text-amber-200/70 mb-3">
                  Ziua {p.n}
                </div>
                <h4
                  className="font-display text-2xl sm:text-[1.7rem] leading-tight tracking-tight"
                >
                  {p.title}
                </h4>
                <p className="mt-3 text-[14px] leading-relaxed text-white/65">
                  {p.body}
                </p>

                <span
                  aria-hidden
                  className="absolute left-6 right-6 bottom-5 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,200,120,0.4), transparent)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ CLOSING ============================ */}
      <section
        data-testid="festival-closing"
        className="relative px-6 sm:px-10 lg:px-20 pb-32"
      >
        <div className="max-w-[820px] mx-auto text-center">
          <div
            aria-hidden
            className="mx-auto h-px w-24 mb-10"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,200,120,0.6), transparent)",
            }}
          />
          <p
            className="font-display italic leading-tight tracking-tight text-white/92"
            style={{ fontSize: "clamp(1.6rem, 3.8vw, 2.6rem)" }}
          >
            „Cei care au stat lipiți de televizor știu deja despre ce e vorba.&rdquo;
          </p>
          <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-amber-200/25 px-5 py-2.5"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,122,90,0.10), rgba(255,180,90,0.08))",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.36em] text-amber-100">
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
        /* On mobile devices background-attachment: fixed is buggy / disabled;
           fall back to a scrolling cover that still feels immersive. */
        @media (max-width: 768px) {
          [data-testid="festival-page"] {
            background-attachment: scroll !important;
          }
        }
      `}</style>
    </div>
  );
}
