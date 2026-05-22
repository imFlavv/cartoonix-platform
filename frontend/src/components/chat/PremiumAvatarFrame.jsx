import React, { useMemo } from "react";
import { mediaUrl } from "@/lib/api";

/**
 * <PremiumAvatarFrame />
 *
 * Wraps an avatar <img> with elegant animated effects for PLUS-only avatars.
 *  • Rotating conic-gradient halo (red → orange → gold) around the avatar
 *  • Inner soft pulsing glow
 *  • Floating sparkle particles
 *  • Subtle inner shimmer overlay
 *
 * Renders ANY avatar — but only applies the premium effects when `animated`
 * is true (driven by avatar metadata: avatar.animated === true). For non-
 * premium avatars, it's a plain rounded image, which keeps usage uniform
 * across the app.
 */
export default function PremiumAvatarFrame({
  url,
  alt = "Avatar",
  size = 40,
  animated = false,
  rounded = "rounded-xl",
  className = "",
  testId,
}) {
  // Stable per-instance offsets for the sparkles so they don't all blink the same way.
  const sparkles = useMemo(() => {
    const base = [
      { top: "8%",  left: "82%", delay: "0s",   dur: "2.2s" },
      { top: "78%", left: "10%", delay: "0.5s", dur: "2.6s" },
      { top: "20%", left: "-8%", delay: "1.0s", dur: "2.0s" },
      { top: "88%", left: "70%", delay: "1.6s", dur: "2.4s" },
      { top: "-6%", left: "40%", delay: "0.8s", dur: "2.8s" },
    ];
    return base;
  }, []);

  if (!animated) {
    // Plain avatar (no premium effect)
    return (
      <div
        className={`${rounded} overflow-hidden ring-1 ring-white/10 bg-black/40 ${className}`}
        style={{ width: size, height: size }}
        data-testid={testId}
      >
        {url ? (
          <img
            src={mediaUrl(url)}
            alt={alt}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-[10px] text-white/40">
            ?
          </div>
        )}
      </div>
    );
  }

  // ---- Premium animated frame ----
  // Outer halo width — scales with avatar size.
  const halo = Math.max(2, Math.round(size * 0.06));
  const totalSize = size + halo * 2;

  return (
    <div
      className={`premium-avatar relative ${className}`}
      style={{
        width: totalSize,
        height: totalSize,
        display: "inline-block",
      }}
      data-testid={testId}
      data-premium="1"
    >
      {/* Pulsing glow behind everything */}
      <span
        aria-hidden
        className="premium-avatar__glow"
        style={{
          inset: -halo,
        }}
      />
      {/* Rotating conic halo (the colorful frame) */}
      <span
        aria-hidden
        className="premium-avatar__halo"
        style={{
          inset: 0,
          padding: halo,
        }}
      >
        <span className="premium-avatar__halo-inner" />
      </span>
      {/* Avatar image */}
      <span
        className={`relative block ${rounded} overflow-hidden bg-black/40 z-10`}
        style={{
          width: size,
          height: size,
          margin: halo,
        }}
      >
        {url ? (
          <img
            src={mediaUrl(url)}
            alt={alt}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-[10px] text-white/40">
            ?
          </div>
        )}
        {/* Subtle shimmer overlay sweeping across the avatar */}
        <span aria-hidden className="premium-avatar__shimmer" />
      </span>
      {/* Sparkles */}
      {sparkles.map((s, i) => (
        <span
          key={i}
          aria-hidden
          className="premium-avatar__sparkle"
          style={{
            top: s.top,
            left: s.left,
            animationDelay: s.delay,
            animationDuration: s.dur,
          }}
        />
      ))}
    </div>
  );
}
