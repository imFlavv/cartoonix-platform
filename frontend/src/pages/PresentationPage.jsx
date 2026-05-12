import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Star,
  Radio,
  Tv,
  Heart,
  Users,
  PlayCircle,
  ChevronRight,
  Calendar,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/contexts/AuthContext";

/* ----------------------------------------------------------------- */
/*  Small reusable visual atoms                                      */
/* ----------------------------------------------------------------- */
const GOLD = "#d6a648";
const DEEP = "#1a0306";

function Ornament({ className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="h-px w-12 bg-gradient-to-r from-transparent via-[#d6a648]/60 to-[#d6a648]/60" />
      <span className="inline-block h-1.5 w-1.5 rotate-45 bg-[#d6a648]" />
      <span className="h-px w-12 bg-gradient-to-l from-transparent via-[#d6a648]/60 to-[#d6a648]/60" />
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.3em] font-semibold uppercase text-[#d6a648]">
      <span className="h-px w-8 bg-[#d6a648]/60" />
      {children}
      <span className="h-px w-8 bg-[#d6a648]/60" />
    </div>
  );
}

function FrameCard({ children, className = "" }) {
  return (
    <div
      className={`relative bg-[#120406] border border-[#d6a648]/15 rounded-sm ${className}`}
      style={{
        boxShadow:
          "inset 0 0 0 1px rgba(214, 166, 72, 0.06), 0 18px 50px -28px rgba(0,0,0,0.8)",
      }}
    >
      {/* Ornate corners */}
      <span className="pointer-events-none absolute top-2 left-2 h-3 w-3 border-l border-t border-[#d6a648]/45" />
      <span className="pointer-events-none absolute top-2 right-2 h-3 w-3 border-r border-t border-[#d6a648]/45" />
      <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-l border-b border-[#d6a648]/45" />
      <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-r border-b border-[#d6a648]/45" />
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- */
/*  PRESENTATION PAGE                                                 */
/* ----------------------------------------------------------------- */
export default function PresentationPage() {
  const { user } = useAuth();

  const features = [
    {
      icon: Star,
      title: "EPISOADE CARE AU RĂMAS CU NOI",
      desc: "Desenele pe care le căutai după școală, acum adunate într-un singur loc, în varianta pe care ți-o amintești.",
    },
    {
      icon: Radio,
      title: "PROGRAM LIVE CA PE VREMURI",
      desc: "De luni până vineri, între 07:00 și 22:00, rulează nonstop atmosfera aceea clasică de canal TV.",
    },
    {
      icon: Tv,
      title: "RECLAME DIN COPILĂRIE",
      desc: "Spoturi vechi, intro-uri și pauze care completează perfect vibe-ul anilor 2000.",
    },
    {
      icon: Heart,
      title: "ALES CU GRIJĂ",
      desc: "Fiecare episod este verificat și organizat atent, fără uploaduri haotice sau conținut pus la întâmplare.",
    },
    {
      icon: Users,
      title: "PENTRU COPII ȘI PĂRINȚI",
      desc: "O platformă gândită pentru toate generațiile — atât pentru cei care au crescut cu ele, cât și pentru cei care le descoperă acum.",
    },
    {
      icon: ShieldCheck,
      title: "UN LOC LINIȘTIT",
      desc: "Fără reclame agresive, fără redirect-uri ciudate sau ferestre enervante — doar desene și nostalgie.",
    },
  ];

  const channels = [
    {
      name: "Cartoon Network",
      tag: "Aventură & comedie",
      gradient: "from-[#0e3a7a] via-[#1e4ea2] to-[#0a2a5c]",
      letter: "CN",
    },
    {
      name: "JETIX & Fox Kids",
      tag: "Acțiune & super-eroi",
      gradient: "from-[#7d0d0d] via-[#b41616] to-[#5a0808]",
      letter: "JETIX",
    },
    {
      name: "Minimax",
      tag: "Desene clasice",
      gradient: "from-[#a86b00] via-[#e5a51a] to-[#7d4d00]",
      letter: "MINIMAX",
    },
  ];

  const stats = [
    { value: "1000+", label: "Episoade" },
    { value: "150+", label: "Seriale" },
    { value: "15h", label: "Program zilnic" },
    { value: "3", label: "Canale legendare" },
  ];

  return (
    <div className="min-h-screen bg-[#08020a] text-white antialiased selection:bg-[#d6a648]/30 selection:text-white">
      {/* ============================================================
          TOP NAV
      ============================================================ */}
      <header className="relative z-30 border-b border-white/5 bg-black/40 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center" data-testid="presentation-logo">
            <BrandLogo variant="horizontal" size="md" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#despre" className="hover:text-white transition-colors">Despre</a>
            <a href="#functii" className="hover:text-white transition-colors">Funcționalități</a>
            <a href="#canale" className="hover:text-white transition-colors">Canale</a>
            <a href="#program" className="hover:text-white transition-colors">Program</a>
          </nav>
          <div className="flex items-center gap-3">
            {!user ? (
              <Link to="/register" data-testid="presentation-register">
                <Button
                  size="lg"
                  className="rounded-sm bg-[#d6a648] hover:bg-[#c5972f] text-black font-semibold h-11 px-6 border border-[#e5b95b]/60"
                  style={{ letterSpacing: "0.08em" }}
                >
                  ÎNREGISTRARE
                </Button>
              </Link>
            ) : (
              <span className="text-xs uppercase tracking-widest text-white/55">
                Acces în curând
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================
          HERO
      ============================================================ */}
      <section className="relative overflow-hidden">
        {/* Studio red backdrop */}
        <div
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage: "url('/brand/bg-studio-red.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/35 to-[#08020a]" />
        {/* Subtle vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#08020a_100%)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-28 lg:pt-28 lg:pb-36">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left text */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#d6a648]/40 rounded-sm bg-black/30">
                <Sparkles className="h-3.5 w-3.5 text-[#d6a648]" />
                <span className="text-[11px] tracking-[0.28em] uppercase text-[#d6a648]">
                  O platformă premium de streaming retro
                </span>
              </div>

              <h1
                className="mt-7 text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight"
                style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
              >
                Desenele tale,
                <br />
                <span className="italic font-normal text-[#d6a648]">
                  oricând, oriunde.
                </span>
              </h1>

              <p className="mt-7 text-lg sm:text-xl text-white/75 leading-relaxed max-w-xl">
                Cartoonix este destinația dedicată desenelor animate care au
                marcat copilăria anilor &apos;90 și 2000. O experiență de
                streaming serioasă, atent realizată, pentru cei care prețuiesc
                detaliul și calitatea.
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {!user ? (
                  <Link to="/register">
                    <Button
                      size="lg"
                      data-testid="presentation-cta-register"
                      className="rounded-sm h-12 px-8 bg-[#d6a648] hover:bg-[#c5972f] text-black font-semibold border border-[#e5b95b]/70 group"
                      style={{ letterSpacing: "0.1em" }}
                    >
                      CREEAZĂ UN CONT
                      <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </Link>
                ) : (
                  <span className="text-sm text-white/70">
                    Ești înregistrat. Accesul complet va fi disponibil în curând.
                  </span>
                )}
                <a
                  href="#despre"
                  className="text-sm tracking-[0.22em] uppercase text-white/70 hover:text-[#d6a648] transition-colors border-b border-white/15 pb-1"
                >
                  Află mai mult
                </a>
              </div>

              {/* Trust line removed by request */}
            </motion.div>

            {/* Right official logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="lg:col-span-6 flex items-center justify-center relative"
            >
              <div className="relative w-full max-w-[680px] aspect-square flex items-center justify-center mx-auto">
                {/* Ornate frame */}
                <span className="absolute inset-0 border border-[#d6a648]/20 rounded-sm" />
                <span className="absolute inset-3 border border-[#d6a648]/10 rounded-sm" />
                {/* Corner ornaments */}
                <span className="absolute -top-px -left-px h-6 w-6 border-l-2 border-t-2 border-[#d6a648]/80" />
                <span className="absolute -top-px -right-px h-6 w-6 border-r-2 border-t-2 border-[#d6a648]/80" />
                <span className="absolute -bottom-px -left-px h-6 w-6 border-l-2 border-b-2 border-[#d6a648]/80" />
                <span className="absolute -bottom-px -right-px h-6 w-6 border-r-2 border-b-2 border-[#d6a648]/80" />

                <img
                  src="/brand/cartoonix-logo-hero.png"
                  alt="Cartoonix"
                  className="relative z-10 w-[92%] h-auto object-contain select-none"
                  draggable={false}
                />
              </div>
            </motion.div>
          </div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-16 lg:mt-24 border-t border-b border-[#d6a648]/15 py-7 grid grid-cols-2 sm:grid-cols-4 gap-6"
          >
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div
                  className="text-3xl sm:text-4xl text-[#d6a648]"
                  style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
                >
                  {s.value}
                </div>
                <div className="mt-1 text-[10px] tracking-[0.28em] uppercase text-white/55">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================================
          DESPRE
      ============================================================ */}
      <section id="despre" className="relative py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <SectionLabel>Despre Cartoonix</SectionLabel>
          <h2
            className="mt-6 text-4xl sm:text-5xl leading-tight"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
          >
            O scrisoare de dragoste
            <br />
            <span className="italic text-[#d6a648]">desenelor de altădată.</span>
          </h2>
          <Ornament className="justify-center mt-7" />
          <p className="mt-8 text-lg text-white/75 leading-[1.85] max-w-3xl mx-auto">
            Cartoonix nu este doar o platformă de streaming. Este un proiect
            construit cu grijă, în care fiecare detaliu — de la calitatea
            episoadelor la programul de difuzare — este gândit pentru a păstra
            atmosfera autentică a copilăriei. Aducem împreună <em className="not-italic text-[#d6a648]">Cartoon
            Network</em>, <em className="not-italic text-[#d6a648]">JETIX & Fox Kids</em> și <em className="not-italic text-[#d6a648]">Minimax</em>, într-un
            singur loc, cu un program continuu și o estetică elegantă.
          </p>
        </div>
      </section>

      {/* ============================================================
          FUNCȚIONALITĂȚI
      ============================================================ */}
      <section id="functii" className="relative py-24 bg-gradient-to-b from-[#0a0306] via-[#0d0204] to-[#08020a]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <SectionLabel>Ce găsești aici</SectionLabel>
            <h2
              className="mt-6 text-4xl sm:text-5xl"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
            >
              Funcționalități atent gândite
            </h2>
            <Ornament className="justify-center mt-6" />
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
              >
                <FrameCard className="h-full p-8">
                  <div className="h-12 w-12 grid place-items-center border border-[#d6a648]/40 rounded-sm">
                    <f.icon className="h-5 w-5 text-[#d6a648]" strokeWidth={1.6} />
                  </div>
                  <h3
                    className="mt-6 text-base tracking-[0.12em] text-white"
                    style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.25rem", letterSpacing: "0.08em" }}
                  >
                    {f.title}
                  </h3>
                  <div className="mt-3 h-px w-10 bg-[#d6a648]/40" />
                  <p className="mt-4 text-sm text-white/65 leading-relaxed">
                    {f.desc}
                  </p>
                </FrameCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          CANALE
      ============================================================ */}
      <section id="canale" className="relative py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <SectionLabel>Trei canale legendare</SectionLabel>
            <h2
              className="mt-6 text-4xl sm:text-5xl"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
            >
              <span className="italic text-[#d6a648]">Reunite</span> sub un singur acoperiș
            </h2>
            <Ornament className="justify-center mt-6" />
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            {channels.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group relative"
              >
                <div
                  className={`relative aspect-[4/5] bg-gradient-to-b ${c.gradient} border border-[#d6a648]/15 overflow-hidden`}
                >
                  {/* Inner frame */}
                  <span className="pointer-events-none absolute inset-3 border border-white/10" />
                  <span className="pointer-events-none absolute top-4 left-4 h-3 w-3 border-l border-t border-white/40" />
                  <span className="pointer-events-none absolute top-4 right-4 h-3 w-3 border-r border-t border-white/40" />
                  <span className="pointer-events-none absolute bottom-4 left-4 h-3 w-3 border-l border-b border-white/40" />
                  <span className="pointer-events-none absolute bottom-4 right-4 h-3 w-3 border-r border-b border-white/40" />

                  {/* Subtle overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />

                  <div className="relative h-full flex flex-col items-center justify-end p-8 pb-10">
                    <span
                      className="text-4xl sm:text-5xl text-white text-center tracking-wider"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {c.letter}
                    </span>
                    <span className="mt-3 h-px w-10 bg-white/40" />
                    <span className="mt-3 text-[11px] tracking-[0.28em] uppercase text-white/85">
                      {c.tag}
                    </span>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <h3
                    className="text-xl text-white"
                    style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600 }}
                  >
                    {c.name}
                  </h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          PROGRAM LIVE
      ============================================================ */}
      <section id="program" className="relative py-24 bg-gradient-to-b from-[#0a0306] to-[#08020a]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <FrameCard className="p-10 sm:p-14 lg:p-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <SectionLabel>Program difuzare</SectionLabel>
                <h2
                  className="mt-6 text-4xl sm:text-5xl leading-tight"
                  style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
                >
                  Transmisiune
                  <br />
                  <span className="italic text-[#d6a648]">continuă & live.</span>
                </h2>
                <Ornament className="mt-6" />
                <p className="mt-7 text-base text-white/70 leading-relaxed">
                  Programul nostru este conceput ca un canal TV clasic: începe
                  dimineața, te însoțește pe parcursul zilei și se încheie seara.
                  Fără reluare la cerere — exact ca în vremurile bune.
                </p>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="border-l-2 border-[#d6a648] pl-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/55">
                      <Calendar className="h-3.5 w-3.5" /> Zile
                    </div>
                    <div
                      className="mt-2 text-xl text-white"
                      style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600 }}
                    >
                      Luni – Vineri
                    </div>
                  </div>
                  <div className="border-l-2 border-[#d6a648] pl-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/55">
                      <Clock className="h-3.5 w-3.5" /> Interval
                    </div>
                    <div
                      className="mt-2 text-xl text-white"
                      style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600 }}
                    >
                      07:00 – 22:00
                    </div>
                  </div>
                </div>
              </div>

              {/* On-air panel */}
              <div className="relative">
                <div className="relative bg-[#0a0204] border border-[#d6a648]/25 p-10 sm:p-14">
                  <span className="pointer-events-none absolute -top-px -left-px h-6 w-6 border-l-2 border-t-2 border-[#d6a648]" />
                  <span className="pointer-events-none absolute -top-px -right-px h-6 w-6 border-r-2 border-t-2 border-[#d6a648]" />
                  <span className="pointer-events-none absolute -bottom-px -left-px h-6 w-6 border-l-2 border-b-2 border-[#d6a648]" />
                  <span className="pointer-events-none absolute -bottom-px -right-px h-6 w-6 border-r-2 border-b-2 border-[#d6a648]" />

                  <div className="flex items-center justify-center gap-2 text-[11px] tracking-[0.32em] uppercase text-white/55">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff3b3b]" />
                    On Air
                  </div>
                  <div
                    className="mt-4 text-center text-[64px] sm:text-[88px] leading-none text-[#d6a648]"
                    style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
                  >
                    LIVE
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <span className="h-px w-12 bg-[#d6a648]/40" />
                    <span className="text-[11px] tracking-[0.32em] uppercase text-white/65">
                      24h • 5 zile pe săptămână
                    </span>
                    <span className="h-px w-12 bg-[#d6a648]/40" />
                  </div>
                </div>
              </div>
            </div>
          </FrameCard>
        </div>
      </section>

      {/* ============================================================
          CTA FINAL
      ============================================================ */}
      <section className="relative py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#d6a648]/50 bg-[#120406]">
            <PlayCircle className="h-7 w-7 text-[#d6a648]" strokeWidth={1.5} />
          </div>
          <h2
            className="mt-7 text-4xl sm:text-5xl leading-tight"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
          >
            Pregătit pentru o
            <br />
            <span className="italic text-[#d6a648]">călătorie în timp?</span>
          </h2>
          <Ornament className="justify-center mt-7" />
          <p className="mt-7 text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">
            Înregistrează un cont astăzi pentru a fi printre primii utilizatori
            când platforma devine complet disponibilă. Locul tău este deja
            rezervat.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-col sm:flex-row">
            {!user ? (
              <Link to="/register" data-testid="cta-final-register">
                <Button
                  size="lg"
                  className="rounded-sm h-12 px-9 bg-[#d6a648] hover:bg-[#c5972f] text-black font-semibold border border-[#e5b95b]/70 group"
                  style={{ letterSpacing: "0.12em" }}
                >
                  CREEAZĂ CONT GRATUIT
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            ) : (
              <span className="text-base text-white/75">
                Te așteptăm. Accesul complet va fi disponibil în curând.
              </span>
            )}
          </div>
          <p className="mt-5 text-xs tracking-[0.22em] uppercase text-white/40">
            Acces gratuit la lansare
          </p>
        </div>
      </section>

      {/* ============================================================
          FOOTER
      ============================================================ */}
      <footer className="relative border-t border-white/8 mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <BrandLogo variant="horizontal" size="sm" />
          </div>
          <div className="text-xs text-white/45 tracking-wider">
            © {new Date().getFullYear()} Cartoonix. Toate drepturile rezervate.
          </div>
          <div className="flex items-center gap-6 text-[11px] tracking-[0.22em] uppercase text-white/55">
            <Link to="/terms-and-conditions" className="hover:text-[#d6a648] transition-colors">
              Termeni
            </Link>
            <a href="#despre" className="hover:text-[#d6a648] transition-colors">
              Despre
            </a>
            <a href="#functii" className="hover:text-[#d6a648] transition-colors">
              Funcționalități
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
