import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

// Hollowmere is a standalone Three.js game shipped as static assets under
// /public/hollowmere-game — embedded here as a full-screen iframe so its own
// loading screen, HUD and controls run untouched. The player's nickname,
// avatar and auth token are passed via the query string so the game can show
// a small nickname badge and sync progress (pumpkins/tokens/tasks) to the
// user's account via /api/hollowmere/state.
const Hollowmere = () => {
  const { user } = useAuth();
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("cx_token") || "";
    const params = new URLSearchParams({
      nick: user.name || "",
      avatar: user.avatar || "",
      token,
    });
    setSrc(`/hollowmere-game/index.html?${params.toString()}`);
  }, [user]);

  return (
    <div className="fixed inset-0 bg-[#050607]" data-testid="hollowmere-page">
      {!src ? (
        <div className="h-full w-full flex items-center justify-center text-white/50" data-testid="hollowmere-loading">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <iframe
          title="Hollowmere"
          src={src}
          data-testid="hollowmere-iframe"
          className="w-full h-full border-0"
          allow="autoplay; fullscreen"
        />
      )}
    </div>
  );
};

export default Hollowmere;
