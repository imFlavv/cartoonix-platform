import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api, mediaUrl } from "@/lib/api";
import { toast } from "sonner";
import {
  MessageSquare,
  Power,
  Send as SendIcon,
  Lock,
  Unlock,
  Pin,
  Trash2,
  ShieldOff,
  Volume2,
  VolumeX,
  Eye,
  Loader2,
  Plus,
  X,
  Crown,
  Globe2,
  Hash,
  Clock,
  Search,
  ShieldAlert,
  Users,
  Settings as SettingsIcon,
  Save,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function Toggle({ checked, onChange, disabled, id, color = "default" }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      data-testid={id}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/40 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? color === "danger"
            ? "bg-gradient-to-r from-red-500 to-orange-500"
            : "bg-gradient-to-r from-[#ff3b3b] to-[#facc15]"
          : "bg-white/15"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function StatCard({ icon: Icon, label, value, accent = "default" }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4 flex items-center gap-3">
      <div
        className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
        style={{
          background:
            accent === "warning"
              ? "linear-gradient(135deg,#f59e0b,#ea580c)"
              : accent === "danger"
              ? "linear-gradient(135deg,#ef4444,#dc2626)"
              : "linear-gradient(135deg,#ff3b3b,#facc15)",
          color: "#0a0a0a",
        }}
      >
        <Icon className="h-5 w-5" strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-display font-bold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </div>
      </div>
    </div>
  );
}

function PlanPill({ plan, role }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-red-500/20 px-1.5 py-[1px] text-[10px] font-bold uppercase tracking-wider text-red-300 ring-1 ring-red-500/40">
        <ShieldAlert className="h-3 w-3" />
        Admin
      </span>
    );
  }
  if (plan === "plus") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-[1px] text-[10px] font-bold uppercase tracking-wider"
        style={{
          background: "linear-gradient(135deg,#ff3b3b,#ff7a1a,#facc15)",
          color: "#0a0a0a",
        }}
      >
        <Crown className="h-3 w-3" strokeWidth={2.5} />
        Plus
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      Free
    </span>
  );
}

