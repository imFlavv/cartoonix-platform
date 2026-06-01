import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { CartoonCard } from "@/components/CartoonCard";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

/**
 * Horizontal scrollable cartoon carousel. Shows 3 cards on desktop,
 * scrolls one "page" at a time with arrow buttons. Touch + scrollbar
 * remain native for natural feel on touch devices.
 */
export function CartoonCarousel() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // Resolve a category id to a stable string for the channel pill on the card.
  const resolveCategoryId = (c) => {
    if (c.category_id) {
      if (c.category_id.startsWith("cat-")) return c.category_id;
    }
    if (c.category) {
      const map = {
        "jetix-foxkids": "cat-jetix",
        "cartoon-network": "cat-cn",
        "minimax": "cat-minimax",
      };
      return map[c.category] || c.category_id || "";
    }
    return c.category_id || "";
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/cartoons", { params: { limit: 200 } });
        if (!mounted) return;
        // Sort: cartoons with episodes first (available), then by created_at desc
        const sorted = [...(data || [])].sort((a, b) => {
          const aHas = (a.episode_count || 0) > 0 ? 0 : 1;
          const bHas = (b.episode_count || 0) > 0 ? 0 : 1;
          if (aHas !== bHas) return aHas - bHas;
          return (b.created_at || "").localeCompare(a.created_at || "");
        });
        setItems(sorted);
      } catch {
        if (mounted) setError(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const updateButtons = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateButtons();
    const el = trackRef.current;
    if (!el) return;
    const handler = () => updateButtons();
    el.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      el.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, [items, updateButtons]);

  const scrollByPage = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const step = Math.max(280, el.clientWidth * 0.85);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <section
      data-testid="home-cartoons-carousel"
      className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-2"
    >
      {/* Heading row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between gap-4 mb-5 sm:mb-6"
      >
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">
            <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
            Bine ai venit
          </div>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl leading-[1] tracking-wide text-white">
            Toate desenele tale,
            <span className="text-[hsl(var(--accent))]"> într-un singur loc.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/45 leading-relaxed">
            Jetix, Cartoon Network și Minimax — derulează colecția și
            apasă pe un desen pentru a vedea toate episoadele.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            disabled={!canPrev}
            data-testid="carousel-prev-button"
            aria-label="Anterior"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:text-white hover:bg-white/[0.07] hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            disabled={!canNext}
            data-testid="carousel-next-button"
            aria-label="Următor"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-white/75 hover:text-white hover:bg-white/[0.07] hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </motion.div>

      {/* Loading skeleton */}
      {items === null && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-[16/10] rounded-2xl bg-white/[0.03] animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty / error state */}
      {items?.length === 0 && !error && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center text-white/45">
          Niciun desen încă disponibil. Revino curând!
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-red-200/80 text-sm">
          Nu am putut încărca lista de desene. Reîncarcă pagina.
        </div>
      )}

      {/* Track — horizontal scroll, 3 cards × 2 rows visible on desktop */}
      {items && items.length > 0 && (
        <div className="relative -mx-1 sm:mx-0">
          {/* Gradient fades at edges (desktop only) */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10 hidden sm:block" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10 hidden sm:block" />
          <div
            ref={trackRef}
            data-testid="carousel-track"
            className="grid grid-flow-col grid-rows-2 auto-cols-[78%] sm:auto-cols-[calc((100%-1.5rem)/2)] lg:auto-cols-[calc((100%-3rem)/3)] gap-x-4 gap-y-6 sm:gap-x-6 sm:gap-y-8 overflow-x-auto snap-x snap-mandatory pb-4 px-1 sm:px-0 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20"
            style={{ scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
          >
            {items.map((c) => (
              <div key={c.id} className="snap-start">
                <CartoonCard
                  cartoon={c}
                  categoryId={resolveCategoryId(c)}
                  showChannel
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
