import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Loader2,
  Users,
  HeartHandshake,
  Sparkles,
  ArrowRight,
  X,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { api, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";

const ACTIVITY_OPTIONS = [
  "Zilnic",
  "De câteva ori / săptămână",
  "Săptămânal",
  "Ocazional",
];

const DEFAULT_FORM = {
  age: "",
  used_since: "",
  activity_level: "",
  social_link: "",
  motivation: "",
  moderation_experience: "",
  conflict_handling: "",
  scenario_spam: "",
  scenario_toxic_joke: "",
  scenario_friend_breaks_rules: "",
  hours_per_day: "",
  time_intervals: "",
  improvements: "",
};

function StatusCard({ application }) {
  const { status, admin_note } = application || {};
  const cfg = useMemo(() => {
    if (status === "accepted")
      return {
        title: "Aplicația ta a fost ACCEPTATĂ",
        subtitle:
          "Bine ai venit în staff-ul Cartoonix. Un admin te va contacta în curând cu pașii următori.",
        icon: CheckCircle2,
        gradient: "linear-gradient(135deg,#10b981 0%,#059669 100%)",
        border: "rgba(16,185,129,0.4)",
        bg: "rgba(16,185,129,0.06)",
        text: "text-emerald-300",
        label: "ACCEPTAT",
      };
    if (status === "rejected")
      return {
        title: "Aplicație respinsă",
        subtitle:
          "Mulțumim pentru interes! Continuă să fii activ în comunitate — vei putea aplica din nou.",
        icon: XCircle,
        gradient: "linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)",
        border: "rgba(239,68,68,0.4)",
        bg: "rgba(239,68,68,0.06)",
        text: "text-red-300",
        label: "RESPINS",
      };
    return {
      title: "Aplicația ta este în revizuire",
      subtitle:
        "Echipa Cartoonix îți va analiza răspunsurile cât mai repede. Vei primi o notificare cu verdictul.",
      icon: Clock,
      gradient: "linear-gradient(135deg,#f59e0b 0%,#d97706 100%)",
      border: "rgba(245,158,11,0.4)",
      bg: "rgba(245,158,11,0.06)",
      text: "text-amber-300",
      label: "ÎN REVIZUIRE",
    };
  }, [status]);
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-3xl overflow-hidden p-8 max-w-2xl w-full"
      style={{
        background: `linear-gradient(135deg, rgba(20,20,24,0.95) 0%, rgba(12,12,14,0.95) 100%)`,
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 20px 60px -12px rgba(0,0,0,0.6)`,
      }}
      data-testid="staff-status-card"
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: cfg.gradient }} />
      <div className="flex items-start gap-5">
        <div
          className="h-16 w-16 rounded-2xl grid place-items-center shrink-0"
          style={{ background: cfg.gradient, color: "white" }}
        >
          <Icon className="h-8 w-8" strokeWidth={2.4} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[10px] uppercase tracking-[0.18em] font-bold ${cfg.text} mb-1`}>
            STATUS · {cfg.label}
          </div>
          <h2 className="font-display text-2xl sm:text-3xl tracking-wide mb-2">{cfg.title}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{cfg.subtitle}</p>
          {admin_note && (
            <div
              className="mt-4 p-3 rounded-xl text-sm leading-relaxed"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
            >
              <div className={`text-[10px] uppercase tracking-wider font-bold ${cfg.text} mb-1`}>
                Mesaj de la echipă
              </div>
              <div className="text-foreground/90">{admin_note}</div>
            </div>
          )}
          <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            Trimisă la{" "}
            {new Date(application.created_at).toLocaleString("ro-RO", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Compact field with optional hint
function F({ label, hint, required, children, testId, className = "" }) {
  return (
    <div className={`space-y-1 ${className}`} data-testid={testId}>
      <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {hint && <p className="text-[10px] text-muted-foreground/70 italic -mt-0.5">{hint}</p>}
      {children}
    </div>
  );
}

export default function StaffPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [appState, setAppState] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      setAppState({ application: null });
      return;
    }
    api
      .get("/staff/me")
      .then(({ data }) => setAppState(data))
      .catch(() => setAppState({ application: null }));
  }, [user]);

  const onChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Trebuie să fii autentificat pentru a aplica");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        age: Number(form.age),
        social_link: form.social_link?.trim() || null,
        improvements: form.improvements?.trim() || null,
      };
      const { data } = await api.post("/staff/apply", payload);
      setAppState({ application: data.application });
      toast.success("Aplicația ta a fost trimisă!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(getErrorMessage(err, "Nu am putut trimite aplicația."));
    } finally {
      setSubmitting(false);
    }
  };

  const Frame = ({ children }) => (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,122,26,0.10) 0%, rgba(8,8,10,0) 70%), radial-gradient(ellipse 60% 80% at 100% 100%, rgba(250,204,21,0.06) 0%, rgba(8,8,10,0) 70%), #08080a",
      }}
    >
      {/* Close button → home */}
      <button
        onClick={() => navigate("/")}
        data-testid="staff-close-btn"
        aria-label="Înapoi la pagina principală"
        className="absolute top-4 right-4 z-30 h-10 w-10 grid place-items-center rounded-xl bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 transition-all"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </div>
    </div>
  );

  if (authLoading || appState === null) {
    return (
      <Frame>
        <div className="min-h-[80vh] grid place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Frame>
    );
  }

  const application = appState?.application;
  const canReapply = application?.status === "rejected";

  if (application && !canReapply) {
    return (
      <Frame>
        <div className="min-h-[88vh] grid place-items-center">
          <StatusCard application={application} />
        </div>
      </Frame>
    );
  }

  if (!user) {
    return (
      <Frame>
        <div className="min-h-[88vh] grid place-items-center">
          <div className="rounded-3xl border border-border bg-card/70 backdrop-blur p-8 max-w-md w-full text-center">
            <Shield className="h-10 w-10 mx-auto text-[#facc15] mb-3" />
            <h1 className="font-display text-2xl tracking-wide mb-2">
              Devino parte din staff-ul Cartoonix
            </h1>
            <p className="text-sm text-muted-foreground mb-5">
              Autentifică-te sau înregistrează-te pentru a aplica.
            </p>
            <div className="flex justify-center gap-2">
              <Link to="/login">
                <Button
                  data-testid="staff-go-login"
                  className="font-semibold text-black"
                  style={{
                    background: "linear-gradient(135deg,#ff3b3b 0%,#ff7a1a 50%,#facc15 100%)",
                  }}
                >
                  Autentificare
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="outline" data-testid="staff-go-register">
                  Înregistrare
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 lg:gap-8">
        {/* LEFT — context */}
        <div className="space-y-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl tracking-wide leading-[1.1]">
              Devino parte din{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg,#ff3b3b 0%,#ff7a1a 50%,#facc15 100%)",
                }}
              >
                staff-ul Cartoonix
              </span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Cartoonix este o comunitate construită pe creativitate, distracție și respect.
              Avem nevoie de oameni implicați care să ne ajute să menținem un mediu plăcut
              și activ pentru toți utilizatorii.
            </p>
          </div>

          {canReapply && (
            <div>
              <StatusCard application={application} />
              <p className="mt-2 text-[11px] text-muted-foreground text-center">
                Poți aplica din nou completând formularul.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h3 className="font-display text-sm tracking-wide">Căutăm oameni care</h3>
            </div>
            <ul className="space-y-1.5">
              {[
                "sunt activi pe platformă",
                "comunică calm și respectuos",
                "iau decizii corecte în situații tensionate",
                "vor să contribuie, nu doar să aibă un rol",
              ].map((it) => (
                <li key={it} className="text-[12px] text-muted-foreground flex items-start gap-1.5">
                  <ArrowRight className="h-3 w-3 mt-0.5 text-amber-400 shrink-0" />
                  {it}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-4 space-y-3">
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-amber-400" />
              <h3 className="font-display text-sm tracking-wide">Ce înseamnă să fii în staff</h3>
            </div>
            <ul className="space-y-1.5">
              {[
                "moderezi chat-ul global și conținutul",
                "ajuți utilizatorii când au probleme",
                "menții o atmosferă pozitivă",
                "oferi feedback pentru îmbunătățiri",
              ].map((it) => (
                <li key={it} className="text-[12px] text-muted-foreground flex items-start gap-1.5">
                  <ArrowRight className="h-3 w-3 mt-0.5 text-amber-400 shrink-0" />
                  {it}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[12px] text-amber-100/90 italic leading-snug">
            Nu căutăm perfecțiune — căutăm oameni serioși, consecvenți și de încredere.
          </div>
        </div>

        {/* RIGHT — form */}
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-border bg-card/70 backdrop-blur p-5 sm:p-6 space-y-5"
          data-testid="staff-form"
        >
          {/* Mini header with user chip */}
          <div className="flex items-center gap-3 pb-3 border-b border-border/50">
            <Users className="h-5 w-5 text-[#facc15] shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-lg tracking-wide leading-none">
                Formular de aplicare
              </h2>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                Aplici ca <span className="text-foreground font-semibold">{user.nickname}</span>
                {" · "}
                {user.email}
              </p>
            </div>
          </div>

          {/* 1. Informații de bază */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-300/90 mb-2">
              1 · Informații de bază
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <F label="Vârsta" required testId="field-age">
                <Input
                  type="number"
                  min={10}
                  max={99}
                  value={form.age}
                  onChange={onChange("age")}
                  required
                  data-testid="input-age"
                  placeholder="22"
                  className="h-9"
                />
              </F>
              <F label="Vechime platformă" required testId="field-used-since">
                <Input
                  value={form.used_since}
                  onChange={onChange("used_since")}
                  required
                  data-testid="input-used-since"
                  placeholder="2 luni"
                  className="h-9"
                />
              </F>
              <F
                label="Social media"
                hint="Facebook / Instagram"
                testId="field-social"
                className="col-span-2"
              >
                <div className="relative">
                  <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="url"
                    value={form.social_link}
                    onChange={onChange("social_link")}
                    data-testid="input-social"
                    placeholder="https://facebook.com/... sau instagram.com/..."
                    className="h-9 pl-8"
                  />
                </div>
              </F>
            </div>
            <div className="mt-3">
              <F label="Cât de des ești activ?" required testId="field-activity">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => setForm((f) => ({ ...f, activity_level: opt }))}
                      data-testid={`activity-${opt}`}
                      className={`px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                        form.activity_level === opt
                          ? "text-black"
                          : "bg-white/5 hover:bg-white/10 text-muted-foreground"
                      }`}
                      style={
                        form.activity_level === opt
                          ? { background: "linear-gradient(135deg,#ff7a1a,#facc15)" }
                          : undefined
                      }
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </F>
            </div>
          </div>

          {/* 2 + 3 grouped */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-300/90 mb-2">
                2 · Motivație
              </div>
              <F label="De ce vrei în staff?" required testId="field-motivation">
                <Textarea
                  rows={3}
                  minLength={30}
                  value={form.motivation}
                  onChange={onChange("motivation")}
                  required
                  data-testid="input-motivation"
                  placeholder="Minim 2-3 fraze concrete..."
                  className="text-sm"
                />
              </F>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-300/90 mb-2">
                3 · Experiență
              </div>
              <div className="space-y-2">
                <F label="Roluri de moderare anterioare" required testId="field-mod-exp">
                  <Textarea
                    rows={2}
                    value={form.moderation_experience}
                    onChange={onChange("moderation_experience")}
                    required
                    data-testid="input-mod-exp"
                    placeholder="Discord X (1 an) sau „nu, dar..."
                    className="text-sm"
                  />
                </F>
                <F label="Cum gestionezi un conflict?" required testId="field-conflict">
                  <Textarea
                    rows={2}
                    value={form.conflict_handling}
                    onChange={onChange("conflict_handling")}
                    required
                    data-testid="input-conflict"
                    placeholder="Pașii pe care i-ai urma..."
                    className="text-sm"
                  />
                </F>
              </div>
            </div>
          </div>

          {/* 4. Scenarios */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-300/90 mb-2">
              4 · Situații practice
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <F label="Spam în chat" required testId="field-spam">
                <Textarea
                  rows={3}
                  value={form.scenario_spam}
                  onChange={onChange("scenario_spam")}
                  required
                  data-testid="input-spam"
                  className="text-sm"
                />
              </F>
              <F label='Toxic "în glumă"' required testId="field-toxic">
                <Textarea
                  rows={3}
                  value={form.scenario_toxic_joke}
                  onChange={onChange("scenario_toxic_joke")}
                  required
                  data-testid="input-toxic"
                  className="text-sm"
                />
              </F>
              <F label="Un prieten încalcă regulile" required testId="field-friend">
                <Textarea
                  rows={3}
                  value={form.scenario_friend_breaks_rules}
                  onChange={onChange("scenario_friend_breaks_rules")}
                  required
                  data-testid="input-friend"
                  className="text-sm"
                />
              </F>
            </div>
          </div>

          {/* 5 + 6 grouped */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-300/90 mb-2">
                5 · Disponibilitate
              </div>
              <div className="grid grid-cols-2 gap-2">
                <F label="Ore/zi" required testId="field-hours">
                  <Input
                    value={form.hours_per_day}
                    onChange={onChange("hours_per_day")}
                    required
                    data-testid="input-hours"
                    placeholder="2-3 ore"
                    className="h-9"
                  />
                </F>
                <F label="Intervale orare" required testId="field-intervals">
                  <Input
                    value={form.time_intervals}
                    onChange={onChange("time_intervals")}
                    required
                    data-testid="input-intervals"
                    placeholder="18-22 lucrătoare"
                    className="h-9"
                  />
                </F>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-amber-300/90 mb-2">
                6 · Extra (opțional)
              </div>
              <F label="Ce ai îmbunătăți la Cartoonix?" testId="field-improvements">
                <Textarea
                  rows={2}
                  value={form.improvements}
                  onChange={onChange("improvements")}
                  data-testid="input-improvements"
                  placeholder="Sugestii concrete..."
                  className="text-sm"
                />
              </F>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            data-testid="staff-submit"
            className="w-full h-11 font-semibold text-black"
            style={{
              background: "linear-gradient(135deg,#ff3b3b 0%,#ff7a1a 50%,#facc15 100%)",
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Se trimite...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Trimite aplicația
              </>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground/70 text-center -mt-2">
            Răspunsurile tale vor fi vizibile doar pentru admin.
          </p>
        </form>
      </div>
    </Frame>
  );
}
