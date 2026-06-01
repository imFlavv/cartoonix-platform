import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Radio, Save, Clock, RotateCw } from "lucide-react";

/**
 * Returns a string formatted for <input type="datetime-local">
 * from any ISO string, in the user's local timezone.
 */
function isoToLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function localInputToISO(local) {
  if (!local) return "";
  // datetime-local has no tz — interpret as user's local time.
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function StateBadge({ state }) {
  if (!state) return null;
  const map = {
    live: { label: "În direct", cls: "bg-red-500/15 border-red-500/40 text-red-300" },
    scheduled: { label: "Programat", cls: "bg-amber-400/15 border-amber-400/40 text-amber-200" },
    ended: { label: "Terminat", cls: "bg-white/[0.04] border-white/15 text-white/60" },
    disabled: { label: "Dezactivat", cls: "bg-white/[0.04] border-white/15 text-white/40" },
  };
  const m = map[state] || map.disabled;
  return (
    <span
      data-testid="admin-live-state-badge"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] ${m.cls}`}
    >
      {state === "live" && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      )}
      {m.label}
    </span>
  );
}

function Field({ label, hint, children, testId }) {
  return (
    <div data-testid={testId} className="space-y-1.5">
      <label className="text-[12px] uppercase tracking-[0.22em] text-white/45">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-white/35">{hint}</p>}
    </div>
  );
}

export default function AdminLive() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);

  const refresh = async () => {
    try {
      const { data } = await api.get("/admin/live/maraton");
      setConfig(data.config);
      setStatus(data.status);
    } catch {
      toast.error("Nu am putut încărca setările live.");
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, []);

  const durationLabel = useMemo(() => {
    if (!config) return "";
    const s = Number(config.duration_seconds || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}min`;
  }, [config]);

  const onSave = async () => {
    if (!config || saving) return;
    setSaving(true);
    try {
      const payload = {
        enabled: !!config.enabled,
        title: config.title,
        subtitle: config.subtitle,
        poster_url: config.poster_url,
        video_path: config.video_path,
        youtube_url: config.youtube_url,
        duration_seconds: Number(config.duration_seconds || 0),
        start_iso: config.start_iso,
        program: (config.program || []).filter((s) => String(s).trim() !== ""),
      };
      const { data } = await api.patch("/admin/live/maraton", payload);
      setConfig(data.config);
      setStatus(data.status);
      toast.success("Setările maratonului au fost salvate.");
    } catch (err) {
      toast.error(
        err?.response?.data?.detail || "Nu am putut salva setările maratonului."
      );
    } finally {
      setSaving(false);
    }
  };

  const onStartNow = () => {
    if (!config) return;
    const now = new Date();
    setConfig({ ...config, start_iso: now.toISOString() });
    toast.message("Ora de start setată la „acum”. Apasă „Salvează” pentru a confirma.");
  };

  if (loading || !config) {
    return (
      <div className="grid place-items-center py-20 text-white/50">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Radio className="h-5 w-5 text-red-400" />
            <span className="text-[11px] uppercase tracking-[0.3em] text-red-400/80">
              Cartoonix Live
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl tracking-wider text-white">
            Maraton live
          </h1>
          <p className="mt-1 text-sm text-white/45 max-w-2xl">
            Configurează evenimentul live afișat utilizatorilor în
            /live. Stream-ul este o pseudo-transmisiune: video-ul este redat
            sincronizat cu ora de start, iar derularea este blocată.
          </p>
        </div>
        <StateBadge state={status?.state} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/45">
              Activare
            </div>
            <p className="mt-1 text-sm text-white/70">
              {config.enabled
                ? "Maratonul este vizibil utilizatorilor."
                : "Maratonul este ascuns. Pagina /live afișează „nicio transmisiune”."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.enabled}
            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
            data-testid="admin-live-toggle-enabled"
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              config.enabled
                ? "bg-gradient-to-r from-[#ff3b3b] to-[#facc15]"
                : "bg-white/15"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition ${
                config.enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Titlu" testId="admin-live-field-title">
            <input
              type="text"
              value={config.title || ""}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              data-testid="admin-live-input-title"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 h-11 text-sm text-white focus:outline-none focus:border-[hsl(var(--accent))]/60"
              placeholder="Maraton Cartoonix"
            />
          </Field>

          <Field label="Subtitlu (opțional)" testId="admin-live-field-subtitle">
            <input
              type="text"
              value={config.subtitle || ""}
              onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
              data-testid="admin-live-input-subtitle"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 h-11 text-sm text-white focus:outline-none focus:border-[hsl(var(--accent))]/60"
              placeholder="Ex: 8 ore non-stop de desene legendare"
            />
          </Field>

          <Field
            label="Începe la"
            hint={`Server: ${new Date(config.start_iso).toLocaleString("ro-RO")}`}
            testId="admin-live-field-start"
          >
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={isoToLocalInput(config.start_iso)}
                onChange={(e) =>
                  setConfig({ ...config, start_iso: localInputToISO(e.target.value) })
                }
                data-testid="admin-live-input-start"
                className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3.5 h-11 text-sm text-white focus:outline-none focus:border-[hsl(var(--accent))]/60"
              />
              <button
                type="button"
                onClick={onStartNow}
                data-testid="admin-live-startnow"
                className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08]"
                title="Setează ora de start la acum"
              >
                <Clock className="h-4 w-4" />
              </button>
            </div>
          </Field>

          <Field
            label="Durată (secunde)"
            hint={`Aproximativ ${durationLabel}`}
            testId="admin-live-field-duration"
          >
            <input
              type="number"
              min={1}
              value={config.duration_seconds || 0}
              onChange={(e) =>
                setConfig({ ...config, duration_seconds: Number(e.target.value) })
              }
              data-testid="admin-live-input-duration"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 h-11 text-sm text-white focus:outline-none focus:border-[hsl(var(--accent))]/60"
            />
          </Field>

          <Field
            label="Cale video (fallback local)"
            hint={`Folosit doar dacă „URL YouTube" e gol. Relativ la VIDEO_DIR (ex: Maraton/0601.mp4). URL: ${status?.video_url || ""}`}
            testId="admin-live-field-path"
          >
            <input
              type="text"
              value={config.video_path || ""}
              onChange={(e) => setConfig({ ...config, video_path: e.target.value })}
              data-testid="admin-live-input-path"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 h-11 text-sm text-white focus:outline-none focus:border-[hsl(var(--accent))]/60"
              placeholder="Maraton/0601.mp4"
            />
          </Field>

          <Field
            label="URL YouTube (recomandat)"
            hint={`Folosit pentru sute/mii de spectatori concurenți (CDN gratuit). Acceptă youtu.be/..., youtube.com/watch?v=...${status?.youtube_id ? ` — ID detectat: ${status.youtube_id}` : ""}`}
            testId="admin-live-field-youtube"
          >
            <input
              type="text"
              value={config.youtube_url || ""}
              onChange={(e) => setConfig({ ...config, youtube_url: e.target.value })}
              data-testid="admin-live-input-youtube"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 h-11 text-sm text-white focus:outline-none focus:border-[hsl(var(--accent))]/60"
              placeholder="https://youtu.be/..."
            />
          </Field>

          <Field
            label="Poster (opțional)"
            hint="Imagine afișată în starea „programat” și în card-ul de pe homepage."
            testId="admin-live-field-poster"
          >
            <input
              type="text"
              value={config.poster_url || ""}
              onChange={(e) => setConfig({ ...config, poster_url: e.target.value })}
              data-testid="admin-live-input-poster"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 h-11 text-sm text-white focus:outline-none focus:border-[hsl(var(--accent))]/60"
              placeholder="https://... sau /api/uploads/..."
            />
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Programul maratonului"
              hint="Câte un desen pe linie. Se afișează pe /live ca listă numerotată."
              testId="admin-live-field-program"
            >
              <textarea
                rows={10}
                value={(config.program || []).join("\n")}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    program: e.target.value.split("\n"),
                  })
                }
                data-testid="admin-live-input-program"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm text-white focus:outline-none focus:border-[hsl(var(--accent))]/60 font-mono leading-relaxed"
                placeholder={"Noua Școală a Împăratului\nEd, Edd și Eddy\nA.T.O.M\n..."}
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={refresh}
            data-testid="admin-live-refresh"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-3.5 h-10 text-sm text-white/70 hover:text-white transition-colors"
          >
            <RotateCw className="h-4 w-4" /> Reîmprospătează status
          </button>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            data-testid="admin-live-save"
            className="h-10 rounded-xl bg-[hsl(var(--accent))] text-black hover:brightness-110 font-semibold"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvează
          </Button>
        </div>
      </div>

      {/* Live computed metrics */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 mb-3">
          Status calculat
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3.5 py-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">
              Stare
            </div>
            <div className="mt-1.5">
              <StateBadge state={status?.state} />
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3.5 py-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">
              Ora server (UTC)
            </div>
            <div className="mt-1 text-white tabular-nums">
              {status?.now_iso ? new Date(status.now_iso).toUTCString() : "—"}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3.5 py-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">
              Elapsed
            </div>
            <div className="mt-1 text-white tabular-nums">
              {status?.elapsed_seconds != null
                ? `${Math.floor(status.elapsed_seconds / 60)} min`
                : "—"}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/30 px-3.5 py-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">
              Până la sfârșit
            </div>
            <div className="mt-1 text-white tabular-nums">
              {status?.seconds_until_end != null
                ? `${Math.floor(status.seconds_until_end / 60)} min`
                : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
