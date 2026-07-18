import { useEffect, useState } from "react";
import { Users } from "lucide-react";
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
      className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full bg-black/70 backdrop-blur-xl border border-white/10 shadow-lg"
    >
      <span className="relative flex h-2 w-2">
        <span className="cx-ping absolute inline-flex h-full w-full rounded-full" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]" />
      </span>
      <Users className="h-3.5 w-3.5 text-white/70" />
      <span className="text-xs font-bold text-white leading-none">{online.toLocaleString("ro-RO")}</span>
    </div>
  );
};
