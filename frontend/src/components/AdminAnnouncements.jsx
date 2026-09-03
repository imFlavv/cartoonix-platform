import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Megaphone, Save, MonitorPlay, Plus, Trash2, ListChecks } from "lucide-react";
import { catStyle } from "@/data/announcementCategories";

const input = "w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm";

const CATS = [
  { key: "noutate", label: "Noutate" },
  { key: "eveniment", label: "Eveniment" },
  { key: "update", label: "Update" },
  { key: "sistem", label: "Sistem" },
  { key: "concurs", label: "Concurs" },
];

const emptyAnn = { title: "", body: "", category: "noutate", image: "", cta_label: "", cta_link: "" };

export function AdminAnnouncements() {
  const [bar, setBar] = useState({ enabled: false, text: "", link_url: "", bg_color: "#ec1c24", text_color: "#ffffff" });
  const [popup, setPopup] = useState({ enabled: false, title: "", body: "", image_url: "", link_url: "", link_label: "" });
  const [savingBar, setSavingBar] = useState(false);
  const [savingPopup, setSavingPopup] = useState(false);
  const [list, setList] = useState([]);
  const [ann, setAnn] = useState(emptyAnn);
  const [savingAnn, setSavingAnn] = useState(false);

  const loadList = () => api.get("/admin/announcements").then((res) => setList(res.data.items || [])).catch(() => {});

  useEffect(() => {
    api.get("/settings/announcement").then((res) => setBar(res.data)).catch(() => {});
    api.get("/settings/popup").then((res) => setPopup(res.data)).catch(() => {});
    loadList();
  }, []);

  const saveBar = async () => {
    setSavingBar(true);
    try { await api.post("/admin/settings/announcement", bar); toast.success("Bară de anunțuri salvată"); }
    catch (err) { toast.error(err.response?.data?.detail || "Eroare"); }
    finally { setSavingBar(false); }
  };
  const savePopup = async () => {
    setSavingPopup(true);
    try {
      await api.post("/admin/settings/popup", popup);
      toast.success("Popup salvat (se va reafișa tuturor)");
    } catch (err) { toast.error(err.response?.data?.detail || "Eroare"); }
    finally { setSavingPopup(false); }
  };
  const publishAnn = async () => {
    if (!ann.title.trim()) { toast.error("Adaugă un titlu"); return; }
    setSavingAnn(true);
    try {
      await api.post("/admin/announcements", ann);
      toast.success("Anunț publicat");
      setAnn(emptyAnn);
      loadList();
    } catch (err) { toast.error(err.response?.data?.detail || "Eroare"); }
    finally { setSavingAnn(false); }
  };
  const deleteAnn = async (id) => {
    if (!window.confirm("Sigur vrei să ștergi acest anunț? Acțiunea nu poate fi anulată.")) return;
    try { await api.delete(`/admin/announcements/${id}`); toast.success("Anunț șters"); loadList(); }
    catch (err) { toast.error(err.response?.data?.detail || "Eroare"); }
  };

  return (
    <div className="space-y-6">
    <div className="grid lg:grid-cols-2 gap-6 max-w-5xl">
      {/* Announcement bar */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="font-display text-2xl flex items-center gap-2"><Megaphone className="h-5 w-5 text-[#ec1c24]" /> Bară de anunțuri</h2>
        <p className="text-sm text-white/50 -mt-2">Un singur mesaj fix, afișat sub header pe prima pagină.</p>

        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
          <p className="font-semibold">Activă</p>
          <Switch data-testid="bar-enabled" checked={bar.enabled} onCheckedChange={(v) => setBar((b) => ({ ...b, enabled: v }))} />
        </div>

        <div>
          <label className="text-xs text-white/50">Text anunț</label>
          <input data-testid="bar-text" value={bar.text} onChange={(e) => setBar((b) => ({ ...b, text: e.target.value }))} placeholder="Ex: Bine ai venit pe Cartoonix! 🎉" className={input} />
        </div>
        <div>
          <label className="text-xs text-white/50">Link (opțional)</label>
          <input data-testid="bar-link" value={bar.link_url} onChange={(e) => setBar((b) => ({ ...b, link_url: e.target.value }))} placeholder="https://..." className={input} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50">Culoare fundal</label>
            <div className="flex items-center gap-2">
              <input type="color" value={bar.bg_color} onChange={(e) => setBar((b) => ({ ...b, bg_color: e.target.value }))} className="h-10 w-12 rounded bg-transparent border border-white/10" />
              <input value={bar.bg_color} onChange={(e) => setBar((b) => ({ ...b, bg_color: e.target.value }))} className={input} />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50">Culoare text</label>
            <div className="flex items-center gap-2">
              <input type="color" value={bar.text_color} onChange={(e) => setBar((b) => ({ ...b, text_color: e.target.value }))} className="h-10 w-12 rounded bg-transparent border border-white/10" />
              <input value={bar.text_color} onChange={(e) => setBar((b) => ({ ...b, text_color: e.target.value }))} className={input} />
            </div>
          </div>
        </div>

        {/* preview */}
        <div className="rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-semibold" style={{ backgroundColor: bar.bg_color, color: bar.text_color }}>
            <Megaphone className="h-4 w-4" /> {bar.text || "Previzualizare anunț"}
          </div>
        </div>

        <button data-testid="bar-save" onClick={saveBar} disabled={savingBar}
          className="w-full py-2.5 rounded-lg bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition disabled:opacity-60 flex items-center justify-center gap-2">
          <Save className="h-4 w-4" /> {savingBar ? "Se salvează..." : "Salvează bara"}
        </button>
      </div>

      {/* Popup */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="font-display text-2xl flex items-center gap-2"><MonitorPlay className="h-5 w-5 text-[#ffcc00]" /> Popup anunț</h2>
        <p className="text-sm text-white/50 -mt-2">Apare la intrarea pe site. La închidere dispare pe ziua respectivă și reapare a doua zi.</p>

        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
          <p className="font-semibold">Activ</p>
          <Switch data-testid="popup-enabled" checked={popup.enabled} onCheckedChange={(v) => setPopup((p) => ({ ...p, enabled: v }))} />
        </div>

        <div>
          <label className="text-xs text-white/50">Titlu</label>
          <input data-testid="popup-title" value={popup.title} onChange={(e) => setPopup((p) => ({ ...p, title: e.target.value }))} className={input} />
        </div>
        <div>
          <label className="text-xs text-white/50">Text</label>
          <textarea data-testid="popup-body" rows={3} value={popup.body} onChange={(e) => setPopup((p) => ({ ...p, body: e.target.value }))} className={input} />
        </div>
        <div>
          <label className="text-xs text-white/50">URL imagine (opțional)</label>
          <input data-testid="popup-image" value={popup.image_url} onChange={(e) => setPopup((p) => ({ ...p, image_url: e.target.value }))} placeholder="https://..." className={input} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50">Link buton (opțional)</label>
            <input data-testid="popup-link" value={popup.link_url} onChange={(e) => setPopup((p) => ({ ...p, link_url: e.target.value }))} placeholder="https://..." className={input} />
          </div>
          <div>
            <label className="text-xs text-white/50">Etichetă buton</label>
            <input data-testid="popup-link-label" value={popup.link_label} onChange={(e) => setPopup((p) => ({ ...p, link_label: e.target.value }))} placeholder="Vezi detalii" className={input} />
          </div>
        </div>

        <button data-testid="popup-save" onClick={savePopup} disabled={savingPopup}
          className="w-full py-2.5 rounded-lg bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition disabled:opacity-60 flex items-center justify-center gap-2">
          <Save className="h-4 w-4" /> {savingPopup ? "Se salvează..." : "Salvează popup"}
        </button>
      </div>
    </div>

      {/* Published announcements (list on /lobby/announcements) */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 space-y-5 max-w-5xl">
        <h2 className="font-display text-2xl flex items-center gap-2"><ListChecks className="h-5 w-5 text-[#a855f7]" /> Anunțuri publicate</h2>
        <p className="text-sm text-white/50 -mt-3">Anunțurile din pagina <span className="text-white/70">Lobby → Anunțuri importante</span>. Fiecare are o categorie, un titlu și un mesaj.</p>

        <div className="grid md:grid-cols-2 gap-4">
          {/* create form */}
          <div className="space-y-3 rounded-xl bg-white/[0.03] border border-white/10 p-4">
            <p className="font-semibold text-sm flex items-center gap-2"><Plus className="h-4 w-4 text-[#ffcc00]" /> Anunț nou</p>
            <div>
              <label className="text-xs text-white/50">Categorie</label>
              <select data-testid="ann-category" value={ann.category} onChange={(e) => setAnn((a) => ({ ...a, category: e.target.value }))} className={input}>
                {CATS.map((c) => <option key={c.key} value={c.key} className="bg-[#141414]">{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50">Titlu</label>
              <input data-testid="ann-title" value={ann.title} onChange={(e) => setAnn((a) => ({ ...a, title: e.target.value }))} placeholder="Ex: Cartoonix PLUS – beneficii noi!" className={input} />
            </div>
            <div>
              <label className="text-xs text-white/50">Mesaj</label>
              <textarea data-testid="ann-body" rows={4} value={ann.body} onChange={(e) => setAnn((a) => ({ ...a, body: e.target.value }))} placeholder="Textul anunțului. Poți folosi paragrafe separate prin Enter." className={input} />
            </div>
            <div>
              <label className="text-xs text-white/50">URL imagine (opțional)</label>
              <input data-testid="ann-image" value={ann.image} onChange={(e) => setAnn((a) => ({ ...a, image: e.target.value }))} placeholder="https://..." className={input} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50">Etichetă buton</label>
                <input data-testid="ann-cta-label" value={ann.cta_label} onChange={(e) => setAnn((a) => ({ ...a, cta_label: e.target.value }))} placeholder="Abonează-te acum" className={input} />
              </div>
              <div>
                <label className="text-xs text-white/50">Link buton</label>
                <input data-testid="ann-cta-link" value={ann.cta_link} onChange={(e) => setAnn((a) => ({ ...a, cta_link: e.target.value }))} placeholder="/plus" className={input} />
              </div>
            </div>
            <button data-testid="ann-publish" onClick={publishAnn} disabled={savingAnn}
              className="w-full py-2.5 rounded-lg bg-[#a855f7] font-bold hover:bg-[#b366ff] transition disabled:opacity-60 flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> {savingAnn ? "Se publică..." : "Publică anunțul"}
            </button>
          </div>

          {/* existing list */}
          <div className="space-y-2">
            <p className="font-semibold text-sm text-white/70">Publicate ({list.length})</p>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {list.length === 0 && <p className="text-white/40 text-sm">Niciun anunț publicat.</p>}
              {list.map((n) => {
                const oc = catStyle(n);
                return (
                <div key={n.id} data-testid="admin-ann-item" className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ backgroundColor: `${oc.accent}22`, color: oc.accent }}>{oc.label}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{n.title}</p>
                    <p className="text-xs text-white/40 truncate">{n.body}</p>
                  </div>
                  <button data-testid="admin-ann-delete" onClick={() => deleteAnn(n.id)} className="grid place-items-center h-8 w-8 rounded-lg bg-[#ec1c24]/15 text-[#ff6b71] hover:bg-[#ec1c24]/25 transition shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
