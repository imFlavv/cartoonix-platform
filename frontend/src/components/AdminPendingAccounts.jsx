import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserCheck, Check, X, ShieldQuestion, Crown, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { PlusIcon } from "@/components/PlusIcon";

export const AdminPendingAccounts = () => {
  const [approvalMode, setApprovalMode] = useState(false);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectIds, setRejectIds] = useState([]);

  const load = useCallback((p = page) => {
    setLoading(true);
    api.get("/admin/pending-users", { params: { page: p, per_page: 25 } })
      .then((res) => {
        setUsers(res.data.users || []);
        setTotal(res.data.total || 0);
        setPages(res.data.pages || 1);
        setPage(res.data.page || 1);
        setSelected([]);
      })
      .catch(() => toast.error("Eroare la încărcarea cererilor"))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    api.get("/settings/account-approval").then((res) => setApprovalMode(!!res.data.enabled)).catch(() => {});
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleApproval = async (val) => {
    try {
      await api.post("/admin/account-approval", { enabled: val });
      setApprovalMode(val);
      toast.success(val
        ? "Aprobare conturi ACTIVĂ - conturile noi așteaptă validarea ta"
        : "Aprobare conturi dezactivată - conturile noi devin active automat");
    } catch {
      toast.error("Eroare");
    }
  };

  const allSelected = users.length > 0 && selected.length === users.length;
  const toggleAll = () => setSelected(allSelected ? [] : users.map((u) => u.id));
  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const approve = async (ids) => {
    if (!ids.length) return;
    setBusy(true);
    try {
      const { data } = await api.post("/admin/pending-users/approve", { ids });
      toast.success(`${data.updated} cont(uri) aprobat(e)`);
      load(page);
    } catch {
      toast.error("Eroare la aprobare");
    } finally {
      setBusy(false);
    }
  };

  const openReject = (ids) => {
    if (!ids.length) return;
    setRejectIds(ids);
    setRejectReason("");
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Introdu un motiv pentru respingere");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/admin/pending-users/reject", { ids: rejectIds, reason: rejectReason.trim() });
      toast.success(`${data.updated} cont(uri) respins(e)`);
      setRejectOpen(false);
      load(page);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Eroare la respingere");
    } finally {
      setBusy(false);
    }
  };

  const fmtDate = (iso) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" }); }
    catch { return iso; }
  };

  return (
    <div className="space-y-6">
      {/* Approval mode toggle */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 max-w-2xl">
        <h2 className="font-display text-2xl mb-1 flex items-center gap-2">
          <ShieldQuestion className="h-5 w-5 text-[#ffcc00]" /> Aprobare manuală conturi
        </h2>
        <p className="text-sm text-white/50 mb-5">
          Când e activată, conturile noi NU devin active automat după verificarea pe email.
          Utilizatorul primește un mesaj de așteptare, iar tu aprobi sau respingi cererea de mai jos.
        </p>
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
          <div>
            <p className="font-semibold">Aprobare conturi noi</p>
            <p className={`text-xs ${approvalMode ? "text-[#ec1c24]" : "text-[#22c55e]"}`}>
              {approvalMode ? "ACTIVĂ - conturile noi așteaptă aprobarea ta" : "Inactivă - conturile noi devin active automat"}
            </p>
          </div>
          <Switch data-testid="account-approval-toggle" checked={approvalMode} onCheckedChange={toggleApproval} />
        </div>
      </div>

      {/* Pending requests */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="font-display text-2xl flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-[#ffcc00]" /> Cereri în așteptare
            <span className="text-sm text-white/40 font-sans">({total})</span>
          </h2>
          {selected.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">{selected.length} selectate</span>
              <button
                data-testid="pending-bulk-approve"
                onClick={() => approve(selected)}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-[#22c55e] text-black font-bold text-sm hover:brightness-110 disabled:opacity-60 flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" /> Aprobă
              </button>
              <button
                data-testid="pending-bulk-reject"
                onClick={() => openReject(selected)}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-[#ec1c24] text-white font-bold text-sm hover:bg-[#ff2d36] disabled:opacity-60 flex items-center gap-1.5"
              >
                <X className="h-4 w-4" /> Respinge
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center text-white/40">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div data-testid="pending-empty" className="py-16 text-center text-white/40">
            Nicio cerere în așteptare momentan.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-3 py-2 mb-2 text-xs uppercase tracking-wide text-white/40">
              <input
                type="checkbox"
                data-testid="pending-select-all"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 accent-[#ec1c24]"
              />
              <span className="flex-1">Selectează tot</span>
            </div>
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  data-testid={`pending-row-${u.id}`}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-colors ${
                    selected.includes(u.id) ? "bg-[#ec1c24]/10 border-[#ec1c24]/40" : "bg-white/5 border-transparent hover:bg-white/10"
                  }`}
                >
                  <input
                    type="checkbox"
                    data-testid={`pending-check-${u.id}`}
                    checked={selected.includes(u.id)}
                    onChange={() => toggleOne(u.id)}
                    className="h-4 w-4 accent-[#ec1c24] shrink-0"
                  />
                  <img src={u.avatar || "/avatars/default-user.jpg"} alt="" className="h-10 w-10 rounded-full object-cover bg-white/10 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate flex items-center gap-2">
                      {u.name}
                      {u.plus ? (
                        <span data-testid={`pending-plus-${u.id}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffcc00]/15 text-[#ffcc00] text-[10px] font-bold uppercase">
                          <Crown className="h-3 w-3" /> PLUS
                        </span>
                      ) : (
                        <span data-testid={`pending-free-${u.id}`} className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-[10px] font-bold uppercase">
                          Fără PLUS
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-white/40 truncate">{u.email} · {fmtDate(u.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      data-testid={`pending-approve-${u.id}`}
                      onClick={() => approve([u.id])}
                      disabled={busy}
                      title="Aprobă"
                      className="h-9 w-9 flex items-center justify-center rounded-lg bg-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e]/30 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      data-testid={`pending-reject-${u.id}`}
                      onClick={() => openReject([u.id])}
                      disabled={busy}
                      title="Respinge"
                      className="h-9 w-9 flex items-center justify-center rounded-lg bg-[#ec1c24]/20 text-[#ec1c24] hover:bg-[#ec1c24]/30 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  data-testid="pending-prev"
                  onClick={() => load(page - 1)}
                  disabled={page <= 1 || loading}
                  className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-white/60">Pagina {page} / {pages}</span>
                <button
                  data-testid="pending-next"
                  onClick={() => load(page + 1)}
                  disabled={page >= pages || loading}
                  className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reject reason dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="bg-[#141414] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Respinge {rejectIds.length > 1 ? `${rejectIds.length} conturi` : "contul"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/50 -mt-2 mb-2">
            Motivul va fi afișat utilizatorului la încercarea de conectare.
          </p>
          <textarea
            data-testid="reject-reason-input"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            placeholder="Ex: Datele introduse nu respectă regulamentul comunității."
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ec1c24] resize-none"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setRejectOpen(false)}
              className="px-5 py-2.5 rounded-lg bg-white/10 font-bold hover:bg-white/20"
            >
              Anulează
            </button>
            <button
              data-testid="reject-confirm"
              onClick={confirmReject}
              disabled={busy}
              className="px-5 py-2.5 rounded-lg bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] disabled:opacity-60 flex items-center gap-2"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Respinge
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
