import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export const WikiBreadcrumbs = ({ trail }) => (
  <nav data-testid="wiki-breadcrumbs" className="flex items-center gap-1.5 text-sm text-[#9b93c2] flex-wrap">
    <Link to="/wiki" className="hover:text-[#c9a3ff] transition-colors">Cartoonix Wiki</Link>
    {trail.map((t, i) => (
      <span key={i} className="flex items-center gap-1.5">
        <ChevronRight className="h-3.5 w-3.5 opacity-40" />
        {t.to ? (
          <Link to={t.to} className="hover:text-[#c9a3ff] transition-colors">{t.label}</Link>
        ) : (
          <span className="text-white/70">{t.label}</span>
        )}
      </span>
    ))}
  </nav>
);
