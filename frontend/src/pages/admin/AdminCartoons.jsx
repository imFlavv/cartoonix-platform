import React, { useEffect, useState } from "react";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Image as ImageIcon, Upload, Link as LinkIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

function CartoonForm({ cartoon, categories, onSaved, onClose }) {
  const [form, setForm] = useState(cartoon || {
    title: "", description: "", year: "", category_id: categories[0]?.id || "", thumbnail_url: "", genres: [],
  });
  const [thumbTab, setThumbTab] = useState("url");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const onUpload = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/admin/upload/thumbnail", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm({ ...form, thumbnail_url: data.url });
      toast.success("Thumbnail încărcat");
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
        title: form.title.trim(),
        description: form.description || "",
        year: form.year ? parseInt(form.year, 10) : null,
        category_id: form.category_id,
        thumbnail_url: form.thumbnail_url || "",
        genres: Array.isArray(form.genres) ? form.genres : (form.genres || "").split(",").map((g) => g.trim()).filter(Boolean),
      };
      if (cartoon?.id) await api.patch(`/admin/cartoons/${cartoon.id}`, payload);
      else await api.post("/admin/cartoons", payload);
      toast.success(cartoon ? "Desen actualizat" : "Desen creat");
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
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Titlu</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="cartoon-form-title" className="h-11 rounded-xl" />
        </div>
        <div>
          <Label>An</Label>
          <Input value={form.year || ""} onChange={(e) => setForm({ ...form, year: e.target.value })} data-testid="cartoon-form-year" className="h-11 rounded-xl" />
        </div>
      </div>
      <div>
        <Label>Categorie</Label>
        <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
          <SelectTrigger className="h-11 rounded-xl" data-testid="cartoon-form-category"><SelectValue placeholder="Alege canalul" /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Descriere</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="cartoon-form-description" className="min-h-[100px] rounded-xl" />
      </div>
      <div>
        <Label>Genuri (separate prin virgulă)</Label>
        <Input value={Array.isArray(form.genres) ? form.genres.join(", ") : form.genres} onChange={(e) => setForm({ ...form, genres: e.target.value })} data-testid="cartoon-form-genres" className="h-11 rounded-xl" />
      </div>
      <div>
        <Label>Thumbnail</Label>
        <Tabs value={thumbTab} onValueChange={setThumbTab} className="mt-2">
          <TabsList><TabsTrigger value="url"><LinkIcon className="h-3.5 w-3.5 mr-1" /> URL</TabsTrigger><TabsTrigger value="upload"><Upload className="h-3.5 w-3.5 mr-1" /> Încarcă</TabsTrigger></TabsList>
          <TabsContent value="url" className="mt-2">
            <Input value={form.thumbnail_url || ""} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://..." data-testid="cartoon-form-thumb-url" className="h-11 rounded-xl" />
          </TabsContent>
          <TabsContent value="upload" className="mt-2">
            <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} disabled={uploading} data-testid="cartoon-form-thumb-upload" className="h-11 rounded-xl" />
          </TabsContent>
        </Tabs>
        {form.thumbnail_url && (
          <div className="mt-3 rounded-xl overflow-hidden border border-border w-48 aspect-[16/10]">
            <img src={mediaUrl(form.thumbnail_url)} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Anulează</Button>
        <Button onClick={save} disabled={saving || !form.title.trim()} data-testid="cartoon-form-save">{saving ? "Se salvează..." : "Salvează"}</Button>
      </DialogFooter>
    </div>
  );
}

export default function AdminCartoons() {
  const [cartoons, setCartoons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const load = async () => {
    const [{ data: cs }, { data: cats }] = await Promise.all([
      api.get("/cartoons"),
      api.get("/categories"),
    ]);
    setCartoons(cs);
    setCategories(cats);
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (id) => {
    if (!window.confirm("Șterge acest desen și toate episoadele lui?")) return;
    try {
      await api.delete(`/admin/cartoons/${id}`);
      toast.success("Șters");
      load();
    } catch (e) {
      toast.error("Ștergere eșuată");
    }
  };

  const filtered = cartoons.filter((c) => !q || c.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="font-display text-3xl tracking-wider">Desene</h1>
          <p className="text-sm text-muted-foreground">Administrează catalogul tău de seriale.</p>
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută..." className="sm:w-64 h-11 rounded-xl" data-testid="admin-cartoons-search" />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)} className="rounded-xl h-11" data-testid="admin-cartoons-create-button"><Plus className="h-4 w-4 mr-1" /> Desen nou</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editează desenul" : "Desen nou"}</DialogTitle></DialogHeader>
            <CartoonForm cartoon={editing} categories={categories} onSaved={load} onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr>
              <th className="text-left p-3">Desen</th>
              <th className="text-left p-3 hidden sm:table-cell">Canal</th>
              <th className="text-left p-3 hidden md:table-cell">An</th>
              <th className="text-left p-3 hidden md:table-cell">Episoade</th>
              <th className="text-right p-3">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-16 rounded-md bg-secondary overflow-hidden">
                      {c.thumbnail_url ? <img src={mediaUrl(c.thumbnail_url)} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center"><ImageIcon className="h-3.5 w-3.5 text-muted-foreground" /></div>}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.description?.slice(0, 60)}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 hidden sm:table-cell text-muted-foreground">{categories.find((cat) => cat.id === c.category_id)?.name || c.category_id}</td>
                <td className="p-3 hidden md:table-cell">{c.year || "—"}</td>
                <td className="p-3 hidden md:table-cell">{c.episode_count}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setOpen(true); }} data-testid={`admin-cartoon-edit-${c.id}`}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(c.id)} data-testid={`admin-cartoon-delete-${c.id}`} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">Niciun desen. Apasă „Desen nou" pentru a adăuga unul.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
