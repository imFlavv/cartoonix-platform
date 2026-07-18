import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { Play, Calendar, Tv, Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const ShowDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [show, setShow] = useState(null);

  useEffect(() => {
    api.get(`/shows/${id}`).then((res) => setShow(res.data));
  }, [id]);

  if (!show)
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <NavBar />
        <div className="pt-24 text-center text-white/40">Se încarcă...</div>
      </div>
    );

  const playEpisode = (epNumber) => {
    if (!user) {
      toast.error("Conectează-te pentru a viziona");
      navigate("/login");
      return;
    }
    navigate(`/watch/${show.id}/${epNumber}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="relative h-[55vh] md:h-[65vh]">
        <img src={show.banner || show.thumbnail} alt={show.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
      </div>

      <div className="relative -mt-32 px-4 md:px-12 pb-16">
        <div className="flex flex-col md:flex-row gap-6">
          <img
            src={show.thumbnail}
            alt={show.title}
            className="w-40 md:w-52 rounded-xl shadow-2xl border border-white/10 shrink-0"
          />
          <div className="flex-1">
            <h1 className="font-display text-4xl md:text-6xl leading-none mb-3">{show.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/60 mb-4">
              <span className="flex items-center gap-1"><Tv className="h-4 w-4" /> {show.channel}</span>
              {show.year && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {show.year}</span>}
              <span>{show.episodes?.length || 0} episoade</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              {(show.genres || []).map((g) => (
                <span key={g} className="px-3 py-1 rounded-full bg-white/10 text-xs font-semibold">{g}</span>
              ))}
            </div>
            <p className="text-white/80 max-w-2xl mb-6">{show.description}</p>
            <button
              data-testid="detail-play-first"
              onClick={() => playEpisode(1)}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition-colors duration-200"
            >
              <Play className="h-5 w-5 fill-white" /> Vizionează Ep. 1
            </button>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="font-display text-3xl mb-4">Episoade</h2>
          <div className="grid gap-3">
            {(show.episodes || []).map((ep) => (
              <div
                key={ep.number}
                data-testid={`episode-${ep.number}`}
                onClick={() => playEpisode(ep.number)}
                className="group flex items-center gap-4 p-3 rounded-xl bg-[#141414] hover:bg-[#2a2a2a] cursor-pointer transition-colors duration-200 border border-white/5"
              >
                <span className="flex items-center justify-center h-11 w-11 rounded-lg bg-black/50 shrink-0 group-hover:bg-[#ec1c24] transition-colors duration-200">
                  <Play className="h-5 w-5 fill-white" />
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{ep.number}. {ep.title}</p>
                  <p className="text-xs text-white/50">{ep.duration}</p>
                </div>
                {!user?.plus && ep.number > 2 && (
                  <Crown className="h-4 w-4 text-[#ffcc00]" title="Cartoonix PLUS" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowDetail;
