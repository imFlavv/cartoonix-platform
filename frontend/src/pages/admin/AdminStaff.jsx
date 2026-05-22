import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Eye,
  Users,
  Inbox,
  Filter,
  Search,
  Calendar,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api, mediaUrl } from "@/lib/api";
import { toast } from "sonner";

const STATUS_META = {
  pending: {
    label: "În revizuire",
    color: "text-amber-300",
    bg: "bg-amber-500/15",
    ring: "ring-amber-500/40",
    icon: Clock,
  },
  accepted: {
    label: "Acceptat",
    color: "text-emerald-300",
    bg: "bg-emerald-500/15",
    ring: "ring-emerald-500/40",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Respins",
    color: "text-red-300",
    bg: "bg-red-500/15",
    ring: "ring-red-500/40",
    icon: XCircle,
  },
};

const QUESTIONS = [
  ["age", "Vârsta"],
  ["used_since", "De cât timp folosește platforma"],
  ["activity_level", "Cât de des este activ"],
  ["motivation", "Motivație"],
  ["moderation_experience", "Experiență de moderare"],
  ["conflict_handling", "Cum ar gestiona un conflict"],
  ["scenario_spam", "Scenariu: spam în chat"],
  ["scenario_toxic_joke", 'Scenariu: limbaj toxic "în glumă"'],
  ["scenario_friend_breaks_rules", "Scenariu: prieten care încalcă regulile"],
  ["hours_per_day", "Ore/zi disponibilitate"],
  ["time_intervals", "Intervale orare"],
  ["improvements", "Ce ar îmbunătăți (opțional)"],
];

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${meta.bg} ${meta.color} ring-1 ${meta.ring}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color = "text-foreground" }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={`mt-1 font-display text-3xl ${color}`}>{value}</div>
    </div>
  );
}

