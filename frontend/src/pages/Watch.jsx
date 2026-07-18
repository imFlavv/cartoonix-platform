import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { ArrowLeft, ChevronRight, Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const Watch = () => {
  const { id, ep } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [show, setShow] = useState(null);
  const epNumber = parseInt(ep, 10);

  useEffect(() => {
    api.get(`/shows/${id}`).then((res) => setShow(res.data));
  }, [id]);

  if (!show)
    return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">Se încarcă...</div>;

  const episode = show.episodes?.find((e) => e.number === epNumber);
  const locked = !user?.plus && epNumber > 2;

  const next = show.episodes?.find((e) => e.number === epNumber + 1);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex items-center gap-4 px-4 md:px-12 h-16 border-b border-white/10">
        <button data-testid="watch-back" onClick={() => navigate(`/show/${id}`)} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200">
          <ArrowLeft className="h-5 w-5" /> Înapoi
        </button>
        <p className="font-semibold truncate">{show.title} — Ep. {epNumber}</p>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {locked ? (
          <div className="aspect-video rounded-xl bg-[#141414] flex flex-col items-center justify-center text-center px-6 border border-[#ffcc00]/30">
            <Crown className="h-12 w-12 text-[#ffcc00] mb-4" />
            <h2 className="font-display text-3xl mb-2">Episod exclusiv Cartoonix PLUS</h2>
            <p className="text-white/60 mb-6 max-w-md">Abonează-te la Cartoonix PLUS pentru acces la toate episoadele.</p>
            <button data-testid="watch-upsell" onClick={() => navigate("/plus")} className="px-7 py-3 rounded-full bg-[#ffcc00] text-black font-bold hover:brightness-110 transition-all duration-200">
              Vezi Cartoonix PLUS
            </button>
          </div>
        ) : (
          <video
            data-testid="video-player"
            key={episode?.video_url}
            src={episode?.video_url}
            controls
            autoPlay
            className="w-full aspect-video rounded-xl bg-black shadow-[0_0_60px_rgba(236,28,36,0.15)]"
          />
        )}

        <div className="flex items-center justify-between mt-6">
          <div>
            <h1 className="font-display text-3xl">{episode?.title}</h1>
            <p className="text-white/50 text-sm">{show.channel} · {episode?.duration}</p>
          </div>
          {next && (
            <button data-testid="watch-next" onClick={() => navigate(`/watch/${id}/${next.number}`)} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 font-semibold transition-colors duration-200">
              Următorul <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Watch;
