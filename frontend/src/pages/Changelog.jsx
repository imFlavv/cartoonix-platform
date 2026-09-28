import { NavBar } from "@/components/NavBar";
import { LOGO_TRANSPARENT } from "@/data/constants";
import { CHANGELOG } from "@/data/changelog";
import { Sparkles, Rss } from "lucide-react";

const Changelog = () => (
  <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="changelog-page">
    <NavBar />
    <div className="pt-24 px-4 md:px-8 pb-16 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <span className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-[#ec1c24]/15 border border-[#ec1c24]/30 shrink-0">
          <Rss className="h-5 w-5 text-[#ec1c24]" />
        </span>
        <div>
          <h1 className="font-display text-3xl md:text-4xl leading-tight">Ce e nou pe Cartoonix</h1>
          <p className="text-white/40 text-xs md:text-sm">Cele mai recente noutăți de pe platformă</p>
        </div>
      </div>

      <div className="mt-8 space-y-4" data-testid="changelog-list">
        {CHANGELOG.map((item, i) => (
          <div
            key={i}
            data-testid="changelog-entry"
            className="rounded-2xl border border-white/10 bg-[#111] p-5 hover:border-[#ffcc00]/30 transition-colors duration-200"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-[#ffcc00] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-lg md:text-xl text-white mb-1.5">{item.title}</h3>
                <p className="text-sm text-white/65 leading-relaxed">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <footer className="border-t border-white/10 px-4 md:px-12 py-8 text-center">
      <img src={LOGO_TRANSPARENT} alt="Cartoonix" className="h-8 mx-auto mb-3" />
      <p className="text-xs text-white/30">© 2026 Cartoonix. Toate drepturile rezervate.</p>
    </footer>
  </div>
);

export default Changelog;
