import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Search, ExternalLink, Menu, X } from "lucide-react";
import { WIKI_HEADER_NAV } from "../data/nav";

export const WikiHeader = ({ onOpenSearch, onToggleSidebar }) => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0817]/90 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-16 flex items-center gap-4">
        <button
          data-testid="wiki-mobile-sidebar-toggle"
          onClick={onToggleSidebar}
          className="lg:hidden shrink-0 p-2 rounded-lg hover:bg-white/5 text-white/70"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/wiki" data-testid="wiki-logo-link" className="flex items-center gap-2.5 shrink-0">
          <img src="/cartoonix-logo.png" alt="Cartoonix" className="h-8 w-8 object-contain rounded-lg" />
          <span className="font-black text-lg leading-tight tracking-tight">
            <span className="text-white">CARTOONIX</span>{" "}
            <span className="cx-wiki-gradient-text">WIKI</span>
          </span>
        </Link>

        <button
          data-testid="wiki-header-search-trigger"
          onClick={onOpenSearch}
          className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-4 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:border-[#a855f7]/40 hover:text-white/60 transition-colors text-sm"
        >
          <Search className="h-4 w-4" />
          <span>Caută în Cartoonix Wiki...</span>
          <kbd className="ml-auto text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>

        <nav className="hidden xl:flex items-center gap-1 text-sm flex-1 justify-end">
          {WIKI_HEADER_NAV.slice(0, 7).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              data-testid={`wiki-header-nav-${item.to}`}
              className="px-2.5 py-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          data-testid="wiki-mobile-search-trigger"
          onClick={onOpenSearch}
          className="md:hidden p-2 rounded-lg hover:bg-white/5 text-white/70"
        >
          <Search className="h-5 w-5" />
        </button>

        <button
          data-testid="wiki-open-cartoonix-btn"
          onClick={() => navigate("/home")}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white text-sm font-bold hover:brightness-110 transition-all"
        >
          Deschide Cartoonix
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
};
