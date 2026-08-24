import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { CHANNELS } from "@/data/constants";
import { toast } from "sonner";
import { FolderSearch, Plus, Film, Lightbulb, Users, Pencil, ChevronUp, ChevronDown, ServerCog, Inbox, ImageOff, MessagesSquare, Megaphone, RotateCcw, Crown, Heart } from "lucide-react";
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
  const [donateEnabled, setDonateEnabled] = useState(true);
  const [promo, setPromo] = useState({ enabled: false, title: "", message: "", price_old: "", price_new: "", cta_label: "", cta_link: "/plus" });
  const [savingPromo, setSavingPromo] = useState(false);
  const [chatWidget, setChatWidget] = useState({ enabled: false, text: "", image_url: "", link: "/lobby/chat" });
  const [savingWidget, setSavingWidget] = useState(false);
  const [plusWidget, setPlusWidget] = useState({ enabled: false, text: "", image_url: "", link: "/plus" });
  const [savingPlusWidget, setSavingPlusWidget] = useState(false);
  const [resettingAvatars, setResettingAvatars] = useState(false);

  const resetAvatars = async () => {
    if (!window.confirm("Sigur vrei să resetezi avatarul TUTUROR utilizatorilor la cel default? Acțiunea este ireversibilă.")) return;
    setResettingAvatars(true);
    try {
      const { data } = await api.post("/admin/reset-avatars");
      toast.success(`${data.updated} avatare resetate la cel default`);
    } catch {
      toast.error("Eroare la resetarea avatarelor");
    } finally {
      setResettingAvatars(false);
    }
  };

  const load = () => api.get("/shows", { params: { full: true } }).then((res) => setShows(res.data));
  const loadSuggestions = () => api.get("/admin/suggestions").then((res) => setSuggestions(res.data)).catch(() => {});
  useEffect(() => {
    load();
    loadSuggestions();
    api.get("/settings/maintenance").then((res) => setMaintenance(res.data.enabled)).catch(() => {});
    api.get("/settings/ui").then((res) => setAvatarFrames(res.data.avatar_frames_enabled !== false)).catch(() => {});
    api.get("/settings/donate").then((res) => setDonateEnabled(res.data.enabled !== false)).catch(() => {});
    api.get("/settings/promo-popup").then((res) => setPromo(res.data)).catch(() => {});
    api.get("/settings/chat-widget").then((res) => setChatWidget(res.data)).catch(() => {});
    api.get("/settings/plus-widget").then((res) => setPlusWidget(res.data)).catch(() => {});
  }, []);

  const savePromo = async (override) => {
    const payload = { ...promo, ...(override || {}) };
    setSavingPromo(true);
    try {
      await api.post("/admin/promo-popup", payload);
      setPromo(payload);
      toast.success("Popup salvat");
    } catch {
      toast.error("Eroare la salvarea popup-ului");
    } finally {
      setSavingPromo(false);
    }
  };
  const setP = (k, v) => setPromo((p) => ({ ...p, [k]: v }));

  const saveWidget = async (override) => {
    const payload = { ...chatWidget, ...(override || {}) };
    setSavingWidget(true);
    try {
      await api.post("/admin/chat-widget", payload);
      setChatWidget(payload);
      toast.success("Caseta chat salvată");
    } catch {
      toast.error("Eroare la salvarea casetei");
    } finally {
      setSavingWidget(false);
    }
  };
  const setW = (k, v) => setChatWidget((w) => ({ ...w, [k]: v }));

  const savePlusWidget = async (override) => {
    const payload = { ...plusWidget, ...(override || {}) };
    setSavingPlusWidget(true);
    try {
      await api.post("/admin/plus-widget", payload);
      setPlusWidget(payload);
      toast.success("Caseta PLUS salvată");
    } catch {
      toast.error("Eroare la salvarea casetei PLUS");
    } finally {
      setSavingPlusWidget(false);
    }
  };
  const setPW = (k, v) => setPlusWidget((w) => ({ ...w, [k]: v }));

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

  const toggleDonate = async (val) => {
    try {
      await api.post("/admin/settings/donate", { enabled: val });
      setDonateEnabled(val);
      window.dispatchEvent(new CustomEvent("cx-donate-settings-changed", { detail: { enabled: val } }));
      toast.success(val ? "Donațiile sunt active" : "Donațiile au fost dezactivate (vizibile doar pentru admini)");
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

  const [detecting, setDetecting] = useState(false);
  const [importAllPath, setImportAllPath] = useState("");
  const [importingAll, setImportingAll] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Import în masă: fiecare subfolder din folderul părinte devine un desen.
  const importAll = async () => {
    if (!importAllPath.trim()) {
      toast.error("Introdu path-ul folderului părinte (ex: /media/videos)");
      return;
    }
    setImportingAll(true);
    setImportResult(null);
    try {
      const { data } = await api.post("/admin/import-all", { folder: importAllPath.trim() });
      setImportResult(data);
      toast.success(`${data.created_count} desene create · ${data.total_episodes} episoade · ${data.skipped_count} sărite`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Eroare la importul în masă");
    } finally {
      setImportingAll(false);
    }
  };


  // Detectare reală a episoadelor .mp4 dintr-un folder de pe VPS (VIDEO_DIR).
  const detectEpisodes = async () => {
    if (!form.vps_path.trim()) {
      toast.error("Introdu path-ul folderului de pe VPS");
      return;
    }
    setDetecting(true);
    try {
      const { data } = await api.post("/admin/import-folder", { folder: form.vps_path.trim() });
      if (!data.episodes?.length) {
        setDetected([]);
        toast.error("Niciun fișier video găsit în folder");
        return;
      }
      setDetected(data.episodes);
      toast.success(`${data.count} episoade detectate din ${data.folder}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Eroare la detectarea episoadelor");
    } finally {
      setDetecting(false);
    }
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
            <div className="bg-[#141414] border border-[#ffcc00]/30 rounded-2xl p-6 mb-8">
              <h2 className="font-display text-2xl mb-1 flex items-center gap-2"><FolderSearch className="h-6 w-6 text-[#ffcc00]" /> Import rapid (Importă tot)</h2>
              <p className="text-sm text-white/50 mb-4">Introdu folderul <b>părinte</b> de pe VPS. Fiecare subfolder devine automat un desen, cu episoadele lui (inclusiv sezoane, dacă are subfoldere). Desenele care există deja (după titlu) sunt sărite.</p>
              <div className="flex gap-2">
                <input
                  data-testid="admin-import-all-path"
                  placeholder="Folder părinte (ex: /media/videos)"
                  value={importAllPath}
                  onChange={(e) => setImportAllPath(e.target.value)}
                  className={input}
                />
                <button
                  type="button"
                  data-testid="admin-import-all-btn"
                  onClick={importAll}
                  disabled={importingAll}
                  className="shrink-0 px-6 rounded-lg bg-[#ffcc00] text-black font-bold hover:bg-[#ffd633] transition-colors duration-200 flex items-center gap-2 disabled:opacity-60"
                >
                  <FolderSearch className="h-5 w-5" /> {importingAll ? "Se importă..." : "Importă tot"}
                </button>
              </div>
              {importResult && (
                <div data-testid="admin-import-all-result" className="mt-4 text-xs space-y-1 max-h-48 overflow-y-auto pr-1">
                  <p className="text-[#22c55e] font-semibold">{importResult.created_count} desene create ({importResult.total_episodes} episoade)</p>
                  {(importResult.created || []).map((c, i) => (
                    <p key={`c-${i}`} className="text-white/70 truncate">
                      ✓ {c.title} — {c.episodes} ep.{c.seasons?.length ? ` · sezoane: ${c.seasons.join(", ")}` : ""}
                    </p>
                  ))}
                  {(importResult.skipped || []).map((s, i) => (
                    <p key={`s-${i}`} className="text-white/40 truncate">• sărit: {s.title || s.folder} ({s.reason})</p>
                  ))}
                </div>
              )}
            </div>

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
                  <input data-testid="admin-vps-path" placeholder="Path folder VPS (ex: /media/videos/ATOM sau ATOM)" value={form.vps_path} onChange={(e) => set("vps_path", e.target.value)} className={input} />
                  <button type="button" data-testid="admin-detect" onClick={detectEpisodes} disabled={detecting} className="shrink-0 px-4 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200 flex items-center gap-1 text-sm font-semibold disabled:opacity-60">
                    <FolderSearch className="h-4 w-4" /> {detecting ? "Se scanează..." : "Detectează"}
                  </button>
                </div>
                {detected && detected.length > 0 && (
                  <div data-testid="admin-detected" className="text-xs text-[#ffcc00] space-y-1 max-h-40 overflow-y-auto pr-1">
                    <p className="font-semibold">{detected.length} episoade detectate din folder:</p>
                    {detected.map((ep, i) => (
                      <p key={i} className="text-white/60 truncate">
                        {ep.season ? <span className="text-[#ffcc00]/70">[{ep.season}] </span> : null}
                        {ep.number}. {ep.title}{ep.duration ? <span className="text-white/40"> · {ep.duration}</span> : null}
                      </p>
                    ))}
                  </div>
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

              <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6">
                <h2 className="font-display text-2xl mb-1 flex items-center gap-2"><Heart className="h-5 w-5 text-[#ec1c24]" /> Donații</h2>
                <p className="text-sm text-white/50 mb-5">Activează/dezactivează pagina și butonul „Donează". Când e dezactivat, dispare din bară pentru utilizatori și rămâne vizibil doar pentru admini.</p>
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                  <div>
                    <p className="font-semibold">Donații active</p>
                    <p className={`text-xs ${donateEnabled ? "text-[#22c55e]" : "text-[#ec1c24]"}`}>{donateEnabled ? "Vizibile - toți utilizatorii văd butonul „Donează”" : "Dezactivate - vizibile doar pentru admini"}</p>
                  </div>
                  <Switch data-testid="donate-toggle" checked={donateEnabled} onCheckedChange={toggleDonate} />
                </div>
              </div>

              <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-display text-2xl flex items-center gap-2"><RotateCcw className="h-5 w-5 text-[#ffcc00]" /> Resetare avatare</h2>
                </div>
                <p className="text-sm text-white/50 mb-5">Resetează avatarul <b>tuturor</b> utilizatorilor la imaginea default (silueta generică). Fiecare utilizator își poate schimba apoi avatarul din nou din profil.</p>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                  <img src="/avatars/default-user.jpg" alt="avatar default" className="h-12 w-12 rounded-full object-cover bg-white/10 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">Avatar global (default)</p>
                    <p className="text-xs text-white/50">Se aplică la toți utilizatorii deodată.</p>
                  </div>
                  <button
                    data-testid="reset-avatars-btn"
                    onClick={resetAvatars}
                    disabled={resettingAvatars}
                    className="shrink-0 px-5 py-2.5 rounded-lg bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-60 flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" /> {resettingAvatars ? "Se resetează..." : "Resetează global"}
                  </button>
                </div>
              </div>

              <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-display text-2xl flex items-center gap-2"><ServerCog className="h-5 w-5 text-[#ffcc00]" /> Popup promoțional</h2>
                  <Switch data-testid="promo-toggle" checked={!!promo.enabled} onCheckedChange={(v) => savePromo({ enabled: v })} />
                </div>
                <p className="text-sm text-white/50 mb-5">Apare pe pagina principală doar utilizatorilor care NU sunt PLUS. Comută switch-ul pentru a-l activa/dezactiva (dezactivat = șters de pe site).</p>
                <div className="space-y-3">
                  <input data-testid="promo-title" value={promo.title || ""} onChange={(e) => setP("title", e.target.value)} placeholder="Titlu" className={input} />
                  <textarea value={promo.message || ""} onChange={(e) => setP("message", e.target.value)} placeholder="Mesaj (ex: abonează-te acum și primești gratuit aplicația TV...)" rows={3} className={`${input} resize-none`} />
                  <div className="grid grid-cols-2 gap-3">
                    <input data-testid="promo-price-old" value={promo.price_old || ""} onChange={(e) => setP("price_old", e.target.value)} placeholder="Preț vechi (ex: 80 RON)" className={input} />
                    <input data-testid="promo-price-new" value={promo.price_new || ""} onChange={(e) => setP("price_new", e.target.value)} placeholder="Preț nou (ex: 50 RON)" className={input} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={promo.cta_label || ""} onChange={(e) => setP("cta_label", e.target.value)} placeholder="Text buton (ex: Vreau PLUS)" className={input} />
                    <input value={promo.cta_link || ""} onChange={(e) => setP("cta_link", e.target.value)} placeholder="Link buton (ex: /plus)" className={input} />
                  </div>
                  <button data-testid="promo-save" onClick={() => savePromo()} disabled={savingPromo} className="w-full py-2.5 rounded-lg bg-[#ffcc00] text-black font-bold hover:brightness-110 disabled:opacity-60">
                    {savingPromo ? "Se salvează..." : "Salvează popup"}
                  </button>
                </div>
              </div>

              <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-display text-2xl flex items-center gap-2"><MessagesSquare className="h-5 w-5 text-[#ffcc00]" /> Caseta chat (colț dreapta-jos)</h2>
                  <Switch data-testid="widget-toggle" checked={!!chatWidget.enabled} onCheckedChange={(v) => saveWidget({ enabled: v })} />
                </div>
                <p className="text-sm text-white/50 mb-5">O casetă mică flotantă în colțul din dreapta-jos care duce la chat. Comută switch-ul pentru a o activa/dezactiva pe tot site-ul.</p>
                <div className="space-y-3">
                  <input data-testid="widget-text" value={chatWidget.text || ""} onChange={(e) => setW("text", e.target.value)} placeholder="Text (ex: Hai la discuție, hai pe chat!)" className={input} />
                  <input data-testid="widget-image" value={chatWidget.image_url || ""} onChange={(e) => setW("image_url", e.target.value)} placeholder="URL imagine fundal (ex: /chat-widget-bg.webp)" className={input} />
                  <input data-testid="widget-link" value={chatWidget.link || ""} onChange={(e) => setW("link", e.target.value)} placeholder="Link la click (ex: /lobby/chat)" className={input} />
                  {chatWidget.image_url && (
                    <div className="rounded-xl overflow-hidden border border-white/10 h-24 w-64 relative" style={{ backgroundImage: `url(${chatWidget.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                      <div className="relative h-full flex items-center px-4">
                        <p className="text-white font-display text-lg leading-tight drop-shadow">{chatWidget.text || "Hai pe chat!"}</p>
                      </div>
                    </div>
                  )}
                  <button data-testid="widget-save" onClick={() => saveWidget()} disabled={savingWidget} className="w-full py-2.5 rounded-lg bg-[#ffcc00] text-black font-bold hover:brightness-110 disabled:opacity-60">
                    {savingWidget ? "Se salvează..." : "Salvează caseta"}
                  </button>
                </div>
              </div>

              <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-display text-2xl flex items-center gap-2"><Crown className="h-5 w-5 text-[#ffcc00]" /> Caseta PLUS (colț dreapta-jos)</h2>
                  <Switch data-testid="pluswidget-toggle" checked={!!plusWidget.enabled} onCheckedChange={(v) => savePlusWidget({ enabled: v })} />
                </div>
                <p className="text-sm text-white/50 mb-5">A doua casetă flotantă, în spatele celei de chat. Cele două se rotesc automat între ele; când închizi una, apare cealaltă.</p>
                <div className="space-y-3">
                  <input data-testid="pluswidget-text" value={plusWidget.text || ""} onChange={(e) => setPW("text", e.target.value)} placeholder="Text (ex: Abonează-te la Cartoonix PLUS!)" className={input} />
                  <input data-testid="pluswidget-image" value={plusWidget.image_url || ""} onChange={(e) => setPW("image_url", e.target.value)} placeholder="URL imagine fundal (ex: /plus-widget-bg.webp)" className={input} />
                  <input data-testid="pluswidget-link" value={plusWidget.link || ""} onChange={(e) => setPW("link", e.target.value)} placeholder="Link la click (ex: /plus)" className={input} />
                  {plusWidget.image_url && (
                    <div className="rounded-xl overflow-hidden border border-white/10 h-24 w-64 relative" style={{ backgroundImage: `url(${plusWidget.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                      <div className="relative h-full flex items-center px-4">
                        <p className="text-white font-display text-lg leading-tight drop-shadow">{plusWidget.text || "Abonează-te la PLUS!"}</p>
                      </div>
                    </div>
                  )}
                  <button data-testid="pluswidget-save" onClick={() => savePlusWidget()} disabled={savingPlusWidget} className="w-full py-2.5 rounded-lg bg-[#ffcc00] text-black font-bold hover:brightness-110 disabled:opacity-60">
                    {savingPlusWidget ? "Se salvează..." : "Salvează caseta PLUS"}
                  </button>
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
