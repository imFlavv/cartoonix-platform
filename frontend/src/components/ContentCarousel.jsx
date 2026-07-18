import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ShowCard } from "@/components/ShowCard";

export const ContentCarousel = ({ title, shows }) => {
  const ref = useRef(null);
  if (!shows || shows.length === 0) return null;

  const scroll = (dir) => {
    if (ref.current) ref.current.scrollBy({ left: dir * 600, behavior: "smooth" });
  };

  return (
    <section className="py-5 md:py-6 group/row">
      <div className="flex items-center justify-between px-4 md:px-12 mb-3">
        <h2 className="font-display text-2xl md:text-3xl tracking-wide">{title}</h2>
      </div>
      <div className="relative">
        <button
          onClick={() => scroll(-1)}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white opacity-0 group-hover/row:opacity-100 hover:bg-[#ec1c24] transition-all duration-200"
          aria-label="scroll stânga"
        >
          <ChevronLeft />
        </button>
        <div
          ref={ref}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide snap-x px-4 md:px-12 py-2"
        >
          {shows.map((s) => (
            <ShowCard key={s.id} show={s} />
          ))}
        </div>
        <button
          onClick={() => scroll(1)}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white opacity-0 group-hover/row:opacity-100 hover:bg-[#ec1c24] transition-all duration-200"
          aria-label="scroll dreapta"
        >
          <ChevronRight />
        </button>
      </div>
    </section>
  );
};
