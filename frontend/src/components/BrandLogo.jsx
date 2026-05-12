import React from "react";

/**
 * Cartoonix brand logo.
 *
 * variant:
 *  - "mark"     : just the stacked CARTOONIX logo (square)
 *  - "horizontal": small mark + horizontal "CARTOONIX" wordmark next to it
 *  - "stacked"  : large mark only (for hero / emails / auth pages)
 */
export function BrandLogo({ variant = "horizontal", size = "md", className = "", textClassName = "" }) {
  const sizes = {
    xs: { h: "h-7", text: "text-base" },
    sm: { h: "h-8", text: "text-xl" },
    md: { h: "h-9", text: "text-2xl" },
    lg: { h: "h-14", text: "text-4xl" },
    xl: { h: "h-24", text: "text-6xl" },
  };
  const s = sizes[size] || sizes.md;

  const Mark = (
    <span
      data-testid="brand-logo-mark"
      className={`inline-flex items-center justify-center ${s.h} aspect-square rounded-xl bg-black overflow-hidden shrink-0 shadow-[0_4px_14px_rgba(0,0,0,0.45)]`}
    >
      <img
        src="/brand/cartoonix-logo.png"
        alt="Cartoonix"
        className="h-[88%] w-[88%] object-contain"
        draggable={false}
      />
    </span>
  );

  if (variant === "mark") {
    return <span className={className}>{Mark}</span>;
  }

  if (variant === "stacked") {
    return (
      <span className={`inline-flex flex-col items-center gap-2 ${className}`}>
        <img
          src="/brand/cartoonix-logo.png"
          alt="Cartoonix"
          className={`${s.h.replace("h-", "h-")} object-contain`}
          style={{ height: size === "xl" ? "9rem" : size === "lg" ? "5rem" : "3rem" }}
          draggable={false}
        />
      </span>
    );
  }

  // horizontal (default)
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {Mark}
      <span className={`font-display tracking-[0.12em] ${s.text} ${textClassName}`}>CARTOONIX</span>
    </span>
  );
}

export default BrandLogo;
