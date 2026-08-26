import { useEffect, useState, useCallback } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { Gift, Ticket, Crown, Coins, Copy, Check, Power, ClipboardList } from "lucide-react";

const input = "w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-[#ec1c24] outline-none text-sm";

const StatusPill = ({ status }) => {
  const map = {
    processing: { t: "În procesare", c: "bg-[#ffcc00]/15 text-[#ffcc00] border-[#ffcc00]/40" },
    fulfilled: { t: "Onorat", c: "bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/40" },
    canceled: { t: "Anulat", c: "bg-white/5 text-white/40 border-white/10" },
  };
  const s = map[status] || map.processing;
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${s.c}`}>{s.t}</span>;
};

const CopyCode = ({ code }) => {
  const [c, setC] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard?.writeText(code).then(() => { setC(true); setTimeout(() => setC(false), 1500); })}
      className="inline-flex items-center gap-1.5 font-mono tracking-widest text-[#ffcc00] hover:text-white transition-colors"
      title="Copiază codul"
    >
      {code} {c ? <Check className="h-3.5 w-3.5 text-[#22c55e]" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

export const AdminRewards = () => {
  const [form, setForm] = useState({ type: "plus", points: 100, scope: "universal", target_email: "", max_uses: "", note: "" });
  const [creating, setCreating] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [lastCreated, setLastCreated] = useState(null);

  const load = useCallback(async () => {
    try {
      const [v, c] = await Promise.all([api.get("/admin/vouchers"), api.get("/admin/reward-claims")]);
      setVouchers(v.data || []);
      setClaims(c.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const create = async () => {
    setCreating(true);
    try {
      const payload = {
        type: form.type,
        points: form.type === "points" ? parseInt(form.points || 0, 10) : 0,
        scope: form.scope,
        target_email: form.scope === "specific" ? form.target_email.trim() : null,
        max_uses: form.scope === "universal" && form.max_uses !== "" ? parseInt(form.max_uses, 10) : null,
        note: form.note,
      };
      const { data } = await api.post("/admin/vouchers", payload);
      setLastCreated(data.voucher);
      toast.success(`Voucher creat: ${data.voucher.code}`);
      setForm((f) => ({ ...f, target_email: "", max_uses: "", note: "" }));
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Eroare la creare");
    } finally {
      setCreating(false);
    }
  };

  const toggleVoucher = async (code) => {
    try {
      await api.post(`/admin/vouchers/${code}/toggle`);
      load();
    } catch { toast.error("Eroare"); }
  };

  const setClaimStatus = async (id, status) => {
    try {
      await api.post(`/admin/reward-claims/${id}/status`, { status });
      toast.success(status === "fulfilled" ? "Marcat ca onorat" : status === "canceled" ? "Anulat" : "Actualizat");
      load();
    } catch { toast.error("Eroare"); }
  };

  return (
    <div className="space-y-8" data-testid="admin-rewards">
      {/* Create voucher */}
      <div className="bg-[#141414] border border-[#ec1c24]/30 rounded-2xl p-6">
        <h2 className="font-display text-2xl mb-1 flex items-center gap-2"><Gift className="h-6 w-6 text-[#ec1c24]" /> Creează voucher</h2>
        <p className="text-sm text-white/50 mb-5">Generează un cod de forma <code className="text-white/70">XXX-XXX-XXX</code> care oferă acces PLUS sau puncte. Poate fi universal (mai mulți utilizatori) sau specific unui utilizator.</p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Tip recompensă</label>
              <div className="grid grid-cols-2 gap-2">
                <button data-testid="voucher-type-plus" onClick={() => set("type", "plus")} className={`py-2.5 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 ${form.type === "plus" ? "bg-[#ffcc00] text-black border-[#ffcc00]" : "bg-white/5 border-white/10 text-white/70"}`}>
                  <Crown className="h-4 w-4" /> Acces PLUS
                </button>
                <button data-testid="voucher-type-points" onClick={() => set("type", "points")} className={`py-2.5 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 ${form.type === "points" ? "bg-[#ec4899] text-white border-[#ec4899]" : "bg-white/5 border-white/10 text-white/70"}`}>
                  <Coins className="h-4 w-4" /> Puncte
                </button>
              </div>
            </div>
            {form.type === "points" && (
              <div>
                <label className="text-xs text-white/50 mb-1 block">Câte puncte oferă</label>
                <input data-testid="voucher-points" type="number" min="1" value={form.points} onChange={(e) => set("points", e.target.value)} className={input} placeholder="Ex: 100" />
              </div>
            )}
            <div>
              <label className="text-xs text-white/50 mb-1 block">Notă (opțional)</label>
              <input data-testid="voucher-note" value={form.note} onChange={(e) => set("note", e.target.value)} className={input} placeholder="Ex: campanie Crăciun" />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Cine poate folosi</label>
              <div className="grid grid-cols-2 gap-2">
                <button data-testid="voucher-scope-universal" onClick={() => set("scope", "universal")} className={`py-2.5 rounded-lg border text-sm font-bold ${form.scope === "universal" ? "bg-[#ec1c24] text-white border-[#ec1c24]" : "bg-white/5 border-white/10 text-white/70"}`}>Universal</button>
                <button data-testid="voucher-scope-specific" onClick={() => set("scope", "specific")} className={`py-2.5 rounded-lg border text-sm font-bold ${form.scope === "specific" ? "bg-[#ec1c24] text-white border-[#ec1c24]" : "bg-white/5 border-white/10 text-white/70"}`}>Utilizator anume</button>
              </div>
            </div>
            {form.scope === "specific" ? (
              <div>
                <label className="text-xs text-white/50 mb-1 block">Email utilizator</label>
                <input data-testid="voucher-target-email" type="email" value={form.target_email} onChange={(e) => set("target_email", e.target.value)} className={input} placeholder="email@exemplu.ro" />
                <p className="text-[11px] text-white/30 mt-1">Codul poate fi folosit o singură dată, doar de acest utilizator.</p>
              </div>
            ) : (
              <div>
                <label className="text-xs text-white/50 mb-1 block">Limită totală de utilizări (gol = nelimitat)</label>
                <input data-testid="voucher-max-uses" type="number" min="1" value={form.max_uses} onChange={(e) => set("max_uses", e.target.value)} className={input} placeholder="Ex: 100" />
                <p className="text-[11px] text-white/30 mt-1">Fiecare utilizator îl poate folosi o singură dată, până la limita totală.</p>
              </div>
            )}
          </div>
        </div>
        <button data-testid="voucher-create-btn" onClick={create} disabled={creating} className="mt-5 w-full py-3 rounded-lg bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-60">
          {creating ? "Se creează..." : "Generează cod voucher"}
        </button>
        {lastCreated && (
          <div data-testid="voucher-created" className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-black/40 border border-[#ffcc00]/40 px-4 py-3">
            <div>
              <p className="text-xs text-white/50">Cod generat ({lastCreated.type === "plus" ? "Acces PLUS pe viață" : `${lastCreated.points} puncte`}):</p>
              <CopyCode code={lastCreated.code} />
            </div>
          </div>
        )}
      </div>

      {/* Claims log (manual fulfillment) */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6">
        <h2 className="font-display text-2xl mb-1 flex items-center gap-2"><ClipboardList className="h-6 w-6 text-[#a855f7]" /> Cereri de recompense</h2>
        <p className="text-sm text-white/50 mb-4">Recompense revendicate de utilizatori cu puncte. Onorează manual biletele cinema / voucherele eMAG.</p>
        {claims.length === 0 ? (
          <p className="text-white/40 text-sm py-6 text-center">Nicio cerere încă.</p>
        ) : (
          <div className="space-y-2" data-testid="admin-claims-list">
            {claims.map((c) => (
              <div key={c.id} data-testid={`admin-claim-${c.id}`} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="h-9 w-9 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                  {c.kind === "plus_invite" ? <Crown className="h-4 w-4 text-[#ffcc00]" /> : <Ticket className="h-4 w-4 text-[#ec4899]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{c.product_title} <span className="text-[#ec1c24]">- {c.cost}p</span></p>
                  <p className="text-xs text-white/40 truncate">{c.user_name || c.user_email} · {new Date(c.created_at).toLocaleString("ro-RO")}</p>
                  {c.voucher_code && <p className="text-xs text-[#ffcc00] font-mono tracking-widest">{c.voucher_code}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusPill status={c.status} />
                  {c.status === "processing" && (
                    <>
                      <button data-testid={`claim-fulfill-${c.id}`} onClick={() => setClaimStatus(c.id, "fulfilled")} className="px-3 py-1.5 rounded-lg bg-[#22c55e] text-black text-xs font-bold hover:brightness-110">Onorează</button>
                      <button data-testid={`claim-cancel-${c.id}`} onClick={() => setClaimStatus(c.id, "canceled")} className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-xs font-bold hover:bg-white/20">Anulează</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Vouchers log */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6">
        <h2 className="font-display text-2xl mb-1 flex items-center gap-2"><Gift className="h-6 w-6 text-[#ec1c24]" /> Istoric vouchere</h2>
        <p className="text-sm text-white/50 mb-4">Toate codurile generate și câte utilizări au avut.</p>
        {vouchers.length === 0 ? (
          <p className="text-white/40 text-sm py-6 text-center">Niciun voucher creat încă.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="admin-vouchers-list">
              <thead>
                <tr className="text-left text-white/40 text-xs uppercase border-b border-white/10">
                  <th className="py-2 pr-3">Cod</th>
                  <th className="py-2 pr-3">Recompensă</th>
                  <th className="py-2 pr-3">Scop</th>
                  <th className="py-2 pr-3">Utilizări</th>
                  <th className="py-2 pr-3">Stare</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <tr key={v.code} data-testid={`admin-voucher-${v.code}`} className="border-b border-white/5">
                    <td className="py-2.5 pr-3"><CopyCode code={v.code} /></td>
                    <td className="py-2.5 pr-3">{v.type === "plus" ? <span className="text-[#ffcc00] font-semibold">PLUS pe viață</span> : <span className="text-[#ec4899] font-semibold">{v.points} puncte</span>}</td>
                    <td className="py-2.5 pr-3 text-white/60">{v.scope === "specific" ? `Specific: ${v.target_email || "—"}` : `Universal${v.max_uses ? ` (max ${v.max_uses})` : ""}`}</td>
                    <td className="py-2.5 pr-3 text-white/60">{v.used_count || 0}{v.scope === "specific" ? "/1" : v.max_uses ? `/${v.max_uses}` : ""}</td>
                    <td className="py-2.5 pr-3">{v.active ? <span className="text-[#22c55e]">Activ</span> : <span className="text-white/40">Inactiv</span>}</td>
                    <td className="py-2.5 pr-3">
                      <button data-testid={`voucher-toggle-${v.code}`} onClick={() => toggleVoucher(v.code)} className="inline-flex items-center gap-1 text-white/50 hover:text-white text-xs" title={v.active ? "Dezactivează" : "Activează"}>
                        <Power className="h-4 w-4" /> {v.active ? "Dezactivează" : "Activează"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
