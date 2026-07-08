import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Tv2,
  Search,
  Loader2,
  CheckCircle2,
  Clock3,
  Trash2,
  RefreshCw,
  Mail,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PAGE_SIZE = 50;

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtMoney(amount, currency) {
  if (amount == null) return "—";
  try {
    const value = Number(amount) / 100;
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: (currency || "RON").toUpperCase(),
      minimumFractionDigits: 2,
    }).format(value);
  } catch (e) {
    return `${amount} ${currency || ""}`;
  }
}

export default function AdminCartoonixTv() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  );

  const fetchList = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data } = await api.get("/admin/cartoonix-tv/registrations", {
        params: {
          q: q || undefined,
          status: statusFilter,
          page,
          page_size: PAGE_SIZE,
        },
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPaidCount(data.paid_count || 0);
      setPendingCount(data.pending_count || 0);
    } catch (err) {
      toast.error("Nu am putut încărca lista", {
        description: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [q, statusFilter, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/cartoonix-tv/registrations/${toDelete.id}`);
      toast.success("Pre-înregistrare ștearsă");
      setToDelete(null);
      fetchList();
    } catch (err) {
      toast.error("Nu am putut șterge înregistrarea", {
        description: getErrorMessage(err),
      });
    } finally {
      setDeleting(false);
    }
  };

  const copyEmail = (email) => {
    try {
      navigator.clipboard.writeText(email);
      toast.success("Email copiat");
    } catch (e) {
      /* ignore */
    }
  };

  const copyAllPaidEmails = () => {
    const emails = items
      .filter((i) => i.payment_verified)
      .map((i) => i.email)
      .join(", ");
    if (!emails) {
      toast.info("Nu există pre-înregistrări plătite pe această pagină");
      return;
    }
    try {
      navigator.clipboard.writeText(emails);
      toast.success(`${emails.split(",").length} emailuri copiate`);
    } catch (e) {
      /* ignore */
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[hsl(var(--accent))]/20 to-transparent ring-1 ring-[hsl(var(--accent))]/25">
            <Tv2 className="h-5 w-5 text-[hsl(var(--accent))]" />
          </div>
          <div>
            <h1 className="font-display text-3xl tracking-wider">
              Cartoonix TV
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Utilizatori pre-înregistrați pentru aplicația de TV. Aceștia sunt
              separați complet de utilizatorii platformei.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyAllPaidEmails}
            data-testid="admin-ctv-copy-paid"
          >
            <Copy className="mr-2 h-4 w-4" /> Copiază emailuri plătite
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchList}
            disabled={refreshing}
            data-testid="admin-ctv-refresh"
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Reîncarcă
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Total pre-înregistrări
          </div>
          <div className="mt-2 font-display text-3xl tabular-nums">{total}</div>
        </div>
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-300/90">
            <CheckCircle2 className="h-3.5 w-3.5" /> Plătite
          </div>
          <div className="mt-2 font-display text-3xl tabular-nums text-emerald-300">
            {paidCount}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-amber-300/90">
            <Clock3 className="h-3.5 w-3.5" /> În așteptare
          </div>
          <div className="mt-2 font-display text-3xl tabular-nums text-amber-300">
            {pendingCount}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="admin-ctv-search"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Caută după nume sau email..."
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setPage(1);
            setStatusFilter(v);
          }}
        >
          <SelectTrigger
            className="w-full sm:w-[200px]"
            data-testid="admin-ctv-status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate</SelectItem>
            <SelectItem value="paid">Doar plătite</SelectItem>
            <SelectItem value="pending">Doar în așteptare</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Nu există pre-înregistrări care să corespundă filtrelor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Nume</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Sumă</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody data-testid="admin-ctv-table" className="divide-y divide-border/60">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium">{it.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>{it.email}</span>
                        <button
                          type="button"
                          onClick={() => copyEmail(it.email)}
                          className="opacity-60 hover:opacity-100 transition"
                          title="Copiază email"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {it.payment_verified ? (
                        <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30">
                          Plătit
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-300 hover:bg-amber-500/20 border-amber-500/30">
                          În așteptare
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {fmtMoney(it.stripe_amount_total, it.stripe_currency)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {fmtDate(it.paid_at || it.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`mailto:${it.email}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/[0.05] hover:text-white transition"
                          title="Trimite email"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => setToDelete(it)}
                          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition"
                          title="Șterge"
                          data-testid={`admin-ctv-delete-${it.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Pagina <span className="tabular-nums">{page}</span> din{" "}
              <span className="tabular-nums">{totalPages}</span> ·{" "}
              <span className="tabular-nums">{total}</span> înregistrări
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ștergi pre-înregistrarea?</DialogTitle>
            <DialogDescription>
              {toDelete
                ? `Vei șterge definitiv pre-înregistrarea pentru ${toDelete.email}. Această acțiune nu poate fi anulată.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setToDelete(null)}
              disabled={deleting}
            >
              Anulează
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              data-testid="admin-ctv-confirm-delete"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Se șterge...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" /> Șterge
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
