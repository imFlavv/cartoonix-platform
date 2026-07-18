import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { ArrowLeft, Megaphone } from "lucide-react";

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `acum ${Math.max(1, Math.floor(diff / 60))} min`;
  if (diff < 86400) return `acum ${Math.floor(diff / 3600)} h`;
  return `acum ${Math.floor(diff / 86400)} zile`;
};

const Announcements = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get("/notifications").then((res) => setItems(res.data.items)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-24 px-4 md:px-12 pb-16 max-w-3xl mx-auto">
        <button data-testid="ann-back" onClick={() => navigate("/lobby")} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200 mb-4">
          <ArrowLeft className="h-5 w-5" /> Lobby
        </button>
        <h1 className="font-display text-5xl mb-8 flex items-center gap-3">
          <Megaphone className="h-9 w-9 text-[#ffcc00]" /> Anunțuri importante
        </h1>

        <div className="space-y-5">
          {items.length === 0 && <p className="text-white/40">Niciun anunț momentan.</p>}
          {items.map((n) => (
            <div key={n.id} data-testid="announcement" className="bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden">
              {n.image && <img src={n.image} alt="" className="w-full h-48 object-cover" />}
              <div className="p-6">
                <p className="text-xs text-white/40 mb-1">{timeAgo(n.created_at)}</p>
                <h2 className="font-bold text-lg mb-2">{n.title}</h2>
                <p className="text-white/70 leading-relaxed">{n.body}</p>
                {n.cta_label && (
                  <button onClick={() => navigate(n.cta_link || "/home")} className="mt-4 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors duration-200">
                    {n.cta_label}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Announcements;
