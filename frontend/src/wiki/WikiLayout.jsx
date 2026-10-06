import { useEffect, useState } from "react";
import "./wiki.css";
import { WikiHeader } from "./components/WikiHeader";
import { WikiFooter } from "./components/WikiFooter";
import { WikiSidebar } from "./components/WikiSidebar";
import { WikiSearch } from "./components/WikiSearch";

export const WikiLayout = ({ children }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="cx-wiki" data-testid="wiki-root">
      <WikiHeader onOpenSearch={() => setSearchOpen(true)} onToggleSidebar={() => setMobileSidebarOpen(true)} />
      <div className="max-w-[1400px] mx-auto flex">
        <WikiSidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />
        <main className="flex-1 min-w-0 px-4 md:px-8 py-8">{children}</main>
      </div>
      <WikiFooter />
      <WikiSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
};

export default WikiLayout;
