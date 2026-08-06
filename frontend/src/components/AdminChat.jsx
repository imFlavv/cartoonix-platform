import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Tv, Save, VolumeX, Ban, Trash2, MessageSquare, ShieldAlert } from "lucide-react";

const input = "w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm";

export function AdminChat() {
  // bot config
  const [bot, setBot] = useState({ enabled: false, interval_minutes: 30, messages: [], room: "global" });
  const [botText, setBotText] = useState("");
  const [savingBot, setSavingBot] = useState(false);
  // moderation
  const [mod, setMod] = useState({ muted: [], banned: [] });
  // recent messages
  const [room, setRoom] = useState("global");
  const [recent, setRecent] = useState([]);

  const loadBot = () => api.get("/admin/chat/bot").then((res) => {
    setBot(res.data);
    setBotText((res.data.messages || []).join("\n"));
  }).catch(() => {});
  const loadMod = () => api.get("/admin/chat/moderation").then((res) => setMod(res.data)).catch(() => {});
  const loadRecent = (r) => api.get("/admin/chat/messages", { params: { room: r } }).then((res) => setRecent(res.data)).catch(() => {});

  useEffect(() => { loadBot(); loadMod(); }, []);
  useEffect(() => { loadRecent(room); }, [room]);

  const saveBot = async () => {
    setSavingBot(true);
    const messages = botText.split("\n").map((s) => s.trim()).filter(Boolean);
    try {
      const { data } = await api.post("/admin/chat/bot", {
        enabled: bot.enabled,
        interval_minutes: Number(bot.interval_minutes) || 30,
        messages,
        room: bot.room,
      });
      setBot(data);
      setBotText((data.messages || []).join("\n"));
      toast.success("Config BOT salvat");
    } catch (err) { toast.error(err.response?.data?.detail || "Eroare la salvare"); }
    finally { setSavingBot(false); }
  };

  const unmute = async (u) => {
    try { await api.post("/admin/chat/unmute", { user_id: u.id }); toast.success(`${u.name} nu mai e mute`); loadMod(); }
    catch (err) { toast.error(err.response?.data?.detail || "Eroare"); }
  };
  const unban = async (u) => {
    try { await api.post("/admin/chat/unban", { user_id: u.id }); toast.success(`${u.name} a fost debanat`); loadMod(); }
    catch (err) { toast.error(err.response?.data?.detail || "Eroare"); }
  };
  const banUser = async (u) => {
    try { await api.post("/admin/chat/ban", { user_id: u.id }); toast.success(`${u.name} a fost banat`); loadMod(); }
    catch (err) { toast.error(err.response?.data?.detail || "Eroare"); }
  };
  const delMsg = async (m) => {
    try { await api.delete(`/admin/chat/message/${m.id}`); loadRecent(room); }
    catch (err) { toast.error(err.response?.data?.detail || "Eroare"); }
  };

  const fmtMuted = (iso) => {
    if (!iso) return "";
    if (iso.startsWith("9999")) return "permanent";
    try { return `până ${new Date(iso).toLocaleString("ro-RO")}`; } catch { return ""; }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* BOT */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="font-display text-2xl flex items-center gap-2"><Tv className="h-5 w-5 text-[#b478ff]" /> CartoonixTV (BOT)</h2>
        <p className="text-sm text-white/50 -mt-2">Mesaje automate afișate în chat la interval, fără nume/avatar (ca o reclamă).</p>

        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
          <div>
            <p className="font-semibold">Bot activ</p>
            <p className={`text-xs ${bot.enabled ? "text-[#22c55e]" : "text-white/50"}`}>{bot.enabled ? "Trimite mesaje automat" : "Oprit"}</p>
          </div>
          <Switch data-testid="bot-enabled" checked={bot.enabled} onCheckedChange={(v) => setBot((b) => ({ ...b, enabled: v }))} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50">Interval (minute)</label>
            <input data-testid="bot-interval" type="number" min={1} value={bot.interval_minutes}
              onChange={(e) => setBot((b) => ({ ...b, interval_minutes: e.target.value }))} className={input} />
          </div>
          <div>
            <label className="text-xs text-white/50">Cameră</label>
            <select data-testid="bot-room" value={bot.room} onChange={(e) => setBot((b) => ({ ...b, room: e.target.value }))} className={input}>
              <option value="global" className="bg-[#141414]">Global</option>
              <option value="plus" className="bg-[#141414]">PLUS</option>
              <option value="both" className="bg-[#141414]">Ambele</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-white/50">Mesaje (unul pe linie — se rotesc în ordine)</label>
          <textarea data-testid="bot-messages" rows={5} value={botText} onChange={(e) => setBotText(e.target.value)}
            placeholder={"Nu rata noile desene adăugate!\nDevino membru PLUS pentru avantaje exclusive 👑"} className={input} />
        </div>

        <button data-testid="bot-save" onClick={saveBot} disabled={savingBot}
          className="w-full py-2.5 rounded-lg bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition disabled:opacity-60 flex items-center justify-center gap-2">
          <Save className="h-4 w-4" /> {savingBot ? "Se salvează..." : "Salvează BOT"}
        </button>
      </div>

      {/* Moderation lists */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 space-y-5">
        <h2 className="font-display text-2xl flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-orange-400" /> Moderare utilizatori</h2>

        <div>
          <p className="text-sm font-semibold text-white/70 mb-2 flex items-center gap-2"><VolumeX className="h-4 w-4 text-orange-400" /> Mute activ ({mod.muted.length})</p>
          {mod.muted.length === 0 ? <p className="text-xs text-white/40">Niciun utilizator redus la tăcere.</p> : (
            <div className="space-y-2">
              {mod.muted.map((u) => (
                <div key={u.id} data-testid={`muted-${u.id}`} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <img src={u.avatar} alt="" className="h-8 w-8 rounded-full bg-[#141414]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{u.name}</p>
                    <p className="text-[11px] text-white/40">{fmtMuted(u.muted_until)}</p>
                  </div>
                  <button onClick={() => unmute(u)} className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20">Unmute</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-white/70 mb-2 flex items-center gap-2"><Ban className="h-4 w-4 text-red-400" /> Banați ({mod.banned.length})</p>
          {mod.banned.length === 0 ? <p className="text-xs text-white/40">Niciun utilizator banat.</p> : (
            <div className="space-y-2">
              {mod.banned.map((u) => (
                <div key={u.id} data-testid={`banned-${u.id}`} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <img src={u.avatar} alt="" className="h-8 w-8 rounded-full bg-[#141414]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{u.name}</p>
                    <p className="text-[11px] text-white/40 truncate">{u.email}</p>
                  </div>
                  <button onClick={() => unban(u)} className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20">Unban</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent messages */}
      <div className="lg:col-span-2 bg-[#0f0f0f] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-display text-2xl flex items-center gap-2"><MessageSquare className="h-5 w-5 text-[#ffcc00]" /> Mesaje recente</h2>
          <div className="flex gap-2">
            {["global", "plus"].map((r) => (
              <button key={r} data-testid={`recent-room-${r}`} onClick={() => setRoom(r)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize ${room === r ? "bg-[#ec1c24] text-white" : "bg-white/10 text-white/60 hover:bg-white/20"}`}>{r}</button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
          {recent.length === 0 && <p className="text-sm text-white/40 py-6 text-center">Niciun mesaj.</p>}
          {recent.map((m) => (
            <div key={m.id} data-testid={`recent-msg-${m.id}`} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/40">{m.is_bot ? "CartoonixTV (BOT)" : m.name}{m.command ? ` · /${m.command}` : ""}</p>
                <p className={`text-sm truncate ${m.deleted ? "italic text-white/30" : "text-white/85"}`}>{m.deleted ? "Acest mesaj a fost șters." : m.text}</p>
              </div>
              {!m.is_bot && m.user_id && (
                <button onClick={() => banUser({ id: m.user_id, name: m.name })} title="Ban utilizator" className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-red-400"><Ban className="h-4 w-4" /></button>
              )}
              {!m.deleted && (
                <button onClick={() => delMsg(m)} title="Șterge mesajul" className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/60"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
