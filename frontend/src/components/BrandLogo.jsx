import React from "react";

/**
 * Cartoonix brand logo — official wordmark.
 *
 * The image already contains the brand: red "CARTOONIX" wordmark on black.
 * We render it as-is, without any wrapping frame.
 *
 * variant:
 *  - "mark"       : just the official logo image (square wordmark)
 *  - "horizontal" : the same image at a navbar-friendly height
 *  - "stacked"    : large logo for hero / auth pages
 */
export function BrandLogo({ variant = "horizontal", size = "md", className = "" }) {
  const heights = {
    xs: { h: 28 },
    sm: { h: 36 },
    md: { h: 44 },
    lg: { h: 72 },
    xl: { h: 128 },
  };
  const { h } = heights[size] || heights.md;

  const Img = (
    <img
      data-testid="brand-logo-mark"
      src="/brand/cartoonix-logo.png"
      alt="Cartoonix"
      className="block select-none object-contain"
      style={{ height: `${h}px`, width: "auto" }}
      draggable={false}
    />
  );

  if (variant === "stacked") {
    return (
      <span className={`inline-flex flex-col items-center ${className}`}>
        {Img}
      </span>
    );
  }

  // both "mark" and "horizontal" simply render the official logo image
  return <span className={`inline-flex items-center ${className}`}>{Img}</span>;
}

export default BrandLogo;
