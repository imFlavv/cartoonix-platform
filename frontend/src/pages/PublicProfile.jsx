import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { PlusIcon } from "@/components/PlusIcon";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { rankInfo } from "@/lib/roles";
import { ArrowLeft, Clock, Calendar, MessageCircle, Crown, Shield, Loader2, UserX } from "lucide-react";

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

const RoleBadge = ({ role, plus, donor }) => (
  <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
    {role === "founder" && (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffcc00]/15 text-[#ffcc00] text-xs font-bold">
        <Crown className="h-3.5 w-3.5" /> Hall of Fame
      </span>
    )}
    {role === "admin" && (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1d9bf0]/15 text-[#1d9bf0] text-xs font-bold">
        <VerifiedBadge className="h-3.5 w-3.5" /> Admin
      </span>
    )}
    {role === "moderator" && (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3b82f6]/15 text-[#3b82f6] text-xs font-bold">
        <Shield className="h-3.5 w-3.5" /> Moderator
      </span>
    )}
    {plus ? (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffcc00]/15 text-[#ffcc00] text-xs font-bold">
        <PlusIcon className="h-3.5 w-3.5" /> Membru PLUS
      </span>
    ) : (
      <span className="px-3 py-1 rounded-full border border-white/20 text-white/50 text-xs font-bold">Cont FREE</span>
    )}
    {donor && (
      <img src="/badge-donator.gif" alt="Donator" title="Susținător Cartoonix" className="h-6 w-6 object-contain" />
    )}
  </div>
);

const PublicProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setProfile(null);
    api.get(`/users/${userId}/profile`)
      .then((res) => setProfile(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [userId]);

  const rank = rankInfo(profile?.chat_msg_count || 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" data-testid="public-profile-page">
      <NavBar />
      <div className="pt-20">
        <button
          data-testid="public-profile-back"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200 mt-4 ml-4 md:ml-12"
        >
          <ArrowLeft className="h-5 w-5" /> Înapoi
        </button>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-white/50" data-testid="public-profile-loading">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p>Se încarcă profilul...</p>
          </div>
        )}

        {!loading && notFound && (
          <div className="flex flex-col items-center justify-center py-24 text-white/50" data-testid="public-profile-not-found">
            <UserX className="h-10 w-10 mb-3 text-white/30" />
            <p>Acest utilizator nu a fost găsit.</p>
          </div>
        )}

        {!loading && profile && (
          <div className="relative mt-4 mx-4 md:mx-12 rounded-3xl overflow-hidden border border-white/10">
            <div
              className="h-40 md:h-56 bg-cover bg-center"
              style={{ backgroundImage: "url('/halloween/rewards-bg.jpg')" }}
            />
            <div className="absolute inset-0 h-40 md:h-56 bg-black/55" />

            <div className="relative bg-[#0f0f0f] px-5 md:px-10 pb-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-12 sm:-mt-14">
                <img
                  src={profile.avatar || `https://api.dicebear.com/9.x/bottts/svg?seed=${profile.name}`}
                  alt={profile.name}
                  data-testid="public-profile-avatar"
                  className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-[#141414] border-4 border-[#0f0f0f] object-cover shadow-lg"
                />
                <div className="text-center sm:text-left flex-1 pb-1">
                  <h1 className="font-display text-3xl md:text-4xl leading-tight" data-testid="public-profile-name">{profile.name}</h1>
                  <div className="mt-2">
                    <RoleBadge role={profile.role} plus={profile.plus} donor={profile.donor} />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-sm text-white/50 justify-center sm:justify-start" data-testid="public-profile-joined">
                <Calendar className="h-4 w-4 text-[#ec1c24]" />
                Membru din: <span className="text-white/80 font-semibold">{formatJoinDate(profile.created_at)}</span>
              </div>

              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 flex items-center gap-4" data-testid="public-profile-time-spent">
                  <div className="h-11 w-11 rounded-xl bg-[#ec1c24]/15 border border-[#ec1c24]/30 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-[#ec1c24]" />
                  </div>
                  <div>
                    <p className="font-display text-xl leading-none">{formatTime(profile.total_time_seconds)}</p>
                    <p className="text-xs text-white/50 mt-1">Timp petrecut pe platformă</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-4" data-testid="public-profile-rank">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="h-11 w-11 rounded-xl bg-[#ffcc00]/15 border border-[#ffcc00]/30 flex items-center justify-center shrink-0">
                      <MessageCircle className="h-5 w-5 text-[#ffcc00]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg leading-tight truncate">{rank.title}</p>
                      <p className="text-xs text-white/50">{(profile.chat_msg_count || 0).toLocaleString("ro-RO")} mesaje pe chat</p>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#ffcc00] to-[#ff8a00] transition-all duration-500" style={{ width: `${rank.progress}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;
