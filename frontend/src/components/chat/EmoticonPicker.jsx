import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Smile, X } from "lucide-react";
import { EMOTICONS } from "./emoticons";

/**
 * Yahoo-style emoticon picker. Click an emoticon to insert its :code:
 * shortcode into the chat input. Dimensions stay at the native GIF size —
 * we never apply width/height CSS overrides on the rendered <img>.
 */
export default function EmoticonPicker({ onPick, onClose }) {
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        onClose?.();
      }
    }
    function handleEsc(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMOTICONS;
    return EMOTICONS.filter((e) => e.code.toLowerCase().includes(q));
  }, [query]);

  return (
    <div
      ref={wrapRef}
      data-testid="chat-emoticon-picker"
      className="absolute bottom-full right-0 mb-2 w-[320px] flex flex-col rounded-2xl overflow-hidden z-[70]"
      style={{
        background:
          "linear-gradient(180deg, rgba(20,20,24,0.98) 0%, rgba(10,10,12,0.98) 100%)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow:
          "0 24px 60px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-white/5"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,59,59,0.10) 0%, rgba(250,204,21,0.08) 100%)",
        }}
      >
        <Smile className="h-4 w-4 text-[#facc15]" />
        <span className="font-display tracking-wider text-[12px] font-semibold">
          Emoticoane
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground/70">
          {filtered.length}/{EMOTICONS.length}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-white/10 transition-colors"
          aria-label="Închide picker"
          data-testid="emoticon-picker-close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-2.5 py-2 border-b border-white/5">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground/70" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută..."
            data-testid="emoticon-search"
            className="flex-1 bg-transparent border-0 outline-none text-[12px] placeholder:text-muted-foreground/60"
            autoFocus
          />
        </div>
      </div>

      {/* Grid */}
      <div
        className="flex-1 overflow-y-auto p-2 chat-scroll"
        style={{ maxHeight: 240 }}
      >
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-[11px] text-muted-foreground/70">
            Niciun emoticon găsit.
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {filtered.map((emo) => (
              <button
                key={emo.code}
                type="button"
                onClick={() => onPick?.(emo.code)}
                title={`:${emo.code}:`}
                data-testid={`emoticon-${emo.code}`}
                className="h-9 w-9 grid place-items-center rounded-md hover:bg-white/10 active:scale-95 transition-all"
              >
                <img
                  src={`/emoticons/${emo.file}`}
                  alt={emo.code}
                  width={emo.w}
                  height={emo.h}
                  draggable={false}
                  style={{ imageRendering: "auto" }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hint */}
      <div className="px-3 py-1.5 border-t border-white/5 text-[10px] text-muted-foreground/70 text-center">
        Tastează <span className="text-amber-300/90 font-mono">:nume:</span> direct în mesaj.
      </div>
    </div>
  );
}
