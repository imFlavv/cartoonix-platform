import { NavBar } from "@/components/NavBar";

// Cartoonix Land — wooden frame background with the official map inside the opening.
// Frame opening (measured on frame.webp 2000x1007): left 24.4% / right 75.3% / top 13.5% / bottom 66.9%.
const Land = () => {
  return (
    <div className="h-screen overflow-hidden bg-gradient-to-b from-[#63b7e4] via-[#8fcfe8] to-[#a7d86a]">
      <NavBar />
      <div className="mt-16 h-[calc(100vh-4rem)] flex items-center justify-center px-2">
        <div
          data-testid="land-frame"
          className="relative"
          style={{ aspectRatio: "2000 / 1007", width: "min(100%, calc((100vh - 4.5rem) * 2000 / 1007))", maxHeight: "100%" }}
        >
          {/* wooden frame + landscape (full background image) */}
          <img
            src="/land/frame.webp"
            alt="Cartoonix Land"
            className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none"
            draggable={false}
          />
          {/* official map, placed inside the frame opening (slight overlap onto the wood to avoid seams) */}
          <img
            src="/land/map.webp"
            alt="Harta Cartoonix Land"
            data-testid="land-map"
            className="absolute object-cover select-none"
            draggable={false}
            style={{ left: "23.9%", top: "13%", width: "51.8%", height: "54.4%" }}
          />
        </div>
      </div>
    </div>
  );
};

export default Land;
