import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export const RelatedArticles = ({ articles }) => {
  if (!articles || articles.length === 0) return null;
  return (
    <div className="mt-10">
      <h3 className="text-sm font-bold uppercase tracking-wide text-white/40 mb-3">Articole Similare</h3>
      <div className="grid sm:grid-cols-3 gap-3">
        {articles.map((a) => (
          <Link key={a.slug} to={`/wiki/${a.slug}`} data-testid={`wiki-related-${a.slug}`} className="cx-wiki-card p-4 group">
            <p className="font-semibold text-sm text-white group-hover:text-[#c9a3ff] transition-colors mb-1">{a.title}</p>
            <p className="text-xs text-[#9b93c2] line-clamp-2">{a.summary}</p>
            <span className="inline-flex items-center gap-1 text-xs text-[#c9a3ff] mt-2 font-semibold">
              Citește <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};
