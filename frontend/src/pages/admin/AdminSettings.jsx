import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Eye, EyeOff, Globe, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [local, setLocal] = useState({ presentation_mode: false });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get("/admin/settings")
      .then(({ data }) => {
        if (mounted) setLocal(data);
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
    const prev = local.presentation_mode;
    setLocal((s) => ({ ...s, presentation_mode: next }));
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
      setLocal((s) => ({ ...s, presentation_mode: prev }));
      toast.error("Nu am putut salva setarea", {
        description: err?.response?.data?.detail || "Încearcă din nou.",
      });
    } finally {
      setSaving(false);
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
    </div>
  );
}
