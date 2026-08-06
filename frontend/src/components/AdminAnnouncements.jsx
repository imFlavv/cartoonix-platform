import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Megaphone, Save, MonitorPlay } from "lucide-react";

const input = "w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm";

export function AdminAnnouncements() {
  const [bar, setBar] = useState({ enabled: false, text: "", link_url: "", bg_color: "#ec1c24", text_color: "#ffffff" });
  const [popup, setPopup] = useState({ enabled: false, title: "", body: "", image_url: "", link_url: "", link_label: "" });
  const [savingBar, setSavingBar] = useState(false);
  const [savingPopup, setSavingPopup] = useState(false);

  useEffect(() => {
    api.get("/settings/announcement").then((res) => setBar(res.data)).catch(() => {});
    api.get("/settings/popup").then((res) => setPopup(res.data)).catch(() => {});
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

  return (
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
  );
}
