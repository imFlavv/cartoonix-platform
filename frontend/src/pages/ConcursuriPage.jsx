import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Trophy,
  Star,
  Sparkles,
  Ticket,
  Mail,
  ChevronRight,
  ExternalLink,
  Plane,
  BedDouble,
  Castle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/BrandLogo";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const DISNEYLAND_PAYMENT_LINK =
  "https://buy.stripe.com/00w3co5oZgFO2ydfoO9EI01";

/* ----------------------------------------------------------------- */
/*  Atoms                                                             */
/* ----------------------------------------------------------------- */
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

/* ----------------------------------------------------------------- */
/*  HERO — Disneyland (the star of the page)                          */
/* ----------------------------------------------------------------- */
function DisneylandHero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      data-testid="contest-card-disneyland"
      className="relative"
    >
      <div
        className="relative overflow-hidden border border-[#d6a648]/35 rounded-sm"
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(214,166,72,0.10), 0 50px 130px -40px rgba(214,166,72,0.20), 0 30px 80px -30px rgba(0,0,0,0.85)",
        }}
      >
        {/* Ornate corners (outer frame) */}
        <span className="pointer-events-none absolute top-2 left-2 h-5 w-5 border-l-2 border-t-2 border-[#d6a648]/80 z-20" />
        <span className="pointer-events-none absolute top-2 right-2 h-5 w-5 border-r-2 border-t-2 border-[#d6a648]/80 z-20" />
        <span className="pointer-events-none absolute bottom-2 left-2 h-5 w-5 border-l-2 border-b-2 border-[#d6a648]/80 z-20" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-5 w-5 border-r-2 border-b-2 border-[#d6a648]/80 z-20" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-[560px]">
          {/* Image side */}
          <div className="relative lg:col-span-7 h-80 lg:h-auto overflow-hidden">
            <img
              src="/brand/disneyland-hero.png"
              alt="Disneyland Paris"
              className="absolute inset-0 w-full h-full object-cover select-none"
              draggable={false}
            />
            {/* Cinematic gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#08020a]/85 via-transparent to-transparent lg:hidden" />
            <div className="absolute inset-0 hidden lg:block bg-gradient-to-r from-transparent via-transparent to-[#08020a]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,transparent_30%,rgba(8,2,10,0.45)_100%)]" />

            {/* Premium ribbon */}
            <div className="absolute top-6 left-6 z-10">
              <span
                className="inline-flex items-center gap-2 bg-[#d6a648] text-black text-[10px] font-bold px-4 py-2 rounded-sm"
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  letterSpacing: "0.28em",
                }}
              >
                <Trophy className="h-3.5 w-3.5" />
                Marele Premiu
              </span>
            </div>

            {/* Floating quote on image (desktop) */}
            <div className="absolute bottom-8 left-8 right-8 lg:right-auto lg:max-w-md z-10">
              <div className="text-[10px] tracking-[0.32em] uppercase text-[#d6a648] mb-2">
                Cartoonix · Experiență exclusivă
              </div>
              <h3
                className="text-3xl sm:text-4xl text-white leading-tight"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                }}
              >
                O vacanță
                <span className="italic font-normal text-[#d6a648]"> ca într-o poveste.</span>
              </h3>
            </div>
          </div>

          {/* Content side */}
          <div className="relative lg:col-span-5 bg-gradient-to-b from-[#120406] to-[#08020a] p-8 sm:p-12 lg:p-14 flex flex-col justify-center">
            {/* Inner frame */}
            <span className="pointer-events-none absolute inset-5 border border-[#d6a648]/10 rounded-sm" />

            <div className="relative">
              <div className="text-[10px] tracking-[0.32em] uppercase text-[#d6a648]">
                Concurs · Plată
              </div>

              <h2
                className="mt-4 text-5xl sm:text-6xl leading-[1.05] text-white"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                }}
              >
                Disneyland
                <br />
                <span className="italic font-normal text-[#d6a648]">Paris</span>
              </h2>

              <Ornament className="mt-6" />

              <p className="mt-7 text-base text-white/75 leading-relaxed">
                Marele premiu Cartoonix: o vacanță magică pentru
                <span className="text-[#d6a648] font-semibold"> 2 persoane</span>,
                într-un loc în care poveștile prind viață.
              </p>

              <ul className="mt-7 space-y-3.5 text-sm text-white/75">
                <li className="flex items-center gap-3">
                  <Plane className="h-4 w-4 text-[#d6a648]" strokeWidth={1.6} />
                  Bilete avion dus-întors
                </li>
                <li className="flex items-center gap-3">
                  <BedDouble className="h-4 w-4 text-[#d6a648]" strokeWidth={1.6} />
                  3 nopți cazare
                </li>
                <li className="flex items-center gap-3">
                  <Castle className="h-4 w-4 text-[#d6a648]" strokeWidth={1.6} />
                  Acces complet la parcul tematic
                </li>
              </ul>

              <div className="mt-10 pt-6 border-t border-[#d6a648]/15">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] tracking-[0.32em] uppercase text-white/45">
                    Bilet participare
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.28em] uppercase text-[#d6a648]">
                    <Ticket className="h-3 w-3" />
                    Plată Stripe
                  </span>
                </div>

                <a
                  href={DISNEYLAND_PAYMENT_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="contest-disneyland-buy-btn"
                >
                  <Button
                    className="w-full h-14 rounded-sm bg-[#d6a648] hover:bg-[#c5972f] text-black font-bold border border-[#e5b95b]/80 group text-[15px]"
                    style={{ letterSpacing: "0.14em" }}
                  >
                    CUMPĂRĂ BILET
                    <ExternalLink className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </a>
                <p className="mt-3 text-[10px] tracking-[0.22em] uppercase text-center text-white/40">
                  Confirmare instant pe email · Plată sigură
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* ----------------------------------------------------------------- */
/*  Contest Card (free) — smaller, secondary                          */
/* ----------------------------------------------------------------- */
function FreeContestCard({
  contestId,
  eyebrow,
  title,
  prize,
  description,
  icon: Icon,
  testid,
  delay = 0,
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API}/contests/enter`, {
        email: email.trim(),
        contest_id: contestId,
      });
      if (data?.duplicate) {
        toast.info("Ești deja înscris cu acest email la concurs.");
      } else {
        toast.success("Înscriere confirmată! Verifică emailul.");
      }
      setEnrolled(true);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Înscrierea nu a putut fi procesată. Încearcă din nou.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay }}
      data-testid={testid}
      className="relative flex flex-col bg-[#120406]/90 border border-[#d6a648]/20 rounded-sm overflow-hidden backdrop-blur-sm"
      style={{
        boxShadow:
          "inset 0 0 0 1px rgba(214,166,72,0.06), 0 24px 60px -30px rgba(0,0,0,0.85)",
      }}
    >
      {/* Ornate corners */}
      <span className="pointer-events-none absolute top-2 left-2 h-3 w-3 border-l border-t border-[#d6a648]/45" />
      <span className="pointer-events-none absolute top-2 right-2 h-3 w-3 border-r border-t border-[#d6a648]/45" />
      <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-l border-b border-[#d6a648]/45" />
      <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-r border-b border-[#d6a648]/45" />

      <div className="p-8 sm:p-10 flex flex-col flex-1">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 grid place-items-center border border-[#d6a648]/40 rounded-sm bg-[#0a0204]">
            <Icon className="h-5 w-5 text-[#d6a648]" strokeWidth={1.6} />
          </div>
          <span className="text-[10px] tracking-[0.32em] uppercase text-[#d6a648]">
            {eyebrow}
          </span>
        </div>

        <h3
          className="mt-7 text-3xl leading-tight text-white"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
        >
          {title}
        </h3>
        <div className="mt-4 h-px w-12 bg-[#d6a648]/50" />

        <div className="mt-5 text-[11px] tracking-[0.28em] uppercase text-white/55">
          Premiu
        </div>
        <div
          className="mt-1 text-[#d6a648] text-lg italic"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600 }}
        >
          {prize}
        </div>

        <p className="mt-5 text-sm text-white/65 leading-relaxed flex-1">
          {description}
        </p>

        {/* CTA */}
        <div className="mt-8">
          <div className="text-[10px] tracking-[0.32em] uppercase text-white/45 mb-2">
            Participare gratuită
          </div>

          {enrolled ? (
            <div
              className="border border-[#d6a648]/30 bg-[#0a0204] px-4 py-3 text-sm text-[#e5b95b] flex items-center gap-2"
              data-testid={`${testid}-success`}
            >
              <Sparkles className="h-4 w-4" />
              Înscriere înregistrată cu succes.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3" data-testid={`${testid}-form`}>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="adresa@email.ro"
                  data-testid={`${testid}-email-input`}
                  className="h-11 pl-9 bg-[#0a0204] border-[#d6a648]/25 text-white placeholder:text-white/30 rounded-sm focus-visible:ring-[#d6a648]/40 focus-visible:border-[#d6a648]/60"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                data-testid={`${testid}-submit-btn`}
                className="w-full h-11 rounded-sm bg-transparent hover:bg-[#d6a648] text-[#d6a648] hover:text-black font-semibold border border-[#d6a648]/60 hover:border-[#e5b95b] group transition-colors"
                style={{ letterSpacing: "0.12em" }}
              >
                {submitting ? "SE TRIMITE..." : "PARTICIPĂ"}
                <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </motion.article>
  );
}

/* ----------------------------------------------------------------- */
/*  PAGE                                                              */
/* ----------------------------------------------------------------- */
export default function ConcursuriPage() {
  return (
    <div className="min-h-screen bg-[#08020a] text-white antialiased selection:bg-[#d6a648]/30 selection:text-white">
      {/* TOP NAV */}
      <header className="relative z-30 border-b border-white/5 bg-black/40 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center" data-testid="concursuri-logo">
            <BrandLogo variant="horizontal" size="md" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <Link to="/" className="hover:text-white transition-colors">Acasă</Link>
            <Link to="/concursuri" className="text-[#d6a648]">Concursuri</Link>
            <Link to="/register" className="hover:text-white transition-colors">Cont nou</Link>
          </nav>
          <Link to="/register" data-testid="concursuri-register-btn">
            <Button
              size="lg"
              className="rounded-sm bg-[#d6a648] hover:bg-[#c5972f] text-black font-semibold h-11 px-6 border border-[#e5b95b]/60"
              style={{ letterSpacing: "0.08em" }}
            >
              ÎNREGISTRARE
            </Button>
          </Link>
        </div>
      </header>

      {/* HERO INTRO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,166,72,0.10),transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-24 pb-12 text-center">
          <SectionLabel>Cartoonix · Concursuri</SectionLabel>
          <h1
            className="mt-7 text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
          >
            Premii care
            <br />
            <span className="italic font-normal text-[#d6a648]">
              îți schimbă povestea.
            </span>
          </h1>
          <Ornament className="justify-center mt-8" />
          <p className="mt-7 text-lg text-white/70 leading-relaxed max-w-2xl mx-auto">
            Trei concursuri exclusive, atent gândite pentru fanii Cartoonix.
            Două gratuite — unul magic. Înscrie-te acum și fă parte din comunitate.
          </p>
        </div>
      </section>

      {/* DISNEYLAND HERO CARD */}
      <section className="relative pt-4 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <DisneylandHero />
        </div>
      </section>

      {/* SECONDARY CONTESTS */}
      <section className="relative py-12 lg:py-16 border-t border-white/5 bg-gradient-to-b from-[#0a0306] to-[#08020a]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <SectionLabel>Concursuri gratuite</SectionLabel>
            <h2
              className="mt-6 text-3xl sm:text-4xl"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
            >
              Participă fără cost
            </h2>
            <Ornament className="justify-center mt-5" />
            <p className="mt-5 text-sm text-white/55 max-w-xl mx-auto">
              Lasă adresa ta de email și ești înscris la tragerea la sorți.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FreeContestCard
              contestId="toy-story-5"
              eyebrow="Premiera filmului"
              title="Toy Story 5"
              prize="2 invitații la premieră"
              description="Fii printre primii care văd noua aventură Pixar. Te trimitem la premieră, alături de un însoțitor, pentru o seară de neuitat."
              icon={Star}
              testid="contest-card-toystory"
            />
            <FreeContestCard
              contestId="abonamente-plus"
              eyebrow="Abonamente premium"
              title="15 × Cartoonix PLUS"
              prize="Acces premium 12 luni"
              description="Cincisprezece abonamente Cartoonix PLUS, oferite cadou. Acces nelimitat la episoade exclusive, playlist-uri și fără reclame."
              icon={Sparkles}
              testid="contest-card-plus"
              delay={0.08}
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative py-20 border-t border-white/5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <SectionLabel>Cum funcționează</SectionLabel>
            <h2
              className="mt-6 text-3xl sm:text-4xl"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
            >
              Trei pași simpli
            </h2>
            <Ornament className="justify-center mt-6" />
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: "01", t: "Alege concursul", d: "Selectează unul dintre cele trei concursuri active." },
              { n: "02", t: "Înscrie-te rapid", d: "Adresa de email este tot ce avem nevoie pentru concursurile gratuite." },
              { n: "03", t: "Așteaptă rezultatele", d: "Tragerea la sorți se face automat. Câștigătorii sunt anunțați pe email." },
            ].map((step) => (
              <div key={step.n} className="text-center">
                <div
                  className="text-5xl text-[#d6a648]"
                  style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
                >
                  {step.n}
                </div>
                <div className="mt-3 mx-auto h-px w-10 bg-[#d6a648]/40" />
                <h3
                  className="mt-4 text-xl text-white"
                  style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600 }}
                >
                  {step.t}
                </h3>
                <p className="mt-3 text-sm text-white/65 max-w-xs mx-auto leading-relaxed">
                  {step.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative border-t border-white/8 mt-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <BrandLogo variant="horizontal" size="sm" />
          <div className="text-xs text-white/45 tracking-wider">
            © {new Date().getFullYear()} Cartoonix. Toate drepturile rezervate.
          </div>
          <div className="flex items-center gap-6 text-[11px] tracking-[0.22em] uppercase text-white/55">
            <Link to="/terms-and-conditions" className="hover:text-[#d6a648] transition-colors">
              Termeni
            </Link>
            <Link to="/" className="hover:text-[#d6a648] transition-colors">
              Acasă
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
