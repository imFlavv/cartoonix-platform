import React, { useEffect, useState } from "react";
import { api, mediaUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Upload, Link as LinkIcon, FolderInput } from "lucide-react";
import { toast } from "sonner";

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
      toast.success("Video uploaded");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Upload failed");
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
      toast.success(episode ? "Episode updated" : "Episode created");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Cartoon</Label>
        <Select value={form.cartoon_id} onValueChange={(v) => setForm({ ...form, cartoon_id: v })}>
          <SelectTrigger className="h-11 rounded-xl" data-testid="episode-form-cartoon"><SelectValue placeholder="Pick cartoon" /></SelectTrigger>
          <SelectContent>
            {cartoons.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="episode-form-title" className="h-11 rounded-xl" />
        </div>
        <div>
          <Label>Duration (sec)</Label>
          <Input value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} data-testid="episode-form-duration" className="h-11 rounded-xl" />
        </div>
        <div>
          <Label>Season</Label>
          <Input value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} data-testid="episode-form-season" className="h-11 rounded-xl" />
        </div>
        <div>
          <Label>Episode #</Label>
          <Input value={form.episode_number} onChange={(e) => setForm({ ...form, episode_number: e.target.value })} data-testid="episode-form-number" className="h-11 rounded-xl" />
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="episode-form-description" className="min-h-[80px] rounded-xl" />
      </div>
      <div>
        <Label>Video source</Label>
        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList>
            <TabsTrigger value="url"><LinkIcon className="h-3.5 w-3.5 mr-1" /> Paste URL</TabsTrigger>
            <TabsTrigger value="upload"><Upload className="h-3.5 w-3.5 mr-1" /> Upload file</TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="mt-2">
            <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://...mp4 or HLS .m3u8" data-testid="episode-form-video-url" className="h-11 rounded-xl" />
          </TabsContent>
          <TabsContent value="upload" className="mt-2">
            <Input type="file" accept="video/*" onChange={(e) => e.target.files?.[0] && onUploadVideo(e.target.files[0])} disabled={uploading} data-testid="episode-form-video-upload" className="h-11 rounded-xl" />
            {form.video_url && <p className="text-xs text-muted-foreground mt-2">Uploaded: {form.video_url}</p>}
          </TabsContent>
        </Tabs>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={saving || !form.title.trim() || !form.video_url || !form.cartoon_id} data-testid="episode-form-save">{saving ? "Saving..." : "Save"}</Button>
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
      toast.success(`Imported ${data.imported} episode${data.imported === 1 ? "" : "s"}`);
      onDone();
      setOpen(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Import failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="rounded-xl h-11" data-testid="admin-import-folder-button"><FolderInput className="h-4 w-4 mr-1" /> Import folder</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Import episodes from server folder</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Target cartoon</Label>
            <Select value={cartoonId} onValueChange={setCartoonId}>
              <SelectTrigger className="h-11 rounded-xl" data-testid="import-folder-cartoon"><SelectValue placeholder="Pick cartoon" /></SelectTrigger>
              <SelectContent>{cartoons.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Folder path (must be under /app/backend/uploads)</Label>
            <Input value={folder} onChange={(e) => setFolder(e.target.value)} data-testid="import-folder-path" className="h-11 rounded-xl" />
            <p className="text-xs text-muted-foreground mt-1">All .mp4/.webm files in the folder will be added as episodes.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={run} disabled={busy || !cartoonId} data-testid="import-folder-run">{busy ? "Importing..." : "Import"}</Button>
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
    if (!window.confirm("Delete this episode?")) return;
    try {
      await api.delete(`/admin/episodes/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const filtered = episodes.filter((e) => !filterCartoon || filterCartoon === "__all__" || e.cartoon_id === filterCartoon);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="font-display text-3xl tracking-wider">Episodes</h1>
          <p className="text-sm text-muted-foreground">Add and manage episodes via upload or URL.</p>
        </div>
        <Select value={filterCartoon} onValueChange={setFilterCartoon}>
          <SelectTrigger className="sm:w-56 h-11 rounded-xl" data-testid="episodes-filter-cartoon"><SelectValue placeholder="All cartoons" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All cartoons</SelectItem>
            {cartoons.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <ImportFolderDialog cartoons={cartoons} onDone={load} />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)} className="rounded-xl h-11" disabled={!cartoons.length} data-testid="admin-episodes-create-button"><Plus className="h-4 w-4 mr-1" /> New episode</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit episode" : "New episode"}</DialogTitle></DialogHeader>
            <EpisodeForm episode={editing} cartoons={cartoons} onSaved={load} onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr>
              <th className="text-left p-3">Episode</th>
              <th className="text-left p-3 hidden sm:table-cell">Cartoon</th>
              <th className="text-left p-3 hidden md:table-cell">Source</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
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
            {filtered.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No episodes yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
