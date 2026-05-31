import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  MoreHorizontal,
  Trash2,
  Ban,
  ShieldOff,
  Network,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const PAGE_SIZE = 50;

// ---------- Helpers ----------
function pickActivityIso(u) {
  // Prefer most recent activity; fall back through chain.
  return u?.last_active || u?.last_login || u?.created_at || null;
}

function formatRelativeRo(iso) {
  if (!iso) return "Niciodată";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Niciodată";
  const diff = Date.now() - d.getTime();
  if (diff < 0) return "acum";
  const sec = Math.floor(diff / 1000);
  if (sec < 30) return "online acum";
  if (sec < 60) return `acum ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `acum ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `acum ${hr} h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `acum ${day} z`;
  // Older — show date
  return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAbsoluteRo(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOnline(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() < 90 * 1000; // within 90s
}

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

  // Modal state for ban actions
  const [banDialog, setBanDialog] = useState(null);
  // banDialog shape: { kind: 'ban'|'unban'|'ban_ip', user: {...} }
  const [banReason, setBanReason] = useState("");
  const [banSubmitting, setBanSubmitting] = useState(false);

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

  // Light auto-refresh every 30s so "ultima activitate" stays fresh.
  useEffect(() => {
    const t = setInterval(() => load(), 30000);
    return () => clearInterval(t);
  }, [load]);

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

  const openBanDialog = (kind, user) => {
    setBanReason("");
    setBanDialog({ kind, user });
  };

  const submitBan = async () => {
    if (!banDialog) return;
    const { kind, user: u } = banDialog;
    setBanSubmitting(true);
    try {
      if (kind === "ban") {
        await api.post(`/admin/users/${u.id}/ban`, { reason: banReason });
        toast.success("Utilizator banat");
      } else if (kind === "unban") {
        await api.post(`/admin/users/${u.id}/unban`, {});
        toast.success("Utilizator deblocat");
      } else if (kind === "ban_ip") {
        const { data } = await api.post(`/admin/users/${u.id}/ban-ip`, { reason: banReason });
        toast.success(`IP ${data?.ip || ""} blocat`);
      }
      setBanDialog(null);
      setBanReason("");
      load();
    } catch (e) {
      toast.error(getErrorMessage(e, "Acțiunea a eșuat"));
    } finally {
      setBanSubmitting(false);
    }
  };

  const fromIndex = useMemo(() => (total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1), [page, total]);
  const toIndex = useMemo(() => Math.min(page * PAGE_SIZE, total), [page, total]);

  const goTo = (p) => {
    const target = Math.max(1, Math.min(pages || 1, p));
    if (target !== page) setPage(target);
  };

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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr>
                <th className="text-left p-3">Utilizator</th>
                <th className="text-left p-3 hidden sm:table-cell">Email</th>
                <th className="text-left p-3 hidden md:table-cell">Rol</th>
                <th className="text-left p-3 hidden md:table-cell">Abonament</th>
                <th className="text-left p-3 hidden lg:table-cell">Ultimă activitate</th>
                <th className="text-left p-3 hidden xl:table-cell">Verificat</th>
                <th className="text-right p-3">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const activityIso = pickActivityIso(u);
                const online = isOnline(activityIso);
                const banned = !!u.banned;
                const self = u.id === me?.id;
                return (
                  <tr key={u.id} className="border-t border-border align-top">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <img
                            src={mediaUrl(u.avatar_url)}
                            alt=""
                            className="h-9 w-9 rounded-md object-cover bg-secondary"
                          />
                          {online && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card"
                              title="Online acum"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium flex items-center gap-2 flex-wrap">
                            <span className="truncate">{u.nickname}</span>
                            {banned && (
                              <Badge
                                variant="destructive"
                                className="rounded-full text-[10px] px-1.5 py-0 h-4 uppercase tracking-wider"
                                title={u.banned_reason || "Cont suspendat"}
                              >
                                BANAT
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground sm:hidden truncate">{u.email}</div>
                          {/* Activity inline on smaller screens */}
                          <div className="text-[11px] text-muted-foreground lg:hidden mt-0.5">
                            {formatRelativeRo(activityIso)}
                            {u.last_ip ? <span className="ml-2 font-mono">{u.last_ip}</span> : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">
                      <span className="block truncate max-w-[260px]" title={u.email}>{u.email}</span>
                    </td>
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
                      <div className="flex flex-col">
                        <span
                          className={
                            "text-sm " +
                            (online
                              ? "text-emerald-400 font-medium"
                              : activityIso
                                ? "text-foreground/90"
                                : "text-muted-foreground")
                          }
                          title={formatAbsoluteRo(activityIso)}
                          data-testid={`admin-user-activity-${u.id}`}
                        >
                          {online ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Online
                            </span>
                          ) : (
                            formatRelativeRo(activityIso)
                          )}
                        </span>
                        <span className="text-[11px] text-muted-foreground" title={formatAbsoluteRo(activityIso)}>
                          {formatAbsoluteRo(activityIso)}
                        </span>
                        {u.last_ip ? (
                          <span
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground"
                            data-testid={`admin-user-ip-${u.id}`}
                          >
                            <Globe className="h-3 w-3" />
                            {u.last_ip}
                          </span>
                        ) : (
                          <span className="mt-1 text-[11px] text-muted-foreground/70 italic">fără IP</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 hidden xl:table-cell">
                      {u.email_verified ? (
                        <Badge className="rounded-full"><ShieldCheck className="h-3 w-3 mr-1" /> Da</Badge>
                      ) : (
                        <Badge variant="destructive" className="rounded-full">Nu</Badge>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`admin-user-menu-${u.id}`}
                            aria-label="Acțiuni"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Acțiuni
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {banned ? (
                            <DropdownMenuItem
                              disabled={self}
                              onClick={() => openBanDialog("unban", u)}
                              data-testid={`admin-user-unban-${u.id}`}
                            >
                              <ShieldOff className="h-4 w-4 mr-2 text-emerald-500" />
                              Deblochează utilizator
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              disabled={self}
                              onClick={() => openBanDialog("ban", u)}
                              data-testid={`admin-user-ban-${u.id}`}
                              className="text-destructive focus:text-destructive"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Banează utilizator
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            disabled={!u.last_ip}
                            onClick={() => openBanDialog("ban_ip", u)}
                            data-testid={`admin-user-ban-ip-${u.id}`}
                            className="text-amber-500 focus:text-amber-500"
                          >
                            <Network className="h-4 w-4 mr-2" />
                            Banează IP{u.last_ip ? ` (${u.last_ip})` : ""}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={self}
                            onClick={() => deleteUser(u.id)}
                            data-testid={`admin-user-delete-${u.id}`}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Șterge utilizator
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-muted-foreground">
                    {query ? `Niciun utilizator pentru "${query}".` : "Niciun utilizator."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

      {/* Ban / Unban / Ban-IP dialog */}
      <Dialog
        open={!!banDialog}
        onOpenChange={(open) => {
          if (!open) {
            setBanDialog(null);
            setBanReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {banDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {banDialog.kind === "ban" && (
                    <>
                      <Ban className="h-5 w-5 text-destructive" /> Banează utilizator
                    </>
                  )}
                  {banDialog.kind === "unban" && (
                    <>
                      <ShieldOff className="h-5 w-5 text-emerald-500" /> Deblochează utilizator
                    </>
                  )}
                  {banDialog.kind === "ban_ip" && (
                    <>
                      <Network className="h-5 w-5 text-amber-500" /> Banează IP
                    </>
                  )}
                </DialogTitle>
                <DialogDescription className="pt-1">
                  {banDialog.kind === "ban" && (
                    <>
                      Vei suspenda contul <b>{banDialog.user.nickname}</b> ({banDialog.user.email}).
                      Acesta nu se va mai putea autentifica.
                    </>
                  )}
                  {banDialog.kind === "unban" && (
                    <>
                      Vei reactiva contul <b>{banDialog.user.nickname}</b> ({banDialog.user.email}).
                    </>
                  )}
                  {banDialog.kind === "ban_ip" && (
                    <>
                      Vei bloca adresa IP{" "}
                      <b className="font-mono">{banDialog.user.last_ip || "—"}</b> asociată cu{" "}
                      <b>{banDialog.user.nickname}</b>. Toate cererile de la acest IP vor fi respinse.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              {banDialog.kind !== "unban" && (
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Motiv (opțional)
                  </label>
                  <Textarea
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Ex: spam, abuz, încălcare termeni..."
                    rows={3}
                    maxLength={300}
                    data-testid="admin-user-ban-reason"
                  />
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setBanDialog(null);
                    setBanReason("");
                  }}
                  disabled={banSubmitting}
                >
                  Anulează
                </Button>
                <Button
                  variant={banDialog.kind === "unban" ? "default" : "destructive"}
                  onClick={submitBan}
                  disabled={banSubmitting}
                  data-testid="admin-user-ban-confirm"
                >
                  {banSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {banDialog.kind === "ban" && "Confirmă banare"}
                  {banDialog.kind === "unban" && "Deblochează"}
                  {banDialog.kind === "ban_ip" && "Banează IP"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
