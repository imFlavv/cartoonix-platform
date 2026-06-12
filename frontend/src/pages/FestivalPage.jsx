import React, { useEffect, useMemo, useState } from "react";
import PublicLayout from "@/components/PublicLayout";
import {
  Film,
  Tv,
  Gamepad2,
  MessageSquare,
  Popcorn,
  Ticket,
  Search,
  Calendar,
  MapPin,
} from "lucide-react";

/**
 * /festival — Cartoonix Fest reveal page.
 *
 * - Static, fixed full-page background (the sunset hill artwork) with a
 *   subtle dark gradient overlay so foreground content stays readable on
 *   any viewport without compressing or repeating the artwork.
 * - Centerpiece: elegant flip-style countdown to 1 July 00:00 (Europe/Bucharest).
 * - The Festival Pass lanyard image floats alongside the description as a
 *   tangible "object" the user can almost reach out and grab.
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
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { days, hours, minutes, seconds, expired: ms <= 0 };
}

function Unit({ value, label }) {
  const padded = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative rounded-2xl px-4 sm:px-6 py-4 sm:py-5 min-w-[78px] sm:min-w-[110px] text-center"
        style={{
          background:
            "linear-gradient(180deg, rgba(20,12,30,0.78) 0%, rgba(8,4,18,0.85) 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow:
            "0 20px 50px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-px"
          style={{ background: "rgba(255,255,255,0.05)" }}
        />
        <span
          className="font-display tabular-nums text-4xl sm:text-6xl tracking-wider leading-none bg-clip-text text-transparent"
          style={{
            backgroundImage: "linear-gradient(180deg, #fde68a 0%, #f59e0b 60%, #f97316 100%)",
          }}
        >
          {padded}
        </span>
      </div>
      <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-white/70 font-semibold">
        {label}
      </span>
    </div>
  );
}

const HIGHLIGHTS = [
  { icon: Film, text: "Maratoane și proiecții în Cinema Retro" },
  { icon: Tv, text: "Programe speciale pe Scena Live" },
  { icon: Gamepad2, text: "Quiz-uri, jocuri și provocări nostalgice" },
  { icon: MessageSquare, text: "Lobby și activități alături de comunitate" },
  { icon: Popcorn, text: "Watch Party-uri și seri tematice" },
  { icon: Ticket, text: "Festival Pass, misiuni și insigne exclusive" },
  { icon: Search, text: "Obiecte ascunse și surprize care se deblochează pe parcurs" },
];

export default function FestivalPage() {
  const { days, hours, minutes, seconds, expired } = useCountdown(FEST_TARGET);
  const title = useMemo(
    () => (expired ? "Cartoonix Fest e LIVE" : "Cartoonix Fest se deschide în"),
    [expired]
  );

  return (
    <PublicLayout>
      {/* Static, fixed background — pinned behind every section so it never
          repeats or compresses on tall content. */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/festival/bg.jpg)" }}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,6,18,0.55) 0%, rgba(8,6,18,0.75) 60%, rgba(8,6,18,0.92) 100%)",
        }}
      />

      <div className="relative">
        {/* HERO */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-10 text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-100/95"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,59,59,0.20), rgba(250,204,21,0.20))",
              border: "1px solid rgba(250,204,21,0.35)",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
            Prima ediție · 1–4 iulie
          </span>

          <h1
            data-testid="festival-title"
            className="mt-6 font-display text-5xl sm:text-7xl lg:text-8xl leading-none tracking-tight"
          >
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #fde68a 0%, #f97316 40%, #ec4899 80%, #a855f7 100%)",
              }}
            >
              Cartoonix Fest
            </span>
          </h1>
          <p
            data-testid="festival-subtitle"
            className="mt-3 text-base sm:text-lg text-white/85 max-w-2xl mx-auto"
          >
            {title}
          </p>

          {/* Countdown */}
          <div
            data-testid="festival-countdown"
            className="mt-8 sm:mt-10 inline-flex items-center gap-3 sm:gap-5"
          >
            <Unit value={days} label="Zile" />
            <span className="text-2xl text-white/30 font-light">:</span>
            <Unit value={hours} label="Ore" />
            <span className="text-2xl text-white/30 font-light">:</span>
            <Unit value={minutes} label="Minute" />
            <span className="text-2xl text-white/30 font-light">:</span>
            <Unit value={seconds} label="Secunde" />
          </div>

          <div className="mt-6 inline-flex items-center gap-4 text-[12px] text-white/70 uppercase tracking-widest">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> 1–4 iulie</span>
            <span className="opacity-30">·</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Exclusiv pe Cartoonix</span>
          </div>
        </section>

        {/* PASS + STORY */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Lanyard pass — floating, slight tilt */}
          <div className="lg:col-span-5 order-2 lg:order-1 flex justify-center">
            <div
              data-testid="festival-pass"
              className="relative"
              style={{ filter: "drop-shadow(0 30px 50px rgba(0,0,0,0.55))" }}
            >
              <img
                src="/festival/pass.png"
                alt="Cartoonix Fest — All Access Pass"
                className="w-[260px] sm:w-[340px] lg:w-[400px] h-auto animate-[festPassFloat_6s_ease-in-out_infinite] select-none"
                draggable={false}
              />
            </div>
          </div>

          {/* Narrative */}
          <div className="lg:col-span-7 order-1 lg:order-2">
            <h2 className="font-display text-2xl sm:text-3xl text-white tracking-wide leading-tight">
              Vara aceasta, nostalgia iese din ecran.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/85">
              Patru zile în care Cartoonix devine locul în care amintirile,
              desenele îndrăgite și comunitatea se întâlnesc într-o atmosferă
              specială — creată pentru cei care au crescut cu televizorul
              pornit și cu nerăbdarea următorului episod.
            </p>

            <ul className="mt-6 space-y-2.5">
              {HIGHLIGHTS.map(({ icon: Icon, text }, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-xl px-3 py-2 border border-white/[0.06]"
                  style={{ background: "rgba(8,6,18,0.40)" }}
                >
                  <span
                    className="shrink-0 mt-0.5 grid place-items-center h-7 w-7 rounded-full"
                    style={{
                      background:
                        "linear-gradient(135deg, #f97316, #ec4899)",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.4} />
                  </span>
                  <span className="text-[14px] text-white/90 leading-snug">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CLOSING NOTE */}
        <section className="mx-auto max-w-3xl px-4 sm:px-6 py-10 pb-20 text-center">
          <div
            className="rounded-2xl p-6 sm:p-8"
            style={{
              background:
                "linear-gradient(180deg, rgba(20,12,30,0.55) 0%, rgba(8,4,18,0.70) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(8px)",
            }}
          >
            <p className="text-[15px] leading-relaxed text-white/85 italic">
              „Nu va fi doar un maraton de desene. Va fi o călătorie înapoi
              spre serile în care timpul se oprea, telecomanda devenea cel
              mai important obiect din cameră, iar următorul episod era
              singura noastră grijă."
            </p>
            <p className="mt-5 text-[12px] uppercase tracking-[0.28em] text-amber-200/80 font-semibold">
              Pregătește-ți Festival Pass-ul
            </p>
            <p className="mt-1 text-[12px] text-white/60">
              Programul complet va fi anunțat în curând.
            </p>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes festPassFloat {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50%      { transform: translateY(-14px) rotate(2deg); }
        }
      `}</style>
    </PublicLayout>
  );
}
