// Cartoonix PLUS chat text style helpers
// Keep in sync with backend sanitize_chat_style and index.css presets.

export const CHAT_STYLE_FONTS = [
  { value: "default", label: "Normal (Nunito)" },
  { value: "serif", label: "Serif (Georgia)" },
  { value: "mono", label: "Mono (JetBrains)" },
  { value: "cursive", label: "Pacifico" },
  { value: "handwritten", label: "Handwritten (Caveat)" },
  { value: "display", label: "Display (Bebas Neue)" },
];

export const CHAT_STYLE_GLOWS = [
  { value: "none", label: "Fără glow", swatch: "#333" },
  { value: "gold", label: "Auriu", swatch: "#ffcc00" },
  { value: "cyan", label: "Cyan", swatch: "#00e0ff" },
  { value: "pink", label: "Roz", swatch: "#ff69b4" },
  { value: "green", label: "Verde", swatch: "#39ff14" },
  { value: "red", label: "Roșu", swatch: "#ff3c3c" },
  { value: "purple", label: "Mov", swatch: "#b478ff" },
  { value: "white", label: "Alb", swatch: "#ffffff" },
];

export const CHAT_STYLE_GRADIENTS = [
  { value: "none", label: "Fără gradient", preview: null },
  { value: "gold", label: "Auriu", preview: "linear-gradient(90deg,#ffe27a,#ffcc00,#ff8a00)" },
  { value: "sunset", label: "Sunset", preview: "linear-gradient(90deg,#ff6a3d,#ff2d78,#a020f0)" },
  { value: "ocean", label: "Ocean", preview: "linear-gradient(90deg,#00e0ff,#0099ff,#5c34ff)" },
  { value: "candy", label: "Candy", preview: "linear-gradient(90deg,#ff77e9,#c86cff,#67d2ff)" },
  { value: "neon", label: "Neon", preview: "linear-gradient(90deg,#39ff14,#00ffcc,#00c8ff)" },
  { value: "aurora", label: "Aurora", preview: "linear-gradient(90deg,#66ff9d,#00d4ff,#a488ff,#ff8bcf)" },
  { value: "fire", label: "Fire", preview: "linear-gradient(90deg,#ffdd57,#ff6a00,#ff1e56)" },
];

export const DEFAULT_CHAT_STYLE = {
  font: "default",
  glow: "none",
  gradient: "none",
  bold: false,
  italic: false,
  sparkle: false,
};

// Build the className string applied to the message text <span>
export function chatStyleClasses(style) {
  const s = { ...DEFAULT_CHAT_STYLE, ...(style || {}) };
  const parts = [`cx-txt-font-${s.font}`];
  if (s.glow && s.glow !== "none") parts.push(`cx-txt-glow-${s.glow}`);
  if (s.gradient && s.gradient !== "none") parts.push(`cx-txt-grad-${s.gradient}`);
  if (s.bold) parts.push("cx-txt-bold");
  if (s.italic) parts.push("cx-txt-italic");
  if (s.sparkle) parts.push("cx-txt-sparkle");
  return parts.join(" ");
}
