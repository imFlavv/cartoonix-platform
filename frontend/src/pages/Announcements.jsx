import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { ArrowLeft, Megaphone, ChevronRight, Star, Bell, Lightbulb } from "lucide-react";
import { catStyle, fmtDate, fmtTime, isNew } from "@/data/announcementCategories";

const Announcements = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get("/notifications")
      .then((res) => setItems((res.data.items || []).filter((n) => !n.user_id)))
      .catch(() => {});
  }, []);

  const top = items.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-24 px-4 md:px-12 pb-16 max-w-6xl mx-auto">
        <button data-testid="ann-back" onClick={() => navigate("/lobby")} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors duration-200 mb-6">
          <ArrowLeft className="h-5 w-5" /> Lobby
        </button>

        <div className="flex items-center gap-4 mb-2">
          <span className="grid place-items-center h-12 w-12 rounded-2xl bg-[#ffcc00]/15 text-[#ffcc00]">
            <Megaphone className="h-7 w-7" />
          </span>
          <h1 className="font-display text-4xl md:text-6xl tracking-wide">Anunțuri importante</h1>
        </div>
        <p className="text-white/50 mb-8 md:text-lg">Aici vei găsi toate noutățile, actualizările și informațiile importante din Cartoonix.</p>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* main list */}
          <div className="lg:col-span-2 space-y-4">
            {items.length === 0 && <p className="text-white/40">Niciun anunț momentan.</p>}
            {items.map((n) => {
              const c = catStyle(n);
              const Icon = c.icon;
              return (
                <button
                  key={n.id}
                  data-testid="announcement"
                  onClick={() => navigate(`/lobby/announcements/${n.id}`)}
                  className="w-full text-left group flex items-stretch rounded-2xl overflow-hidden bg-[#0f0f0f] border border-white/10 hover:border-white/25 transition-colors duration-200"
                >
                  {/* thumbnail */}
                  <div className={`relative w-20 sm:w-28 md:w-40 shrink-0 bg-gradient-to-br ${c.grad} grid place-items-center overflow-hidden`}>
                    {n.image ? (
                      <img src={n.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                    ) : null}
                    <Icon className="relative h-8 w-8 md:h-12 md:w-12 drop-shadow-lg" style={{ color: c.accent }} />
                  </div>
                  {/* content */}
                  <div className="flex-1 min-w-0 p-3.5 md:p-5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.accent }}>{c.label}</span>
                        {isNew(n.created_at) && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: `${c.accent}22`, color: c.accent }}>Nou</span>
                        )}
                      </div>
                      <h2 className="font-display text-lg md:text-2xl leading-tight mt-1 tracking-wide truncate">{n.title}</h2>
                      <p className="text-sm text-white/55 mt-1 line-clamp-1">{n.body}</p>
                      <p className="text-xs text-white/45 mt-1.5">{fmtDate(n.created_at)} · {fmtTime(n.created_at)}</p>
                    </div>
                    <ChevronRight className="h-6 w-6 text-white/30 group-hover:text-white/70 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* sidebar */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-[#0f0f0f] border border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
                <Star className="h-4 w-4 text-[#ffcc00]" />
                <h3 className="font-bold text-sm uppercase tracking-widest text-white/70">Anunțuri de top</h3>
              </div>
              <div className="p-3 space-y-1">
                {top.map((n) => {
                  const c = catStyle(n);
                  const Icon = c.icon;
                  return (
                    <button key={n.id} data-testid="top-announcement" onClick={() => navigate(`/lobby/announcements/${n.id}`)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors text-left">
                      <span className={`grid place-items-center h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br ${c.grad}`}>
                        <Icon className="h-5 w-5" style={{ color: c.accent }} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold uppercase tracking-wide truncate">{n.title}</p>
                        <p className="text-xs text-white/45">{fmtDate(n.created_at)}</p>
                      </div>
                    </button>
                  );
                })}
                {top.length === 0 && <p className="text-white/40 text-sm p-2">—</p>}
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-[#1a1305] to-[#0f0f0f] border border-[#ffcc00]/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-[#ffcc00]" />
                <h3 className="font-bold text-sm uppercase tracking-widest text-white/70">Sfatul zilei</h3>
              </div>
              <div className="flex items-start gap-3">
                <p className="text-sm text-white/60 leading-relaxed">Activează notificările pentru a nu pierde niciun anunț important din comunitatea Cartoonix.</p>
                <Bell className="h-9 w-9 text-[#ffcc00] shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Announcements;
