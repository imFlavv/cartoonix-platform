import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Users,
  Trophy,
  Crown,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 50;

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

/* ---------- Contest list (overview) ---------- */
function ContestsOverview({ onOpen }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/contests");
      setItems(data?.items || []);
      setTotal(data?.total_entries || 0);
    } catch (e) {
      toast.error(getErrorMessage(e, "Nu am putut încărca concursurile."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wider">Concursuri</h1>
          <p className="text-sm text-muted-foreground">
            Vezi participanții înscriși la fiecare concurs.
            <span className="ml-2 text-foreground/80">
              · <span className="font-semibold">{total}</span> înscrieri totale
            </span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => onOpen(c.id)}
              data-testid={`admin-contest-card-${c.id}`}
              className="text-left rounded-2xl border border-border bg-card/60 p-5 hover:border-foreground/30 hover:bg-card transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-xl">
                    {c.emoji}
                  </div>
                  <div>
                    <div className="font-semibold leading-tight">{c.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.prize}</div>
                  </div>
                </div>
                {c.plan === "plus" ? (
                  <Badge className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black border-0 shrink-0">
                    <Crown className="h-3 w-3 mr-1" /> Plus
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="rounded-full shrink-0">
                    <Sparkles className="h-3 w-3 mr-1" /> Free
                  </Badge>
                )}
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold tabular-nums">{c.entry_count}</div>
                  <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5 mt-0.5">
                    <Users className="h-3 w-3" />
                    {c.entry_count === 1 ? "participant" : "participanți"}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {c.last_entry_at ? (
                    <>
                      <div className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Ultima înscriere
                      </div>
                      <div className="mt-0.5">{formatDate(c.last_entry_at)}</div>
                    </>
                  ) : (
                    <span>Fără înscrieri</span>
                  )}
                </div>
              </div>

              <div className="mt-4 text-xs font-semibold tracking-[0.2em] uppercase text-primary group-hover:translate-x-0.5 transition-transform">
                Vezi participanți →
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Entries list (per contest) ---------- */
function ContestEntries({ contestId, onBack }) {
  const [entries, setEntries] = useState([]);
  const [contest, setContest] = useState(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (query) params.q = query;
      const { data } = await api.get(`/admin/contests/${contestId}/entries`, { params });
      setEntries(data?.items || []);
      setTotal(data?.total || 0);
      setPages(data?.pages || 0);
      setContest(data?.contest || null);
    } catch (e) {
      toast.error(getErrorMessage(e, "Nu am putut încărca participanții."));
    } finally {
      setLoading(false);
    }
  }, [contestId, page, query]);

  useEffect(() => { load(); }, [load]);

  const fromIndex = useMemo(() => (total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1), [page, total]);
  const toIndex = useMemo(() => Math.min(page * PAGE_SIZE, total), [page, total]);
  const pageList = useMemo(() => {
    if (!pages || pages <= 1) return [];
    const max = pages;
    const cur = page;
    const set = new Set([1, max, cur, cur - 1, cur + 1, cur - 2, cur + 2]);
    const arr = [...set].filter((n) => n >= 1 && n <= max).sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      out.push(arr[i]);
      if (i < arr.length - 1 && arr[i + 1] - arr[i] > 1) out.push("…");
    }
    return out;
  }, [page, pages]);

  const goTo = (p) => {
    const target = Math.max(1, Math.min(pages || 1, p));
    if (target !== page) setPage(target);
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground mb-6 transition-colors"
        data-testid="admin-contest-back"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Înapoi la concursuri
      </button>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {contest?.emoji && <span className="text-2xl">{contest.emoji}</span>}
            <h1 className="font-display text-2xl sm:text-3xl tracking-wider">
              {contest?.title || "Concurs"}
            </h1>
            {contest?.plan === "plus" ? (
              <Badge className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black border-0">
                <Crown className="h-3 w-3 mr-1" /> Plus
              </Badge>
            ) : (
              <Badge variant="secondary" className="rounded-full">
                <Sparkles className="h-3 w-3 mr-1" /> Free
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            <Trophy className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
            {contest?.prize}
            <span className="ml-3 text-foreground/80">
              · <span className="font-semibold">{total}</span> participanți
            </span>
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="admin-contest-search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Caută după email sau pseudonim..."
          className="pl-9 pr-9 h-11 rounded-xl"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="bg-secondary/40">
            <tr>
              <th className="text-left p-3">Utilizator</th>
              <th className="text-left p-3 hidden sm:table-cell">Email</th>
              <th className="text-left p-3 hidden md:table-cell">Plan la înscriere</th>
              <th className="text-left p-3 hidden md:table-cell">Plan curent</th>
              <th className="text-right p-3">Înscris la</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.user_id} className="border-t border-border">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={mediaUrl(e.avatar_url)}
                      alt=""
                      className="h-8 w-8 rounded-md object-cover bg-secondary"
                    />
                    <div>
                      <div className="font-medium">{e.nickname || "—"}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">{e.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 hidden sm:table-cell text-muted-foreground">{e.email}</td>
                <td className="p-3 hidden md:table-cell">
                  {e.plan_at_entry === "plus" ? (
                    <Badge className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black border-0">
                      Plus
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="rounded-full">Free</Badge>
                  )}
                </td>
                <td className="p-3 hidden md:table-cell">
                  {e.current_plan === "plus" ? (
                    <Badge className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black border-0">
                      Plus
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="rounded-full">Free</Badge>
                  )}
                </td>
                <td className="p-3 text-right text-muted-foreground text-xs">
                  {formatDate(e.created_at)}
                </td>
              </tr>
            ))}
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-muted-foreground">
                  {query ? `Niciun participant pentru "${query}".` : "Niciun participant înscris încă."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Afișare <span className="text-foreground font-medium">{fromIndex}</span>–
            <span className="text-foreground font-medium">{toIndex}</span> din{" "}
            <span className="text-foreground font-medium">{total}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goTo(page - 1)}
              disabled={page <= 1 || loading}
              className="rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {pageList.map((p, idx) =>
              p === "…" ? (
                <span key={`e-${idx}`} className="px-2 text-muted-foreground select-none">…</span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => goTo(p)}
                  disabled={loading}
                  className="rounded-lg min-w-[36px] h-9 px-2.5"
                >
                  {p}
                </Button>
              )
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => goTo(page + 1)}
              disabled={page >= pages || loading}
              className="rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Main wrapper (overview ↔ entries) ---------- */
export default function AdminContests() {
  const [openId, setOpenId] = useState(null);

  if (openId) {
    return <ContestEntries contestId={openId} onBack={() => setOpenId(null)} />;
  }
  return <ContestsOverview onOpen={setOpenId} />;
}
