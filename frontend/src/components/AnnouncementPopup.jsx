import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { X } from "lucide-react";

const todayStr = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// Site-wide announcement popup. Shows once per day per popup version until dismissed.
// Dismissing (X) hides it for the current day only; it reappears the next day.
export function AnnouncementPopup() {
  const [cfg, setCfg] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get("/settings/popup")
      .then((res) => {
        const data = res.data;
        if (!data || !data.enabled || (!data.title && !data.body && !data.image_url)) return;
        setCfg(data);
        const key = "cx_popup_dismissed";
        const stored = localStorage.getItem(key); // format: "<id>|<date>"
        const marker = `${data.id}|${todayStr()}`;
        if (stored !== marker) setOpen(true);
      })
      .catch(() => {});
  }, []);

  const dismiss = () => {
    if (cfg) localStorage.setItem("cx_popup_dismissed", `${cfg.id}|${todayStr()}`);
    setOpen(false);
  };

  if (!open || !cfg) return null;

  return (
    <div
      data-testid="announcement-popup"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#141414] border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          data-testid="announcement-popup-close"
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-black/40 text-white/80 hover:bg-black/70 hover:text-white transition"
          aria-label="Închide"
        >
          <X className="h-5 w-5" />
        </button>
        {cfg.image_url && (
          <img src={cfg.image_url} alt="" className="w-full max-h-56 object-cover" />
        )}
        <div className="p-6">
          {cfg.title && <h3 className="font-display text-2xl mb-2 text-white">{cfg.title}</h3>}
          {cfg.body && <p className="text-white/70 text-sm whitespace-pre-line leading-relaxed">{cfg.body}</p>}
          {cfg.link_url && (
            <a
              href={cfg.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-5 px-6 py-2.5 rounded-full bg-[#ec1c24] hover:bg-[#ff2d36] text-white font-bold text-sm transition"
            >
              {cfg.link_label || "Vezi detalii"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
