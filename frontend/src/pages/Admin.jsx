import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { CHANNELS } from "@/data/constants";
import { toast } from "sonner";
import { FolderSearch, Plus, Film, Lightbulb, Users, Pencil, ChevronUp, ChevronDown, ServerCog, Inbox, ImageOff, MessagesSquare, Megaphone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { AdminMembers } from "@/components/AdminMembers";
import { AdminTickets } from "@/components/AdminTickets";
import { AdminChat } from "@/components/AdminChat";
import { AdminAnnouncements } from "@/components/AdminAnnouncements";
import { AdminShowEditor } from "@/components/AdminShowEditor";

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
  const [suggestions, setSuggestions] = useState([]);
  const [editingShow, setEditingShow] = useState(null);
  const [maintenance, setMaintenance] = useState(false);
  const [avatarFrames, setAvatarFrames] = useState(true);

  const load = () => api.get("/shows").then((res) => setShows(res.data));
  const loadSuggestions = () => api.get("/admin/suggestions").then((res) => setSuggestions(res.data)).catch(() => {});
  useEffect(() => {
    load();
    loadSuggestions();
    api.get("/settings/maintenance").then((res) => setMaintenance(res.data.enabled)).catch(() => {});
    api.get("/settings/ui").then((res) => setAvatarFrames(res.data.avatar_frames_enabled !== false)).catch(() => {});
  }, []);

  const toggleMaintenance = async (val) => {
    try {
      await api.post("/admin/maintenance", { enabled: val });
      setMaintenance(val);
      toast.success(val ? "Mentenanță ACTIVATĂ - platforma e blocată pentru utilizatori" : "Mentenanță dezactivată");
    } catch {
      toast.error("Eroare");
    }
  };

  const toggleAvatarFrames = async (val) => {
    try {
      await api.post("/admin/settings/ui", { avatar_frames_enabled: val });
      setAvatarFrames(val);
      // Broadcast to App.js so it updates the <body> class instantly
      window.dispatchEvent(new CustomEvent("cx-ui-settings-changed", { detail: { avatar_frames_enabled: val } }));
      toast.success(val ? "Rame avatar activate" : "Rame avatar dezactivate");
    } catch {
      toast.error("Eroare");
    }
  };

  const move = async (index, dir) => {
    const arr = [...shows];
    const j = index + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[index], arr[j]] = [arr[j], arr[index]];
    setShows(arr);
    try {
      await api.post("/admin/shows/reorder", { ordered_ids: arr.map((s) => s.id) });
      toast.success("Ordine actualizată");
    } catch {
      toast.error("Nu s-a putut reordona");
      load();
    }
  };

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

        <Tabs defaultValue="shows">
          <TabsList className="bg-[#141414] border border-white/10 mb-6">
            <TabsTrigger value="shows" data-testid="admin-tab-shows" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
              <Film className="h-4 w-4 mr-2" /> Desene
            </TabsTrigger>
            <TabsTrigger value="suggestions" data-testid="admin-tab-suggestions" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
              <Lightbulb className="h-4 w-4 mr-2" /> Sugestii{suggestions.length ? ` (${suggestions.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="members" data-testid="admin-tab-members" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
              <Users className="h-4 w-4 mr-2" /> Membri
            </TabsTrigger>
            <TabsTrigger value="tickets" data-testid="admin-tab-tickets" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
              <Inbox className="h-4 w-4 mr-2" /> Solicitări
            </TabsTrigger>
            <TabsTrigger value="chat" data-testid="admin-tab-chat" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
              <MessagesSquare className="h-4 w-4 mr-2" /> Chat
            </TabsTrigger>
            <TabsTrigger value="announcements" data-testid="admin-tab-announcements" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
              <Megaphone className="h-4 w-4 mr-2" /> Anunțuri
            </TabsTrigger>
            <TabsTrigger value="platform" data-testid="admin-tab-platform" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
              <ServerCog className="h-4 w-4 mr-2" /> Platformă
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shows">
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
                <p className="text-xs text-white/40 mb-3">Folosește săgețile pentru a schimba ordinea în platformă. Click pe creion pentru a edita titlul și episoadele.</p>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {shows.map((s, i) => (
                    <div key={s.id} data-testid={`admin-show-${s.id}`} className="flex items-center gap-3 p-2 rounded-lg bg-[#141414] border border-white/5">
                      <div className="flex flex-col">
                        <button data-testid={`move-up-${s.id}`} disabled={i === 0} onClick={() => move(i, -1)} className="text-white/50 hover:text-white disabled:opacity-20"><ChevronUp className="h-4 w-4" /></button>
                        <button data-testid={`move-down-${s.id}`} disabled={i === shows.length - 1} onClick={() => move(i, 1)} className="text-white/50 hover:text-white disabled:opacity-20"><ChevronDown className="h-4 w-4" /></button>
                      </div>
                      <span className="text-xs text-white/30 w-4 text-center">{i + 1}</span>
                      <img src={s.thumbnail} alt={s.title} className="h-14 w-10 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{s.title}</p>
                        <p className="text-xs text-white/50">{s.channel} · {s.episodes?.length || 0} ep.</p>
                      </div>
                      <button data-testid={`edit-show-${s.id}`} onClick={() => setEditingShow(s)} className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/10 shrink-0">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="suggestions">
            <h2 className="font-display text-2xl mb-4">Sugestii de la utilizatori ({suggestions.length})</h2>
            {suggestions.length === 0 ? (
              <div className="text-center py-16 text-white/40">
                <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-50" />
                Nicio sugestie primită încă.
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((s) => (
                  <div key={s.id} data-testid={`suggestion-${s.id}`} className="bg-[#141414] border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{s.name}</p>
                        <p className="text-xs text-white/40">{s.email} · {new Date(s.created_at).toLocaleString("ro-RO")}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#22c55e]/15 text-[#22c55e] text-[10px] font-bold uppercase">{s.status}</span>
                    </div>
                    <p className="text-white/80 text-sm">{s.text}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="members">
            <AdminMembers />
          </TabsContent>

          <TabsContent value="tickets">
            <AdminTickets />
          </TabsContent>

          <TabsContent value="chat">
            <AdminChat />
          </TabsContent>

          <TabsContent value="announcements">
            <AdminAnnouncements />
          </TabsContent>

          <TabsContent value="platform">
            <div className="max-w-xl space-y-6">
              <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6">
                <h2 className="font-display text-2xl mb-1 flex items-center gap-2"><ServerCog className="h-5 w-5 text-[#ffcc00]" /> Mod mentenanță</h2>
                <p className="text-sm text-white/50 mb-5">Când e activat, întreaga platformă este blocată pentru utilizatori. Doar adminii se pot loga și naviga.</p>
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                  <div>
                    <p className="font-semibold">Platformă în mentenanță</p>
                    <p className={`text-xs ${maintenance ? "text-[#ec1c24]" : "text-[#22c55e]"}`}>{maintenance ? "ACTIVĂ - utilizatorii nu au acces" : "Inactivă - platforma funcționează normal"}</p>
                  </div>
                  <Switch data-testid="maintenance-toggle" checked={maintenance} onCheckedChange={toggleMaintenance} />
                </div>
              </div>

              <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6">
                <h2 className="font-display text-2xl mb-1 flex items-center gap-2"><ImageOff className="h-5 w-5 text-[#ffcc00]" /> Rame avatar</h2>
                <p className="text-sm text-white/50 mb-5">Controlează afișarea ramelor decorative de pe avatare (inelul auriu PLUS pe profil, etc.). Dezactivează dacă nu vrei să apară nicăieri în platformă.</p>
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                  <div>
                    <p className="font-semibold">Rame avatar active</p>
                    <p className={`text-xs ${avatarFrames ? "text-[#22c55e]" : "text-white/50"}`}>{avatarFrames ? "Vizibile - ramele decorative apar pe toată platforma" : "Ascunse - avatarele apar fără rame decorative"}</p>
                  </div>
                  <Switch data-testid="avatar-frames-toggle" checked={avatarFrames} onCheckedChange={toggleAvatarFrames} />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AdminShowEditor
        show={editingShow}
        open={!!editingShow}
        onOpenChange={(o) => !o && setEditingShow(null)}
        onSaved={load}
      />
    </div>
  );
};

export default Admin;
