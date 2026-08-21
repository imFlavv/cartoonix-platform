import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { PlusIcon } from "@/components/PlusIcon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Ban, ShieldCheck, Pencil, Trash2, Globe, KeyRound, UserPlus } from "lucide-react";
import { toast } from "sonner";

const inputCls = "w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]";

export const AdminMembers = () => {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, plus: 0, free: 0 });
  const [editing, setEditing] = useState(null);
  const [bannedIps, setBannedIps] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", plus: false });
  const [savingNew, setSavingNew] = useState(false);

  const load = useCallback(() => {
    api.get("/admin/users", { params: { ...(q ? { q } : {}), page, per_page: 20 } })
      .then((res) => {
        const d = res.data;
        setUsers(d.users || []);
        setPages(d.pages || 1);
        setTotal(d.total || 0);
        if (d.stats) setStats(d.stats);
      })
      .catch(() => {});
  }, [q, page]);
  const loadIps = () => api.get("/admin/banned-ips").then((res) => setBannedIps(res.data)).catch(() => {});

  useEffect(() => { setPage(1); }, [q]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadIps(); }, []);

  const patch = async (u, body, msg) => {
    try {
      await api.put(`/admin/users/${u.id}`, body);
      toast.success(msg);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Eroare");
    }
  };

  const banIp = async (ip) => {
    if (!ip) return toast.error("Utilizatorul nu are IP înregistrat");
    await api.post("/admin/ban-ip", { ip });
    toast.success(`IP ${ip} banat`);
    loadIps();
  };

  const unbanIp = async (ip) => {
    await api.delete(`/admin/ban-ip/${encodeURIComponent(ip)}`);
    toast.success("IP deblocat");
    loadIps();
  };

  const removeUser = async (u) => {
    if (!window.confirm(`Ștergi contul ${u.email}?`)) return;
    await api.delete(`/admin/users/${u.id}`);
    toast.success("Cont șters");
    load();
  };

  const createUser = async () => {
    const name = newUser.name.trim();
    const email = newUser.email.trim().toLowerCase();
    if (!name) return toast.error("Introdu un nume");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast.error("Email invalid");
    if (newUser.password.length < 6) return toast.error("Parola trebuie să aibă min. 6 caractere");
    setSavingNew(true);
    try {
      await api.post("/admin/users", { name, email, password: newUser.password, plus: newUser.plus });
      toast.success(`Cont creat pentru ${email}`);
      setCreating(false);
      setNewUser({ name: "", email: "", password: "", plus: false });
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Nu am putut crea contul");
    } finally {
      setSavingNew(false);
    }
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/50 uppercase tracking-wide">Total utilizatori</p>
          <p data-testid="stat-total" className="font-display text-3xl mt-1">{stats.total.toLocaleString("ro-RO")}</p>
        </div>
        <div className="rounded-xl border border-[#ffcc00]/30 bg-[#ffcc00]/10 p-4">
          <p className="text-xs text-[#ffcc00] uppercase tracking-wide flex items-center gap-1"><PlusIcon className="h-3.5 w-3.5" /> PLUS</p>
          <p data-testid="stat-plus" className="font-display text-3xl mt-1 text-[#ffcc00]">{stats.plus.toLocaleString("ro-RO")}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/50 uppercase tracking-wide">FREE</p>
          <p data-testid="stat-free" className="font-display text-3xl mt-1">{stats.free.toLocaleString("ro-RO")}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input data-testid="members-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută după nume sau email..." className={`${inputCls} pl-9`} />
        </div>
        <button
          data-testid="create-user-btn"
          onClick={() => setCreating(true)}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#ffcc00] text-black font-bold hover:brightness-110 transition-all duration-200"
        >
          <UserPlus className="h-4 w-4" /> Creează utilizator
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="text-left px-4 py-3">Utilizator</th>
              <th className="text-left px-4 py-3">Plan</th>
              <th className="text-left px-4 py-3">IP</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} data-testid={`member-${u.id}`} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar || `https://api.dicebear.com/9.x/bottts/svg?seed=${u.email}`} alt="" className="h-8 w-8 rounded-full bg-[#141414]" />
                    <div>
                      <p className="font-semibold">{u.name} {u.role === "admin" && <span className="text-[10px] text-[#ffcc00]">(admin)</span>}</p>
                      <p className="text-xs text-white/50">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button data-testid={`toggle-plus-${u.id}`} onClick={() => patch(u, { plus: !u.plus }, u.plus ? "Trecut pe FREE" : "Trecut pe PLUS")} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${u.plus ? "bg-[#ffcc00]/15 text-[#ffcc00]" : "border border-white/20 text-white/60"}`}>
                    {u.plus ? <><PlusIcon className="h-3.5 w-3.5" /> PLUS</> : "FREE"}
                  </button>
                </td>
                <td className="px-4 py-3 text-white/60 font-mono text-xs">{u.last_ip || "—"}</td>
                <td className="px-4 py-3">
                  {u.banned ? <span className="px-2 py-1 rounded-full bg-[#ec1c24]/15 text-[#ec1c24] text-xs font-bold">BANAT</span> : <span className="px-2 py-1 rounded-full bg-[#22c55e]/15 text-[#22c55e] text-xs font-bold">Activ</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button data-testid={`edit-user-${u.id}`} onClick={() => setEditing({ ...u, newPassword: "" })} title="Editează" className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
                    <button data-testid={`ban-user-${u.id}`} onClick={() => patch(u, { banned: !u.banned }, u.banned ? "Deblocat" : "Cont banat")} title={u.banned ? "Deblochează" : "Banează"} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10">
                      {u.banned ? <ShieldCheck className="h-4 w-4 text-[#22c55e]" /> : <Ban className="h-4 w-4 text-[#ec1c24]" />}
                    </button>
                    <button data-testid={`ban-ip-${u.id}`} onClick={() => banIp(u.last_ip)} title="Banează IP" className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10"><Globe className="h-4 w-4 text-orange-400" /></button>
                    <button data-testid={`delete-user-${u.id}`} onClick={() => removeUser(u)} title="Șterge" className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10"><Trash2 className="h-4 w-4 text-white/60" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <p className="text-white/50">
          {total.toLocaleString("ro-RO")} rezultate · pagina {page} din {pages}
        </p>
        <div className="flex items-center gap-2">
          <button
            data-testid="members-prev"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 font-semibold"
          >
            ← Înapoi
          </button>
          <button
            data-testid="members-next"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 font-semibold"
          >
            Înainte →
          </button>
        </div>
      </div>

      {/* banned IPs */}
      <div className="mt-8">
        <h3 className="font-display text-2xl mb-3">IP-uri banate ({bannedIps.length})</h3>
        {bannedIps.length === 0 ? (
          <p className="text-white/40 text-sm">Niciun IP banat.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {bannedIps.map((b) => (
              <span key={b.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ec1c24]/15 border border-[#ec1c24]/30 text-sm font-mono">
                {b.ip}
                <button data-testid={`unban-ip-${b.ip}`} onClick={() => unbanIp(b.ip)} className="text-white/60 hover:text-white">✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* create dialog */}
      <Dialog open={creating} onOpenChange={(o) => { if (!o) { setCreating(false); setNewUser({ name: "", email: "", password: "", plus: false }); } }}>
        <DialogContent className="bg-[#141414] border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle className="font-display text-2xl flex items-center gap-2"><UserPlus className="h-5 w-5 text-[#ffcc00]" /> Creează utilizator</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/50">Nume</label>
              <input data-testid="create-name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Nume afișat" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-white/50">Email</label>
              <input data-testid="create-email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="email@exemplu.ro" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-white/50 flex items-center gap-1"><KeyRound className="h-3 w-3" /> Parolă (min. 6 caractere)</label>
              <input data-testid="create-password" type="text" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Parolă cont" className={inputCls} />
            </div>
            <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 cursor-pointer">
              <span className="flex items-center gap-2 text-sm font-semibold"><PlusIcon className="h-4 w-4 text-[#ffcc00]" /> Activează PLUS din start</span>
              <input data-testid="create-plus" type="checkbox" checked={newUser.plus} onChange={(e) => setNewUser({ ...newUser, plus: e.target.checked })} className="accent-[#ffcc00] h-4 w-4" />
            </label>
            <p className="text-xs text-white/40">Contul va fi creat verificat (fără email OTP). Utilizatorul se poate loga imediat cu aceste date.</p>
            <button
              data-testid="save-new-user"
              onClick={createUser}
              disabled={savingNew}
              className="w-full py-3 rounded-lg bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-60"
            >
              {savingNew ? "Se creează..." : "Creează cont"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-[#141414] border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle className="font-display text-2xl">Editează utilizator</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50">Nume</label>
                <input data-testid="edit-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-white/50">Email</label>
                <input data-testid="edit-email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-white/50 flex items-center gap-1"><KeyRound className="h-3 w-3" /> Parolă nouă (opțional)</label>
                <input data-testid="edit-password" type="text" value={editing.newPassword} onChange={(e) => setEditing({ ...editing, newPassword: e.target.value })} placeholder="lasă gol ca să nu schimbi" className={inputCls} />
              </div>
              <button
                data-testid="save-user"
                onClick={async () => {
                  try {
                    await api.put(`/admin/users/${editing.id}`, { name: editing.name, email: editing.email });
                    if (editing.newPassword && editing.newPassword.length >= 6) {
                      await api.put(`/admin/users/${editing.id}/password`, { password: editing.newPassword });
                    } else if (editing.newPassword) {
                      toast.error("Parola trebuie să aibă min. 6 caractere");
                      return;
                    }
                    toast.success("Utilizator actualizat");
                    setEditing(null);
                    load();
                  } catch (e) {
                    toast.error(e.response?.data?.detail || "Eroare");
                  }
                }}
                className="w-full py-3 rounded-lg bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200"
              >
                Salvează
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
