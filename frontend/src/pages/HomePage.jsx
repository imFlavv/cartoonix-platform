import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, mediaUrl } from "@/lib/api";
import PublicLayout from "@/components/PublicLayout";
import { CartoonCard } from "@/components/CartoonCard";
import { Play, Sparkles, Star, Tv } from "lucide-react";

const CHANNEL_VISUALS = {
  "jetix-foxkids": {
    accent: "hsl(var(--brand-jetix))",
    pattern: "pattern-hatch",
    badgeBg: "bg-[hsl(var(--brand-jetix))]",
    badgeText: "text-black",
    tagline: "Eroi de acțiune · dimineți de sâmbătă super-puterice",
  },
  "cartoon-network": {
    accent: "hsl(var(--brand-cn))",
    pattern: "pattern-checker",
    badgeBg: "bg-[hsl(var(--brand-cn))]",
    badgeText: "text-black",
    tagline: "Îndrăzneț · ciudat · de neuitat",
  },
  minimax: {
    accent: "hsl(var(--brand-minimax))",
    pattern: "pattern-polka",
    badgeBg: "bg-[hsl(var(--brand-minimax))]",
    badgeText: "text-white",
    tagline: "Cald · magic · aventuri colorate",
  },
};

function ChannelCard({ category }) {
  const v = CHANNEL_VISUALS[category.slug] || {};
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      data-testid={`home-channel-card-${category.slug}`}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/55 p-6 sm:p-7 shadow-[0_14px_40px_rgba(0,0,0,0.45)]"
    >
      <div className={`absolute inset-0 ${v.pattern} opacity-90 pointer-events-none`} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wider uppercase ${v.badgeBg} ${v.badgeText}`}>
            Canal
          </div>
          <Tv className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="mt-8 flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute -inset-6 rounded-full opacity-25 blur-2xl" style={{ background: v.accent }} />
            <div className="relative rounded-xl bg-[hsl(var(--card))] border border-border px-5 py-3">
              <span className="font-display text-3xl sm:text-4xl tracking-[0.16em]" style={{ color: v.accent }}>
                {category.logo_text}
              </span>
            </div>
          </div>
          <h3 className="mt-5 font-display text-xl sm:text-2xl tracking-wider">{category.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{v.tagline || category.description}</p>
        </div>
        <div className="mt-7 flex items-center justify-between">
          <div className={`h-1 w-12 rounded-full`} style={{ background: v.accent }} />
          <Link to={`/category/${category.slug}`}>
            <Button variant="secondary" size="sm" className="rounded-xl" data-testid={`home-explore-${category.slug}`}>
              Explorează <Play className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
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
      <section className="relative overflow-hidden noise-overlay">
        <div className="absolute inset-0 hero-bg" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs tracking-wider uppercase"
              >
                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--accent))]" /> Tezaurul este deschis
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.05 }}
                className="font-display text-5xl sm:text-6xl lg:text-7xl tracking-[0.02em] mt-4"
              >
                Streamează <span className="text-[hsl(var(--primary))]">clasicele</span>.
                <br /> Retrăiește <span className="text-[hsl(var(--accent))]">epoca de aur</span>.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl"
              >
                Cartoonix este casa ta caldă și premium pentru desenele care au definit diminețile de sâmbătă.
                Trei canale. Un singur tezaur nostalgic.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.15 }}
                className="mt-7 flex flex-wrap items-center gap-3"
              >
                <Link to="/register">
                  <Button size="lg" data-testid="primary-cta-button" className="rounded-xl h-12 px-6 text-base">
                    Începe să vizionezi
                  </Button>
                </Link>
                <Link to="/plans">
                  <Button size="lg" variant="secondary" className="rounded-xl h-12 px-6 text-base" data-testid="hero-plans-button">
                    Vezi abonamente
                  </Button>
                </Link>
                <div className="flex items-center gap-1 text-sm text-muted-foreground ml-2">
                  <Star className="h-4 w-4 fill-[hsl(var(--accent))] text-[hsl(var(--accent))]" />
                  <span>Curat de superfani</span>
                </div>
              </motion.div>
            </div>
            {/* Right column: stack of channel preview cards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative hidden lg:block"
            >
              <div className="tv-bezel relative scanlines overflow-hidden">
                <div className="aspect-video rounded-xl bg-[hsl(var(--card))] grid place-items-center relative overflow-hidden">
                  <div className="absolute inset-0 hero-bg opacity-80" />
                  <div className="relative text-center">
                    <div className="font-display text-7xl tracking-widest text-[hsl(var(--accent))]">CARTOONIX</div>
                    <div className="mt-2 text-sm text-muted-foreground tracking-[0.3em] uppercase">Live</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CATEGORY CARDS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex items-end justify-between mb-7">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl tracking-wider">Trei canale legendare</h2>
            <p className="text-muted-foreground mt-1">Alege un tezaur și pătrunde înăuntru.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {categories.map((c) => (
            <ChannelCard key={c.id} category={c} />
          ))}
        </div>
      </section>

      {/* FEATURED */}
      {featured.length > 0 && (
        <section data-testid="home-featured-section" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl tracking-wider">Proaspete din tezaur</h2>
              <p className="text-muted-foreground text-sm mt-1">Clasice adăugate recent.</p>
            </div>
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
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <h3 className="font-display text-2xl tracking-wider">Niciun desen încă</h3>
            <p className="text-muted-foreground text-sm mt-1">Un administrator poate adăuga primul clasic din Panoul Admin.</p>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
