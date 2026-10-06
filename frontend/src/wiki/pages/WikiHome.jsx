import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import { WIKI_CATEGORIES } from "../data/categories";
import { WikiCategoryCard } from "../components/WikiCategoryCard";
import { AnnouncementCard } from "../components/AnnouncementCard";
import { ANNOUNCEMENTS } from "../data/announcements";
import { UPDATES } from "../data/updates";
import { WIKI_ARTICLES } from "../data/articles";
import { WikiSearch } from "../components/WikiSearch";

const POPULAR_SLUGS = ["nix", "mystery-box", "plus", "cinema", "live", "rewards"];

export default function WikiHome() {
  const [searchOpen, setSearchOpen] = useState(false);
  const latestAnnouncements = ANNOUNCEMENTS.slice(0, 3);
  const latestUpdate = UPDATES[0];
  const popular = POPULAR_SLUGS.map((s) => WIKI_ARTICLES.find((a) => a.slug === s)).filter(Boolean);

  return (
    <div data-testid="wiki-home-page">
      {/* HERO */}
      <section className="text-center pt-8 pb-14 cx-wiki-fade-up">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-[#a855f7]/15 text-[#c9a3ff] border border-[#a855f7]/30 mb-5">
          <Sparkles className="h-3.5 w-3.5" /> Enciclopedia Oficială Cartoonix
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4">
          <span className="cx-wiki-gradient-text">CARTOONIX WIKI</span>
        </h1>
        <p className="text-lg text-white/80 font-semibold mb-3">Tot ce trebuie să știi despre Cartoonix.</p>
        <p className="text-[#9b93c2] max-w-2xl mx-auto leading-relaxed mb-8">
          Explorează baza de cunoștințe oficială Cartoonix. Află cum funcționează platforma, descoperă recompensele,
          NIX, Mystery Box-urile, evenimentele, Cinema, canalele LIVE și rămâi la curent cu cele mai recente schimbări.
        </p>

        <button
          data-testid="wiki-home-search-trigger"
          onClick={() => setSearchOpen(true)}
          className="group flex items-center gap-3 mx-auto max-w-xl w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#a855f7]/50 transition-colors cx-wiki-glow"
        >
          <Search className="h-5 w-5 text-[#9b93c2]" />
          <span className="text-[#9b93c2] group-hover:text-white/70 transition-colors">Ce anume cauți?</span>
          <kbd className="ml-auto text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded shrink-0">⌘K</kbd>
        </button>
      </section>

      {/* WELCOME PANEL */}
      <section className="cx-wiki-card p-6 md:p-8 mb-14 cx-wiki-fade-up">
        <h2 className="text-xl font-black mb-3 text-white">Bine ai venit pe Cartoonix Wiki</h2>
        <p className="text-[#9b93c2] leading-relaxed">
          Cartoonix Wiki este hub-ul oficial de informații pentru platforma Cartoonix. Aici poți afla mai multe despre
          funcționalități, monede virtuale, recompense, evenimente, actualizări ale platformei și tot ce se întâmplă
          în universul Cartoonix.
        </p>
      </section>

      {/* CATEGORIES */}
      <section className="mb-16">
        <h2 className="text-2xl font-black text-white mb-6">Categorii Wiki</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {WIKI_CATEGORIES.map((cat, i) => <WikiCategoryCard key={cat.title + i} cat={cat} />)}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* LATEST ANNOUNCEMENTS */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black text-white">Ultimele Anunțuri</h2>
            <Link to="/wiki/announcements" className="text-sm text-[#c9a3ff] font-semibold flex items-center gap-1">
              Vezi toate <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {latestAnnouncements.map((a) => <AnnouncementCard key={a.slug} item={a} />)}
          </div>
        </section>

        {/* POPULAR PAGES + LATEST UPDATE */}
        <div className="space-y-10">
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-white">Pagini Populare</h2>
              <Link to="/wiki/updates" className="text-sm text-[#c9a3ff] font-semibold flex items-center gap-1">
                Note de actualizare <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-2">
              {popular.map((a) => (
                <Link key={a.slug} to={`/wiki/${a.slug}`} data-testid={`wiki-popular-${a.slug}`} className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#a855f7]/40 transition-colors group">
                  <span className="font-semibold text-white/85 group-hover:text-[#c9a3ff] transition-colors text-sm">{a.title}</span>
                  <ArrowRight className="h-4 w-4 text-[#9b93c2] group-hover:translate-x-1 transition-transform" />
                </Link>
              ))}
            </div>
          </section>

          {latestUpdate && (
            <section>
              <h2 className="text-xl font-black text-white mb-5">Cea Mai Recentă Actualizare</h2>
              <div className="cx-wiki-card p-5">
                <p className="font-bold text-white">{latestUpdate.title} — {latestUpdate.period}</p>
                <p className="text-sm text-[#9b93c2] mt-2 mb-4">{latestUpdate.new?.[0]}</p>
                <Link to="/wiki/updates" className="text-sm text-[#c9a3ff] font-semibold flex items-center gap-1">
                  Vezi tot changelog-ul <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>

      <WikiSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
