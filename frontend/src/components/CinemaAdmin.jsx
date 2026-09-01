import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Film, Lightbulb, LightbulbOff, Play, DoorOpen, Square, Lock, Trash2, Plus, X, Save } from "lucide-react";

const input = "w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-[#ec1c24] outline-none text-sm";

const STATUS_LABELS = { closed: "Închisă", open: "Intrare deschisă", live: "În transmisie", ended: "Încheiată" };
const STATUS_COLORS = {
  closed: "bg-white/10 text-white/60",
  open: "bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40",
  live: "bg-[#ec1c24] text-white",
  ended: "bg-[#ffcc00]/20 text-[#ffcc00] border border-[#ffcc00]/40",
};

const HallControl = ({ hall, reload }) => {
  const [movieUrl, setMovieUrl] = useState(hall.movie_url || "");
  const [movieTitle, setMovieTitle] = useState(hall.movie_title || "");
  const [ads, setAds] = useState(hall.ads || []);
  const [rows, setRows] = useState(hall.rows);
  const [cols, setCols] = useState(hall.cols);
  const [plusRows, setPlusRows] = useState(hall.plus_rows);

  useEffect(() => {
    setMovieUrl(hall.movie_url || ""); setMovieTitle(hall.movie_title || "");
    setAds(hall.ads || []); setRows(hall.rows); setCols(hall.cols); setPlusRows(hall.plus_rows);
  }, [hall.hall]); // eslint-disable-line

  const patch = async (body, okMsg) => {
    try {
      await api.post(`/admin/cinema/${hall.hall}`, body);
      if (okMsg) toast.success(okMsg);
      reload();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Eroare");
    }
  };

  const clearSeats = async () => {
    if (!window.confirm("Golești toate locurile din această sală?")) return;
    try { const { data } = await api.post(`/admin/cinema/${hall.hall}/clear-seats`); toast.success(`${data.removed} locuri eliberate`); reload(); }
    catch { toast.error("Eroare"); }
  };

  return (
    <div className="bg-[#141414] border border-white/10 rounded-2xl p-6" data-testid={`admin-cinema-hall-${hall.hall}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-2xl flex items-center gap-2"><Film className="h-6 w-6 text-[#ffcc00]" /> {hall.name}</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/50">{hall.occupied} locuri ocupate</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${STATUS_COLORS[hall.status]}`}>{STATUS_LABELS[hall.status]}</span>
        </div>
      </div>

      {/* status controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <button data-testid={`cinema-set-open-${hall.hall}`} onClick={() => patch({ status: "open" }, "Intrarea a fost deschisă")} className="py-2.5 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/40 text-[#22c55e] text-sm font-bold hover:bg-[#22c55e]/25 flex items-center justify-center gap-1.5"><DoorOpen className="h-4 w-4" /> Deschide intrarea</button>
        <button data-testid={`cinema-set-live-${hall.hall}`} onClick={() => patch({ status: "live" }, "Filmul a pornit — sala este blocată")} className="py-2.5 rounded-lg bg-[#ec1c24] text-white text-sm font-bold hover:bg-[#ff2d36] flex items-center justify-center gap-1.5"><Play className="h-4 w-4" /> Pornește filmul</button>
        <button data-testid={`cinema-set-ended-${hall.hall}`} onClick={() => patch({ status: "ended" }, "Transmisia s-a încheiat")} className="py-2.5 rounded-lg bg-[#ffcc00]/15 border border-[#ffcc00]/40 text-[#ffcc00] text-sm font-bold hover:bg-[#ffcc00]/25 flex items-center justify-center gap-1.5"><Square className="h-4 w-4" /> Încheie</button>
        <button data-testid={`cinema-set-closed-${hall.hall}`} onClick={() => patch({ status: "closed" }, "Sala a fost închisă")} className="py-2.5 rounded-lg bg-white/10 text-white/70 text-sm font-bold hover:bg-white/20 flex items-center justify-center gap-1.5"><Lock className="h-4 w-4" /> Închide sala</button>
      </div>

      {/* lights */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 mb-4">
        <span className="text-sm text-white/70">Lumini: <b className={hall.lights === "off" ? "text-white/40" : "text-[#ffcc00]"}>{hall.lights === "off" ? "Stinse" : "Aprinse"}</b></span>
        <button
          data-testid={`cinema-lights-${hall.hall}`}
          onClick={() => patch({ lights: hall.lights === "off" ? "on" : "off" })}
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${hall.lights === "off" ? "bg-[#ffcc00] text-black hover:brightness-110" : "bg-white/10 text-white hover:bg-white/20"}`}
        >
          {hall.lights === "off" ? <><Lightbulb className="h-4 w-4" /> Aprinde luminile</> : <><LightbulbOff className="h-4 w-4" /> Stinge luminile</>}
        </button>
      </div>

      {/* movie */}
      <div className="space-y-2 mb-4">
        <label className="text-xs text-white/50">Film principal</label>
        <input data-testid={`cinema-movie-title-${hall.hall}`} value={movieTitle} onChange={(e) => setMovieTitle(e.target.value)} placeholder="Titlu film (ex: Tom și Jerry — Maraton)" className={input} />
        <input data-testid={`cinema-movie-url-${hall.hall}`} value={movieUrl} onChange={(e) => setMovieUrl(e.target.value)} placeholder="Link video film (mp4 sau /media/videos/...)" className={input} />
        <button data-testid={`cinema-save-movie-${hall.hall}`} onClick={() => patch({ movie_url: movieUrl, movie_title: movieTitle }, "Film salvat")} className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold flex items-center justify-center gap-2"><Save className="h-4 w-4" /> Salvează filmul</button>
      </div>

      {/* ads */}
      <div className="space-y-2 mb-4">
        <label className="text-xs text-white/50">Reclame pre-show (rulează în buclă cât timp intrarea e deschisă)</label>
        {ads.map((a, i) => (
          <div key={i} className="flex gap-2" data-testid={`cinema-ad-${hall.hall}-${i}`}>
            <input value={a.title} onChange={(e) => setAds((p) => p.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="Titlu" className={`${input} w-32`} />
            <input value={a.url} onChange={(e) => setAds((p) => p.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} placeholder="Link video reclamă" className={input} />
            <button onClick={() => setAds((p) => p.filter((_, j) => j !== i))} className="px-2 rounded-lg bg-white/5 hover:bg-[#ec1c24]/20 text-white/50 hover:text-[#ec1c24]"><X className="h-4 w-4" /></button>
          </div>
        ))}
        <div className="flex gap-2">
          <button data-testid={`cinema-add-ad-${hall.hall}`} onClick={() => setAds((p) => [...p, { title: "", url: "" }])} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-bold flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Adaugă reclamă</button>
          <button data-testid={`cinema-save-ads-${hall.hall}`} onClick={() => patch({ ads }, "Reclame salvate")} className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold flex items-center justify-center gap-2"><Save className="h-4 w-4" /> Salvează reclamele</button>
        </div>
      </div>

      {/* layout + clear */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div><label className="text-xs text-white/50">Rânduri</label><input data-testid={`cinema-rows-${hall.hall}`} type="number" min="1" max="26" value={rows} onChange={(e) => setRows(+e.target.value)} className={input} /></div>
        <div><label className="text-xs text-white/50">Locuri/rând</label><input data-testid={`cinema-cols-${hall.hall}`} type="number" min="1" max="30" value={cols} onChange={(e) => setCols(+e.target.value)} className={input} /></div>
        <div><label className="text-xs text-white/50">Rânduri PLUS</label><input data-testid={`cinema-plusrows-${hall.hall}`} type="number" min="0" max="26" value={plusRows} onChange={(e) => setPlusRows(+e.target.value)} className={input} /></div>
      </div>
      <div className="flex gap-2">
        <button data-testid={`cinema-save-layout-${hall.hall}`} onClick={() => patch({ rows, cols, plus_rows: plusRows }, "Layout salvat")} className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold flex items-center justify-center gap-2"><Save className="h-4 w-4" /> Salvează layout</button>
        <button data-testid={`cinema-clear-seats-${hall.hall}`} onClick={clearSeats} className="flex-1 py-2 rounded-lg bg-[#ec1c24]/15 border border-[#ec1c24]/40 text-[#ec1c24] hover:bg-[#ec1c24]/25 text-sm font-bold flex items-center justify-center gap-2"><Trash2 className="h-4 w-4" /> Golește locurile</button>
      </div>
    </div>
  );
};

export const CinemaAdmin = () => {
  const [halls, setHalls] = useState([]);
  const reload = useCallback(async () => {
    try { const { data } = await api.get("/admin/cinema"); setHalls(data || []); } catch { /* ignore */ }
  }, []);
  useEffect(() => { reload(); const t = setInterval(reload, 5000); return () => clearInterval(t); }, [reload]);

  return (
    <div className="space-y-6" data-testid="admin-cinema">
      <p className="text-sm text-white/50">Controlează sălile de cinema: deschide intrarea, pornește filmul (blochează sala), stinge/aprinde luminile (se actualizează live la toți utilizatorii) și setează filmul + reclamele pre-show.</p>
      <div className="grid xl:grid-cols-2 gap-5">
        {halls.map((h) => <HallControl key={h.hall} hall={h} reload={reload} />)}
      </div>
    </div>
  );
};
