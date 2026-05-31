import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { PLUS_BADGE_URL } from "@/lib/badges";
import {
  Tv,
  Users,
  Heart,
  Sparkles,
  ListMusic,
  Trophy,
  LogIn,
  UserPlus,
  ArrowRight,
} from "lucide-react";

const PERKS = [
  {
    icon: Tv,
    title: "Catalogul nostalgic",
    desc: "Jetix, Fox Kids, Cartoon Network și Minimax — toate sub același acoperiș.",
  },
  {
    icon: ListMusic,
    title: "Playlist-uri personale",
    desc: "Organizează-ți episoadele preferate într-o coadă care se redă automat.",
  },
  {
    icon: Heart,
    title: "Salvează favoritele",
    desc: "Construiește-ți biblioteca cu desenele care contează pentru tine.",
  },
  {
    icon: Users,
    title: "Chat live cu comunitatea",
    desc: "Discută cu alți fani în timp real — sau în camera exclusivă PLUS.",
  },
  {
    icon: Trophy,
    title: "Concursuri exclusive",
    desc: "Participă la concursuri și câștigă badge-uri rare în profilul tău.",
  },
  {
    icon: Sparkles,
    title: "Acces anticipat",
    desc: "Membrii PLUS primesc primii noile funcții și conținut bonus.",
  },
];

export default function GuestGatePage() {
  const location = useLocation();
  // After login, send user back to where they tried to go.
  const next =
    location.pathname && location.pathname !== "/"
      ? `?next=${encodeURIComponent(location.pathname + location.search)}`
      : "";

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-foreground relative overflow-hidden">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 60% at 50% -10%, hsla(var(--accent) / 0.18) 0%, transparent 60%), radial-gradient(60% 50% at 10% 110%, hsla(var(--accent) / 0.08) 0%, transparent 60%)",
        }}
      />
      <div className="absolute inset-0 scanlines opacity-40 pointer-events-none" />

      {/* Top nav */}
      <header className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center" data-testid="guest-logo-link">
          <BrandLogo className="h-9 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          <Link to={`/login${next}`} data-testid="guest-nav-login-link">
            <Button
              variant="ghost"
              className="rounded-xl h-10 px-4 text-white/70 hover:text-white hover:bg-white/[0.06]"
            >
              <LogIn className="h-4 w-4 mr-2" /> Loghează-te
            </Button>
          </Link>
          <Link to="/register" data-testid="guest-nav-register-link">
            <Button className="rounded-xl h-10 px-4 font-semibold bg-[hsl(var(--accent))] text-black hover:bg-[hsl(var(--accent))]/90">
              <UserPlus className="h-4 w-4 mr-2" /> Înregistrează-te
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 sm:pt-12 pb-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid lg:grid-cols-12 gap-10 items-center"
        >
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/60">
              <Sparkles className="h-3 w-3 text-[hsl(var(--accent))]" />
              Acces exclusiv pentru membri
            </span>
            <h1 className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl leading-[0.95] tracking-[0.04em] text-white">
              Desenele copilăriei tale,
              <br />
              <span className="text-[hsl(var(--accent))]">în sfârșit acasă.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base sm:text-lg text-white/65 leading-relaxed">
              Cartoonix este un tezaur nostalgic închis comunității noastre. Pentru a viziona, salva favorite, crea playlist-uri și a discuta cu ceilalți fani — ai nevoie de un cont gratuit.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/register" data-testid="guest-cta-register-button">
                <Button className="group rounded-xl h-12 px-6 text-base font-semibold bg-[hsl(var(--accent))] text-black hover:bg-[hsl(var(--accent))]/90 shadow-[0_8px_30px_-8px_hsla(var(--accent)/0.6)]">
                  Creează cont gratuit
                  <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link to={`/login${next}`} data-testid="guest-cta-login-link">
                <Button
                  variant="outline"
                  className="rounded-xl h-12 px-6 text-base font-semibold border-white/15 text-white hover:bg-white/[0.05] hover:text-white"
                >
                  Am deja cont
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-xs text-white/40">
              Înregistrarea durează mai puțin de un minut. Nu cerem card de credit.
            </p>
          </div>

          {/* PLUS spotlight card */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] backdrop-blur-xl p-6 sm:p-8 overflow-hidden"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full"
                style={{
                  background:
                    "radial-gradient(closest-side, hsla(var(--accent) / 0.35), transparent 70%)",
                }}
              />
              <div className="relative flex items-center gap-3">
                <img src={PLUS_BADGE_URL} alt="" className="h-12 w-auto" />
                <div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">
                    Membership
                  </div>
                  <div className="font-display text-2xl tracking-wider text-white">
                    Cartoonix PLUS
                  </div>
                </div>
              </div>
              <ul className="relative mt-6 space-y-2.5 text-sm">
                {[
                  "Streaming Full HD, fără reclame",
                  "Playlist-uri și favorite nelimitate",
                  "Badge PLUS în platformă și pe chat",
                  "Acces în camera de chat exclusivă",
                  "Concursuri și conținut exclusive",
                ].map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))] mt-0.5">
                      <svg viewBox="0 0 20 20" className="h-3 w-3 fill-current">
                        <path d="M7.7 14.3 3.4 10l1.4-1.4 2.9 2.9 7.5-7.5 1.4 1.4z" />
                      </svg>
                    </span>
                    <span className="text-white/80">{b}</span>
                  </li>
                ))}
              </ul>
              <div className="relative mt-6 pt-5 border-t border-white/[0.06] text-xs text-white/45">
                Începe gratuit cu planul FREE — poți face upgrade oricând.
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Perks grid */}
        <div className="mt-16 sm:mt-24">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-block text-[11px] uppercase tracking-[0.28em] text-white/40">
              Ce te așteaptă înăuntru
            </span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl tracking-wider text-white">
              O comunitate construită în jurul nostalgiei
            </h2>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PERKS.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 * i }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-white/15 transition-colors"
                data-testid={`guest-perk-card-${i}`}
              >
                <div className="h-10 w-10 rounded-xl bg-[hsl(var(--accent))]/12 ring-1 ring-[hsl(var(--accent))]/25 grid place-items-center text-[hsl(var(--accent))]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 font-semibold text-white">{title}</div>
                <p className="mt-1.5 text-sm text-white/55 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="mt-16 sm:mt-20 rounded-3xl border border-white/[0.08] bg-gradient-to-r from-[hsl(var(--accent))]/[0.08] via-white/[0.02] to-transparent p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
        >
          <div>
            <h3 className="font-display text-2xl sm:text-3xl tracking-wider text-white">
              Gata să te întorci în copilărie?
            </h3>
            <p className="mt-2 text-sm text-white/55 max-w-lg">
              Câteva click-uri și ești înăuntru — fără card, fără spam, doar desenele care contează.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link to={`/login${next}`} data-testid="guest-footer-login-link">
              <Button
                variant="outline"
                className="rounded-xl h-11 px-5 border-white/15 text-white hover:bg-white/[0.05] hover:text-white"
              >
                Loghează-te
              </Button>
            </Link>
            <Link to="/register" data-testid="guest-footer-register-link">
              <Button className="rounded-xl h-11 px-5 font-semibold bg-[hsl(var(--accent))] text-black hover:bg-[hsl(var(--accent))]/90">
                Înregistrează-te <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
