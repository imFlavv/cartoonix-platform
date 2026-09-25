import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import "./Land.css";

// Cartoonix Land — full-screen background image, rendered exactly like the
// provided HTML/CSS (object-fit: cover; object-position: center; scale 1.20).
const Land = () => {
  const [hoverBuilding, setHoverBuilding] = useState(false);
  const [hoverCenter, setHoverCenter] = useState(false);
  const [halloween, setHalloween] = useState(false);

  useEffect(() => {
    api.get("/settings/halloween").then((res) => setHalloween(!!res.data.enabled)).catch(() => {});
  }, []);

  const openAtelier = () => {
    toast.info("🎨 Atelierul Cartoonix se deschide în curând!");
  };

  const openHalloween = () => {
    toast.info("🎃 Evenimentul de Halloween începe în curând!");
  };

  // ---- Halloween theme (activated by admin) ----
  if (halloween) {
    return (
      <div data-testid="land-page" className="fullscreen-image">
        <img src="/land-assets/halloween-base.webp" alt="Cartoonix Land - Halloween" draggable={false} />
        {/* glow overlay of the central element, same transform → perfectly aligned */}
        <img
          src="/land-assets/halloween-glow.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="land-glow"
          style={{ opacity: hoverCenter ? 1 : 0 }}
        />
        {/* clickable hotspot over the central Halloween element */}
        <button
          data-testid="land-halloween-center"
          onMouseEnter={() => setHoverCenter(true)}
          onMouseLeave={() => setHoverCenter(false)}
          onClick={openHalloween}
          title="Evenimentul de Halloween"
          className="land-hotspot-halloween"
        />
      </div>
    );
  }

  // ---- Default theme ----
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
