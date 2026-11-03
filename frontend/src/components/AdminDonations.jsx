import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { HandCoins, Download, Search, X, History, Coins, Receipt, Heart } from "lucide-react";
import { NixCoin } from "@/components/NixCoin";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const input = "w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-[#ec1c24] outline-none text-sm";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

const downloadBlob = async (url, filename) => {
  try {
    const res = await api.get(url, { responseType: "blob" });
    const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch {
    toast.error("Nu am putut exporta fișierul");
  }
};

const LedgerRow = ({ e }) => (
  <div data-testid={`ledger-entry-${e.created_at}`} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
    <div className="min-w-0">
      <p className="text-sm font-semibold truncate">{e.description}</p>
      <p className="text-xs text-white/40">{fmtDate(e.created_at)}</p>
    </div>
    <span className={`flex items-center gap-1 font-bold shrink-0 ${e.points >= 0 ? "text-[#22c55e]" : "text-[#ec1c24]"}`}>
      <NixCoin className="h-4 w-4" /> {e.points >= 0 ? "+" : ""}{e.points}
    </span>
  </div>
);

const UserLedgerModal = ({ userId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.get(`/admin/users/${userId}/nix-ledger`)
      .then(({ data }) => setData(data))
      .catch(() => toast.error("Nu am putut încărca istoricul utilizatorului"))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#141414] border border-white/10 text-white max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="user-ledger-modal">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <History className="h-5 w-5 text-[#ffcc00]" /> Istoric NIX — {data?.user?.name || "Se încarcă..."}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-white/40 text-sm py-6 text-center">Se încarcă...</p>
        ) : !data ? (
          <p className="text-white/40 text-sm py-6 text-center">Nu am găsit date.</p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                <p className="text-[11px] text-white/40 uppercase">Email</p>
                <p className="text-sm font-semibold truncate">{data.user.email}</p>
              </div>
              <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                <p className="text-[11px] text-white/40 uppercase">Sold curent</p>
                <p className="text-sm font-bold text-[#c084fc] flex items-center gap-1"><NixCoin className="h-3.5 w-3.5" /> {data.user.points} NIX</p>
              </div>
              <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                <p className="text-[11px] text-white/40 uppercase">Total donat</p>
                <p className="text-sm font-bold text-[#ec1c24]">{data.donations_total_ron} RON</p>
              </div>
              <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                <p className="text-[11px] text-white/40 uppercase">NIX din donații</p>
                <p className="text-sm font-bold text-[#22c55e]">+{data.donations_total_nix}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">Toate tranzacțiile NIX</h3>
              <button
                data-testid="export-user-ledger-btn"
                onClick={() => downloadBlob(`/admin/users/${userId}/nix-ledger/export`, `istoric_nix_${data.user.name || userId}.csv`)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Exportă CSV
              </button>
            </div>
            {data.ledger.length === 0 ? (
              <p className="text-white/40 text-sm py-6 text-center">Nicio tranzacție NIX încă.</p>
            ) : (
              <div className="space-y-2" data-testid="user-ledger-list">
                {data.ledger.map((e, i) => <LedgerRow key={i} e={e} />)}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const AdminDonations = () => {
  const [donations, setDonations] = useState([]);
  const [totals, setTotals] = useState({ total_ron: 0, total_nix: 0, count: 0 });
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [detailUserId, setDetailUserId] = useState(null);
  const PER_PAGE = 15;

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, per_page: PER_PAGE };
      if (q.trim()) params.q = q.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const { data } = await api.get("/admin/donations", { params });
      setDonations(data.donations || []);
      setTotals(data.totals || { total_ron: 0, total_nix: 0, count: 0 });
      setPages(data.pages || 1);
      setPage(data.page || 1);
    } catch {
      toast.error("Nu am putut încărca donațiile");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, dateFrom, dateTo]);

  useEffect(() => { load(1); }, [q, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearFilters = () => { setQ(""); setDateFrom(""); setDateTo(""); };

  const exportCsv = async () => {
    setExporting(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    await downloadBlob(`/admin/donations/export?${params.toString()}`, `donatii_cartoonix.csv`);
    setExporting(false);
  };

  return (
    <div className="space-y-6" data-testid="admin-donations">
      <div>
        <h2 className="font-display text-2xl mb-1 flex items-center gap-2"><HandCoins className="h-6 w-6 text-[#ec1c24]" /> Loguri donații</h2>
        <p className="text-sm text-white/50">Cine a donat, cât, când a fost creditat în NIX — și pe ce a consumat utilizatorul acei NIX. Util pentru cereri de refund pe tranzacții deja onorate.</p>
      </div>

      {/* Summary cards (reflect current filter) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div data-testid="donations-total-ron" className="rounded-2xl border border-[#ec1c24]/30 bg-gradient-to-br from-[#1a0a0b] to-[#0f0f0f] p-5">
          <div className="flex items-center justify-between mb-1"><p className="text-xs uppercase tracking-wide text-white/50 font-semibold">Total donat (filtrat)</p><Heart className="h-5 w-5 text-[#ec1c24]" /></div>
          <span className="font-display text-4xl text-[#ec1c24]">{totals.total_ron} RON</span>
        </div>
        <div data-testid="donations-total-nix" className="rounded-2xl border border-[#c084fc]/30 bg-gradient-to-br from-[#160a1a] to-[#0f0f0f] p-5">
          <div className="flex items-center justify-between mb-1"><p className="text-xs uppercase tracking-wide text-white/50 font-semibold">NIX creditat (filtrat)</p><Coins className="h-5 w-5 text-[#c084fc]" /></div>
          <span className="font-display text-4xl text-[#c084fc]">{totals.total_nix}</span>
        </div>
        <div data-testid="donations-count" className="rounded-2xl border border-[#ffcc00]/30 bg-gradient-to-br from-[#1a1607] to-[#0f0f0f] p-5">
          <div className="flex items-center justify-between mb-1"><p className="text-xs uppercase tracking-wide text-white/50 font-semibold">Nr. donații</p><Receipt className="h-5 w-5 text-[#ffcc00]" /></div>
          <span className="font-display text-4xl text-[#ffcc00]">{totals.count}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-5">
        <div className="grid sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="text-xs text-white/50 mb-1 block">Caută donator (nume, email, ID tranzacție)</label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input data-testid="donations-search-input" value={q} onChange={(e) => setQ(e.target.value)} className={`${input} pl-9`} placeholder="Ex: ana@exemplu.ro" />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">De la data</label>
            <input data-testid="donations-date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={input} />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Până la data</label>
            <input data-testid="donations-date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={input} />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          {(q || dateFrom || dateTo) && (
            <button data-testid="donations-clear-filters" onClick={clearFilters} className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white">
              <X className="h-3.5 w-3.5" /> Șterge filtrele
            </button>
          )}
          <button
            data-testid="donations-export-btn"
            onClick={exportCsv}
            disabled={exporting}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ec1c24] text-white text-sm font-bold hover:bg-[#ff2d36] transition-colors disabled:opacity-60"
          >
            <Download className="h-4 w-4" /> {exporting ? "Se exportă..." : "Exportă CSV"}
          </button>
        </div>
      </div>

      {/* Donations table */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6">
        {loading ? (
          <p className="text-white/40 text-sm py-6 text-center">Se încarcă...</p>
        ) : donations.length === 0 ? (
          <p className="text-white/40 text-sm py-6 text-center">Nicio donație găsită pentru acest filtru.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="donations-list">
              <thead>
                <tr className="text-left text-white/40 text-xs uppercase border-b border-white/10">
                  <th className="py-2 pr-3">Creditat pe</th>
                  <th className="py-2 pr-3">Donator</th>
                  <th className="py-2 pr-3">Sumă</th>
                  <th className="py-2 pr-3">NIX creditat</th>
                  <th className="py-2 pr-3">ID tranzacție</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.session_id} data-testid={`donation-row-${d.session_id}`} className="border-b border-white/5 align-top">
                    <td className="py-2.5 pr-3 text-white/70 whitespace-nowrap">{fmtDate(d.credited_at)}</td>
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold">{d.user_name}</p>
                      <p className="text-xs text-white/40">{d.user_email}</p>
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-[#ec1c24] whitespace-nowrap">{d.amount} {d.currency}</td>
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-1 font-bold text-[#c084fc]"><NixCoin className="h-4 w-4" /> +{d.points}</span>
                      {d.bonus_percent > 0 && <span className="text-[11px] text-white/30">(bază {d.base_points} + {d.bonus_percent}% bonus)</span>}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-white/40 max-w-[160px] truncate" title={d.session_id}>{d.session_id}</td>
                    <td className="py-2.5 pr-3">
                      {d.user_id && (
                        <button
                          data-testid={`donation-detail-${d.session_id}`}
                          onClick={() => setDetailUserId(d.user_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors whitespace-nowrap"
                        >
                          <History className="h-3.5 w-3.5" /> Istoric NIX
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4" data-testid="donations-pager">
            <button onClick={() => load(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed">Înapoi</button>
            <span className="text-sm text-white/50">Pagina {page} / {pages}</span>
            <button onClick={() => load(Math.min(pages, page + 1))} disabled={page >= pages} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed">Înainte</button>
          </div>
        )}
      </div>

      <UserLedgerModal userId={detailUserId} onClose={() => setDetailUserId(null)} />
    </div>
  );
};