function ApplicationDetail({ appData, onClose, onStatusChanged }) {
  const [status, setStatus] = useState(appData?.status || "pending");
  const [note, setNote] = useState(appData?.admin_note || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(appData?.status || "pending");
    setNote(appData?.admin_note || "");
  }, [appData]);

  if (!appData) return null;
  const answers = appData.answers || {};

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(
        `/staff/admin/applications/${appData.id}/status`,
        { status, admin_note: note || null }
      );
      toast.success("Status actualizat");
      onStatusChanged?.(data.application);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Nu am putut salva");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!appData} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#facc15]" />
            Aplicație Staff
            <StatusBadge status={status} />
          </DialogTitle>
          <DialogDescription>
            Răspunsurile complete ale candidatului.
          </DialogDescription>
        </DialogHeader>

        {/* User header */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-border/50">
          {appData.avatar_url ? (
            <img
              src={mediaUrl(appData.avatar_url)}
              alt={appData.nickname}
              className="h-12 w-12 rounded-lg object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-white/5 grid place-items-center text-muted-foreground">
              ?
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{appData.nickname}</div>
            <div className="text-xs text-muted-foreground truncate">
              {appData.email}
              {" · "}
              <span className="uppercase">{appData.subscription || "free"}</span>
            </div>
          </div>
          <div className="text-right text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3 inline mr-1" />
            {new Date(appData.created_at).toLocaleString("ro-RO")}
          </div>
        </div>

        {/* Answers */}
        <div className="space-y-3 mt-2">
          {QUESTIONS.map(([key, label]) => {
            const v = answers[key];
            if (v === null || v === undefined || v === "") {
              return (
                <div
                  key={key}
                  className="rounded-xl border border-border/40 bg-card/40 p-3"
                >
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                    {label}
                  </div>
                  <div className="text-sm italic text-muted-foreground/60">
                    (necompletat)
                  </div>
                </div>
              );
            }
            return (
              <div
                key={key}
                className="rounded-xl border border-border/40 bg-card/40 p-3"
              >
                <div className="text-[11px] uppercase tracking-wider text-amber-300/90 font-semibold mb-1">
                  {label}
                </div>
                <div className="text-sm whitespace-pre-wrap break-words">
                  {String(v)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status edit */}
        <div
          className="mt-3 rounded-2xl p-4 space-y-3"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,122,26,0.06), rgba(250,204,21,0.04))",
            border: "1px solid rgba(250,204,21,0.2)",
          }}
        >
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Setează status
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {["pending", "accepted", "rejected"].map((s) => {
              const meta = STATUS_META[s];
              const Icon = meta.icon;
              const active = status === s;
              return (
                <button
                  type="button"
                  key={s}
                  onClick={() => setStatus(s)}
                  data-testid={`status-${s}`}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    active
                      ? `${meta.bg} ${meta.color} ring-1 ${meta.ring}`
                      : "bg-white/5 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {meta.label}
                </button>
              );
            })}
          </div>

          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Notă pentru utilizator (opțional)
          </Label>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder='ex: "Mulțumim, te vom contacta în 48h." sau motivul respingerii.'
            data-testid="admin-note"
          />
          <Button
            onClick={save}
            disabled={saving}
            data-testid="save-status"
            className="w-full font-semibold text-black"
            style={{
              background:
                "linear-gradient(135deg,#ff3b3b,#ff7a1a 50%,#facc15)",
            }}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvează status
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminStaff() {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({
    pending: 0,
    accepted: 0,
    rejected: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get(
        `/staff/admin/applications?status=${filter}&limit=300`
      );
      setItems(data.items || []);
      setCounts(
        data.counts || { pending: 0, accepted: 0, rejected: 0, total: 0 }
      );
    } catch (e) {
      toast.error("Nu am putut încărca aplicațiile");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (a) =>
        (a.nickname || "").toLowerCase().includes(q) ||
        (a.email || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wider flex items-center gap-3">
          <Shield className="h-7 w-7 text-[#facc15]" />
          Staff Applications
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aplicații pentru a face parte din staff-ul Cartoonix.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Inbox}
          label="Total"
          value={counts.total || 0}
        />
        <StatCard
          icon={Clock}
          label="În revizuire"
          value={counts.pending || 0}
          color="text-amber-300"
        />
        <StatCard
          icon={CheckCircle2}
          label="Acceptate"
          value={counts.accepted || 0}
          color="text-emerald-300"
        />
        <StatCard
          icon={XCircle}
          label="Respinse"
          value={counts.rejected || 0}
          color="text-red-300"
        />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card/70 p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-black/30">
          {[
            { v: "pending", l: "În revizuire" },
            { v: "accepted", l: "Acceptate" },
            { v: "rejected", l: "Respinse" },
            { v: "all", l: "Toate" },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setFilter(opt.v)}
              data-testid={`filter-${opt.v}`}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filter === opt.v
                  ? "bg-white/10 text-white"
                  : "text-muted-foreground hover:bg-white/5"
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută după nickname sau email..."
            data-testid="search-applications"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-black/20 p-10 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
          <p className="text-sm text-muted-foreground">
            Nicio aplicație în această categorie.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/70 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-bold border-b border-border/60 bg-black/30">
            <div className="col-span-5 sm:col-span-4">Utilizator</div>
            <div className="hidden sm:block col-span-3">Email</div>
            <div className="col-span-3 sm:col-span-2">Status</div>
            <div className="col-span-3 sm:col-span-2">Trimisă</div>
            <div className="col-span-1 text-right">Acțiuni</div>
          </div>
          {filtered.map((a) => (
            <div
              key={a.id}
              className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-b border-border/30 last:border-b-0 hover:bg-white/[0.02] transition-colors"
              data-testid={`application-${a.id}`}
            >
              <div className="col-span-5 sm:col-span-4 flex items-center gap-2 min-w-0">
                {a.avatar_url ? (
                  <img
                    src={mediaUrl(a.avatar_url)}
                    alt={a.nickname}
                    className="h-8 w-8 rounded-md object-cover ring-1 ring-white/10 shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-md bg-white/5 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {a.nickname}
                  </div>
                  <div className="sm:hidden text-[11px] text-muted-foreground truncate">
                    {a.email}
                  </div>
                </div>
              </div>
              <div className="hidden sm:block col-span-3 text-xs text-muted-foreground truncate">
                {a.email}
              </div>
              <div className="col-span-3 sm:col-span-2">
                <StatusBadge status={a.status} />
              </div>
              <div className="col-span-3 sm:col-span-2 text-[11px] text-muted-foreground">
                {new Date(a.created_at).toLocaleDateString("ro-RO")}
              </div>
              <div className="col-span-1 text-right">
                <button
                  onClick={() => setDetail(a)}
                  data-testid={`view-${a.id}`}
                  className="p-2 rounded-md hover:bg-white/10 transition-colors"
                  aria-label="Vezi aplicația"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ApplicationDetail
        appData={detail}
        onClose={() => setDetail(null)}
        onStatusChanged={(updated) => {
          setDetail(updated);
          refresh();
        }}
      />
    </div>
  );
}
