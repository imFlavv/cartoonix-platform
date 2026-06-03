import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Eye, EyeOff, Globe, Loader2, AlertTriangle, Wrench, Rocket, LifeBuoy, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSettings } from "@/contexts/SettingsContext";

function Toggle({ checked, onChange, disabled, id }) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      data-testid={id}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/40 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "bg-gradient-to-r from-[#ff3b3b] to-[#facc15]"
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

export default function AdminSettings() {
  const { settings, refresh } = useSettings() || {};
  const [local, setLocal] = useState({
    presentation_mode: false,
    maintenance_mode: false,
    early_access_mode: false,
    support_enabled: true,
    announcement_active: false,
    announcement_text: "",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);

  useEffect(() => {
    let mounted = true;
    api
      .get("/admin/settings")
      .then(({ data }) => {
        if (mounted) {
          setLocal(data);
          setAnnouncementDraft(data?.announcement_text || "");
        }
      })
      .catch(() => {
        if (settings) setLocal(settings);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePresentation = async (next) => {
    if (saving) return;
    const prev = { ...local };
    // Optimistic mutual exclusion: turning presentation ON also turns early access OFF.
    setLocal((s) => ({
      ...s,
      presentation_mode: next,
      ...(next ? { early_access_mode: false } : {}),
    }));
    setSaving(true);
    try {
      const { data } = await api.patch("/admin/settings", {
        presentation_mode: next,
      });
      setLocal(data);
      if (refresh) await refresh();
      toast.success(
        next ? "Mod prezentare activat" : "Mod prezentare dezactivat",
        {
          description: next
            ? "Vizitatorii vor vedea pagina de prezentare. Doar înregistrarea este permisă."
            : "Platforma este complet disponibilă pentru utilizatori.",
        }
      );
    } catch (err) {
      // rollback
      setLocal(prev);
      toast.error("Nu am putut salva setarea", {
        description: err?.response?.data?.detail || "Încearcă din nou.",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleMaintenance = async (next) => {
    if (saving) return;
    const prev = local.maintenance_mode;
    setLocal((s) => ({ ...s, maintenance_mode: next }));
    setSaving(true);
    try {
      const { data } = await api.patch("/admin/settings", {
        maintenance_mode: next,
      });
      setLocal(data);
      if (refresh) await refresh();
      toast.success(
        next ? "Mod mentenanță activat" : "Mod mentenanță dezactivat",
        {
          description: next
            ? "Toți vizitatorii non-admin văd pagina de mentenanță. Adminii păstrează acces total."
            : "Platforma este din nou complet disponibilă.",
        }
      );
    } catch (err) {
      setLocal((s) => ({ ...s, maintenance_mode: prev }));
      toast.error("Nu am putut salva setarea", {
        description: err?.response?.data?.detail || "Încearcă din nou.",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleEarlyAccess = async (next) => {
    if (saving) return;
    const prev = { ...local };
    // Optimistic: turning early access ON also turns presentation OFF.
    setLocal((s) => ({
      ...s,
      early_access_mode: next,
      ...(next ? { presentation_mode: false } : {}),
    }));
    setSaving(true);
    try {
      const { data } = await api.patch("/admin/settings", {
        early_access_mode: next,
      });
      setLocal(data);
      if (refresh) await refresh();
      toast.success(
        next ? "Early Access activat" : "Early Access dezactivat",
        {
          description: next
            ? "Vizitatorii văd pagina /early-access cu formularul de înregistrare în 3 pași."
            : "Platforma revine la comportamentul normal.",
        }
      );
    } catch (err) {
      setLocal(prev);
      toast.error("Nu am putut salva setarea", {
        description: err?.response?.data?.detail || "Încearcă din nou.",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSupport = async (next) => {
    if (saving) return;
    const prev = local.support_enabled;
    setLocal((s) => ({ ...s, support_enabled: next }));
    setSaving(true);
    try {
      const { data } = await api.patch("/admin/settings", { support_enabled: next });
      setLocal(data);
      if (refresh) await refresh();
      toast.success(next ? "Sistem support activat" : "Sistem support dezactivat", {
        description: next
          ? "Linkul Support reapare în navigare și utilizatorii pot deschide tickete."
          : "Linkul Support a fost ascuns din navigare și nu mai pot fi create tickete noi.",
      });
    } catch (err) {
      setLocal((s) => ({ ...s, support_enabled: prev }));
      toast.error("Nu am putut salva setarea", {
        description: err?.response?.data?.detail || "Încearcă din nou.",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleAnnouncementActive = async (next) => {
    if (saving) return;
    const prev = local.announcement_active;
    setLocal((s) => ({ ...s, announcement_active: next }));
    setSaving(true);
    try {
      const { data } = await api.patch("/admin/settings", { announcement_active: next });
      setLocal(data);
      setAnnouncementDraft(data?.announcement_text || "");
      if (refresh) await refresh();
      toast.success(next ? "Bara de anunțuri activată" : "Bara de anunțuri dezactivată");
    } catch (err) {
      setLocal((s) => ({ ...s, announcement_active: prev }));
      toast.error("Nu am putut salva setarea", {
        description: err?.response?.data?.detail || "Încearcă din nou.",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveAnnouncementText = async () => {
    const text = (announcementDraft || "").trim();
    setSavingAnnouncement(true);
    try {
      const { data } = await api.patch("/admin/settings", { announcement_text: text });
      setLocal(data);
      setAnnouncementDraft(data?.announcement_text || "");
      if (refresh) await refresh();
      toast.success("Anunț salvat");
    } catch (err) {
      toast.error("Nu am putut salva anunțul", {
        description: err?.response?.data?.detail || "Încearcă din nou.",
      });
    } finally {
      setSavingAnnouncement(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl tracking-wider">Setări</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configurări globale pentru platforma Cartoonix.
        </p>
      </div>

      {/* PRESENTATION MODE CARD */}
      <div className="rounded-2xl border border-border bg-card/70 overflow-hidden">
        <div className="p-6 flex items-start gap-5">
          <div className="shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#ff3b3b] to-[#facc15] grid place-items-center text-black">
            <Globe className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl tracking-wide flex items-center gap-2">
                  Mod prezentare
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : local.presentation_mode ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 uppercase tracking-widest">
                      <Eye className="h-3 w-3" /> Activ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground uppercase tracking-widest">
                      <EyeOff className="h-3 w-3" /> Inactiv
                    </span>
                  )}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Când este activ, vizitatorii văd o pagină de prezentare în limba
                  română. Singura acțiune disponibilă este înregistrarea unui cont
                  — accesul la platformă rămâne restricționat. Adminii pot intra
                  normal în panou.
                </p>
              </div>
              <Toggle
                id="settings-presentation-toggle"
                checked={!!local.presentation_mode}
                onChange={togglePresentation}
                disabled={saving || loading}
              />
            </div>

            {local.presentation_mode && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="text-amber-200/90 font-medium">
                    Acces public limitat
                  </p>
                  <p className="text-amber-200/65 mt-0.5 leading-relaxed">
                    Toate rutele publice (login, dashboard, categorii) sunt acum
                    redirecționate către pagina de prezentare. Înregistrarea
                    rămâne deschisă.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-3 bg-black/20 border-t border-border/60 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Modificările se aplică instant pentru toți vizitatorii.
          </span>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            data-testid="settings-preview-presentation"
          >
            <a href="/" target="_blank" rel="noreferrer">
              Previzualizează →
            </a>
          </Button>
        </div>
      </div>

      {/* MAINTENANCE MODE CARD */}
      <div className="rounded-2xl border border-border bg-card/70 overflow-hidden">
        <div className="p-6 flex items-start gap-5">
          <div className="shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 grid place-items-center text-black">
            <Wrench className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl tracking-wide flex items-center gap-2">
                  Mod mentenanță
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : local.maintenance_mode ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 uppercase tracking-widest">
                      <Eye className="h-3 w-3" /> Activ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground uppercase tracking-widest">
                      <EyeOff className="h-3 w-3" /> Inactiv
                    </span>
                  )}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Când este activ, toți vizitatorii non-admin văd doar un mesaj
                  de mentenanță. Suprascrie Mod prezentare dacă acesta este
                  activ. Adminii pot intra în continuare în panou pentru a
                  dezactiva mentenanța.
                </p>
              </div>
              <Toggle
                id="settings-maintenance-toggle"
                checked={!!local.maintenance_mode}
                onChange={toggleMaintenance}
                disabled={saving || loading}
              />
            </div>

            {local.maintenance_mode && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/5 p-3">
                <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="text-red-200/90 font-medium">
                    Platforma este indisponibilă public
                  </p>
                  <p className="text-red-200/65 mt-0.5 leading-relaxed">
                    Toate paginile (inclusiv pagina de prezentare și
                    înregistrarea) afișează mesajul de mentenanță. Doar
                    /login și /admin rămân accesibile.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-3 bg-black/20 border-t border-border/60 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Modificările se aplică instant pentru toți vizitatorii.
          </span>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            data-testid="settings-preview-maintenance"
          >
            <a href="/" target="_blank" rel="noreferrer">
              Previzualizează →
            </a>
          </Button>
        </div>
      </div>

      {/* EARLY ACCESS CARD */}
      <div className="rounded-2xl border border-border bg-card/70 overflow-hidden">
        <div className="p-6 flex items-start gap-5">
          <div className="shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-600 grid place-items-center text-white">
            <Rocket className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl tracking-wide flex items-center gap-2">
                  Mod Early Access
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : local.early_access_mode ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-300 uppercase tracking-widest">
                      <Eye className="h-3 w-3" /> Activ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground uppercase tracking-widest">
                      <EyeOff className="h-3 w-3" /> Inactiv
                    </span>
                  )}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Când este activ, vizitatorii sunt direcționați spre <code className="text-fuchsia-300">/early-access</code> —
                  un formular în 3 pași: <strong>date personale</strong> →
                  <strong> alegere plan</strong> (FREE sau PLUS cu plată Stripe) →
                  <strong> verificare email</strong>. După înregistrare, vor vedea
                  countdown-ul până la 1 Iunie 2026.
                  <br />
                  <span className="text-amber-300/80">Notă:</span> activarea Early
                  Access dezactivează automat Mod prezentare (și invers).
                </p>
              </div>
              <Toggle
                id="settings-early-access-toggle"
                checked={!!local.early_access_mode}
                onChange={toggleEarlyAccess}
                disabled={saving || loading}
              />
            </div>

            {local.early_access_mode && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/5 p-3">
                <AlertTriangle className="h-4 w-4 text-fuchsia-300 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="text-fuchsia-100/90 font-medium">
                    Acces public limitat la Early Access
                  </p>
                  <p className="text-fuchsia-100/65 mt-0.5 leading-relaxed">
                    Toate paginile redirect către <code>/early-access</code>.
                    Doar <code>/login</code> și <code>/admin</code> rămân
                    accesibile. Utilizatorii deja înregistrați văd countdown-ul
                    pe pagina principală.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-3 bg-black/20 border-t border-border/60 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Modificările se aplică instant pentru toți vizitatorii.
          </span>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            data-testid="settings-preview-early-access"
          >
            <a href="/early-access" target="_blank" rel="noreferrer">
              Previzualizează →
            </a>
          </Button>
        </div>
      </div>

      {/* SUPPORT TOGGLE CARD */}
      <div className="rounded-2xl border border-border bg-card/70 overflow-hidden">
        <div className="p-6 flex items-start gap-5">
          <div className="shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl tracking-wide flex items-center gap-2">
                  Sistem de Support
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : local.support_enabled ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 uppercase tracking-widest">
                      <Eye className="h-3 w-3" /> Activ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground uppercase tracking-widest">
                      <EyeOff className="h-3 w-3" /> Inactiv
                    </span>
                  )}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Controlează disponibilitatea ticketelor de support. Când e
                  <strong> dezactivat</strong>, linkul „Support" dispare din
                  navigare, pagina <code>/support</code> redirecționează acasă, iar
                  utilizatorii nu pot crea sau răspunde la tickete. Adminii păstrează
                  acces complet la <code>/admin/support</code> pentru ticketele
                  existente.
                </p>
              </div>
              <Toggle
                id="settings-support-toggle"
                checked={!!local.support_enabled}
                onChange={toggleSupport}
                disabled={saving || loading}
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-3 bg-black/20 border-t border-border/60 flex items-center">
          <span className="text-xs text-muted-foreground">
            Schimbarea e instantanee pentru toți utilizatorii.
          </span>
        </div>
      </div>

      {/* ANNOUNCEMENT BAR CARD */}
      <div className="rounded-2xl border border-border bg-card/70 overflow-hidden">
        <div className="p-6 flex items-start gap-5">
          <div className="shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#ff3b3b] to-[#facc15] grid place-items-center text-black">
            <Megaphone className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl tracking-wide flex items-center gap-2">
                  Bară de anunțuri
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : local.announcement_active ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 uppercase tracking-widest">
                      <Eye className="h-3 w-3" /> Activ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground uppercase tracking-widest">
                      <EyeOff className="h-3 w-3" /> Inactiv
                    </span>
                  )}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Afișează mesaje importante imediat sub bara de navigare, pe
                  toate paginile platformei. <strong>Scrie un anunț pe linie</strong>
                   — dacă sunt mai multe, vor derula tip marquee, separate cu un
                  romb. Max 2000 caractere total. Bara rămâne vizibilă până o
                  dezactivezi.
                </p>
              </div>
              <Toggle
                id="settings-announcement-toggle"
                checked={!!local.announcement_active}
                onChange={toggleAnnouncementActive}
                disabled={saving || loading}
              />
            </div>

            <div className="mt-5 space-y-2">
              <label
                htmlFor="announcement-text"
                className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Text anunț
              </label>
              <Textarea
                id="announcement-text"
                data-testid="settings-announcement-text"
                value={announcementDraft}
                onChange={(e) => setAnnouncementDraft(e.target.value.slice(0, 2000))}
                placeholder={"Maraton special de Crăciun pe 24 decembrie de la ora 18:00!\nÎnregistrările pentru concursul lunar sunt deschise până vineri.\nServerul va fi în mentenanță sâmbătă 02:00 – 04:00."}
                rows={4}
                disabled={loading}
                className="resize-y min-h-[110px] bg-black/30 border-white/10 focus-visible:ring-[hsl(var(--accent))]/40 font-mono text-[13px]"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {announcementDraft.length}/2000
                  {(() => {
                    const lines = announcementDraft
                      .split(/\r?\n/)
                      .map((s) => s.trim())
                      .filter(Boolean).length;
                    return lines > 0 ? ` · ${lines} ${lines === 1 ? "anunț" : "anunțuri"}` : "";
                  })()}
                </span>
                <Button
                  data-testid="settings-announcement-save"
                  size="sm"
                  onClick={saveAnnouncementText}
                  disabled={
                    savingAnnouncement ||
                    loading ||
                    (announcementDraft || "").trim() === (local.announcement_text || "").trim()
                  }
                  className="h-8 text-xs bg-gradient-to-r from-[#ff3b3b] to-[#facc15] text-black hover:opacity-95"
                >
                  {savingAnnouncement ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Se salvează…
                    </>
                  ) : (
                    "Salvează anunțul"
                  )}
                </Button>
              </div>
            </div>

            {local.announcement_active && local.announcement_text && (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  Preview
                </p>
                <div
                  className="rounded-lg border border-white/[0.06] px-3 py-2 text-[13px] text-white/90 flex flex-wrap items-center gap-x-3 gap-y-1"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(255,59,59,0.12) 0%, rgba(250,204,21,0.10) 50%, rgba(255,59,59,0.12) 100%)",
                  }}
                >
                  <span aria-hidden>📣</span>
                  {local.announcement_text
                    .split(/\r?\n/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((line, i, arr) => (
                      <React.Fragment key={i}>
                        <span>{line}</span>
                        {i < arr.length - 1 && (
                          <span className="text-[hsl(var(--accent))]/70">◆</span>
                        )}
                      </React.Fragment>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 py-3 bg-black/20 border-t border-border/60 flex items-center">
          <span className="text-xs text-muted-foreground">
            Bara apare doar pe paginile publice (dashboard, categorii, profil).
          </span>
        </div>
      </div>
    </div>
  );
}
