import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, X } from "lucide-react";
import { WIKI_SIDEBAR } from "../data/nav";

const SidebarSection = ({ section, currentPath }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        data-testid={`wiki-sidebar-section-${section.title}`}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wide text-white/40 hover:text-white/70 transition-colors"
      >
        {section.title}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <ul className="space-y-0.5 mb-2">
          {section.items.map((item) => {
            const active = currentPath === item.to.split("#")[0] && !item.to.includes("#");
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  data-testid={`wiki-sidebar-link-${item.to}`}
                  className={`block px-4 py-1.5 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-[#a855f7]/15 text-[#c9a3ff] font-semibold"
                      : "text-[#9b93c2] hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export const WikiSidebar = ({ mobileOpen, onCloseMobile }) => {
  const { pathname } = useLocation();
  const content = (
    <div className="cx-wiki-scroll overflow-y-auto h-full py-5 px-2">
      <p className="px-3 text-sm font-black text-white/80 mb-3 tracking-wide">CARTOONIX WIKI</p>
      {WIKI_SIDEBAR.map((section) => (
        <SidebarSection key={section.title} section={section} currentPath={pathname} />
      ))}
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 border-r border-white/10 sticky top-16 h-[calc(100vh-4rem)]">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={onCloseMobile} />
          <div className="absolute left-0 top-0 h-full w-72 bg-[#0a0817] border-r border-white/10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="font-bold text-sm text-white/80">Navigare Wiki</span>
              <button data-testid="wiki-sidebar-close-mobile" onClick={onCloseMobile} className="p-1.5 rounded-lg hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
};
