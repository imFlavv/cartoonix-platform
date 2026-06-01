import React, { useCallback, useEffect, useRef, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  LifeBuoy,
  Search,
  Send,
  Paperclip,
  X,
  Shield,
  CheckCircle2,
  Clock,
  Inbox,
  Lock,
} from "lucide-react";

const STATUS_META = {
  open: { label: "Deschis", className: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: Inbox },
  in_progress: { label: "În lucru", className: "bg-sky-500/15 text-sky-300 border-sky-500/30", icon: Clock },
  resolved: { label: "Rezolvat", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  closed: { label: "Închis", className: "bg-white/10 text-white/60 border-white/20", icon: Lock },
};

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.open;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${meta.className}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminSupport() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [replyMsg, setReplyMsg] = useState("");
  const [replyAttach, setReplyAttach] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: 1, page_size: 100 };
      if (statusFilter !== "all") params.status_filter = statusFilter;
      if (q.trim()) params.q = q.trim();
      const { data } = await api.get("/admin/support/tickets", { params });
      setItems(data.items || []);
      setOpenCount(data.open_count || 0);
    } catch (e) {
      toast.error(getErrorMessage(e, "Nu am putut încărca ticketele"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, q]);

  useEffect(() => { load(); }, [load]);

  // Refresh selected ticket data on demand
  const reloadSelected = async (id) => {
    try {
      const { data } = await api.get(`/support/tickets/${id}`);
      setSelected(data);
      setItems((arr) => arr.map((t) => (t.id === id ? data : t)));
    } catch (e) { /* noop */ }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Fișierul depășește 8 MB.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/support/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setReplyAttach({ url: data.url, filename: data.filename });
    } catch (e) {
      toast.error(getErrorMessage(e, "Upload eșuat"));
    } finally {
      setUploading(false);
    }
  };

  const sendReply = async () => {
    if (!selected || !replyMsg.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/support/tickets/${selected.id}/reply`, {
        message: replyMsg.trim(),
        attachment_url: replyAttach?.url || null,
      });
      setSelected(data);
      setItems((arr) => arr.map((t) => (t.id === data.id ? data : t)));
      setReplyMsg("");
      setReplyAttach(null);
      toast.success("Răspuns trimis");
    } catch (e) {
      toast.error(getErrorMessage(e, "Nu am putut trimite răspunsul"));
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (newStatus) => {
    if (!selected) return;
    try {
      const { data } = await api.patch(`/admin/support/tickets/${selected.id}`, {
        status: newStatus,
      });
      setSelected(data);
      setItems((arr) => arr.map((t) => (t.id === data.id ? data : t)));
      toast.success(`Status actualizat: ${STATUS_META[newStatus]?.label || newStatus}`);
      load(); // refresh open_count
    } catch (e) {
      toast.error(getErrorMessage(e, "Nu am putut actualiza statusul"));
    }
  };

  return (
    <div data-testid="admin-support" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))]/80">
            <LifeBuoy className="h-3.5 w-3.5" /> Support
          </div>
          <h1 className="font-display text-3xl tracking-wider text-white mt-1">Tichete de suport</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {openCount} deschise / în lucru · {items.length} afișate
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="admin-support-search"
              placeholder="Caută după titlu, email, mesaj..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="admin-support-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate</SelectItem>
              <SelectItem value="open">Deschise</SelectItem>
              <SelectItem value="in_progress">În lucru</SelectItem>
              <SelectItem value="resolved">Rezolvate</SelectItem>
              <SelectItem value="closed">Închise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Se încarcă...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Niciun ticket potrivit filtrelor.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-background/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Ticket</th>
                <th className="p-3">Utilizator</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Update</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr
                  key={t.id}
                  data-testid={`admin-ticket-${t.id}`}
                  onClick={() => setSelected(t)}
                  className="border-t border-border cursor-pointer hover:bg-secondary/40 transition-colors"
                >
                  <td className="p-3">
                    <div className="font-medium truncate max-w-[280px]">{t.title}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[320px]">
                      {t.message}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-sm">{t.user_nickname}</div>
                    <div className="text-xs text-muted-foreground">{t.user_email}</div>
                  </td>
                  <td className="p-3"><StatusPill status={t.status} /></td>
                  <td className="p-3 text-right whitespace-nowrap text-xs text-muted-foreground">
                    {formatDate(t.updated_at)}<br />
                    <span className="text-foreground">{t.reply_count} răsp.</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <DialogTitle className="font-display tracking-wider text-xl">
                    {selected.title}
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    <StatusPill status={selected.status} />
                  </div>
                </div>
                <DialogDescription>
                  De la <strong className="text-foreground">{selected.user_nickname}</strong>{" "}
                  ({selected.user_email}) · {formatDate(selected.created_at)}
                </DialogDescription>
              </DialogHeader>

              {/* Status actions */}
              <div className="flex flex-wrap gap-2 border-y border-border/60 py-2">
                {["open", "in_progress", "resolved", "closed"].map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={selected.status === s ? "default" : "outline"}
                    onClick={() => setStatus(s)}
                    disabled={selected.status === s}
                    data-testid={`admin-ticket-set-${s}`}
                  >
                    {STATUS_META[s].label}
                  </Button>
                ))}
              </div>

              {/* Conversation */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                <Bubble
                  author={selected.user_nickname || "Utilizator"}
                  role="user"
                  msg={selected.message}
                  att={selected.attachment_url}
                  at={selected.created_at}
                  mine={false}
                />
                {selected.replies.map((r) => (
                  <Bubble
                    key={r.id}
                    author={r.author_role === "admin" ? "Tu (Admin)" : r.author_nickname}
                    role={r.author_role}
                    msg={r.message}
                    att={r.attachment_url}
                    at={r.created_at}
                    mine={r.author_id === user?.id}
                  />
                ))}
              </div>

              {/* Reply */}
              <div className="border-t border-border/60 pt-3 space-y-2">
                <Textarea
                  data-testid="admin-support-reply-input"
                  value={replyMsg}
                  onChange={(e) => setReplyMsg(e.target.value)}
                  placeholder="Răspunde utilizatorului..."
                  rows={3}
                />
                {replyAttach && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-xs">
                    <span className="truncate flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5" />
                      {replyAttach.filename}
                    </span>
                    <button onClick={() => setReplyAttach(null)} className="text-muted-foreground hover:text-red-400">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Paperclip className="h-4 w-4 mr-1.5" />
                    {uploading ? "Se încarcă..." : "Atașează"}
                  </Button>
                  <input type="file" ref={fileRef} className="hidden" onChange={(e) => uploadFile(e.target.files?.[0])} />
                  <Button
                    data-testid="admin-support-reply-send"
                    onClick={sendReply}
                    disabled={sending || !replyMsg.trim()}
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    Trimite răspuns
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Bubble({ author, role, msg, att, at, mine }) {
  const isAdmin = role === "admin";
  return (
    <div className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
      <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 text-xs font-bold ${
        isAdmin
          ? "bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))] ring-1 ring-[hsl(var(--accent))]/40"
          : "bg-secondary text-foreground"
      }`}>
        {isAdmin ? <Shield className="h-4 w-4" /> : (author?.[0] || "?").toUpperCase()}
      </div>
      <div className="max-w-[75%]">
        <div className="text-[11px] text-muted-foreground mb-0.5">
          {author} · {formatDate(at)}
        </div>
        <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
          isAdmin
            ? "bg-[hsl(var(--accent))]/10 border border-[hsl(var(--accent))]/25 text-foreground"
            : mine
            ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
            : "bg-secondary text-foreground"
        }`}>
          {msg}
          {att && (
            <a href={att} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs underline opacity-90">
              <Paperclip className="h-3 w-3" /> Vezi atașament
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
