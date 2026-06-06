/**
 * Cartoonix chat emoticons — Yahoo-style classic pack.
 * Each token `:name:` written in the message body is rendered as an
 * <img src="/emoticons/name.gif"> on display.
 *
 * Keep this list in sync with /app/frontend/public/emoticons/*.gif
 */
export const EMOTICONS = [
  "angry", "anguished", "bawling", "bee", "blush", "bow", "bring_it",
  "chicken", "clap", "coffee", "confounded", "confused", "cow", "cowboy",
  "cry", "disappointed", "dizzy", "dog", "fearful", "flushed", "frowning",
  "get_outta_here", "giggle", "glasses", "grimacing", "grin", "hang_loose",
  "heart", "heartbreak", "how_interesting", "hug", "hushed", "i_dunno",
  "innocent", "jack_o_lantern", "joker", "joy", "kiss", "liar", "lightbulb",
  "lol", "look_at_the_time", "loser", "lucky", "minus_one", "money",
  "monkey", "mrgreen", "murica", "naughty", "neutral", "no_mouth",
  "not_listening", "nuh_uh", "ohstop", "one_finger", "open_mouth", "peace",
  "pensive", "perturbed", "pig", "pirate", "plus_one", "prayer", "punch",
  "rage", "relaxed", "relieved", "rock_on", "rofl", "rose", "scream",
  "sick", "skull", "sleeping", "sleepy", "smile", "smiley", "smirk",
  "star", "sunglasses", "time_out", "tired_face", "tongue", "transformer",
  "triumph", "unamused", "weary", "whistle", "who_me", "wink", "worried",
  "yin_yang",
];

const EMOTICON_SET = new Set(EMOTICONS);

export function emoticonUrl(name) {
  return `/emoticons/${name}.gif`;
}

/**
 * Tokenise a message body into a sequence of text runs and emoticon refs.
 * Matches `:name:` strictly against the known emoticon set so unrelated
 * colon-separated text (URLs, ratios, times) is not corrupted.
 */
export function tokenizeMessage(text) {
  if (!text) return [];
  const out = [];
  const re = /:([a-z][a-z0-9_]{1,24}):/gi;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = m[1].toLowerCase();
    if (!EMOTICON_SET.has(name)) continue;
    if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
    out.push({ type: "emo", name });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}
