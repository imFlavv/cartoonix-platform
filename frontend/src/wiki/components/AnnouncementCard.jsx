import { Link } from "react-router-dom";
import { Pin, ArrowRight } from "lucide-react";
import { AnnouncementBadge } from "./AnnouncementBadge";

export const AnnouncementCard = ({ item }) => (
  <Link
    to={`/wiki/announcements/${item.slug}`}
    data-testid={`wiki-announcement-card-${item.slug}`}
    className="cx-wiki-card cx-wiki-fade-up block p-5 group"
  >
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      {item.pinned && (
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30">
          <Pin className="h-3 w-3" /> PINNED
        </span>
      )}
      <AnnouncementBadge category={item.category} />
    </div>
    <h3 className="font-bold text-lg text-white mb-1.5 group-hover:text-[#c9a3ff] transition-colors">{item.title}</h3>
    <p className="text-sm text-[#9b93c2] leading-relaxed mb-4 line-clamp-2">{item.excerpt}</p>
    <div className="flex items-center justify-between text-xs text-[#9b93c2]/80">
      <span>{item.author} · {new Date(item.date).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}</span>
      <span className="flex items-center gap-1 text-[#c9a3ff] font-semibold group-hover:gap-2 transition-all">
        Citește <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </div>
  </Link>
);
