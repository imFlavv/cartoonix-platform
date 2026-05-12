import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, ExternalLink, Sparkles } from "lucide-react";
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          data-testid="disneyland-popup-overlay"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={dismiss}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-5xl bg-[#08020a] border border-[#d6a648]/40 shadow-[0_40px_120px_-20px_rgba(214,166,72,0.25)] overflow-hidden rounded-sm"
            data-testid="disneyland-popup-modal"
          >
            {/* Ornate corners */}
            <span className="pointer-events-none absolute top-2 left-2 h-5 w-5 border-l-2 border-t-2 border-[#d6a648]/80 z-10" />
            <span className="pointer-events-none absolute top-2 right-2 h-5 w-5 border-r-2 border-t-2 border-[#d6a648]/80 z-10" />
            <span className="pointer-events-none absolute bottom-2 left-2 h-5 w-5 border-l-2 border-b-2 border-[#d6a648]/80 z-10" />
            <span className="pointer-events-none absolute bottom-2 right-2 h-5 w-5 border-r-2 border-b-2 border-[#d6a648]/80 z-10" />

            {/* Close button */}
            <button
              onClick={dismiss}
              aria-label="Închide"
              data-testid="disneyland-popup-close"
              className="absolute top-4 right-4 z-20 h-9 w-9 grid place-items-center rounded-full bg-black/60 border border-white/15 text-white/80 hover:text-white hover:border-[#d6a648]/60 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Left: image */}
              <div className="relative h-72 md:h-auto md:min-h-[520px] overflow-hidden">
                <img
                  src="/brand/disneyland-hero.png"
                  alt="Disneyland Paris"
                  className="absolute inset-0 w-full h-full object-cover select-none"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#08020a]/40 md:to-[#08020a]/95" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08020a]/80 via-transparent to-transparent md:hidden" />

                {/* Premium ribbon */}
                <div className="absolute top-5 left-5">
                  <span
                    className="inline-flex items-center gap-2 bg-[#d6a648] text-black text-[10px] font-bold px-3.5 py-1.5 rounded-sm"
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
              <div className="relative p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.32em] uppercase text-[#d6a648]">
                  <span className="h-px w-8 bg-[#d6a648]/60" />
                  Cartoonix · Concurs
                </div>

                <h2
                  className="mt-5 text-4xl sm:text-5xl leading-[1.05] text-white"
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

                <div className="mt-4 flex items-center gap-3">
                  <span className="h-px w-12 bg-[#d6a648]/70" />
                  <span className="inline-block h-1.5 w-1.5 rotate-45 bg-[#d6a648]" />
                  <span className="h-px w-12 bg-[#d6a648]/70" />
                </div>

                <p className="mt-6 text-[15px] text-white/75 leading-relaxed">
                  O vacanță magică pentru 2 persoane, oferită de Cartoonix.
                  O experiență care îți va rămâne în suflet pentru totdeauna.
                </p>

                <ul className="mt-6 space-y-2.5 text-sm text-white/70">
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

                <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
                    className="text-[11px] tracking-[0.28em] uppercase text-white/55 hover:text-white transition-colors h-12 px-3"
                  >
                    Mai târziu
                  </button>
                </div>

                <p className="mt-5 text-[10px] tracking-[0.28em] uppercase text-white/40 flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-[#d6a648]" />
                  Plată sigură via Stripe · Confirmare instant pe email
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
