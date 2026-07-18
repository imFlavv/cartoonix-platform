import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CHANNELS } from "@/data/constants";
import { Trash2, Film } from "lucide-react";
import { toast } from "sonner";

const inputCls = "w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]";

export const AdminShowEditor = ({ show, open, onOpenChange, onSaved }) => {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (show) {
      setForm({
        title: show.title || "",
        description: show.description || "",
        category: show.category || "",
        channel: show.channel || CHANNELS[0],
        year: show.year || "",
        genres: (show.genres || []).join(", "),
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
  const removeEp = (idx) => setForm((f) => ({ ...f, episodes: f.episodes.filter((_, i) => i !== idx) }));

  const save = async () => {
    try {
      await api.put(`/admin/shows/${show.id}`, {
        title: form.title,
        description: form.description,
        category: form.category,
        channel: form.channel,
        year: form.year,
        genres: form.genres.split(",").map((g) => g.trim()).filter(Boolean),
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

          <div>
            <p className="font-display text-xl mt-2 mb-2 flex items-center gap-2"><Film className="h-5 w-5 text-[#ffcc00]" /> Episoade ({form.episodes.length})</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {form.episodes.map((ep, i) => (
                <div key={i} data-testid={`edit-ep-${i}`} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                  <span className="text-xs text-white/40 w-6 text-center">{ep.number}</span>
                  <input value={ep.title} onChange={(e) => setEp(i, "title", e.target.value)} className="flex-1 px-3 py-1.5 rounded bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#ffcc00]" />
                  <input value={ep.video_url} onChange={(e) => setEp(i, "video_url", e.target.value)} placeholder="url .mp4" className="flex-1 px-3 py-1.5 rounded bg-white/5 border border-white/10 text-xs text-white/60 focus:outline-none focus:ring-1 focus:ring-[#ffcc00]" />
                  <button onClick={() => removeEp(i)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#ec1c24]/20 text-white/50 hover:text-[#ec1c24]"><Trash2 className="h-4 w-4" /></button>
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
