import { EMOTICON_SET, emoticonUrl } from "@/data/emoticons";

// Renders chat text, replacing :name: shortcodes with emoticon images
export const MessageText = ({ text }) => {
  const parts = text.split(/(:[a-z0-9_]+:)/gi);
  return (
    <span className="inline">
      {parts.map((p, i) => {
        const m = p.match(/^:([a-z0-9_]+):$/i);
        if (m && EMOTICON_SET.has(m[1])) {
          return (
            <img
              key={i}
              src={emoticonUrl(m[1])}
              alt={m[1]}
              className="inline-block align-text-bottom mx-0.5"
              draggable={false}
            />
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
};
