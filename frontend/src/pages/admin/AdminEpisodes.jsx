import React, { useEffect, useMemo, useState } from "react";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Upload, Link as LinkIcon, FolderInput, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 25;

function EpisodeForm({ episode, cartoons, onSaved, onClose }) {
  const [form, setForm] = useState(episode || {
    cartoon_id: cartoons[0]?.id || "",
    title: "",
    season: 1,
    episode_number: 1,
    description: "",
    duration_seconds: 0,
    video_url: "",
    source_type: "external",
    thumbnail_url: "",
  });
  const [tab, setTab] = useState(form.source_type === "upload" ? "upload" : "url");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const onUploadVideo = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/admin/upload/video", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm({ ...form, video_url: data.url, source_type: "upload" });
      toast.success("Video încărcat");
    } catch (e) {
      toast.error(getErrorMessage(e, "Încărcare eșuată"));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        cartoon_id: form.cartoon_id,
        title: form.title.trim(),
        season: parseInt(form.season, 10) || 1,
        episode_number: parseInt(form.episode_number, 10) || 1,
        description: form.description || "",
        duration_seconds: parseInt(form.duration_seconds, 10) || 0,
        video_url: form.video_url,
        source_type: tab === "upload" ? "upload" : "external",
        thumbnail_url: form.thumbnail_url || "",
      };
      if (episode?.id) await api.patch(`/admin/episodes/${episode.id}`, payload);
      else await api.post("/admin/episodes", payload);
      toast.success(episode ? "Episod actualizat" : "Episod creat");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e, "Salvare eșuată"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Desen</Label>
        <Select value={form.cartoon_id} onValueChange={(v) => setForm({ ...form, cartoon_id: v })}>
          <SelectTrigger className="h-11 rounded-xl" data-testid="episode-form-cartoon"><SelectValue placeholder="Alege desenul" /></SelectTrigger>
          <SelectContent>
            {cartoons.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Label>Titlu</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="episode-form-title" className="h-11 rounded-xl" />
        </div>
        <div>
          <Label>Durată (sec)</Label>
          <Input value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} data-testid="episode-form-duration" className="h-11 rounded-xl" />
        </div>
        <div>
          <Label>Sezon</Label>
          <Input value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} data-testid="episode-form-season" className="h-11 rounded-xl" />
        </div>
        <div>
          <Label>Episod #</Label>
          <Input value={form.episode_number} onChange={(e) => setForm({ ...form, episode_number: e.target.value })} data-testid="episode-form-number" className="h-11 rounded-xl" />
        </div>
      </div>
      <div>
        <Label>Descriere</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="episode-form-description" className="min-h-[80px] rounded-xl" />
      </div>
      <div>
        <Label>Sursă video</Label>
        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList>
            <TabsTrigger value="url"><LinkIcon className="h-3.5 w-3.5 mr-1" /> Lipește URL</TabsTrigger>
            <TabsTrigger value="upload"><Upload className="h-3.5 w-3.5 mr-1" /> Încarcă fișier</TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="mt-2">
            <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="/media/videos/dexter/s01e01.mp4 sau https://...mp4" data-testid="episode-form-video-url" className="h-11 rounded-xl" />
            <p className="text-xs text-muted-foreground mt-2">
              Pune calea directă din librăria video de pe server, ex: <span className="text-foreground">/media/videos/dexter/s01e01.mp4</span>. Acceptă și URL-uri externe (http/https). Format recomandat: <span className="text-foreground">.mp4 (H.264)</span> — .mkv/.avi pot să nu ruleze în toate browserele.
            </p>
          </TabsContent>
          <TabsContent value="upload" className="mt-2">
            <Input type="file" accept="video/*" onChange={(e) => e.target.files?.[0] && onUploadVideo(e.target.files[0])} disabled={uploading} data-testid="episode-form-video-upload" className="h-11 rounded-xl" />
            {form.video_url && <p className="text-xs text-muted-foreground mt-2">Încărcat: {form.video_url}</p>}
          </TabsContent>
        </Tabs>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Anulează</Button>
        <Button onClick={save} disabled={saving || !form.title.trim() || !form.video_url || !form.cartoon_id} data-testid="episode-form-save">{saving ? "Se salvează..." : "Salvează"}</Button>
      </DialogFooter>
    </div>
  );
}

