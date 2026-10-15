import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Calendar, Clock, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AvatarFrame } from "@/components/AvatarFrame";
import { api } from "@/lib/api";

const MAINTENANCE_BG =
  "https://customer-assets-agu9un31.emergentagent.net/job_cartoon-redesign/artifacts/de96flow_ChatGPT%20Image%20Jul%2029%2C%202026%2C%2002_32_11%20AM.png";

const formatTime = (sec) => {
  sec = Math.floor(sec || 0);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
};

const formatJoinDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "—";
  }
};

export const MaintenancePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    api
      .get(`/users/${user.id}/profile`)
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, [user?.id]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-white px-6 relative overflow-hidden bg-[#0a0a0a]"
      style={{
        backgroundImage: `url("${MAINTENANCE_BG}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Subtle vignette so text stays readable over the scene */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {user && (
        <div className="relative flex flex-col items-center mb-2" data-testid="maintenance-user-profile">
          <AvatarFrame
            src={user.avatar || `https://api.dicebear.com/9.x/bottts/svg?seed=${user.name}`}
            alt={user.name}
            frame={user.avatar_frame}
            size="h-28 w-28 md:h-32 md:w-32"
            ringClassName="border-4 border-black/50"
            testId="maintenance-avatar"
          />
          <h2
            className="font-display text-2xl md:text-3xl mt-4 text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
            data-testid="maintenance-username"
          >
            {user.name}
          </h2>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-xs md:text-sm"
              data-testid="maintenance-joined-date"
            >
              <Calendar className="h-4 w-4 text-[#ec1c24] shrink-0" />
              <span className="text-white/60">Membru din:</span>
              <span className="font-semibold text-white/90">{formatJoinDate(user.created_at)}</span>
            </div>
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-xs md:text-sm"
              data-testid="maintenance-time-spent"
            >
              <Clock className="h-4 w-4 text-[#ffcc00] shrink-0" />
              <span className="text-white/60">Timp pe forum:</span>
              <span className="font-semibold text-white/90">
                {formatTime(stats?.total_time_seconds ?? user.total_time_seconds)}
              </span>
            </div>
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-xs md:text-sm"
              data-testid="maintenance-chat-count"
            >
              <MessageCircle className="h-4 w-4 text-[#22c55e] shrink-0" />
              <span className="text-white/60">Mesaje chat:</span>
              <span className="font-semibold text-white/90">{(stats?.chat_msg_count ?? 0).toLocaleString("ro-RO")}</span>
            </div>
          </div>
        </div>
      )}

      <h1 className="relative font-display text-4xl md:text-5xl mt-6 text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
        Suntem în mentenanță
      </h1>
      <p className="relative text-white/80 mt-3 text-center max-w-md drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
        Lucrăm la ceva grozav pentru tine. Revenim în curând cu desenele tale
        preferate!
      </p>
      <button
        data-testid="maintenance-admin-login"
        onClick={() => navigate("/login")}
        className="relative mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-sm font-semibold text-white/90 transition-colors duration-200"
      >
        <ShieldAlert className="h-4 w-4" /> Acces administrator
      </button>
    </div>
  );
};
