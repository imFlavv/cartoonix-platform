import { useEffect, useState } from "react";
import { Monitor, Save, Bell } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Switch } from "@/components/ui/switch";

const input = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ec1c24]";

export const AdminDesktopApp = () => {
  const [form, setForm] = useState({ version: "", size: "", url: "" });
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/settings/desktop-app").then((res) => setForm({ version: res.data.version, size: res.data.size, url: res.data.url })).catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.post("/admin/settings/desktop-app", { ...form, notify });
      toast.success(res.data.notified ? "Salvat. Toți utilizatorii au primit notificarea." : "Aplicația desktop a fost actualizată");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6" data-testid="admin-desktop-app-card">
      <h2 className="font-display text-2xl mb-1 flex items-center gap-2"><Monitor className="h-5 w-5 text-[#ec1c24]" /> Aplicație Desktop</h2>
      <p className="text-sm text-white/50 mb-5">Versiunea și link-ul de descărcare afișate în profil, tab-ul „Aplicație Desktop”.</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-white/60">Versiune
          <input data-testid="desktop-app-version-input" value={form.version} onChange={(e) => set("version", e.target.value)} placeholder="ex: 0.5.0" className={`${input} mt-1`} />
        </label>
        <label className="text-xs text-white/60">Mărime fișier
          <input data-testid="desktop-app-size-input" value={form.size} onChange={(e) => set("size", e.target.value)} placeholder="ex: 99 MB" className={`${input} mt-1`} />
        </label>
      </div>
      <label className="text-xs text-white/60 block mt-3">Link descărcare (.exe)
        <input data-testid="desktop-app-url-input" value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://..." className={`${input} mt-1`} />
      </label>
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 mt-4">
        <div className="flex items-center gap-3">
          <Bell className="h-4 w-4 text-[#ffcc00]" />
          <div>
            <p className="font-semibold text-sm">Notifică toți utilizatorii</p>
            <p className="text-xs text-white/50">Trimite un anunț „Versiune nouă disponibilă” la salvare</p>
          </div>
        </div>
        <Switch data-testid="desktop-app-notify-toggle" checked={notify} onCheckedChange={setNotify} />
      </div>
      <button data-testid="desktop-app-save-btn" onClick={save} disabled={saving}
        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ec1c24] hover:bg-[#ff2d35] disabled:opacity-50 text-sm font-semibold transition-colors duration-200">
        <Save className="h-4 w-4" /> {saving ? "Se salvează..." : "Salvează"}
      </button>
    </div>
  );
};
