import React, { useCallback, useEffect, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Loader2, Send, Users, Crown, Sparkles, User as UserIcon, Mail } from "lucide-react";
import { toast } from "sonner";

const TARGET_OPTIONS = [
  { value: "all", label: "Toți utilizatorii", icon: Users },
  { value: "free", label: "Doar utilizatori FREE", icon: Sparkles },
  { value: "plus", label: "Doar utilizatori PLUS", icon: Crown },
  { value: "user", label: "Un singur utilizator (email)", icon: UserIcon },
];

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ro-RO", {
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

export default function AdminNotifications() {
  const [target, setTarget] = useState("all");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get("/admin/notifications");
      setHistory(Array.isArray(data?.items) ? data.items : []);
    } catch {
      /* silent */
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const resolveUserId = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean) {
      throw new Error("Introdu adresa de email a utilizatorului.");
    }
    const { data } = await api.get("/admin/users", {
      params: { q: clean, page: 1, page_size: 5 },
    });
    const exact = (data?.items || []).find(
      (u) => (u.email || "").toLowerCase() === clean
    );
    if (!exact) throw new Error("Nu am găsit un utilizator cu acel email.");
    return exact.id;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    if (!title.trim() || !body.trim()) {
      toast.error("Completează titlul și mesajul.");
      return;
    }
    setSending(true);
    try {
      let payload = { target, title: title.trim(), body: body.trim() };
      if (target === "user") {
        payload.user_id = await resolveUserId();
      }
      const { data } = await api.post("/admin/notifications", payload);
      toast.success(
        `Trimis către ${data?.sent || 0} ${data?.sent === 1 ? "utilizator" : "utilizatori"}.`
      );
      setTitle("");
      setBody("");
      if (target === "user") setEmail("");
      loadHistory();
    } catch (err) {
      toast.error(getErrorMessage(err, "Trimiterea a eșuat."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="admin-notifications-page">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-fuchsia-400" />
            Notificări utilizatori
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trimite mesaje și anunțuri direct în Inbox-ul utilizatorilor.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 space-y-4 rounded-2xl border border-border/60 bg-card p-5"
          data-testid="admin-notifications-form"
        >
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Send className="h-4 w-4" /> Mesaj nou
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="target">Destinatar</Label>
            <Select value={target} onValueChange={(v) => setTarget(v)}>
              <SelectTrigger id="target" data-testid="admin-notif-target">
                <SelectValue placeholder="Alege destinatarul" />
              </SelectTrigger>
              <SelectContent>
                {TARGET_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <SelectItem key={value} value={value}>
                    <div className="inline-flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {target === "user" && (
            <div className="space-y-1.5">
              <Label htmlFor="email">Email utilizator</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@exemplu.ro"
                  className="pl-9"
                  data-testid="admin-notif-email"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title">Titlu</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              placeholder="Ex: Lansare oficială pe 1 iunie!"
              data-testid="admin-notif-title"
            />
            <p className="text-[10px] text-muted-foreground">
              {title.length}/140
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">Mesaj</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={6}
              placeholder="Scrie aici conținutul anunțului..."
              data-testid="admin-notif-body"
            />
            <p className="text-[10px] text-muted-foreground">
              {body.length}/2000
            </p>
          </div>

          <Button
            type="submit"
            disabled={sending}
            data-testid="admin-notif-submit"
            className="w-full sm:w-auto"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Se trimite...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Trimite notificarea
              </>
            )}
          </Button>
        </form>

        {/* History */}
        <aside
          className="rounded-2xl border border-border/60 bg-card p-5 space-y-3"
          data-testid="admin-notifications-history"
        >
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4" /> Trimise recent
          </h2>
          {historyLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Niciun mesaj trimis încă.
            </p>
          ) : (
            <ul className="space-y-2 max-h-[65vh] overflow-y-auto pr-1 -mr-1">
              {history.map((h, idx) => (
                <li
                  key={`${h.created_at}-${idx}`}
                  className="rounded-xl border border-border/60 bg-background/40 px-3 py-2.5"
                  data-testid={`admin-notif-history-${idx}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">
                      {h.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDate(h.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-line">
                    {h.body}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground tracking-wide uppercase">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" /> {h.recipients}
                    </span>
                    <span>
                      Citit: {h.read_count}/{h.recipients}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
