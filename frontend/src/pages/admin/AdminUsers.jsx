import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ShieldCheck, Search, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const PAGE_SIZE = 50;

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const { user: me } = useAuth();
  const debounceRef = useRef(null);

  // Debounce search input -> query (resets page)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (query) params.q = query;
      const { data } = await api.get("/admin/users", { params });
      // Backward-compatible: backend now returns {items,total,pages,...}
      if (Array.isArray(data)) {
        setUsers(data);
        setTotal(data.length);
        setPages(1);
      } else {
        setUsers(data.items || []);
        setTotal(data.total || 0);
        setPages(data.pages || 0);
      }
    } catch (e) {
      toast.error(getErrorMessage(e, "Nu am putut încărca utilizatorii"));
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { load(); }, [load]);

  const updateUser = async (id, patch) => {
    try {
      await api.patch(`/admin/users/${id}`, patch);
      toast.success("Actualizat");
      load();
    } catch (e) {
      toast.error("Actualizare eșuată");
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Șterge acest utilizator?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success("Șters");
      load();
    } catch (e) {
      toast.error(getErrorMessage(e, "Ștergere eșuată"));
    }
  };

  const fromIndex = useMemo(() => (total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1), [page, total]);
  const toIndex = useMemo(() => Math.min(page * PAGE_SIZE, total), [page, total]);

  const goTo = (p) => {
    const target = Math.max(1, Math.min(pages || 1, p));
    if (target !== page) setPage(target);
  };

  // Build a compact list of page numbers to render (with ellipsis)
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

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wider">Utilizatori</h1>
          <p className="text-sm text-muted-foreground">
            Administrează conturile, rolurile și abonamentele.
            {total > 0 && (
              <span className="ml-2 text-foreground/80">
                · <span className="font-semibold">{total}</span> total
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          data-testid="admin-users-search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Caută după email sau pseudonim..."
          className="pl-9 pr-9 h-11 rounded-xl"
        />
        {searchInput && (
          <button
            type="button"
            aria-label="Șterge căutarea"
            onClick={() => setSearchInput("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            data-testid="admin-users-search-clear"
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
              <th className="text-left p-3 hidden md:table-cell">Rol</th>
              <th className="text-left p-3 hidden md:table-cell">Abonament</th>
              <th className="text-left p-3 hidden lg:table-cell">Verificat</th>
              <th className="text-right p-3">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <img src={mediaUrl(u.avatar_url)} alt="" className="h-8 w-8 rounded-md object-cover bg-secondary" />
                    <div>
                      <div className="font-medium">{u.nickname}</div>
                      <div className="text-xs text-muted-foreground sm:hidden">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 hidden sm:table-cell text-muted-foreground">{u.email}</td>
                <td className="p-3 hidden md:table-cell">
                  <Select value={u.role} onValueChange={(v) => updateUser(u.id, { role: v })}>
                    <SelectTrigger className="h-9 w-28 rounded-lg" data-testid={`admin-user-role-${u.id}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Utilizator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 hidden md:table-cell">
                  <Select value={u.subscription} onValueChange={(v) => updateUser(u.id, { subscription: v })}>
                    <SelectTrigger className="h-9 w-28 rounded-lg" data-testid={`admin-user-sub-${u.id}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="plus">Plus</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 hidden lg:table-cell">
                  {u.email_verified ? <Badge className="rounded-full"><ShieldCheck className="h-3 w-3 mr-1" /> Da</Badge> : <Badge variant="destructive" className="rounded-full">Nu</Badge>}
                </td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => deleteUser(u.id)} disabled={u.id === me?.id} className="text-destructive" data-testid={`admin-user-delete-${u.id}`}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  {query ? `Niciun utilizator pentru "${query}".` : "Niciun utilizator."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-muted-foreground" data-testid="admin-users-range">
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
              data-testid="admin-users-prev"
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
                  data-testid={`admin-users-page-${p}`}
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
              data-testid="admin-users-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
