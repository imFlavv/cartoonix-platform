import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { api } from "@/lib/api";
import { CartoonCard } from "@/components/CartoonCard";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const VISUAL = {
  "jetix-foxkids": { accent: "hsl(var(--brand-jetix))", pattern: "pattern-hatch" },
  "cartoon-network": { accent: "hsl(var(--brand-cn))", pattern: "pattern-checker" },
  minimax: { accent: "hsl(var(--brand-minimax))", pattern: "pattern-polka" },
};

export default function CategoryPage() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [cartoons, setCartoons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: cat }, { data: list }] = await Promise.all([
          api.get(`/categories/${slug}`),
          api.get(`/cartoons?category=${slug}`),
        ]);
        setCategory(cat);
        setCartoons(list);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const v = VISUAL[slug] || {};

  return (
    <PublicLayout>
      <section className="relative overflow-hidden border-b border-border/60">
        <div className={`absolute inset-0 ${v.pattern} opacity-90 pointer-events-none`} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {category ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Canal</div>
              <h1 className="mt-1 font-display text-4xl sm:text-5xl lg:text-6xl tracking-wider" style={{ color: v.accent }}>
                {category.name}
              </h1>
              <p className="mt-2 text-muted-foreground max-w-2xl">{category.description}</p>
            </motion.div>
          ) : (
            <Skeleton className="h-16 w-72" />
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[16/10] rounded-2xl" />
            ))}
          </div>
        ) : cartoons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <h3 className="font-display text-2xl tracking-wider">Niciun desen pe acest canal încă</h3>
            <p className="text-muted-foreground text-sm mt-1">Adminii pot adăuga desene din Panoul Admin.</p>
            <Link to="/"><Button variant="secondary" className="mt-4 rounded-xl" data-testid="empty-back-home">Înapoi acasă</Button></Link>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.04 } },
            }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5"
          >
            {cartoons.map((c) => (
              <motion.div key={c.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
                <CartoonCard cartoon={c} categoryId={c.category_id} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </PublicLayout>
  );
}
