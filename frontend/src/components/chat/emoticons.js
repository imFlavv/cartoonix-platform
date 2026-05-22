// Auto-generated emoticon registry for Cartoonix chat.
// Codes are case-insensitive and matched as :code: inside any chat message.
// Original GIF dimensions are preserved — never resize at render time.
import EMOTICONS_RAW from "./emoticons.json";

export const EMOTICONS = EMOTICONS_RAW;

// Quick lookup map by code (lowercase)
export const EMOTICON_MAP = EMOTICONS_RAW.reduce((acc, e) => {
  acc[e.code.toLowerCase()] = e;
  return acc;
}, {});

// Match :code: where code is letters/digits/underscores
export const EMOTICON_REGEX = /:([a-z0-9_]+):/gi;

/**
 * Parse a chat message and return an array of React-friendly parts:
 *  - { type: "text", value: string }
 *  - { type: "emo", emo: { code, file, w, h } }
 *
 * The component layer is responsible for rendering — this function is
 * intentionally framework-agnostic (no JSX) so it can be unit-tested
 * and re-used inside admin tables, message previews, pinned messages, etc.
 */
export function parseEmoticons(text) {
  if (!text || typeof text !== "string") return [];
  const parts = [];
  let lastIndex = 0;
  // Re-create regex per call to avoid stateful lastIndex bugs in concurrent React.
  const re = new RegExp(EMOTICON_REGEX.source, "gi");
  let m;
  while ((m = re.exec(text)) !== null) {
    const code = m[1].toLowerCase();
    const emo = EMOTICON_MAP[code];
    if (emo) {
      if (m.index > lastIndex) {
        parts.push({ type: "text", value: text.slice(lastIndex, m.index) });
      }
      parts.push({ type: "emo", emo });
      lastIndex = m.index + m[0].length;
    }
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
}
