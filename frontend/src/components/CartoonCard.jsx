import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { mediaUrl } from "@/lib/api";
import { Play, Clock3 } from "lucide-react";

const CHANNEL_STYLES = {
  "cat-jetix": { stripe: "bg-[hsl(var(--brand-jetix))]", pattern: "pattern-hatch", text: "text-black" },
  "cat-cn": { stripe: "bg-[hsl(var(--brand-cn))]", pattern: "pattern-checker", text: "text-black" },
  "cat-minimax": { stripe: "bg-[hsl(var(--brand-minimax))]", pattern: "pattern-polka", text: "text-white" },
};

export function CartoonCard({ cartoon, categoryId }) {
  const styles = CHANNEL_STYLES[categoryId] || { stripe: "bg-primary", pattern: "" };
  const epCount = cartoon.episode_count || 0;
  const isComingSoon = epCount === 0;
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      data-testid="cartoon-grid-card"
      className="group relative overflow-hidden rounded-2xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/55 shadow-[0_10px_30px_rgba(0,0,0,0.25)] dark:shadow-[0_14px_40px_rgba(0,0,0,0.55)]"
    >
      <Link to={`/cartoon/${cartoon.id}`} className="block">
        <div className={`aspect-[16/10] relative overflow-hidden ${styles.pattern}`}>
          {cartoon.thumbnail_url ? (
            <img
              src={mediaUrl(cartoon.thumbnail_url)}
              alt={cartoon.title}
              className={`absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                isComingSoon ? "grayscale-[0.4] brightness-[0.7]" : ""
              }`}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center px-4">
                <div className="font-display text-3xl tracking-wider opacity-70">{cartoon.title}</div>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
          {isComingSoon && (
            <div
              data-testid="cartoon-coming-soon-badge"
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--accent))] ring-1 ring-[hsl(var(--accent))]/40 shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            >
              <Clock3 className="h-3 w-3" strokeWidth={2.5} />
              În curând
            </div>
          )}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <div>
              <div className="text-white font-semibold text-base sm:text-lg leading-tight drop-shadow">{cartoon.title}</div>
              <div className="text-white/70 text-xs">
                {cartoon.year || "—"} · {isComingSoon ? "Disponibil în curând" : `${epCount} ep`}
              </div>
            </div>
            {!isComingSoon && (
              <div className="h-10 w-10 rounded-full bg-white/95 grid place-items-center text-black opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="h-4 w-4 ml-0.5" />
              </div>
            )}
          </div>
          <div className={`absolute top-3 left-3 h-1 w-12 rounded-full ${styles.stripe}`} />
        </div>
        <div className="p-3 pt-3">
          <p className="text-xs text-muted-foreground line-clamp-2">{cartoon.description || "Un desen animat clasic din epoca de aur."}</p>
        </div>
      </Link>
    </motion.div>
  );
}
