import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Megaphone } from "lucide-react";

// Fixed single announcement bar shown under the header on the home page.
export function AnnouncementBar() {
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    api.get("/settings/announcement")
      .then((res) => setCfg(res.data))
      .catch(() => setCfg(null));
  }, []);

  if (!cfg || !cfg.enabled || !cfg.text) return null;

  const content = (
    <div
      data-testid="announcement-bar"
      className="w-full px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold text-center"
      style={{ backgroundColor: cfg.bg_color || "#ec1c24", color: cfg.text_color || "#ffffff" }}
    >
      <Megaphone className="h-4 w-4 shrink-0" />
      <span>{cfg.text}</span>
    </div>
  );

  return (
    <div className="pt-16">
      {cfg.link_url ? (
        <a href={cfg.link_url} target="_blank" rel="noopener noreferrer" className="block hover:brightness-95 transition">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}
