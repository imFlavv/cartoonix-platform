import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { CHANNELS } from "@/data/constants";
import { toast } from "sonner";
import { FolderSearch, Plus } from "lucide-react";

const empty = {
  title: "",
  description: "",
  thumbnail: "",
  banner: "",
  category: "",
  channel: CHANNELS[0],
  year: "",
  genres: "",
  vps_path: "",
};

const Admin = () => {
  const [form, setForm] = useState(empty);
  const [shows, setShows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [detected, setDetected] = useState(null);

  const load = () => api.get("/shows").then((res) => setShows(res.data));
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Simulare detectare episoade din folder VPS (conectarea reala la VPS urmeaza)
  const detectEpisodes = () => {
    if (!form.vps_path.trim()) {
      toast.error("Introdu path-ul folderului de pe VPS");
      return;
    }
    const count = 6;
    const eps = Array.from({ length: count }, (_, i) => ({
      number: i + 1,
      title: `Episodul ${i + 1}`,
      video_url: `${form.vps_path.replace(/\/$/, "")}/ep${i + 1}.mp4`,
      duration: "22 min",
    }));
    setDetected(eps);
    toast.success(`${count} episoade .mp4 detectate (demo)`);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        genres: form.genres.split(",").map((g) => g.trim()).filter(Boolean),
        episodes: detected || [],
      };
      await api.post("/admin/shows", payload);
      toast.success("Desen adăugat!");
      setForm(empty);
      setDetected(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Eroare la salvare");
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-24 px-4 md:px-12 pb-16 max-w-5xl mx-auto">
        <h1 className="font-display text-4xl md:text-5xl mb-8">Panou Admin</h1>

        <div className="grid md:grid-cols-2 gap-8">
          <form onSubmit={submit} className="space-y-3 bg-[#141414] border border-white/10 rounded-2xl p-6">
            <h2 className="font-display text-2xl mb-2">Adaugă desen</h2>
            <input data-testid="admin-title" required placeholder="Titlu" value={form.title} onChange={(e) => set("title", e.target.value)} className={input} />
            <textarea data-testid="admin-description" required placeholder="Descriere" value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className={input} />
            <input data-testid="admin-thumbnail" required placeholder="URL thumbnail (poster)" value={form.thumbnail} onChange={(e) => set("thumbnail", e.target.value)} className={input} />
            <input data-testid="admin-banner" placeholder="URL banner (opțional)" value={form.banner} onChange={(e) => set("banner", e.target.value)} className={input} />
            <div className="grid grid-cols-2 gap-3">
              <select data-testid="admin-channel" value={form.channel} onChange={(e) => set("channel", e.target.value)} className={input}>
                {CHANNELS.map((c) => <option key={c} value={c} className="bg-[#141414]">{c}</option>)}
              </select>
              <input data-testid="admin-year" placeholder="An" value={form.year} onChange={(e) => set("year", e.target.value)} className={input} />
            </div>
            <input data-testid="admin-category" required placeholder="Categorie (ex: Acțiune)" value={form.category} onChange={(e) => set("category", e.target.value)} className={input} />
            <input data-testid="admin-genres" placeholder="Genuri (separate prin virgulă)" value={form.genres} onChange={(e) => set("genres", e.target.value)} className={input} />

            <div className="flex gap-2">
              <input data-testid="admin-vps-path" placeholder="Path folder VPS (ex: /var/www/cartoons/tom)" value={form.vps_path} onChange={(e) => set("vps_path", e.target.value)} className={input} />
              <button type="button" data-testid="admin-detect" onClick={detectEpisodes} className="shrink-0 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200 flex items-center gap-1 text-sm font-semibold">
                <FolderSearch className="h-4 w-4" /> Detectează
              </button>
            </div>
            {detected && (
              <p data-testid="admin-detected" className="text-xs text-[#ffcc00]">{detected.length} episoade .mp4 detectate din folder</p>
            )}

            <button data-testid="admin-submit" type="submit" disabled={busy} className="w-full py-3 rounded-lg bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-60 flex items-center justify-center gap-2">
              <Plus className="h-5 w-5" /> {busy ? "Se salvează..." : "Adaugă desen"}
            </button>
          </form>

          <div>
            <h2 className="font-display text-2xl mb-3">Desene existente ({shows.length})</h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {shows.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-[#141414] border border-white/5">
                  <img src={s.thumbnail} alt={s.title} className="h-14 w-10 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{s.title}</p>
                    <p className="text-xs text-white/50">{s.channel} · {s.episodes?.length || 0} ep.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
