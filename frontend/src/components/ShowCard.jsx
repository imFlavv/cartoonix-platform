import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";

export const ShowCard = ({ show }) => {
  const navigate = useNavigate();
  return (
    <div
      data-testid={`show-card-${show.id}`}
      onClick={() => navigate(`/show/${show.id}`)}
      className="group relative shrink-0 w-[150px] md:w-[190px] snap-start cursor-pointer"
    >
      <div className="relative rounded-lg overflow-hidden bg-[#141414] aspect-[2/3] transition-transform duration-300 ease-out group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(236,28,36,0.4)]">
        <img src={show.thumbnail} alt={show.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="flex items-center justify-center h-12 w-12 rounded-full bg-[#ec1c24]">
            <Play className="h-5 w-5 text-white fill-white ml-0.5" />
          </span>
        </div>
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[10px] font-bold uppercase tracking-wide">
          {show.channel}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold text-white/90 truncate group-hover:text-[#ffcc00] transition-colors duration-200">
        {show.title}
      </p>
    </div>
  );
};
