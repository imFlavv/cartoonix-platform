import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { ArrowRight } from "lucide-react";
import { categoryHref } from "../data/categories";

export const WikiCategoryCard = ({ cat }) => {
  const Icon = Icons[cat.icon] || Icons.BookOpen;
  return (
    <Link
      to={categoryHref(cat)}
      data-testid={`wiki-category-${cat.slug}-${cat.title}`}
      className="cx-wiki-card cx-wiki-fade-up group p-5 flex flex-col gap-3 hover:-translate-y-1"
    >
      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#a855f7]/25 to-[#ec4899]/25 flex items-center justify-center text-[#c9a3ff] group-hover:text-[#ec4899] transition-colors">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-white mb-1">{cat.title}</h3>
        <p className="text-sm text-[#9b93c2] leading-snug">{cat.desc}</p>
      </div>
      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-[#9b93c2]">{cat.count > 0 ? `${cat.count} articole` : "Vezi secțiunea"}</span>
        <span className="flex items-center gap-1 text-[#c9a3ff] font-semibold group-hover:gap-2 transition-all">
          Explorează <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
};