function MessageRow({ msg, onPin, onDelete, onModerate, onHistory }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`group relative flex items-start gap-3 px-3 py-2 rounded-xl transition-colors ${
        msg.deleted ? "opacity-50" : "hover:bg-white/[0.03]"
      }`}
    >
      <div className="h-9 w-9 shrink-0 rounded-lg overflow-hidden ring-1 ring-white/10 bg-black/40">
        {msg.avatar_url && (
          <img
            src={mediaUrl(msg.avatar_url)}
            alt={msg.nickname}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`font-semibold text-sm ${
              msg.role === "admin"
                ? "text-red-300"
                : msg.plan === "plus"
                ? "text-amber-200"
                : "text-white"
            }`}
          >
            {msg.nickname}
          </span>
          <PlanPill plan={msg.plan} role={msg.role} />
          <span className="text-[11px] text-muted-foreground ml-auto">
            {new Date(msg.created_at).toLocaleTimeString("ro-RO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="text-sm text-white/90 break-words whitespace-pre-wrap mt-0.5">
          {msg.deleted ? (
            <span className="italic text-muted-foreground">
              [Mesaj șters]
            </span>
          ) : (
            msg.content
          )}
        </div>
      </div>
      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1.5 rounded-md hover:bg-white/10"
              data-testid={`msg-actions-${msg.id}`}
            >
              <SettingsIcon className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">
              Acțiuni mesaj
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!msg.deleted && (
              <>
                <DropdownMenuItem onClick={() => onPin(msg)}>
                  <Pin className="h-4 w-4 mr-2" />
                  Fixează mesajul
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(msg)}
                  className="text-red-400 focus:text-red-300"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Șterge mesaj
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuLabel className="text-xs">
              Acțiuni utilizator
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onHistory(msg.user_id)}>
              <Eye className="h-4 w-4 mr-2" />
              Vezi istoric
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onModerate(msg.user_id, "mute_5m")}>
              <VolumeX className="h-4 w-4 mr-2" />
              Mute 5 min
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onModerate(msg.user_id, "mute_1h")}>
              <VolumeX className="h-4 w-4 mr-2" />
              Mute 1 oră
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onModerate(msg.user_id, "mute_24h")}>
              <VolumeX className="h-4 w-4 mr-2" />
              Mute 24 ore
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onModerate(msg.user_id, "ban")}
              className="text-red-400 focus:text-red-300"
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              Ban permanent
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function AdminChat() {
  const [adminState, setAdminState] = useState(null);
  const [stats, setStats] = useState({ total_messages: 0, online_total: 0, active_sanctions: 0 });
  const [room, setRoom] = useState("global");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(null);
  const [newWord, setNewWord] = useState("");
  const [historyUser, setHistoryUser] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [sanctions, setSanctions] = useState([]);
  const [confirm, setConfirm] = useState(null); // { title, body, onConfirm }

  const refreshAll = useCallback(async () => {
    try {
      const [stateRes, sanctionsRes] = await Promise.all([
        api.get("/chat/admin/state"),
        api.get("/chat/admin/sanctions"),
      ]);
      setAdminState(stateRes.data);
      setStats(stateRes.data.stats || {});
      if (!localSettings) setLocalSettings(stateRes.data.settings);
      setSanctions(sanctionsRes.data?.items || []);
    } catch (e) {
      toast.error("Nu am putut încărca datele chat-ului");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSettings]);

  const refreshMessages = useCallback(async () => {
    try {
      const { data } = await api.get(`/chat/admin/messages?room=${room}&limit=150`);
      setMessages(data.items || []);
    } catch (e) {
      /* ignore */
    }
  }, [room]);

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshMessages();
    const t = setInterval(refreshMessages, 3000);
    const t2 = setInterval(refreshAll, 8000);
    return () => {
      clearInterval(t);
      clearInterval(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const patchSettings = async (patch, optimistic = true) => {
    if (optimistic) {
      setLocalSettings((s) => ({ ...s, ...patch }));
    }
    setSavingSettings(true);
    try {
      const { data } = await api.patch("/chat/admin/settings", patch);
      setLocalSettings(data.settings);
      toast.success("Setări actualizate");
    } catch (e) {
      toast.error("Nu am putut salva setările");
      refreshAll();
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddWord = async () => {
    const w = newWord.trim().toLowerCase();
    if (!w) return;
    const list = Array.from(
      new Set([...(localSettings?.chat_banned_words || []), w])
    );
    setNewWord("");
    await patchSettings({ chat_banned_words: list });
  };

  const handleRemoveWord = async (w) => {
    const list = (localSettings?.chat_banned_words || []).filter((x) => x !== w);
    await patchSettings({ chat_banned_words: list });
  };

  const handlePin = async (msg) => {
    try {
      await api.post("/chat/admin/pin", { message_id: msg.id });
      toast.success("Mesaj fixat în chat");
      refreshAll();
    } catch (e) {
      toast.error("Nu am putut fixa mesajul");
    }
  };

  const handleUnpin = async () => {
    try {
      await api.post("/chat/admin/pin", { message_id: null });
      toast.success("Mesaj fixat eliminat");
      refreshAll();
    } catch (e) {
      toast.error("Nu am putut elimina");
    }
  };

  const handleDelete = (msg) => {
    setConfirm({
      title: "Șterge mesaj?",
      body: `"${msg.content.slice(0, 60)}${msg.content.length > 60 ? "…" : ""}"`,
      onConfirm: async () => {
        try {
          await api.delete(`/chat/admin/messages/${msg.id}`);
          toast.success("Mesaj șters");
          refreshMessages();
        } catch (e) {
          toast.error("Nu am putut șterge mesajul");
        }
      },
    });
  };

  const handleModerate = async (user_id, action) => {
    try {
      await api.post("/chat/admin/moderate", { user_id, action });
      const label = {
        mute_5m: "Mute 5 min aplicat",
        mute_1h: "Mute 1 oră aplicat",
        mute_24h: "Mute 24 ore aplicat",
        mute_perm: "Mute permanent aplicat",
        ban: "Ban permanent aplicat",
        unmute: "Mute eliminat",
        unban: "Ban eliminat",
      }[action] || "Acțiune aplicată";
      toast.success(label);
      refreshAll();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Nu am putut aplica acțiunea");
    }
  };

  const openHistory = async (user_id) => {
    setHistoryUser(user_id);
    setHistoryData(null);
    try {
      const { data } = await api.get(`/chat/admin/users/${user_id}/history?limit=80`);
      setHistoryData(data);
    } catch (e) {
      toast.error("Nu am putut încărca istoricul");
      setHistoryUser(null);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const s = localSettings || {};
  const pinned = s.chat_pinned_message;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="font-display text-3xl tracking-wider flex items-center gap-3">
          <MessageSquare className="h-7 w-7 text-[#facc15]" />
          Chat
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Moderare, setări și mesaje live din chat-ul Cartoonix.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon={Hash}
          label="Mesaje totale"
          value={stats.total_messages || 0}
        />
        <StatCard
          icon={Users}
          label="Online acum"
          value={stats.online_total || 0}
        />
        <StatCard
          icon={ShieldOff}
          label="Sancțiuni active"
          value={stats.active_sanctions || 0}
          accent={stats.active_sanctions ? "warning" : "default"}
        />
      </div>

      {/* Master toggles */}
      <div className="rounded-2xl border border-border bg-card/70 p-5 space-y-5">
        <div>
          <h2 className="font-display text-xl tracking-wide">Control general</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Activează/dezactivează chat-ul sau opreste temporar trimiterea de mesaje.
          </p>
        </div>

        <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-black/20 border border-border/40">
          <div className="flex items-start gap-3">
            <div
              className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
              style={{
                background: s.chat_enabled
                  ? "linear-gradient(135deg,#10b981,#059669)"
                  : "linear-gradient(135deg,#6b7280,#374151)",
                color: "white",
              }}
            >
              <Power className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold flex items-center gap-2">
                Chat activ
                {s.chat_enabled ? (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                    Activ
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground font-bold">
                    Inactiv
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Când e dezactivat, widget-ul de chat este ascuns complet pentru toți
                utilizatorii (admin-ul îl vede în continuare aici).
              </p>
            </div>
          </div>
          <Toggle
            id="chat-enabled-toggle"
            checked={!!s.chat_enabled}
            onChange={(v) => patchSettings({ chat_enabled: v })}
            disabled={savingSettings}
          />
        </div>

        <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-black/20 border border-border/40">
          <div className="flex items-start gap-3">
            <div
              className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
              style={{
                background: s.chat_messages_enabled
                  ? "linear-gradient(135deg,#3b82f6,#1d4ed8)"
                  : "linear-gradient(135deg,#f59e0b,#ea580c)",
                color: "white",
              }}
            >
              {s.chat_messages_enabled ? (
                <Unlock className="h-5 w-5" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="font-semibold flex items-center gap-2">
                Trimitere mesaje permisă
                {s.chat_messages_enabled ? (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                    Permis
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold">
                    Read-only
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Dezactivează doar trimiterea — chat-ul rămâne vizibil, dar nimeni
                nu mai poate scrie. Util în timpul evenimentelor sau pentru cooldown
                general.
              </p>
            </div>
          </div>
          <Toggle
            id="chat-messages-toggle"
            checked={!!s.chat_messages_enabled}
            onChange={(v) => patchSettings({ chat_messages_enabled: v })}
            disabled={savingSettings || !s.chat_enabled}
          />
        </div>

        {/* Slow mode + new user days */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-black/20 border border-border/40">
            <Label htmlFor="slow-mode" className="text-xs uppercase tracking-wider text-muted-foreground">
              Slow mode global (secunde)
            </Label>
            <Input
              id="slow-mode"
              type="number"
              min={0}
              max={600}
              value={s.chat_slow_mode_seconds ?? 0}
              onChange={(e) =>
                setLocalSettings((p) => ({
                  ...p,
                  chat_slow_mode_seconds: parseInt(e.target.value || "0", 10),
                }))
              }
              onBlur={() =>
                patchSettings(
                  { chat_slow_mode_seconds: parseInt(s.chat_slow_mode_seconds || 0, 10) },
                  false
                )
              }
              className="mt-1.5"
              data-testid="slow-mode-input"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Cooldown minim aplicat pentru toți (peste cei 5s de bază).
            </p>
          </div>
          <div className="p-3 rounded-xl bg-black/20 border border-border/40">
            <Label htmlFor="new-user-days" className="text-xs uppercase tracking-wider text-muted-foreground">
              Restricție utilizatori noi (zile)
            </Label>
            <Input
              id="new-user-days"
              type="number"
              min={0}
              max={30}
              value={s.chat_new_user_days ?? 3}
              onChange={(e) =>
                setLocalSettings((p) => ({
                  ...p,
                  chat_new_user_days: parseInt(e.target.value || "0", 10),
                }))
              }
              onBlur={() =>
                patchSettings(
                  { chat_new_user_days: parseInt(s.chat_new_user_days || 0, 10) },
                  false
                )
              }
              className="mt-1.5"
              data-testid="new-user-days-input"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Numărul de zile după înregistrare în care nu pot scrie. 0 = fără restricție.
            </p>
          </div>
        </div>

        {/* Block links */}
        <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-black/20 border border-border/40">
          <div>
            <div className="font-semibold text-sm">Blochează link-uri externe</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mesajele care conțin URL-uri sunt respinse automat.
            </p>
          </div>
          <Toggle
            id="block-links-toggle"
            checked={!!s.chat_block_links}
            onChange={(v) => patchSettings({ chat_block_links: v })}
            disabled={savingSettings}
          />
        </div>
      </div>

      {/* Banned words editor */}
      <div className="rounded-2xl border border-border bg-card/70 p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-xl tracking-wide flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
              Cuvinte interzise
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cuvintele de aici sunt cenzurate automat în mesaje (***).
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {s.chat_banned_words?.length || 0} cuvinte
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Adaugă cuvânt..."
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
            data-testid="banned-word-input"
          />
          <Button
            onClick={handleAddWord}
            data-testid="banned-word-add"
            className="text-black font-semibold"
            style={{
              background: "linear-gradient(135deg,#ff3b3b,#facc15)",
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Adaugă
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(s.chat_banned_words || []).map((w) => (
            <span
              key={w}
              className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-medium"
            >
              {w}
              <button
                onClick={() => handleRemoveWord(w)}
                className="opacity-50 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                aria-label={`Șterge ${w}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {(!s.chat_banned_words || s.chat_banned_words.length === 0) && (
            <span className="text-xs text-muted-foreground italic">
              Lista este goală. Adaugă primul cuvânt.
            </span>
          )}
        </div>
      </div>

      {/* Pinned message */}
      {pinned && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 flex items-start gap-3">
          <Pin className="h-5 w-5 text-amber-300 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-amber-300/80">
              Mesaj fixat
            </div>
            <div className="text-sm text-amber-100 mt-0.5 break-words">
              <span className="font-semibold">{pinned.nickname}:</span>{" "}
              {pinned.content}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUnpin}
            className="text-amber-200"
          >
            <X className="h-4 w-4 mr-1" /> Anulează fixarea
          </Button>
        </div>
      )}

      {/* Live messages */}
      <div className="rounded-2xl border border-border bg-card/70 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/60">
          <h2 className="font-display text-xl tracking-wide flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#facc15]" />
            Mesaje live
          </h2>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-black/30">
            <button
              onClick={() => setRoom("global")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                room === "global" ? "bg-white/10 text-white" : "text-muted-foreground"
              }`}
              data-testid="admin-room-global"
            >
              <Globe2 className="h-3.5 w-3.5" />
              Global
            </button>
            <button
              onClick={() => setRoom("plus")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                room === "plus" ? "text-black" : "text-amber-200"
              }`}
              style={
                room === "plus"
                  ? { background: "linear-gradient(135deg,#ff7a1a,#facc15)" }
                  : undefined
              }
              data-testid="admin-room-plus"
            >
              <Crown className="h-3.5 w-3.5" />
              Plus
            </button>
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {messages.length === 0 ? (
            <div className="grid place-items-center py-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                Niciun mesaj încă în această cameră.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <MessageRow
                key={m.id}
                msg={m}
                onPin={handlePin}
                onDelete={handleDelete}
                onModerate={handleModerate}
                onHistory={openHistory}
              />
            ))
          )}
        </div>
      </div>

      {/* Active sanctions */}
      <div className="rounded-2xl border border-border bg-card/70 overflow-hidden">
        <div className="p-4 border-b border-border/60">
          <h2 className="font-display text-xl tracking-wide flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-red-400" />
            Sancțiuni active
            <span className="text-xs text-muted-foreground font-normal ml-1">
              ({sanctions.length})
            </span>
          </h2>
        </div>
        {sanctions.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nicio sancțiune activă. 🎉
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {sanctions.map((sa) => (
              <div
                key={sa.user_id}
                className="flex items-center gap-3 p-3 hover:bg-white/[0.02]"
              >
                <div className="h-9 w-9 rounded-lg overflow-hidden ring-1 ring-white/10 bg-black/40 shrink-0">
                  {sa.user?.avatar_url && (
                    <img
                      src={mediaUrl(sa.user.avatar_url)}
                      alt={sa.user?.nickname}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    {sa.user?.nickname || sa.user_id.slice(0, 8)}
                    <PlanPill plan={sa.user?.subscription} />
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${
                        sa.type === "ban"
                          ? "bg-red-500/20 text-red-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {sa.type === "ban" ? "BAN" : "MUTE"}
                    </span>
                    {sa.until ? (
                      <span>
                        până{" "}
                        {new Date(sa.until).toLocaleString("ro-RO", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    ) : (
                      <span>permanent</span>
                    )}
                    {sa.reason && <span>· {sa.reason}</span>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openHistory(sa.user_id)}
                  className="text-xs"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Istoric
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleModerate(sa.user_id, sa.type === "ban" ? "unban" : "unmute")
                  }
                  className="text-xs text-emerald-300"
                >
                  Anulează
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History dialog */}
      <Dialog
        open={!!historyUser}
        onOpenChange={(v) => {
          if (!v) {
            setHistoryUser(null);
            setHistoryData(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-[#facc15]" />
              Istoric utilizator
            </DialogTitle>
            <DialogDescription>
              Ultimele mesaje din chat ale acestui utilizator.
            </DialogDescription>
          </DialogHeader>
          {!historyData ? (
            <div className="grid place-items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-border/40">
                <div className="h-12 w-12 rounded-xl overflow-hidden ring-1 ring-white/10 bg-black/40">
                  {historyData.user?.avatar_url && (
                    <img
                      src={mediaUrl(historyData.user.avatar_url)}
                      alt={historyData.user?.nickname}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold flex items-center gap-2">
                    {historyData.user?.nickname}
                    <PlanPill
                      plan={historyData.user?.subscription}
                      role={historyData.user?.role}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {historyData.user?.email}
                  </div>
                </div>
                {historyData.sanction && (
                  <div className="text-xs text-amber-300">
                    {historyData.sanction.type === "ban" ? "BANAT" : "MUTE"} activ
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleModerate(historyData.user.id, "mute_5m")}
                >
                  <VolumeX className="h-3.5 w-3.5 mr-1" />
                  Mute 5m
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleModerate(historyData.user.id, "mute_1h")}
                >
                  <VolumeX className="h-3.5 w-3.5 mr-1" />
                  Mute 1h
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleModerate(historyData.user.id, "mute_24h")}
                >
                  <VolumeX className="h-3.5 w-3.5 mr-1" />
                  Mute 24h
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleModerate(historyData.user.id, "mute_perm")}
                >
                  <VolumeX className="h-3.5 w-3.5 mr-1" />
                  Mute permanent
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-400"
                  onClick={() => handleModerate(historyData.user.id, "ban")}
                >
                  <ShieldOff className="h-3.5 w-3.5 mr-1" />
                  Ban
                </Button>
                {historyData.sanction && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-emerald-300 ml-auto"
                    onClick={() =>
                      handleModerate(
                        historyData.user.id,
                        historyData.sanction.type === "ban" ? "unban" : "unmute"
                      )
                    }
                  >
                    Anulează sancțiunea
                  </Button>
                )}
              </div>

              <div className="max-h-[40vh] overflow-y-auto rounded-xl border border-border/40">
                {historyData.messages.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Niciun mesaj.
                  </div>
                ) : (
                  historyData.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-2 border-b border-border/30 last:border-0 ${
                        m.deleted ? "opacity-50" : ""
                      }`}
                    >
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(m.created_at).toLocaleString("ro-RO")}
                        {" · "}
                        Cameră: {m.room}
                        {m.deleted && " · ȘTERS"}
                      </div>
                      <div className="text-sm">{m.content}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <Dialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              {confirm?.title}
            </DialogTitle>
            {confirm?.body && <DialogDescription>{confirm.body}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Anulează
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={async () => {
                const fn = confirm?.onConfirm;
                setConfirm(null);
                if (fn) await fn();
              }}
            >
              Confirmă
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
