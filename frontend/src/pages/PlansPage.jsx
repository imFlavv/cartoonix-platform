import React from "react";
import PublicLayout from "@/components/PublicLayout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const FREE_FEATURES = [
  "Streaming Standard Definition (SD)",
  "Reclame între episoade",
  "Profil de bază & favorite",
  "Până la 3 ore de streaming zilnic",
];
const PLUS_FEATURES = [
  "Experiență fără reclame",
  "Streaming Full HD (1080p)",
  "Descărcări offline (când e posibil)",
  "Streaming nelimitat",
  "Creează playlist-uri & favorite",
  "Acces anticipat la episoade noi",
  "Suport prioritar",
];

function PlanCard({ title, price, features, accent, badge, ctaTo, ctaLabel, testId }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 240, damping: 22 }}
      data-testid={testId}
      className="relative rounded-2xl border border-border bg-card/70 backdrop-blur p-7 shadow-[0_14px_40px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Cartoonix</div>
        {badge && <Badge>{badge}</Badge>}
      </div>
      <div className="mt-2 font-display text-3xl tracking-wider" style={{ color: accent }}>{title}</div>
      <div className="mt-2 text-3xl font-bold">{price}</div>
      <ul className="mt-5 space-y-2 text-sm">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="h-4 w-4 mt-0.5 text-[hsl(var(--accent))] shrink-0" />
            <span className="text-muted-foreground">{f}</span>
          </li>
        ))}
      </ul>
      <Link to={ctaTo}>
        <Button className="mt-6 w-full rounded-xl h-11" data-testid={`${testId}-cta`}>{ctaLabel}</Button>
      </Link>
    </motion.div>
  );
}

export default function PlansPage() {
  return (
    <PublicLayout>
      <section className="relative noise-overlay">
        <div className="absolute inset-0 hero-bg opacity-70" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs tracking-wider uppercase">
              <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--accent))]" /> Abonamente
            </div>
            <h1 className="font-display text-4xl sm:text-5xl tracking-wider mt-3">Alege-ți accesul la tezaur</h1>
            <p className="text-muted-foreground mt-2">Plățile vor fi disponibile în curând — poți să te înscrii gratuit pe perioada preview-ului.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <PlanCard title="FREE" price="0 $ / lună" features={FREE_FEATURES} accent="hsl(var(--muted-foreground))"
              ctaTo="/register" ctaLabel="Începe gratuit" testId="plans-card-free" />
            <PlanCard title="PLUS" price="5,99 $ / lună" features={PLUS_FEATURES} accent="hsl(var(--primary))"
              badge="Cel mai bun preț" ctaTo="/register" ctaLabel="Treci pe Plus" testId="plans-card-plus" />
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
