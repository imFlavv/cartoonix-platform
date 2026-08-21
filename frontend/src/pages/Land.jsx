import { useState } from "react";
import { toast } from "sonner";
import "./Land.css";

// Cartoonix Land — full-screen background image, rendered exactly like the
// provided HTML/CSS (object-fit: cover; object-position: center; scale 1.20).
const Land = () => {
  const [hoverBuilding, setHoverBuilding] = useState(false);

  const openAtelier = () => {
    toast.info("🎨 Atelierul Cartoonix se deschide în curând!");
  };

  return (
    <div data-testid="land-page" className="fullscreen-image">
      <img src="/land-assets/ORIGINAL.png" alt="Cartoonix Land" draggable={false} />
      {/* glowing building overlay — same transform as the base image so it stays aligned */}
      <img
        src="/land-assets/building-glow.webp"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="land-glow"
        style={{ opacity: hoverBuilding ? 0.5 : 0 }}
      />
      {/* clickable hotspot over the building (scale-1.20 adjusted position) */}
      <button
        data-testid="land-building-atelier"
        onMouseEnter={() => setHoverBuilding(true)}
        onMouseLeave={() => setHoverBuilding(false)}
        onClick={openAtelier}
        title="Atelierul Cartoonix"
        className="land-hotspot"
      />
    </div>
  );
};

export default Land;
