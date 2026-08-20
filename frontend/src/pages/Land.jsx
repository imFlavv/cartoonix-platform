import { useState } from "react";
import { toast } from "sonner";

// Cartoonix Land — full-screen map. The inner container keeps the image's exact
// aspect ratio while covering the viewport, so percentage-based hotspots align
// perfectly with the artwork at any resolution.
const RATIO_W = 2000;
const RATIO_H = 894;

const Land = () => {
  const [hoverBuilding, setHoverBuilding] = useState(false);

  const openAtelier = () => {
    // TODO: point this to the real destination once the Atelier zone exists
    toast.info("🎨 Atelierul Cartoonix se deschide în curând!");
  };

  return (
    <div data-testid="land-page" className="fixed inset-0 overflow-hidden bg-[#63b7e4] flex items-center justify-center">
      <div
        className="relative"
        style={{
          width: `max(100vw, calc(100vh * ${RATIO_W} / ${RATIO_H}))`,
          height: `max(100vh, calc(100vw * ${RATIO_H} / ${RATIO_W}))`,
        }}
      >
        {/* base map */}
        <img
          src="/land/land-full.webp"
          alt="Cartoonix Land"
          draggable={false}
          className="absolute inset-0 w-full h-full object-fill select-none"
        />
        {/* glowing building overlay (same 2000x894 canvas, perfectly aligned) */}
        <img
          src="/land/building-glow.webp"
          alt=""
          draggable={false}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none transition-opacity duration-300 ease-out"
          style={{ opacity: hoverBuilding ? 0.5 : 0 }}
        />
        {/* clickable hotspot over the building */}
        <button
          data-testid="land-building-atelier"
          onMouseEnter={() => setHoverBuilding(true)}
          onMouseLeave={() => setHoverBuilding(false)}
          onClick={openAtelier}
          title="Atelierul Cartoonix"
          className="absolute cursor-pointer focus:outline-none"
          style={{ left: "57.4%", top: "19%", width: "8.2%", height: "15.6%" }}
        />
      </div>
    </div>
  );
};

export default Land;
