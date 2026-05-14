import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, ExternalLink, Sparkles, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISNEYLAND_PAYMENT_LINK =
  "https://buy.stripe.com/00w3co5oZgFO2ydfoO9EI01";
const SESSION_KEY = "cartoonix_disneyland_popup_shown";

export default function DisneylandPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(SESSION_KEY);
      if (seen) return;
    } catch (_) {
      /* sessionStorage might be unavailable */
    }
    // Delay a little for a more deliberate reveal
    const t = setTimeout(() => setOpen(true), 1400);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch (_) {
      /* noop */
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain"
          data-testid="disneyland-popup-overlay"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
            onClick={dismiss}
          />

          {/* Scroll container — flex centers on desktop, stacks/scrolls on mobile */}
          <div className="relative min-h-full flex items-start sm:items-center justify-center p-3 sm:p-6">
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-5xl bg-[#08020a] border border-[#d6a648]/40 shadow-[0_40px_120px_-20px_rgba(214,166,72,0.25)] overflow-hidden rounded-sm my-auto"
            data-testid="disneyland-popup-modal"
          >
            {/* Ornate corners */}
            <span className="pointer-events-none absolute top-2 left-2 h-5 w-5 border-l-2 border-t-2 border-[#d6a648]/80 z-10" />
            <span className="pointer-events-none absolute top-2 right-2 h-5 w-5 border-r-2 border-t-2 border-[#d6a648]/80 z-10" />
            <span className="pointer-events-none absolute bottom-2 left-2 h-5 w-5 border-l-2 border-b-2 border-[#d6a648]/80 z-10" />
            <span className="pointer-events-none absolute bottom-2 right-2 h-5 w-5 border-r-2 border-b-2 border-[#d6a648]/80 z-10" />

            {/* Close button — bigger & more visible on mobile */}
            <button
              onClick={dismiss}
              aria-label="Închide"
              data-testid="disneyland-popup-close"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 h-11 w-11 sm:h-9 sm:w-9 grid place-items-center rounded-full bg-black/80 border border-[#d6a648]/50 text-white hover:text-[#d6a648] hover:border-[#d6a648] active:scale-95 transition-all shadow-lg"
            >
              <X className="h-5 w-5 sm:h-4 sm:w-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Left: image — smaller on mobile to give content more room */}
              <div className="relative h-44 sm:h-64 md:h-auto md:min-h-[520px] overflow-hidden">
                <img
                  src="/brand/disneyland-hero.webp"
                  loading="eager"
                  fetchpriority="high"
                  alt="Disneyland Paris"
                  className="absolute inset-0 w-full h-full object-cover select-none"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#08020a]/40 md:to-[#08020a]/95" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08020a]/80 via-transparent to-transparent md:hidden" />

                {/* Premium ribbon */}
                <div className="absolute top-4 left-4 sm:top-5 sm:left-5">
                  <span
                    className="inline-flex items-center gap-2 bg-[#d6a648] text-black text-[10px] font-bold px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-sm"
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      letterSpacing: "0.28em",
                    }}
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    Marele Premiu
                  </span>
                </div>
              </div>

              {/* Right: content */}
              <div className="relative p-5 sm:p-8 lg:p-12 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.32em] uppercase text-[#d6a648]">
                  <span className="h-px w-8 bg-[#d6a648]/60" />
                  Cartoonix · Concurs
                </div>

                <h2
                  className="mt-4 sm:mt-5 text-3xl sm:text-4xl lg:text-5xl leading-[1.05] text-white"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 700,
                  }}
                >
                  Disneyland
                  <br />
                  <span className="italic font-normal text-[#d6a648]">
                    Paris
                  </span>
                </h2>

                <div className="mt-3 sm:mt-4 flex items-center gap-3">
                  <span className="h-px w-10 sm:w-12 bg-[#d6a648]/70" />
                  <span className="inline-block h-1.5 w-1.5 rotate-45 bg-[#d6a648]" />
                  <span className="h-px w-10 sm:w-12 bg-[#d6a648]/70" />
                </div>

                <p className="mt-5 sm:mt-6 text-[14px] sm:text-[15px] text-white/75 leading-relaxed">
                  O vacanță magică pentru 2 persoane, oferită de Cartoonix.
                  O experiență care îți va rămâne în suflet pentru totdeauna.
                </p>

                <ul className="mt-5 sm:mt-6 space-y-2 sm:space-y-2.5 text-[13px] sm:text-sm text-white/70">
                  <li className="flex items-center gap-3">
                    <span className="h-1 w-1 rounded-full bg-[#d6a648]" />
                    Bilete avion dus-întors
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="h-1 w-1 rounded-full bg-[#d6a648]" />
                    3 nopți cazare
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="h-1 w-1 rounded-full bg-[#d6a648]" />
                    Acces complet la parcul tematic
                  </li>
                </ul>

                {/* Tickets info */}
                <div className="mt-5 sm:mt-6 border border-[#d6a648]/25 bg-[#0a0204] px-4 py-3 sm:py-3.5 rounded-sm">
                  <div className="flex items-center gap-2.5">
                    <Ticket className="h-4 w-4 text-[#d6a648] flex-shrink-0" strokeWidth={1.8} />
                    <span className="text-[13px] sm:text-sm text-white/85">
                      <span className="text-[#d6a648] font-semibold">1 ticket</span> = 1 șansă de câștig
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-white/55 leading-relaxed" style={{ paddingLeft: "1.65rem" }}>
                    Cu cât mai multe tickete, cu atât șansele de câștig la tombolă sunt mai mari.
                    <br />
                    <span className="text-white/70">Maxim 5 tickete per utilizator.</span>
                  </p>
                </div>

                <div className="mt-6 sm:mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <a
                    href={DISNEYLAND_PAYMENT_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={dismiss}
                    data-testid="disneyland-popup-buy-btn"
                    className="flex-1"
                  >
                    <Button
                      className="w-full h-12 rounded-sm bg-[#d6a648] hover:bg-[#c5972f] text-black font-bold border border-[#e5b95b]/80 group"
                      style={{ letterSpacing: "0.12em" }}
                    >
                      IA BILET ACUM
                      <ExternalLink className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </a>
                  <button
                    onClick={dismiss}
                    data-testid="disneyland-popup-later-btn"
                    className="text-[11px] tracking-[0.28em] uppercase text-white/60 hover:text-white active:text-white/90 transition-colors h-12 px-3 border border-white/15 sm:border-0 rounded-sm sm:rounded-none"
                  >
                    Mai târziu
                  </button>
                </div>

                <p className="mt-4 sm:mt-5 text-[10px] tracking-[0.28em] uppercase text-white/40 flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-[#d6a648]" />
                  Plată sigură via Stripe · Confirmare instant pe email
                </p>
              </div>
            </div>
          </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
