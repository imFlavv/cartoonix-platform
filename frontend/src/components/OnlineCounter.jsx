import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export const OnlineCounter = () => {
  const [online, setOnline] = useState(null);

  useEffect(() => {
    const load = () => api.get("/presence/online").then((res) => setOnline(res.data.online)).catch(() => {});
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  if (online === null) return null;

  return (
    <div
      data-testid="online-counter"
      className="fixed bottom-5 left-5 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-black/70 backdrop-blur-xl border border-white/10 shadow-lg"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="cx-ping absolute inline-flex h-full w-full rounded-full" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22c55e]" />
      </span>
      <span className="text-sm font-bold text-white">{online.toLocaleString("ro-RO")}</span>
      <span className="text-xs text-white/50">online</span>
    </div>
  );
};
