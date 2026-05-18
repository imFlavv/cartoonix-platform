import React, { useCallback, useEffect, useState } from "react";
import { Inbox as InboxIcon, MailOpen, Trash2, Loader2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

function formatRelativeRO(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return "acum câteva secunde";
  const min = Math.floor(sec / 60);
  if (min < 60) return `acum ${min} ${min === 1 ? "minut" : "minute"}`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `acum ${hr} ${hr === 1 ? "oră" : "ore"}`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `acum ${days} ${days === 1 ? "zi" : "zile"}`;
  return date.toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * InboxPanel — content for the Inbox dialog.
 * Renders the user's notifications list with mark-read / delete actions.
 *
 * Props:
 *  - open (bool): when true, fetches the list.
 *  - onUnreadChange (fn): notified whenever the unread count likely changed.
 */
export default function InboxPanel({ open, onUnreadChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/notifications");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      toast.error("Nu am putut încărca mesajele.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const markRead = async (id) => {
    setBusyId(id);
    try {
      await api.post(`/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      onUnreadChange?.();
    } catch {
      toast.error("Acțiunea a eșuat.");
    } finally {
      setBusyId(null);
    }
  };

  const removeOne = async (id) => {
    setBusyId(id);
    try {
      await api.delete(`/notifications/${id}`);
      setItems((prev) => prev.filter((n) => n.id !== id));
      onUnreadChange?.();
    } catch {
      toast.error("Nu am putut șterge mesajul.");
    } finally {
      setBusyId(null);
    }
  };

  const markAll = async () => {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await api.post("/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      onUnreadChange?.();
      toast.success("Toate mesajele au fost marcate ca citite.");
    } catch {
      toast.error("Acțiunea a eșuat.");
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="space-y-3" data-testid="inbox-panel">
      {/* Header row with actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/55">
          {loading
            ? "Se încarcă..."
            : items.length === 0
            ? "Niciun mesaj"
            : `${items.length} ${items.length === 1 ? "mesaj" : "mesaje"} · ${unreadCount} necitit${unreadCount === 1 ? "" : "e"}`}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAll}
            disabled={markingAll}
            data-testid="inbox-mark-all-read"
            className="h-8 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10 gap-1.5"
          >
            {markingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Marchează toate
          </Button>
        )}
      </div>

      {/* List / Empty / Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-white/50" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] py-10 flex flex-col items-center justify-center text-center">
          <div className="relative mb-4">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full blur-xl opacity-60"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(217,70,239,0.45), transparent 70%)",
              }}
            />
            <div className="relative h-14 w-14 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
              <InboxIcon className="h-6 w-6 text-white/70" />
            </div>
          </div>
          <p className="text-sm text-white/75 font-medium">Niciun mesaj nou</p>
          <p className="text-xs text-white/40 mt-1.5 max-w-[260px]">
            Vei primi aici notificările, anunțurile și mesajele din partea
            echipei Cartoonix.
          </p>
        </div>
      ) : (
        <ul
          className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 -mr-1"
          data-testid="inbox-list"
        >
          {items.map((n) => (
            <li
              key={n.id}
              data-testid={`inbox-item-${n.id}`}
              className={`group relative rounded-xl border px-4 py-3 transition-colors ${
                n.read
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-fuchsia-400/30 bg-fuchsia-400/[0.06]"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Unread dot */}
                <span className="mt-1.5 flex-shrink-0">
                  <span
                    className={`block h-2 w-2 rounded-full ${
                      n.read ? "bg-white/20" : "bg-fuchsia-400 shadow-[0_0_8px_rgba(217,70,239,0.7)]"
                    }`}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <h4 className="text-sm font-semibold text-white flex-1 leading-snug">
                      {n.title}
                    </h4>
                    <span className="text-[10px] text-white/40 tracking-wide whitespace-nowrap pt-0.5">
                      {formatRelativeRO(n.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/65 leading-relaxed whitespace-pre-line">
                    {n.body}
                  </p>
                  {/* Inline actions */}
                  <div className="mt-2.5 flex items-center gap-2">
                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        disabled={busyId === n.id}
                        data-testid={`inbox-mark-read-${n.id}`}
                        className="inline-flex items-center gap-1 text-[11px] text-white/65 hover:text-white px-2 py-1 rounded-md hover:bg-white/10 transition disabled:opacity-50"
                      >
                        <MailOpen className="h-3 w-3" />
                        Marchează citit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeOne(n.id)}
                      disabled={busyId === n.id}
                      data-testid={`inbox-delete-${n.id}`}
                      className="inline-flex items-center gap-1 text-[11px] text-white/50 hover:text-red-300 px-2 py-1 rounded-md hover:bg-white/10 transition disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Șterge
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
