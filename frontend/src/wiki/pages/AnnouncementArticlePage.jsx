import { useParams, Navigate, Link } from "react-router-dom";
import { ANNOUNCEMENTS } from "../data/announcements";
import { WikiBreadcrumbs } from "../components/WikiBreadcrumbs";
import { AnnouncementBadge } from "../components/AnnouncementBadge";
import { HelpfulWidget } from "../components/HelpfulWidget";
import { ArrowRight } from "lucide-react";

export default function AnnouncementArticlePage() {
  const { slug } = useParams();
  const item = ANNOUNCEMENTS.find((a) => a.slug === slug);
  if (!item) return <Navigate to="/wiki/announcements" replace />;

  const related = ANNOUNCEMENTS.filter((a) => a.slug !== slug).slice(0, 2);

  return (
    <div data-testid={`wiki-announcement-article-${slug}`} className="max-w-3xl mx-auto cx-wiki-fade-up">
      <WikiBreadcrumbs trail={[{ label: "Anunțuri", to: "/wiki/announcements" }, { label: item.title }]} />

      <div className="flex items-center gap-2 mt-5 mb-3">
        <AnnouncementBadge category={item.category} />
        {item.pinned && <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30">PINNED</span>}
      </div>

      <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">{item.title}</h1>
      <p className="text-sm text-white/40 mb-8">
        {item.author} · {new Date(item.date).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}
      </p>

      <div className="h-48 md:h-64 rounded-2xl bg-gradient-to-br from-[#a855f7]/25 via-[#ec4899]/15 to-transparent border border-white/10 mb-8 flex items-center justify-center">
        <span className="text-sm text-white/30">Imagine Cover Anunț</span>
      </div>

      <div className="cx-wiki-prose">
        {item.body.map((p, i) => <p key={i}>{p}</p>)}
      </div>

      {related.length > 0 && (
        <div className="mt-10">
          <h3 className="text-sm font-bold uppercase tracking-wide text-white/40 mb-3">Articole Similare</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {related.map((r) => (
              <Link key={r.slug} to={`/wiki/announcements/${r.slug}`} className="cx-wiki-card p-4 group">
                <p className="font-semibold text-sm text-white group-hover:text-[#c9a3ff] transition-colors mb-1">{r.title}</p>
                <p className="text-xs text-[#9b93c2] line-clamp-2">{r.excerpt}</p>
                <span className="inline-flex items-center gap-1 text-xs text-[#c9a3ff] mt-2 font-semibold">
                  Citește <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <HelpfulWidget />
    </div>
  );
}
