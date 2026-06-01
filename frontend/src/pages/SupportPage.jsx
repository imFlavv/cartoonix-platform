import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  LifeBuoy,
  Paperclip,
  Plus,
  Send,
  Shield,
  X,
  Inbox,
  CheckCircle2,
  Clock,
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
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${meta.className}`}
      data-testid={`ticket-status-${status}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SupportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // New ticket form
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState(null); // {url, filename}
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Reply form (when a ticket is opened)
  const [replyMsg, setReplyMsg] = useState("");
  const [replyAttach, setReplyAttach] = useState(null);
  const [replySending, setReplySending] = useState(false);
  const replyFileRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/support/tickets");
      setTickets(data || []);
    } catch (e) {
      toast.error(getErrorMessage(e, "Nu am putut încărca ticketele"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const uploadFile = async (file, setter) => {
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
      setter({ url: data.url, filename: data.filename });
      toast.success(`Fișier atașat: ${data.filename}`);
    } catch (e) {
      toast.error(getErrorMessage(e, "Upload eșuat"));
    } finally {
      setUploading(false);
    }
  };

  const submitTicket = async () => {
    if (title.trim().length < 3) {
      toast.error("Titlul e prea scurt (min. 3 caractere).");
      return;
    }
    if (message.trim().length < 5) {
      toast.error("Mesajul e prea scurt (min. 5 caractere).");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/support/tickets", {
        title: title.trim(),
        message: message.trim(),
        attachment_url: attachment?.url || null,
      });
      toast.success("Ticket trimis. Vei primi răspuns aici și pe email.");
      setNewOpen(false);
      setTitle("");
      setMessage("");
      setAttachment(null);
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e, "Nu am putut trimite ticket-ul"));
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!selected) return;
    if (replyMsg.trim().length < 1) return;
    setReplySending(true);
    try {
      const { data } = await api.post(`/support/tickets/${selected.id}/reply`, {
        message: replyMsg.trim(),
        attachment_url: replyAttach?.url || null,
      });
      setSelected(data);
      setTickets((arr) => arr.map((t) => (t.id === data.id ? data : t)));
      setReplyMsg("");
      setReplyAttach(null);
    } catch (e) {
      toast.error(getErrorMessage(e, "Nu am putut trimite răspunsul"));
    } finally {
      setReplySending(false);
    }
  };

  return (
    <PublicLayout>
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6 mb-8"
        >
          <div className="h-14 w-14 rounded-2xl bg-[hsl(var(--accent))]/15 ring-1 ring-[hsl(var(--accent))]/30 grid place-items-center shrink-0">
            <LifeBuoy className="h-7 w-7 text-[hsl(var(--accent))]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Asistență</div>
            <h1 className="font-display text-3xl sm:text-4xl tracking-wider text-white">
              Centrul de Support
            </h1>
            <p className="mt-1 text-sm text-white/55 max-w-xl">
              Deschide un ticket dacă întâmpini o problemă sau ai o sugestie.
              Echipa Cartoonix îți răspunde aici, păstrând totul într-un loc.
            </p>
          </div>
          <Button
            data-testid="support-new-ticket-btn"
            onClick={() => setNewOpen(true)}
            className="rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Solicitare nouă
          </Button>
        </motion.div>

        {/* Tickets list */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-sm text-white/50">Se încarcă...</div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <h3 className="font-display text-xl tracking-wider text-white">
                Nu ai încă nicio solicitare
              </h3>
              <p className="text-sm text-white/45 mt-1">
                Apasă pe „Solicitare nouă" pentru a începe.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.05]" data-testid="support-tickets-list">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setSelected(t)}
                    data-testid={`support-ticket-${t.id}`}
                    className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-white truncate">{t.title}</h4>
                        <StatusPill status={t.status} />
                      </div>
                      <div className="text-xs text-white/45 mt-1">
                        Creat {formatDate(t.created_at)} · {t.reply_count} răspuns(uri)
                      </div>
                    </div>
                    <div className="text-xs text-white/40 shrink-0 hidden sm:block">
                      Ultim update<br />
                      {formatDate(t.updated_at)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* NEW TICKET dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitare nouă</DialogTitle>
            <DialogDescription>
              Descrie pe scurt problema. Putem atașa și un fișier (max 8 MB).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="support-title">Titlu</Label>
              <Input
                id="support-title"
                data-testid="support-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Nu pot reda Episodul 3 din Tom & Jerry"
                maxLength={140}
              />
            </div>
            <div>
              <Label htmlFor="support-message">Mesaj</Label>
              <Textarea
                id="support-message"
                data-testid="support-message-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descrie ce s-a întâmplat, ce browser folosești, etc."
                rows={5}
                maxLength={5000}
              />
            </div>
            <div>
              <Label>Atașament (opțional)</Label>
              {attachment ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                  <span className="truncate flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-white/60" />
                    {attachment.filename}
                  </span>
                  <button
                    onClick={() => setAttachment(null)}
                    className="text-white/50 hover:text-red-300"
                    data-testid="support-remove-attachment"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-white/70"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  data-testid="support-attach-btn"
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  {uploading ? "Se încarcă..." : "Atașează fișier"}
                </Button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => uploadFile(e.target.files?.[0], setAttachment)}
              />
              <p className="text-[11px] text-white/40 mt-1">
                Imagini, PDF, video, log-uri. Max 8 MB.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Anulează</Button>
            <Button
              data-testid="support-submit-btn"
              onClick={submitTicket}
              disabled={submitting}
              className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
            >
              <Send className="h-4 w-4 mr-1.5" />
              {submitting ? "Se trimite..." : "Trimite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DETAIL dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <DialogTitle className="font-display tracking-wider">
                    {selected.title}
                  </DialogTitle>
                  <StatusPill status={selected.status} />
                </div>
                <DialogDescription>
                  Creat {formatDate(selected.created_at)}
                </DialogDescription>
              </DialogHeader>

              {/* Original message + replies thread */}
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                <MessageBubble
                  authorName={selected.user_nickname || "Tu"}
                  authorRole="user"
                  message={selected.message}
                  attachmentUrl={selected.attachment_url}
                  createdAt={selected.created_at}
                  isMine
                />
                {selected.replies.map((r) => (
                  <MessageBubble
                    key={r.id}
                    authorName={r.author_role === "admin" ? "Echipa Cartoonix" : r.author_nickname}
                    authorRole={r.author_role}
                    message={r.message}
                    attachmentUrl={r.attachment_url}
                    createdAt={r.created_at}
                    isMine={r.author_id === user?.id}
                  />
                ))}
              </div>

              {/* Reply form (hidden if closed) */}
              {selected.status !== "closed" ? (
                <div className="border-t border-white/[0.07] pt-3 space-y-2">
                  <Textarea
                    data-testid="support-reply-input"
                    value={replyMsg}
                    onChange={(e) => setReplyMsg(e.target.value)}
                    placeholder="Scrie un răspuns..."
                    rows={3}
                  />
                  {replyAttach && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs">
                      <span className="truncate flex items-center gap-1.5">
                        <Paperclip className="h-3.5 w-3.5 text-white/60" />
                        {replyAttach.filename}
                      </span>
                      <button onClick={() => setReplyAttach(null)} className="text-white/50 hover:text-red-300">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => replyFileRef.current?.click()}
                      disabled={uploading}
                    >
                      <Paperclip className="h-4 w-4 mr-1.5" />
                      {uploading ? "Se încarcă..." : "Atașează"}
                    </Button>
                    <input
                      type="file"
                      ref={replyFileRef}
                      className="hidden"
                      onChange={(e) => uploadFile(e.target.files?.[0], setReplyAttach)}
                    />
                    <Button
                      data-testid="support-reply-send-btn"
                      onClick={sendReply}
                      disabled={replySending || !replyMsg.trim()}
                      className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                    >
                      <Send className="h-4 w-4 mr-1.5" />
                      Trimite
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-white/45 border-t border-white/[0.07] pt-3">
                  Acest ticket este închis. Deschide unul nou dacă mai ai nevoie de ajutor.
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}

function MessageBubble({ authorName, authorRole, message, attachmentUrl, createdAt, isMine }) {
  const isAdmin = authorRole === "admin";
  return (
    <div className={`flex gap-3 ${isMine ? "flex-row-reverse" : ""}`}>
      <div
        className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 text-xs font-bold ${
          isAdmin
            ? "bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))] ring-1 ring-[hsl(var(--accent))]/40"
            : "bg-white/10 text-white/80"
        }`}
        title={authorName}
      >
        {isAdmin ? <Shield className="h-4 w-4" /> : (authorName?.[0] || "?").toUpperCase()}
      </div>
      <div className={`max-w-[75%] ${isMine ? "items-end" : ""} flex flex-col`}>
        <div className="text-[11px] text-white/40 mb-0.5">
          {authorName} · {formatDate(createdAt)}
        </div>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
            isAdmin
              ? "bg-[hsl(var(--accent))]/10 text-white border border-[hsl(var(--accent))]/25"
              : isMine
              ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
              : "bg-white/[0.05] text-white"
          }`}
        >
          {message}
          {attachmentUrl && (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs underline opacity-90"
            >
              <Paperclip className="h-3 w-3" /> Vezi atașament
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
