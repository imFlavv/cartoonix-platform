import { Link } from "react-router-dom";

export const WikiFooter = () => (
  <footer className="border-t border-white/10 mt-16 bg-[#0a0817]">
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <img src="/cartoonix-logo.png" alt="Cartoonix" className="h-7 w-7 object-contain rounded-lg" />
            <span className="font-black text-sm">
              <span className="text-white">CARTOONIX</span> <span className="cx-wiki-gradient-text">WIKI</span>
            </span>
          </div>
          <p className="text-sm text-[#9b93c2] max-w-xs">
            Cartoonix Wiki este hub-ul oficial de informații pentru platforma Cartoonix.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-white/40 mb-3">Explorează</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/wiki/platform" className="text-[#9b93c2] hover:text-[#a855f7]">Platformă</Link></li>
            <li><Link to="/wiki/rewards" className="text-[#9b93c2] hover:text-[#a855f7]">Recompense</Link></li>
            <li><Link to="/wiki/cinema" className="text-[#9b93c2] hover:text-[#a855f7]">Cinema</Link></li>
            <li><Link to="/wiki/live" className="text-[#9b93c2] hover:text-[#a855f7]">LIVE</Link></li>
            <li><Link to="/wiki/events" className="text-[#9b93c2] hover:text-[#a855f7]">Evenimente</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-white/40 mb-3">Informații</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/wiki/announcements" className="text-[#9b93c2] hover:text-[#a855f7]">Anunțuri</Link></li>
            <li><Link to="/wiki/updates" className="text-[#9b93c2] hover:text-[#a855f7]">Note de Actualizare</Link></li>
            <li><Link to="/wiki/faq" className="text-[#9b93c2] hover:text-[#a855f7]">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-white/40 mb-3">Cartoonix</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/home" data-testid="wiki-footer-open-cartoonix" className="text-[#9b93c2] hover:text-[#a855f7]">Deschide Cartoonix</Link></li>
            <li><Link to="/feedback" className="text-[#9b93c2] hover:text-[#a855f7]">Feedback</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 mt-10 pt-6 text-xs text-[#9b93c2]/70 space-y-1">
        <p>Cartoonix Wiki este hub-ul oficial de informații pentru platforma Cartoonix.</p>
        <p>Conținutul și funcționalitățile se pot schimba pe măsură ce platforma evoluează.</p>
      </div>
    </div>
  </footer>
);
