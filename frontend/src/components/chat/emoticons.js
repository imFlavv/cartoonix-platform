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

// ---- 2000s-style ASCII shortcuts → :code: ----
// Order matters: longer / more specific patterns must come BEFORE shorter
// ambiguous ones (e.g. :-D before :D, <3 before :|).
// Each entry: [literal trigger, emoticon code].
const ASCII_SHORTCUTS = [
  // Joy / laughter
  [":-D", "lol"], [":D", "lol"], ["=D", "lol"],
  ["xD", "joy"], ["XD", "joy"], ["xd", "joy"],
  // Tongue
  [":-P", "tongue"], [":P", "tongue"], [":-p", "tongue"], [":p", "tongue"],
  // Wink
  [";-)", "wink"], [";)", "wink"], [";-]", "wink"],
  // Smile
  [":-)", "smile"], [":)", "smile"], ["=)", "smile"], [":]", "smile"],
  // Frown / sad
  [":'(", "cry"], [":'-(", "cry"],
  [":-(", "disappointed"], [":(", "disappointed"], ["=(", "disappointed"], [":[", "disappointed"],
  // Surprise
  [":-O", "open_mouth"], [":-o", "open_mouth"], [":O", "open_mouth"], [":o", "open_mouth"],
  // Neutral
  [":-|", "neutral"], [":|", "neutral"],
  // Sunglasses
  ["B-)", "sunglasses"], ["B)", "sunglasses"], ["8-)", "sunglasses"], ["8)", "sunglasses"],
  // Kiss
  [":-*", "kiss"], [":*", "kiss"],
  // Heart / love
  ["<3", "heart"], ["</3", "heartbreak"],
  // Angel / devil
  ["O:)", "innocent"], ["o:)", "innocent"],
];

// Escape regex special chars in literal triggers
function _escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build one combined alternation regex with capture group.
// We require the trigger to be at start, after whitespace, or after punctuation,
// AND followed by whitespace / end / punctuation — so we don't mangle things
// like URLs (https://...), times (8:30) or emojis already encoded as :code:.
const ASCII_RE = new RegExp(
  "(^|[\\s.,!?\\u00A0])(" +
    ASCII_SHORTCUTS.map((s) => _escapeRegex(s[0])).join("|") +
    ")(?=$|[\\s.,!?\\u00A0])",
  "g"
);

const ASCII_MAP = ASCII_SHORTCUTS.reduce((acc, [trig, code]) => {
  acc[trig] = code;
  return acc;
}, {});

/**
 * Convert ASCII smileys like :) :D <3 ;) into their :code: token equivalents.
 * Returns the same string if nothing matches.
 */
export function convertAsciiShortcuts(text) {
  if (!text || typeof text !== "string") return text;
  if (text.length < 2) return text;
  return text.replace(ASCII_RE, (_m, prefix, trig) => {
    const code = ASCII_MAP[trig];
    return prefix + (code ? `:${code}:` : trig);
  });
}

/**
 * Parse a chat message and return an array of React-friendly parts:
 *  - { type: "text", value: string }
 *  - { type: "emo", emo: { code, file, w, h } }
 *
 * The component layer is responsible for rendering — this function is
 * intentionally framework-agnostic (no JSX) so it can be unit-tested
 * and re-used inside admin tables, message previews, pinned messages, etc.
 *
 * ASCII shortcuts (`:)`, `:D`, `<3`, ...) are auto-expanded first.
 */
export function parseEmoticons(text) {
  if (!text || typeof text !== "string") return [];
  const expanded = convertAsciiShortcuts(text);
  const parts = [];
  let lastIndex = 0;
  // Re-create regex per call to avoid stateful lastIndex bugs in concurrent React.
  const re = new RegExp(EMOTICON_REGEX.source, "gi");
  let m;
  while ((m = re.exec(expanded)) !== null) {
    const code = m[1].toLowerCase();
    const emo = EMOTICON_MAP[code];
    if (emo) {
      if (m.index > lastIndex) {
        parts.push({ type: "text", value: expanded.slice(lastIndex, m.index) });
      }
      parts.push({ type: "emo", emo });
      lastIndex = m.index + m[0].length;
    }
  }
  if (lastIndex < expanded.length) {
    parts.push({ type: "text", value: expanded.slice(lastIndex) });
  }
  return parts;
}
