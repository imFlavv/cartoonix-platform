import { NavBar } from "@/components/NavBar";
import { LOGO_TRANSPARENT } from "@/data/constants";
import { CHANGELOG } from "@/data/changelog";
import { Sparkles, Rss } from "lucide-react";

const Changelog = () => (
  <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="changelog-page">
    <NavBar />
    <div className="pt-24 px-4 md:px-8 pb-16 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <span className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-[#ec1c24]/15 border border-[#ec1c24]/30 shrink-0">
          <Rss className="h-5 w-5 text-[#ec1c24]" />
        </span>
        <div>
          <h1 className="font-display text-3xl md:text-4xl leading-tight">Noutăți Cartoonix</h1>
          <p className="text-white/40 text-xs md:text-sm">Tot ce s-a schimbat pe platformă, de la lansare</p>
        </div>
      </div>

      <div className="relative mt-10 pl-6 md:pl-8" data-testid="changelog-timeline">
        <div className="absolute left-[5px] md:left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-[#ec1c24]/60 via-white/10 to-transparent" />

        {CHANGELOG.map((group) => (
          <div key={group.month} className="mb-10" data-testid={`changelog-month-${group.month}`}>
            <h2 className="relative -ml-6 md:-ml-8 mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#ffcc00]">
              <span className="inline-flex items-center justify-center h-3 w-3 rounded-full bg-[#ffcc00] ring-4 ring-[#0a0a0a] ml-[1px] md:ml-[3px]" />
              <span className="ml-2">{group.month}</span>
            </h2>

            <div className="space-y-6">
              {group.entries.map((entry) => (
                <div key={entry.date} className="relative" data-testid="changelog-entry">
                  <span className="absolute -left-6 md:-left-8 top-1.5 h-2.5 w-2.5 rounded-full bg-[#ec1c24] ring-4 ring-[#0a0a0a]" />
                  <div className="rounded-2xl border border-white/10 bg-[#111] p-4 md:p-5 hover:border-white/20 transition-colors duration-200">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h3 className="font-display text-lg md:text-xl text-white">{entry.title}</h3>
                      <span className="shrink-0 text-[11px] uppercase tracking-wide text-white/35 font-semibold">{entry.date}</span>
                    </div>
                    <ul className="space-y-1.5 text-sm text-white/70 leading-relaxed list-disc pl-4 marker:text-[#ec1c24]">
                      {entry.items.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="relative">
          <span className="absolute -left-6 md:-left-8 top-1.5 h-2.5 w-2.5 rounded-full bg-[#ffcc00] ring-4 ring-[#0a0a0a] animate-pulse" />
          <p className="flex items-center gap-2 text-sm text-white/40 italic">
            <Sparkles className="h-4 w-4 text-[#ffcc00]" /> Continuăm să construim — urmează mai multe.
          </p>
        </div>
      </div>
    </div>

    <footer className="border-t border-white/10 px-4 md:px-12 py-8 text-center">
      <img src={LOGO_TRANSPARENT} alt="Cartoonix" className="h-8 mx-auto mb-3" />
      <p className="text-xs text-white/30">© 2026 Cartoonix. Toate drepturile rezervate.</p>
    </footer>
  </div>
);

export default Changelog;
