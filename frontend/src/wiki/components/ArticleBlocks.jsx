import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Tv, AlertTriangle } from "lucide-react";
import { slugify } from "../data/helpers";

const RARITIES = [
  { label: "Common", className: "bg-white/10 text-white/70 border-white/20" },
  { label: "Rare", className: "bg-[#38bdf8]/15 text-[#7dd3fc] border-[#38bdf8]/40" },
  { label: "Epic", className: "bg-[#a855f7]/15 text-[#c9a3ff] border-[#a855f7]/40" },
  { label: "Legendary", className: "bg-[#f59e0b]/15 text-[#fbbf24] border-[#f59e0b]/40" },
  { label: "Mythic", className: "bg-[#ec4899]/15 text-[#f9a8d4] border-[#ec4899]/40" },
  { label: "Godlike", className: "bg-gradient-to-r from-[#a855f7] via-[#ec4899] to-[#fbbf24] text-white border-transparent" },
];

const RarityLegend = () => (
  <div data-testid="wiki-rarity-legend" className="flex flex-wrap gap-2 my-4">
    {RARITIES.map((r) => (
      <span key={r.label} className={`text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full border ${r.className}`}>
        {r.label}
      </span>
    ))}
  </div>
);

const ChannelGuide = ({ items }) => (
  <div data-testid="wiki-channel-guide" className="grid sm:grid-cols-2 gap-3 my-4">
    {items.map((ch) => (
      <div key={ch.name} className="cx-wiki-card p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-[#a855f7]/15 flex items-center justify-center shrink-0 text-[#c9a3ff]">
          <Tv className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">{ch.name}</p>
          <p className="text-xs text-[#9b93c2] mt-0.5">{ch.desc}</p>
        </div>
      </div>
    ))}
  </div>
);

const SeatMap = () => (
  <div data-testid="wiki-seat-map" className="cx-wiki-card p-6 my-4">
    <p className="text-center text-xs text-[#9b93c2] mb-4 uppercase tracking-wide">Ecran</p>
    <div className="h-1.5 rounded-full bg-gradient-to-r from-[#a855f7]/40 via-white/20 to-[#ec4899]/40 mb-6" />
    <div className="flex flex-col items-center gap-2">
      {[5, 6, 5].map((count, row) => (
        <div key={row} className="flex gap-2">
          {Array.from({ length: count }).map((_, i) => {
            const isMine = row === 1 && i === 2;
            const isTaken = (row + i) % 4 === 0 && !isMine;
            return (
              <div
                key={i}
                className={`h-6 w-6 rounded-md border text-[9px] flex items-center justify-center font-bold ${
                  isMine
                    ? "bg-[#fbbf24] border-[#fbbf24] text-black"
                    : isTaken
                    ? "bg-white/10 border-white/10 text-white/20"
                    : "bg-white/5 border-white/15 text-white/40"
                }`}
              >
                {isMine ? "TU" : ""}
              </div>
            );
          })}
        </div>
      ))}
    </div>
    <div className="flex items-center justify-center gap-5 mt-5 text-xs text-[#9b93c2]">
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-white/5 border border-white/15" /> Liber</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-white/10 border border-white/10" /> Ocupat</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#fbbf24]" /> Locul tău</span>
    </div>
  </div>
);

const FaqAccordion = ({ items }) => (
  <Accordion type="single" collapsible data-testid="wiki-faq-accordion" className="my-4">
    {items.map((it, i) => (
      <AccordionItem key={i} value={`item-${i}`} className="border-white/10">
        <AccordionTrigger className="text-white hover:text-[#c9a3ff]" data-testid={`wiki-faq-q-${i}`}>{it.q}</AccordionTrigger>
        <AccordionContent className="text-[#9b93c2]">{it.a}</AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

export const ArticleBlocks = ({ blocks }) => (
  <div className="cx-wiki-prose">
    {blocks.map((b, i) => {
      if (b.type === "heading") {
        return <h2 key={i} id={slugify(b.text)} className="text-2xl font-black text-white mt-10 mb-4 scroll-mt-24">{b.text}</h2>;
      }
      if (b.type === "paragraph") return <p key={i}>{b.text}</p>;
      if (b.type === "list") {
        return (
          <ul key={i} className="list-disc list-inside space-y-1.5 mb-4">
            {b.items.map((it, j) => <li key={j}>{it}</li>)}
          </ul>
        );
      }
      if (b.type === "warning") {
        return (
          <div key={i} className="flex gap-3 items-start p-4 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/30 my-5">
            <AlertTriangle className="h-4 w-4 text-[#fbbf24] shrink-0 mt-0.5" />
            <p className="text-sm text-[#fde8b8]">{b.text}</p>
          </div>
        );
      }
      if (b.type === "rarities") return <RarityLegend key={i} />;
      if (b.type === "channels") return <ChannelGuide key={i} items={b.items} />;
      if (b.type === "seats") return <SeatMap key={i} />;
      if (b.type === "faq") return <FaqAccordion key={i} items={b.items} />;
      return null;
    })}
  </div>
);
