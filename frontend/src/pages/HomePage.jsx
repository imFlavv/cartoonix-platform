import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import PublicLayout from "@/components/PublicLayout";
import { CartoonCard } from "@/components/CartoonCard";
import { Play, Sparkles, ArrowRight, ShieldCheck, Clapperboard } from "lucide-react";
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
const CHANNEL_ACCENTS = {
  "jetix-foxkids": "hsl(18 88% 55%)",
  "cartoon-network": "hsl(46 92% 55%)",
  minimax: "hsl(330 70% 60%)",
};

function ChannelCard({ category, index }) {
  const accent = CHANNEL_ACCENTS[category.slug] || "hsl(var(--accent))";
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

        <div className="mt-10 mb-8 text-center">
          <span
            className="font-display text-4xl sm:text-5xl tracking-[0.14em]"
            style={{ color: accent }}
          >
            {category.logo_text}
          </span>
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
              "radial-gradient(900px circle at 78% 12%, hsla(46,92%,55%,0.12), transparent 55%), radial-gradient(700px circle at 12% 90%, rgba(255,255,255,0.04), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 noise-overlay opacity-60" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/60"
              >
                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--accent))]" /> Bine ai venit în platformă!
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-[0.01em] mt-6 text-white"
              >
                Desenele copilăriei tale.
                <br />
                <span className="text-[hsl(var(--accent))]">În sfârșit acasă.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-white/55"
              >
                Jetix, Cartoon Network și Minimax — toate într-un singur loc. Desenele cu care ai
                crescut, organizate și gata de redat oricând.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="mt-9 flex flex-wrap items-center gap-3"
              >
                <Link to="/register">
                  <Button
                    size="lg"
                    data-testid="primary-cta-button"
                    className="h-12 rounded-xl bg-[hsl(var(--accent))] px-6 text-base font-semibold text-black hover:bg-[hsl(var(--accent))]/90"
                  >
                    Începe să vizionezi <Play className="ml-2 h-4 w-4 fill-black" />
                  </Button>
                </Link>
                <Link to="/category/jetix-foxkids">
                  <Button
                    size="lg"
                    variant="outline"
                    data-testid="hero-channels-button"
                    className="h-12 rounded-xl border-white/15 bg-transparent px-6 text-base text-white hover:bg-white/[0.06]"
                  >
                    Vezi canalele
                  </Button>
                </Link>
                <div className="ml-1 flex items-center gap-1.5 text-sm text-white/45">
                  <ShieldCheck className="h-4 w-4 text-[hsl(var(--accent))]" />
                  <span>Creat de fani</span>
                </div>
              </motion.div>
            </div>

            {/* TV preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="relative hidden lg:block"
            >
              <div className="tv-bezel relative scanlines overflow-hidden">
                <div className="aspect-[4/5] rounded-xl bg-[#0a0b0f] grid place-items-center relative overflow-hidden">
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(600px circle at 50% 40%, hsla(46,92%,55%,0.10), transparent 60%)",
                    }}
                  />
                  <div className="relative text-center">
                    <div className="font-display text-6xl tracking-[0.1em] text-[hsl(var(--accent))]">
                      CARTOONIX
                    </div>
                    <div className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-white/40">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> Live
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

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
