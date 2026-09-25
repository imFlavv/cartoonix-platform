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

// PLUS-exclusive chat bubble skins. "none" = classic dark bubble (same as FREE).
// `thumb` = image preview; `css` = CSS-only skin (rendered via SkinnedBubble class).
export const CHAT_STYLE_BUBBLES = [
  { value: "none", label: "Clasică", desc: "Simplu și elegant", thumb: null },
  { value: "capybara", label: "Capybara", desc: "Prietenos și simpatic", thumb: "/chat/bubbles/capybara/left.png" },
  { value: "ice", label: "Ice", desc: "Rece și modern", thumb: "/chat/bubbles/ice/left.png" },
  { value: "planet", label: "Planet", desc: "Cosmic și vibrant", thumb: "/chat/bubbles/planet/left.png" },
  { value: "neon", label: "Neon", desc: "Modern și strălucitor", css: true },
  { value: "retro", label: "Retro", desc: "Pixel perfect", css: true },
  { value: "gold", label: "Aur", desc: "Luxos și regal", css: true },
  { value: "holo", label: "Holo", desc: "Curcubeu futurist", css: true },
  { value: "bubblegum", label: "Bubblegum", desc: "Dulce și pufos", css: true },
];

// Name colors (PLUS only). "default" keeps the standard chat name color.
export const CHAT_STYLE_NAME_COLORS = [
  { value: "default", hex: "#ffffff" },
  { value: "gold", hex: "#ffcc00" },
  { value: "orange", hex: "#ff8a00" },
  { value: "red", hex: "#ff3c3c" },
  { value: "pink", hex: "#ff5db1" },
  { value: "purple", hex: "#b478ff" },
  { value: "blue", hex: "#3b82f6" },
  { value: "cyan", hex: "#00e0ff" },
  { value: "green", hex: "#39ff14" },
];

export function nameColorHex(value) {
  const found = CHAT_STYLE_NAME_COLORS.find((c) => c.value === value);
  return found && found.value !== "default" ? found.hex : null;
}

export const DEFAULT_CHAT_STYLE = {
  font: "default",
  glow: "none",
  gradient: "none",
  bubble: "none",
  name_color: "default",
  bold: false,
  italic: false,
  sparkle: false,
  shadow: false,
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
  if (s.shadow) parts.push("cx-txt-shadow");
  return parts.join(" ");
}
