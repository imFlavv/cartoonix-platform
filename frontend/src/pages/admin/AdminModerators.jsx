import React, { useCallback, useEffect, useState } from "react";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ShieldCheck,
  Search,
  UserPlus,
  UserMinus,
  Loader2,
  VolumeX,
  Volume2,
  ScrollText,
  Crown,
} from "lucide-react";

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTION_LABEL = {
  mute: "Mute",
  unmute: "Unmute",
};

export default function AdminModerators() {
  const [tab, setTab] = useState("manage"); // manage | logs

  // ---- moderators + search ----
  const [moderators, setModerators] = useState([]);
  const [loadingMods, setLoadingMods] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // ---- logs ----
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadModerators = useCallback(async () => {
    setLoadingMods(true);
    try {
      const { data } = await api.get("/admin/moderators");
      setModerators(Array.isArray(data?.items) ? data.items : []);
    } catch {
      toast.error("Nu am putut încărca moderatorii.");
    } finally {
      setLoadingMods(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const { data } = await api.get("/chat/admin/mod-logs?limit=300");
      setLogs(Array.isArray(data?.items) ? data.items : []);
    } catch {
      toast.error("Nu am putut încărca logurile.");
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadModerators();
  }, [loadModerators]);

  useEffect(() => {
    if (tab === "logs") loadLogs();
  }, [tab, loadLogs]);

  const runSearch = async (e) => {
    e?.preventDefault?.();
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get("/admin/users", { params: { q, page_size: 20 } });
      setResults(Array.isArray(data?.items) ? data.items : []);
    } catch {
      toast.error("Căutarea a eșuat.");
    } finally {
      setSearching(false);
    }
  };

  const promote = async (u) => {
    setBusyId(u.id);
    try {
      await api.post(`/admin/moderators/${u.id}/promote`);
      toast.success(`${u.nickname} a fost promovat la Moderator.`, {
        description: "Utilizatorul a primit o notificare.",
      });
      await loadModerators();
      setResults((prev) => prev.map((r) => (r.id === u.id ? { ...r, is_moderator: true } : r)));
    } catch (err) {
      toast.error(getErrorMessage(err, "Promovarea a eșuat."));
    } finally {
      setBusyId(null);
    }
  };

  const demote = async (u) => {
    if (!window.confirm(`Sigur retragi rolul de Moderator pentru ${u.nickname}?`)) return;
    setBusyId(u.id);
    try {
      await api.post(`/admin/moderators/${u.id}/demote`);
      toast.success(`${u.nickname} nu mai este Moderator.`);
      await loadModerators();
      setResults((prev) => prev.map((r) => (r.id === u.id ? { ...r, is_moderator: false } : r)));
    } catch (err) {
      toast.error(getErrorMessage(err, "Retragerea a eșuat."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-moderators-page">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 grid place-items-center text-white shrink-0">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl tracking-wide">Moderatori</h1>
          <p className="text-sm text-muted-foreground">
            Promovează utilizatori la Moderator și urmărește acțiunile lor de moderare.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="inline-flex rounded-xl border border-border bg-card/50 p-1">
        <button
          onClick={() => setTab("manage")}
          data-testid="modtab-manage"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "manage" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
          }`}
        >
          <UserPlus className="inline h-4 w-4 mr-1.5" /> Gestionare
        </button>
        <button
          onClick={() => setTab("logs")}
          data-testid="modtab-logs"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "logs" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
          }`}
        >
          <ScrollText className="inline h-4 w-4 mr-1.5" /> Loguri moderare
        </button>
      </div>

      {tab === "manage" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Promote: search */}
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <h2 className="font-display text-lg tracking-wide flex items-center gap-2 mb-3">
              <UserPlus className="h-4 w-4 text-blue-400" /> Promovează un utilizator
            </h2>
            <form onSubmit={runSearch} className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Caută după nume sau email…"
                data-testid="mod-search-input"
                className="h-10 rounded-xl"
              />
              <Button type="submit" disabled={searching} className="h-10 rounded-xl" data-testid="mod-search-button">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-4 space-y-2">
              {results.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Caută un utilizator pentru a-l promova la Moderator.
                </p>
              ) : (
                results.map((u) => {
                  const isAdmin = u.role === "admin";
                  return (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5"
                      data-testid="mod-search-result"
                    >
                      <img src={mediaUrl(u.avatar_url)} alt="" className="h-9 w-9 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{u.nickname}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                      </div>
                      {isAdmin ? (
                        <span className="text-[11px] text-red-300 font-semibold px-2">Admin</span>
                      ) : u.is_moderator ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-blue-300 font-semibold px-2">
                          <ShieldCheck className="h-3.5 w-3.5" /> Moderator
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => promote(u)}
                          disabled={busyId === u.id}
                          className="rounded-lg h-8"
                          data-testid={`mod-promote-${u.id}`}
                        >
                          {busyId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-1" /> Promovează</>}
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Current moderators */}
          <div className="rounded-2xl border border-border bg-card/70 p-5">
            <h2 className="font-display text-lg tracking-wide flex items-center gap-2 mb-3">
              <Crown className="h-4 w-4 text-blue-400" /> Moderatori actuali
              <span className="text-xs text-muted-foreground font-normal">({moderators.length})</span>
            </h2>
            {loadingMods ? (
              <div className="grid place-items-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : moderators.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Niciun moderator încă. Promovează un utilizator din stânga.
              </p>
            ) : (
              <div className="space-y-2">
                {moderators.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5"
                    data-testid="mod-current-item"
                  >
                    <img src={mediaUrl(u.avatar_url)} alt="" className="h-9 w-9 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate flex items-center gap-1.5">
                        {u.nickname}
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        Moderator din {formatDateTime(u.moderator_since)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => demote(u)}
                      disabled={busyId === u.id}
                      className="rounded-lg h-8 text-red-300 hover:text-red-200"
                      data-testid={`mod-demote-${u.id}`}
                    >
                      {busyId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserMinus className="h-4 w-4 mr-1" /> Retrage</>}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* LOGS */
        <div className="rounded-2xl border border-border bg-card/70 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
            <h2 className="font-display text-lg tracking-wide flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-blue-400" /> Acțiunile moderatorilor
            </h2>
            <Button variant="ghost" size="sm" onClick={loadLogs} disabled={loadingLogs} className="h-8 text-xs">
              {loadingLogs ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reîmprospătează"}
            </Button>
          </div>
          {loadingLogs ? (
            <div className="grid place-items-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">
              Nicio acțiune de moderare înregistrată încă.
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {logs.map((l) => {
                const isMute = l.action === "mute";
                return (
                  <div
                    key={l.id}
                    className="flex items-center gap-3 px-5 py-3 text-sm"
                    data-testid="mod-log-row"
                  >
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-lg shrink-0 ${
                        isMute ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"
                      }`}
                    >
                      {isMute ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate">
                        <span className="font-semibold text-white">{l.moderator_nickname}</span>
                        {l.moderator_role === "admin" && (
                          <span className="ml-1 text-[10px] text-red-300 font-semibold uppercase">admin</span>
                        )}
                        <span className="text-muted-foreground"> a dat </span>
                        <span className={isMute ? "text-red-300 font-medium" : "text-emerald-300 font-medium"}>
                          {ACTION_LABEL[l.action] || l.action}
                          {l.duration ? ` (${l.duration})` : ""}
                        </span>
                        <span className="text-muted-foreground"> lui </span>
                        <span className="font-semibold text-white">{l.target_nickname}</span>
                      </div>
                      {l.reason && (
                        <div className="text-[11px] text-muted-foreground truncate">Motiv: {l.reason}</div>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatDateTime(l.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
