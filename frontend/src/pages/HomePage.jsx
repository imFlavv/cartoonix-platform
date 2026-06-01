import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { api, mediaUrl } from "@/lib/api";
import PublicLayout from "@/components/PublicLayout";
import { CartoonCard } from "@/components/CartoonCard";
import { CartoonCarousel } from "@/components/CartoonCarousel";
import { Play, Sparkles, ArrowRight, ShieldCheck, Clapperboard, Radio } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTv, faBoltLightning, faComments, faHeart } from "@fortawesome/free-solid-svg-icons";

const WHY_FEATURES = [
  { icon: faTv, title: "", text: "Desenele copilăriei tale, organizate într-un singur loc." },
  { icon: faBoltLightning, title: "Fără reclame", text: "Vizionare fără întreruperi și acces la calitate premium." },
  { icon: faComments, title: "Chat live", text: "Discută live cu alți oameni care au crescut cu aceleași desene." },
  { icon: faHeart, title: "Favorite & playlist-uri", text: "Păstrează episoadele preferate și continuă oricând." },
];

/**
 * Refined, dark-only, gold-accented home dashboard.
 * Palette is intentionally restrained: deep black background, soft white text,
 * and a single warm gold accent (hsl(var(--accent))). Per-channel hues are used
 * only as discreet thin markers — not as loud fills.
 */
