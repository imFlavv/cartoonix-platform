import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { mediaUrl } from "@/lib/api";
import { Play, Clock3 } from "lucide-react";

const CHANNEL_STYLES = {
  "cat-jetix": { stripe: "bg-[hsl(var(--brand-jetix))]", pattern: "pattern-hatch" },
  "cat-cn": { stripe: "bg-[hsl(var(--brand-cn))]", pattern: "pattern-checker" },
  "cat-minimax": { stripe: "bg-[hsl(var(--brand-minimax))]", pattern: "pattern-polka" },
};

const CHANNEL_LABELS = {
  "cat-jetix": "JETIX",
  "cat-cn": "Cartoon Network",
  "cat-minimax": "Minimax",
};

/**
 * Cartoon card with the title placed BELOW the cover image, not on top of it.
 * This keeps the artwork clean and gives titles space to breathe in a
 * uniform two-line typographic block.
 */
export function CartoonCard({ cartoon, categoryId, showChannel = false }) {
  const styles = CHANNEL_STYLES[categoryId] || { stripe: "bg-primary", pattern: "" };
  const epCount = cartoon.episode_count || 0;
  const isComingSoon = epCount === 0;
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      data-testid="cartoon-grid-card"
      className="group relative"
    >
      <Link to={`/cartoon/${cartoon.id}`} className="block">
        {/* Cover */}
        <div
          className={`relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 ${styles.pattern}`}
        >
          {cartoon.thumbnail_url ? (
            <img
              src={mediaUrl(cartoon.thumbnail_url)}
              alt={cartoon.title}
              loading="lazy"
              className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05] ${
                isComingSoon ? "grayscale-[0.4] brightness-[0.7]" : ""
              }`}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-black/30">
              <div className="text-center px-4">
                <div className="font-display text-2xl tracking-wider text-white/60">
                  {cartoon.title}
                </div>
              </div>
            </div>
          )}

          {/* Subtle bottom fade for play button readability on hover */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Channel stripe (top-left) */}
          <div className={`absolute top-3 left-3 h-1 w-12 rounded-full ${styles.stripe}`} />

          {/* Coming soon badge (top-right) */}
          {isComingSoon && (
            <div
              data-testid="cartoon-coming-soon-badge"
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--accent))] ring-1 ring-[hsl(var(--accent))]/40"
            >
              <Clock3 className="h-3 w-3" strokeWidth={2.5} />
              În curând
            </div>
          )}

          {/* Hover play button */}
          {!isComingSoon && (
            <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="h-14 w-14 rounded-full bg-white/95 grid place-items-center text-black shadow-[0_8px_24px_-6px_rgba(0,0,0,0.7)] ring-2 ring-white/30 transition-transform group-hover:scale-110">
                <Play className="h-5 w-5 ml-0.5 fill-black" />
              </div>
            </div>
          )}
        </div>

        {/* Title + meta below the cover */}
        <div className="mt-3 px-0.5">
          <h3 className="font-display text-base sm:text-lg tracking-wide text-white leading-tight line-clamp-2 group-hover:text-[hsl(var(--accent))] transition-colors">
            {cartoon.title}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/45">
            {cartoon.year && (
              <>
                <span className="tabular-nums">{cartoon.year}</span>
                <span className="text-white/20">·</span>
              </>
            )}
            <span>
              {isComingSoon ? "În curând" : `${epCount} ep`}
            </span>
            {showChannel && CHANNEL_LABELS[categoryId] && (
              <>
                <span className="text-white/20">·</span>
                <span className="truncate">{CHANNEL_LABELS[categoryId]}</span>
              </>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
