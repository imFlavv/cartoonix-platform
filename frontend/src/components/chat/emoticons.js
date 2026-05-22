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
// ambiguous ones (e.g. :-D before :D, :)) before :), :-SS before :-S).
// Mappings follow the official Yahoo! Messenger shortcode legend.
// Each entry: [literal trigger, emoticon code].
const ASCII_SHORTCUTS = [
  // ---- 4+ char Yahoo shortcuts ----
  [">:D<", "hug"],            // big hug
  ["<):)", "cowboy"],         // cowboy
  ["#:-S", "relieved"],       // whew!
  [":-SS", "fearful"],        // nailbiting (MUST come before :-S)
  ["O:-)", "innocent"],       // angel (MUST come before O:))
  [":'-(", "cry"],

  // ---- 3-char shortcuts ----
  [":))", "joy"],             // laughing (MUST come before :))
  [":((", "cry"],             // crying (MUST come before :()
  ["=))", "rofl"],            // rolling on the floor (MUST come before =))
  ["=((", "heartbreak"],      // broken heart (MUST come before =()
  [";;)", "blush"],           // batting eyelashes
  [":-)", "smile"],
  [":-(", "disappointed"],
  [":-D", "grin"],            // big grin
  [":-P", "tongue"],
  [":-p", "tongue"],
  [":-O", "open_mouth"],      // surprise
  [":-o", "open_mouth"],
  [":-*", "kiss"],
  [":-|", "neutral"],
  [":-/", "confused"],
  [":-S", "worried"],
  [":-B", "glasses"],         // nerd
  [":-&", "sick"],
  [":-$", "no_mouth"],        // don't tell anyone
  [":-?", "how_interesting"], // thinking
  [":-t", "time_out"],
  [":-w", "look_at_the_time"], // waiting
  [":-<", "frowning"],        // sigh
  [":'(", "cry"],
  [";-)", "wink"],
  [";-]", "wink"],
  ["B-)", "sunglasses"],      // cool
  ["8-)", "sunglasses"],
  ["8->", "pensive"],         // daydreaming
  ["8-|", "unamused"],        // rolling eyes
  ["8-}", "giggle"],          // silly
  ["L-)", "loser"],
  ["I-)", "sleepy"],
  ["[-(", "not_listening"],   // not talking
  ["=D>", "clap"],            // applause
  ["@-)", "dizzy"],           // hypnotized
  ["#-o", "scream"],          // d'oh
  ["~X(", "weary"],           // at wits' end
  ["(:|", "tired_face"],      // yawn
  [":^o", "liar"],
  ["/:)", "confounded"],      // raised eyebrow
  [":\">", "blush"],          // blushing
  [">:)", "joker"],           // devil
  [">:P", "tongue"],          // phbbbbt (raspberry)
  ["O:)", "innocent"],
  ["o:)", "innocent"],
  ["</3", "heartbreak"],

  // ---- 2-char shortcuts ----
  [":)", "smile"],            // happy
  [":(", "disappointed"],     // sad
  [":D", "grin"],             // big grin (changed from lol per Yahoo legend)
  [":P", "tongue"],
  [":p", "tongue"],
  [":O", "open_mouth"],
  [":o", "open_mouth"],
  [":*", "kiss"],
  [":|", "neutral"],           // straight face
  [":x", "heart"],             // love struck
  [":>", "smirk"],             // smug
  [":[", "disappointed"],
  [":]", "smile"],
  [";)", "wink"],
  ["=)", "smile"],
  ["=(", "disappointed"],
  ["=D", "lol"],
  ["B)", "sunglasses"],
  ["8)", "sunglasses"],
  ["xD", "joy"],
  ["XD", "joy"],
  ["xd", "joy"],
  ["X(", "angry"],
  ["<3", "heart"],
  ["=;", "ohstop"],            // talk to the hand
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