function LiveBanner() {
  const [data, setData] = useState(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data: status } = await api.get("/live/status");
        if (mounted) setData(status);
      } catch {
        /* silent */
      }
    };
    load();
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      load();
    }, 60000);
    const tickId = setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => {
      mounted = false;
      clearInterval(id);
      clearInterval(tickId);
    };
  }, []);

  if (!data || (data.state !== "live" && data.state !== "scheduled")) return null;

  const isLive = data.state === "live";
  // For scheduled, compute remaining from start_iso for smoother countdown
  let remaining = data.seconds_until_start || 0;
  if (!isLive && data.start_iso) {
    remaining = Math.max(0, (new Date(data.start_iso).getTime() - Date.now()) / 1000);
  }
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = Math.floor(remaining % 60);
  const compactCountdown = days > 0
    ? `${days}z ${hours}h ${minutes}m`
    : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const accentBg = isLive
    ? "from-red-500/[0.12] via-red-500/[0.05]"
    : "from-amber-400/[0.10] via-amber-400/[0.04]";
  const accentBorder = isLive ? "border-red-500/30 hover:border-red-500/55" : "border-amber-400/30 hover:border-amber-400/55";
  const accentLine = isLive ? "via-red-500/60" : "via-amber-400/60";
  const pillBg = isLive
    ? "bg-red-500/15 border-red-500/40 text-red-300"
    : "bg-amber-400/15 border-amber-400/40 text-amber-200";
  const iconBg = isLive
    ? "bg-red-500/15 text-red-300 ring-red-500/40"
    : "bg-amber-400/15 text-amber-200 ring-amber-400/40";
  const ctaLabel = isLive ? "Urmărește" : "Vezi detalii";

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
      <Link to="/live" data-testid="home-live-banner" className="block group">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className={`relative overflow-hidden rounded-2xl border bg-gradient-to-r to-transparent p-5 sm:p-7 transition-colors ${accentBg} ${accentBorder}`}
        >
          <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${accentLine} to-transparent`} />
          {data.poster_url && (
            <img
              src={mediaUrl(data.poster_url)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-15"
              loading="lazy"
            />
          )}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isLive
                ? "radial-gradient(700px circle at 100% 50%, rgba(239,68,68,0.15), transparent 60%)"
                : "radial-gradient(700px circle at 100% 50%, hsla(46,92%,55%,0.14), transparent 60%)",
            }}
          />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <span className={`grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-2xl ring-1 ${iconBg}`}>
                <Radio className="h-6 w-6 sm:h-7 sm:w-7" />
              </span>
              <span className={`sm:hidden inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${pillBg}`}>
                {isLive ? (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                ) : (
                  <Radio className="h-3 w-3" />
                )}
                {isLive ? "Live acum" : "În curând"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${pillBg}`}>
                {isLive ? (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                ) : (
                  <Radio className="h-3 w-3" />
                )}
                {isLive ? "Live acum" : "Programat — începe în curând"}
              </div>
              <h3 className="mt-2 font-display text-2xl sm:text-3xl lg:text-4xl tracking-wider text-white truncate">
                {data.title || "Maraton Cartoonix"}
              </h3>
              {isLive ? (
                <p className="mt-1 text-sm text-white/55 line-clamp-2">
                  {data.subtitle || "Transmisiune în direct — alătură-te acum."}
                </p>
              ) : (
                <p className="mt-1 text-sm text-white/55 tabular-nums">
                  Începe în <span className="font-semibold text-white">{compactCountdown}</span>
                  {data.start_iso && (
                    <>
                      {" "}
                      <span className="hidden sm:inline text-white/40">
                        • {new Date(data.start_iso).toLocaleString("ro-RO", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--accent))] text-black px-5 h-11 text-sm font-semibold shadow-[0_8px_22px_-8px_rgba(245,194,66,0.55)] group-hover:brightness-110 transition-all">
                <Play className="h-4 w-4 fill-black" />
                {ctaLabel}
              </span>
            </div>
          </div>
        </motion.div>
      </Link>
    </section>
  );
}

const CHANNEL_ACCENTS = {
  "jetix-foxkids": "hsl(18 88% 55%)",
  "cartoon-network": "hsl(46 92% 55%)",
  minimax: "hsl(330 70% 60%)",
};

// Each channel renders its actual logo instead of plain text.
const CHANNEL_LOGOS = {
  "jetix-foxkids": "/channel-logos/jetix.png",
  "cartoon-network": "/channel-logos/cartoon-network.png",
  minimax: "/channel-logos/minimax.svg",
};

function ChannelCard({ category, index }) {
  const accent = CHANNEL_ACCENTS[category.slug] || "hsl(var(--accent))";
  const logoSrc = CHANNEL_LOGOS[category.slug];
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      whileHover={{ y: -6 }}
      data-testid={`home-channel-card-${category.slug}`}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-7 transition-colors hover:border-white/[0.14]"
    >
      {/* top accent line */}
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      {/* soft corner glow */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
        style={{ background: accent }}
      />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: accent, background: "rgba(255,255,255,0.04)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
            Canal
          </span>
          <Clapperboard className="h-4 w-4 text-white/25" />
        </div>

        <div className="mt-8 mb-7 flex items-center justify-center h-24 sm:h-28">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={`${category.name} logo`}
              loading="lazy"
              decoding="async"
              data-testid={`channel-logo-${category.slug}`}
              className="max-h-full max-w-[70%] object-contain drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)]"
            />
          ) : (
            <span
              className="font-display text-4xl sm:text-5xl tracking-[0.14em]"
              style={{ color: accent }}
            >
              {category.logo_text}
            </span>
          )}
        </div>

        <h3 className="font-display text-xl tracking-wider text-white">{category.name}</h3>
        <p className="mt-1 text-sm text-white/45 line-clamp-2">{category.description}</p>

        <Link to={`/category/${category.slug}`}>
          <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors group-hover:text-white">
            Explorează
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: cats }, { data: cartoons }] = await Promise.all([
          api.get("/categories"),
          api.get("/cartoons?limit=8"),
        ]);
        setCategories(cats);
        setFeatured(cartoons);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* restrained gold-only ambience */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px circle at 78% 12%, hsla(46,92%,55%,0.10), transparent 55%), radial-gradient(700px circle at 12% 90%, rgba(255,255,255,0.03), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 noise-overlay opacity-60" />
        <div className="relative">
          <CartoonCarousel />
        </div>
      </section>

      {/* LIVE BANNER (only when live) */}
      <LiveBanner />

      {/* WHY / FEATURES STRIP */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {WHY_FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition-colors hover:border-[hsl(var(--accent))]/30"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] ring-1 ring-[hsl(var(--accent))]/20 transition-transform group-hover:scale-105">
                <FontAwesomeIcon icon={f.icon} className="h-5 w-5" />
              </span>
              {f.title && (
                <h3 className="mt-4 font-display text-lg tracking-wider text-white">{f.title}</h3>
              )}
              <p className="mt-1 text-sm leading-relaxed text-white/45">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CHANNELS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-9">
          <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))]/80">Canale</div>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl tracking-wider text-white">Trei canale legendare</h2>
          <p className="text-white/45 mt-1">Alege canalul cu care ai crescut.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((c, i) => (
            <ChannelCard key={c.id} category={c} index={i} />
          ))}
        </div>
      </section>

      {/* FEATURED */}
      {featured.length > 0 && (
        <section data-testid="home-featured-section" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="mb-7">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))]/80">Colecție</div>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl tracking-wider text-white">Adăugate recent</h2>
            <p className="text-white/45 text-sm mt-1">Noi episoade adăugate în Cartoonix.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {featured.slice(0, 8).map((c) => (
              <CartoonCard key={c.id} cartoon={c} categoryId={c.category_id} />
            ))}
          </div>
        </section>
      )}

      {!loading && featured.length === 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <h3 className="font-display text-2xl tracking-wider text-white">Niciun desen încă</h3>
            <p className="text-white/45 text-sm mt-1">Un administrator poate adăuga primul clasic din Panoul Admin.</p>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
