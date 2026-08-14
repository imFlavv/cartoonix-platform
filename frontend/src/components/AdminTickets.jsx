import { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";
import { Send, RefreshCw } from "lucide-react";

const STATUS_META = {
  open: { label: "DESCHISĂ", cls: "bg-blue-500/15 text-blue-300 border-blue-400/40" },
  in_progress: { label: "ÎN LUCRU", cls: "bg-orange-500/15 text-orange-300 border-orange-400/40" },
  resolved: { label: "REZOLVATĂ", cls: "bg-green-500/15 text-green-300 border-green-400/40" },
};

const FILTERS = [
  { key: "", label: "Toate" },
  { key: "open", label: "Deschise" },
  { key: "in_progress", label: "În lucru" },
  { key: "resolved", label: "Rezolvate" },
];

export const AdminTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const load = async (f = filter) => {
    try {
      const { data } = await api.get(`/admin/tickets${f ? `?status=${f}` : ""}`);
      setTickets(data);
      if (selected) {
        const updated = data.find((t) => t.id === selected.id);
        setSelected(updated || null);
      }
    } catch {
      /* ignore */
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [filter]);
  useEffect(() => { setPage(1); }, [filter]);

  const totalPages = Math.max(1, Math.ceil(tickets.length / PER_PAGE));
  const pageTickets = tickets.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const reply = async () => {
    if (!replyText.trim() || !selected) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/admin/tickets/${selected.id}/reply`, { text: replyText.trim() });
      setSelected(data);
      setReplyText("");
      await load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Eroare");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status) => {
    if (!selected) return;
    setBusy(true);
    try {
      const { data } = await api.put(`/admin/tickets/${selected.id}/status`, { status });
      setSelected(data);
      toast.success("Status actualizat");
      await load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Eroare");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-4">
      {/* List */}
      <div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              data-testid={`admin-ticket-filter-${f.key || "all"}`}
              onClick={() => setFilter(f.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${filter === f.key ? "bg-[#ec1c24] border-[#ec1c24] text-white" : "border-white/15 text-white/60 hover:bg-white/10"}`}
            >
              {f.label}
            </button>
          ))}
          <button onClick={() => load()} className="ml-auto text-white/50 hover:text-white p-1.5"><RefreshCw className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {tickets.length === 0 && <p className="text-white/40 text-sm py-6 text-center">Nicio solicitare.</p>}
          {pageTickets.map((t) => {
            const m = STATUS_META[t.status] || STATUS_META.open;
            return (
              <button
                key={t.id}
                data-testid="admin-ticket-item"
                onClick={() => setSelected(t)}
                className={`w-full text-left p-3 rounded-xl border transition ${selected?.id === t.id ? "bg-white/10 border-[#ffcc00]/50" : "bg-[#141414] border-white/10 hover:bg-white/5"}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-sm truncate">{t.subject}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${m.cls}`}>{m.label}</span>
                </div>
                <p className="text-xs text-white/50 truncate">{t.user_name || t.user_email}</p>
              </button>
            );
          })}
        </div>
        {tickets.length > PER_PAGE && (
          <div className="flex items-center justify-between mt-3" data-testid="admin-tickets-pagination">
            <button
              data-testid="admin-tickets-prev"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-white/15 text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Înapoi
            </button>
            <span className="text-xs text-white/50">Pagina {page} din {totalPages}</span>
            <button
              data-testid="admin-tickets-next"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-white/15 text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Înainte →
            </button>
          </div>
        )}
      </div>

      {/* Detail */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 min-h-[300px]">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-white/40 text-sm">Selectează o solicitare pentru a răspunde.</div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-lg font-bold">{selected.subject}</h3>
                <p className="text-xs text-white/50">{selected.user_name} · {selected.user_email}</p>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${(STATUS_META[selected.status] || STATUS_META.open).cls}`}>
                {(STATUS_META[selected.status] || STATUS_META.open).label}
              </span>
            </div>
            <p className="text-white/80 whitespace-pre-wrap mb-3">{selected.message}</p>
            {selected.attachment && (
              <img src={selected.attachment} alt="atașament" className="max-h-64 rounded-lg border border-white/10 mb-3" />
            )}

            <div className="space-y-2 border-t border-white/10 pt-3 mb-3 max-h-56 overflow-y-auto">
              {selected.replies?.map((r, i) => (
                <div key={i} className={`flex ${r.from === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${r.from === "admin" ? "bg-[#ec1c24]/15 border border-[#ec1c24]/30" : "bg-white/10"}`}>
                    <p className="text-[10px] font-bold mb-0.5 opacity-70">{r.from === "admin" ? "Echipa Cartoonix" : r.author}</p>
                    <p className="whitespace-pre-wrap">{r.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-3">
              <input
                data-testid="admin-ticket-reply-input"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Răspunde utilizatorului..."
                className="flex-1 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00] text-sm"
              />
              <button data-testid="admin-ticket-reply-send" onClick={reply} disabled={busy} className="px-4 rounded-full bg-[#ffcc00] text-black font-bold flex items-center disabled:opacity-60">
                <Send className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">Status:</span>
              {["open", "in_progress", "resolved"].map((s) => (
                <button
                  key={s}
                  data-testid={`admin-ticket-status-${s}`}
                  onClick={() => setStatus(s)}
                  disabled={busy || selected.status === s}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${selected.status === s ? "bg-white/15 border-white/30 text-white" : "border-white/15 text-white/60 hover:bg-white/10"} disabled:opacity-60`}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