function ImportFolderDialog({ cartoons, onDone }) {
  const [open, setOpen] = useState(false);
  const [cartoonId, setCartoonId] = useState(cartoons[0]?.id || "");
  const [folder, setFolder] = useState("/app/backend/uploads/videos");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/admin/import-folder", { folder, cartoon_id: cartoonId });
      toast.success(`${data.imported} ${data.imported === 1 ? "episod importat" : "episoade importate"}`);
      onDone();
      setOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e, "Import eșuat"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="rounded-xl h-11" data-testid="admin-import-folder-button"><FolderInput className="h-4 w-4 mr-1" /> Importă folder</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Importă episoade dintr-un folder de pe server</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Desen țintă</Label>
            <Select value={cartoonId} onValueChange={setCartoonId}>
              <SelectTrigger className="h-11 rounded-xl" data-testid="import-folder-cartoon"><SelectValue placeholder="Alege desenul" /></SelectTrigger>
              <SelectContent>{cartoons.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cale folder (în /media/videos sau în uploads)</Label>
            <Input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="/media/videos/Vaca Si Puiul/" data-testid="import-folder-path" className="h-11 rounded-xl" />
            <p className="text-xs text-muted-foreground mt-1">Toate fișierele video din folder (.mp4, .webm, .mkv, .mov, .avi, .wmv...) vor fi adăugate ca episoade.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Anulează</Button>
          <Button onClick={run} disabled={busy || !cartoonId} data-testid="import-folder-run">{busy ? "Se importă..." : "Importă"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminEpisodes() {
  const [episodes, setEpisodes] = useState([]);
  const [cartoons, setCartoons] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [filterCartoon, setFilterCartoon] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    const [{ data: cs }] = await Promise.all([api.get("/cartoons")]);
    setCartoons(cs);
    // Get all episodes by fetching detail for each cartoon
    const eps = [];
    for (const c of cs) {
      const { data } = await api.get(`/cartoons/${c.id}`);
      for (const ep of data.episodes || []) eps.push({ ...ep, cartoon_title: c.title });
    }
    setEpisodes(eps);
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (id) => {
    if (!window.confirm("Șterge acest episod?")) return;
    try {
      await api.delete(`/admin/episodes/${id}`);
      toast.success("Șters");
      load();
    } catch (e) {
      toast.error("Ștergere eșuată");
    }
  };

  const filtered = useMemo(
    () =>
      episodes.filter(
        (e) =>
          !filterCartoon ||
          filterCartoon === "__all__" ||
          e.cartoon_id === filterCartoon
      ),
    [episodes, filterCartoon]
  );

  // Reset to page 1 whenever filter changes or list size shrinks below current page
  useEffect(() => {
    setPage(1);
  }, [filterCartoon]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  const showingFrom = filtered.length === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(filtered.length, startIdx + pageItems.length);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="font-display text-3xl tracking-wider">Episoade</h1>
          <p className="text-sm text-muted-foreground">Adaugă și administrează episoade prin upload sau URL.</p>
        </div>
        <Select value={filterCartoon} onValueChange={setFilterCartoon}>
          <SelectTrigger className="sm:w-56 h-11 rounded-xl" data-testid="episodes-filter-cartoon"><SelectValue placeholder="Toate desenele" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toate desenele</SelectItem>
            {cartoons.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <ImportFolderDialog cartoons={cartoons} onDone={load} />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)} className="rounded-xl h-11" disabled={!cartoons.length} data-testid="admin-episodes-create-button"><Plus className="h-4 w-4 mr-1" /> Episod nou</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editează episodul" : "Episod nou"}</DialogTitle></DialogHeader>
            <EpisodeForm episode={editing} cartoons={cartoons} onSaved={load} onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr>
              <th className="text-left p-3">Episod</th>
              <th className="text-left p-3 hidden sm:table-cell">Desen</th>
              <th className="text-left p-3 hidden md:table-cell">Sursă</th>
              <th className="text-right p-3">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="p-3">
                  <div>
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs text-muted-foreground">S{e.season} · E{e.episode_number}</div>
                  </div>
                </td>
                <td className="p-3 hidden sm:table-cell">{e.cartoon_title}</td>
                <td className="p-3 hidden md:table-cell"><span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-secondary">{e.source_type === "upload" ? <><Upload className="h-3 w-3" /> upload</> : <><LinkIcon className="h-3 w-3" /> URL</>}</span></td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(e); setOpen(true); }} data-testid={`admin-episode-edit-${e.id}`}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(e.id)} data-testid={`admin-episode-delete-${e.id}`} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">Niciun episod încă.</td></tr>}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div
          className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          data-testid="admin-episodes-pagination"
        >
          <div className="text-xs text-muted-foreground" data-testid="admin-episodes-pagination-info">
            Se afișează <span className="text-foreground font-medium">{showingFrom}</span>
            {showingFrom !== showingTo && (
              <>
                {" – "}
                <span className="text-foreground font-medium">{showingTo}</span>
              </>
            )}
            {" din "}
            <span className="text-foreground font-medium">{filtered.length}</span>
            {" episoade"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg h-9"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              data-testid="admin-episodes-prev-page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <span
              className="text-xs text-muted-foreground tabular-nums px-1"
              data-testid="admin-episodes-page-indicator"
            >
              Pagina <span className="text-foreground font-medium">{safePage}</span> / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg h-9"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              data-testid="admin-episodes-next-page"
            >
              Următor <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
