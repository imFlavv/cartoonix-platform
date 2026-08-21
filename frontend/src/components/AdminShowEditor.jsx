import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CHANNELS } from "@/data/constants";
import { Trash2, Film, GripVertical, FolderSearch, Download } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const inputCls = "w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]";

export const AdminShowEditor = ({ show, open, onOpenChange, onSaved }) => {
  const [form, setForm] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [reimporting, setReimporting] = useState(false);

  useEffect(() => {
    if (show) {
      setForm({
        title: show.title || "",
        description: show.description || "",
        category: show.category || "",
        channel: show.channel || CHANNELS[0],
        year: show.year || "",
        genres: (show.genres || []).join(", "),
        thumbnail: show.thumbnail || "",
        vps_path: show.vps_path || "",
        download_disabled: !!show.download_disabled,
        episodes: (show.episodes || []).map((e) => ({ ...e })),
      });
    }
  }, [show]);

  if (!form) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setEp = (idx, k, v) => {
    setForm((f) => {
      const eps = [...f.episodes];
      eps[idx] = { ...eps[idx], [k]: v };
      return { ...f, episodes: eps };
    });
  };
  const removeEp = (idx) =>
    setForm((f) => ({
      ...f,
      episodes: f.episodes
        .filter((_, i) => i !== idx)
        .map((e, i) => ({ ...e, number: i + 1 })),
    }));

  // Renumber episodes 1..N based on their current array position.
  const renumber = (eps) => eps.map((e, i) => ({ ...e, number: i + 1 }));

  // Move episode from `from` index to `to` index, then renumber automatically.
  const moveEp = (from, to) => {
    if (from === null || to === null || from === to) return;
    setForm((f) => {
      const eps = [...f.episodes];
      const [moved] = eps.splice(from, 1);
      eps.splice(to, 0, moved);
      return { ...f, episodes: renumber(eps) };
    });
  };

  const onDragStart = (e, idx) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(idx));
    } catch (_) {
      /* no-op */
    }
  };
  const onDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (idx !== overIndex) setOverIndex(idx);
  };
  const onDrop = (e, idx) => {
    e.preventDefault();
    moveEp(dragIndex, idx);
    setDragIndex(null);
    setOverIndex(null);
  };
  const onDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const reimport = async () => {
    const folder = (form.vps_path || "").trim();
    if (!folder) {
      toast.error("Introdu path-ul folderului de pe VPS");
      return;
    }
    setReimporting(true);
    try {
      const { data } = await api.post("/admin/import-folder", { folder });
      if (!data.episodes?.length) {
        toast.error("Niciun fișier video găsit în folder");
        return;
      }
      setForm((f) => ({ ...f, episodes: data.episodes }));
      toast.success(`${data.count} episoade reîncărcate. Nu uita să salvezi.`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Eroare la reimport");
    } finally {
      setReimporting(false);
    }
  };

  const save = async () => {
    try {
      await api.put(`/admin/shows/${show.id}`, {
        title: form.title,
        description: form.description,
        category: form.category,
        channel: form.channel,
        year: form.year,
        genres: form.genres.split(",").map((g) => g.trim()).filter(Boolean),
        thumbnail: form.thumbnail,
        vps_path: form.vps_path,
        download_disabled: form.download_disabled,
        episodes: form.episodes,
      });
      toast.success("Desen actualizat");
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Eroare la salvare");
    }
  };

  const del = async () => {
    if (!window.confirm(`Ștergi desenul „${show.title}”?`)) return;
    await api.delete(`/admin/shows/${show.id}`);
    toast.success("Desen șters");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#141414] border-white/10 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display text-2xl">Editează desen</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50">Titlu afișat în platformă</label>
            <input data-testid="edit-show-title" value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
          </div>
          <textarea data-testid="edit-show-desc" value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className={inputCls} />
          <div className="grid grid-cols-3 gap-3">
            <select value={form.channel} onChange={(e) => set("channel", e.target.value)} className={inputCls}>
              {CHANNELS.map((c) => <option key={c} value={c} className="bg-[#141414]">{c}</option>)}
            </select>
            <input placeholder="Categorie" value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls} />
            <input placeholder="An" value={form.year} onChange={(e) => set("year", e.target.value)} className={inputCls} />
          </div>
          <input placeholder="Genuri (virgulă)" value={form.genres} onChange={(e) => set("genres", e.target.value)} className={inputCls} />

          {/* Download toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-start gap-2">
              <Download className="h-4 w-4 text-[#ffcc00] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Dezactivează descărcarea</p>
                <p className="text-xs text-white/50">Când e activ, butonul „Descarcă" e ascuns pentru acest desen (util pentru conținut cu drepturi restricționate).</p>
              </div>
            </div>
            <Switch data-testid="edit-show-download-disabled" checked={!!form.download_disabled} onCheckedChange={(v) => set("download_disabled", v)} />
          </div>

          {/* Poster / imagine desen */}
          <div className="flex gap-3 items-start">
            <div className="shrink-0">
              {form.thumbnail ? (
                <img src={form.thumbnail} alt="poster" className="h-24 w-16 object-cover rounded-lg border border-white/10" onError={(e) => { e.currentTarget.style.opacity = 0.2; }} />
              ) : (
                <div className="h-24 w-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/30 text-center px-1">fără poster</div>
              )}
            </div>
            <div className="flex-1">
              <label className="text-xs text-white/50 mb-1 block">Poster (URL imagine) — apare pe pagina principală și în zona de desene</label>
              <input placeholder="https://... sau /api/uploads/..." value={form.thumbnail} onChange={(e) => set("thumbnail", e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="flex gap-2">
            <input placeholder="Path folder VPS (ex: /media/videos/ATOM sau ATOM)" value={form.vps_path} onChange={(e) => set("vps_path", e.target.value)} className={inputCls} />
            <button type="button" onClick={reimport} disabled={reimporting} className="shrink-0 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200 flex items-center gap-1 text-sm font-semibold disabled:opacity-60">
              <FolderSearch className="h-4 w-4" /> {reimporting ? "Se scanează..." : "Reimportă"}
            </button>
          </div>

          <div>
            <p className="font-display text-xl mt-2 mb-1 flex items-center gap-2"><Film className="h-5 w-5 text-[#ffcc00]" /> Episoade ({form.episodes.length})</p>
            <p className="text-[11px] text-white/40 mb-2 flex items-center gap-1"><GripVertical className="h-3.5 w-3.5" /> Trage de mâner pentru a reordona. Episoadele se renumerotează automat 1, 2, 3…</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {form.episodes.map((ep, i) => (
                <div
                  key={i}
                  data-testid={`edit-ep-${i}`}
                  onDragOver={(e) => onDragOver(e, i)}
                  onDrop={(e) => onDrop(e, i)}
                  className={`flex items-center gap-2 bg-white/5 rounded-lg p-2 transition-all duration-150 ${dragIndex === i ? "opacity-40" : ""} ${overIndex === i && dragIndex !== i ? "ring-2 ring-[#ffcc00] bg-[#ffcc00]/10" : ""}`}
                >
                  <span
                    draggable
                    onDragStart={(e) => onDragStart(e, i)}
                    onDragEnd={onDragEnd}
                    className="cursor-grab active:cursor-grabbing text-white/30 hover:text-[#ffcc00] shrink-0"
                    title="Trage pentru a reordona"
                    data-testid={`ep-drag-${i}`}
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <span className="text-xs text-white/40 w-6 text-center shrink-0">{ep.number}</span>
                  {ep.season ? (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-[#ffcc00]/15 text-[#ffcc00] max-w-[90px] truncate" title={ep.season}>{ep.season}</span>
                  ) : null}
                  <input value={ep.title} onChange={(e) => setEp(i, "title", e.target.value)} className="flex-1 px-3 py-1.5 rounded bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#ffcc00]" />
                  <input value={ep.video_url} onChange={(e) => setEp(i, "video_url", e.target.value)} placeholder="url .mp4" className="flex-1 px-3 py-1.5 rounded bg-white/5 border border-white/10 text-xs text-white/60 focus:outline-none focus:ring-1 focus:ring-[#ffcc00]" />
                  {ep.duration ? <span className="shrink-0 text-[10px] text-white/40 w-10 text-right">{ep.duration}</span> : null}
                  <button onClick={() => removeEp(i)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#ec1c24]/20 text-white/50 hover:text-[#ec1c24] shrink-0"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              {form.episodes.length === 0 && <p className="text-white/40 text-sm">Niciun episod. Importă un folder VPS din formularul de adăugare.</p>}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button data-testid="save-show" onClick={save} className="flex-1 py-3 rounded-lg bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200">Salvează</button>
            <button data-testid="delete-show" onClick={del} className="px-4 py-3 rounded-lg bg-white/10 hover:bg-[#ec1c24]/30 font-bold transition-colors duration-200"><Trash2 className="h-5 w-5" /></button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
