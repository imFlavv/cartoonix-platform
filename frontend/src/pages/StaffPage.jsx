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
  Sparkles,
  Users,
  HeartHandshake,
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
  "De câteva ori pe săptămână",
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
    if (status === "accepted") {
      return {
        title: "Felicitări! Aplicația ta a fost ACCEPTATĂ",
        subtitle:
          "Bine ai venit în staff-ul Cartoonix. Un admin te va contacta în curând cu pașii următori.",
        icon: CheckCircle2,
        gradient: "linear-gradient(135deg,#10b981 0%,#059669 100%)",
        border: "rgba(16,185,129,0.4)",
        bg: "rgba(16,185,129,0.06)",
        text: "text-emerald-300",
        label: "ACCEPTAT",
      };
    }
    if (status === "rejected") {
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
    }
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-3xl overflow-hidden p-8"
      style={{
        background: `linear-gradient(135deg, rgba(20,20,24,0.95) 0%, rgba(12,12,14,0.95) 100%)`,
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 20px 60px -12px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.03)`,
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
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">{cfg.subtitle}</p>
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
          <div className="mt-5 flex items-center gap-2 text-[11px] text-muted-foreground">
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

function Section({ idx, title, subtitle, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div
          className="h-9 w-9 rounded-xl grid place-items-center shrink-0 font-display font-bold text-sm"
          style={{
            background: "linear-gradient(135deg,#ff3b3b 0%,#ff7a1a 50%,#facc15 100%)",
            color: "#0a0a0a",
          }}
        >
          {idx}
        </div>
        <div>
          <h3 className="font-display text-xl tracking-wide">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4 pl-12">{children}</div>
    </div>
  );
}

function Field({ label, hint, required, children, testId }) {
  return (
    <div className="space-y-1.5" data-testid={testId}>
      <Label className="text-sm font-semibold flex items-center gap-1">
        {label}
        {required && <span className="text-red-400">*</span>}
      </Label>
      {hint && <p className="text-[11px] text-muted-foreground/80 italic">{hint}</p>}
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
      toast.success("Aplicația ta a fost trimisă! Verifică statusul mai sus.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(getErrorMessage(err, "Nu am putut trimite aplicația. Verifică câmpurile."));
    } finally {
      setSubmitting(false);
    }
  };

  // Standalone full-page frame (no header/footer)
  const Frame = ({ children }) => (
    <div
      className="min-h-screen w-full relative"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,122,26,0.10) 0%, rgba(8,8,10,0) 70%), radial-gradient(ellipse 60% 80% at 100% 100%, rgba(250,204,21,0.06) 0%, rgba(8,8,10,0) 70%), #08080a",
      }}
    >
      <button
        onClick={() => navigate("/")}
        data-testid="staff-close-btn"
        aria-label="Înapoi la pagina principală"
        className="fixed top-4 right-4 z-30 h-10 w-10 grid place-items-center rounded-xl bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 transition-all"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">{children}</div>
    </div>
  );

  if (authLoading || appState === null) {
    return (
      <Frame>
        <div className="min-h-[60vh] grid place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Frame>
    );
  }

  const application = appState?.application;
  const canReapply = application?.status === "rejected";

  return (
    <Frame>
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-10"
      >
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-wide leading-tight">
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
        <p className="mt-5 text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Cartoonix este o comunitate construită în jurul creativității, distracției și
          respectului. Pe măsură ce platforma crește, avem nevoie de oameni implicați care să
          ne ajute să menținem un mediu plăcut și activ pentru toți utilizatorii.
        </p>
      </motion.div>

      {application && !canReapply ? (
        <StatusCard application={application} />
      ) : (
        <>
          {canReapply && (
            <div className="mb-6">
              <StatusCard application={application} />
              <div className="mt-3 text-center text-xs text-muted-foreground">
                Poți aplica din nou completând formularul de mai jos.
              </div>
            </div>
          )}

          {/* Profile we're looking for */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {[
              {
                icon: Sparkles,
                title: "Căutăm oameni care",
                items: [
                  "sunt activi pe platformă",
                  "comunică calm și respectuos",
                  "iau decizii corecte în situații tensionate",
                  "vor să contribuie, nu doar să aibă un rol",
                ],
              },
              {
                icon: HeartHandshake,
                title: "Ce înseamnă să fii în staff",
                items: [
                  "moderezi chat-ul global și conținutul",
                  "ajuți utilizatorii când au probleme",
                  "menții o atmosferă pozitivă",
                  "oferi feedback pentru îmbunătățiri",
                ],
              },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="rounded-2xl border border-border bg-card/60 backdrop-blur p-5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className="h-8 w-8 rounded-lg grid place-items-center"
                      style={{
                        background: "linear-gradient(135deg,#ff7a1a,#facc15)",
                        color: "#0a0a0a",
                      }}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                    <h3 className="font-display text-base tracking-wide">{card.title}</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {card.items.map((it) => (
                      <li key={it} className="text-[13px] text-muted-foreground flex items-start gap-2">
                        <ArrowRight className="h-3 w-3 mt-1 text-amber-400 shrink-0" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-3 text-sm text-amber-100/90 mb-8 italic">
            Nu căutăm perfecțiune — căutăm oameni serioși, consecvenți și de încredere.
          </div>

          {!user ? (
            <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-8 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-display text-xl mb-2">Trebuie să fii autentificat</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Înregistrează-te sau autentifică-te pentru a aplica.
              </p>
              <div className="flex justify-center gap-2">
                <Link to="/login">
                  <Button
                    data-testid="staff-go-login"
                    className="font-semibold text-black"
                    style={{
                      background:
                        "linear-gradient(135deg,#ff3b3b 0%,#ff7a1a 50%,#facc15 100%)",
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
          ) : (
            <form
              onSubmit={onSubmit}
              className="rounded-2xl border border-border bg-card/70 backdrop-blur p-6 sm:p-8 space-y-10"
              data-testid="staff-form"
            >
              {/* User chip */}
              <div className="flex items-center gap-3 pb-5 border-b border-border/60">
                <div className="h-10 w-10 rounded-xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.nickname} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">Aplici ca</div>
                  <div className="font-semibold truncate">
                    {user.nickname}
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      {user.subscription} · {user.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1. Basic info */}
              <Section idx={1} title="Informații de bază" subtitle="Cine ești și cât de des te găsim aici.">
                <Field label="Vârsta" required testId="field-age">
                  <Input
                    type="number"
                    min={10}
                    max={99}
                    value={form.age}
                    onChange={onChange("age")}
                    required
                    data-testid="input-age"
                    placeholder="ex: 22"
                  />
                </Field>
                <Field label="De cât timp folosești platforma?" required testId="field-used-since">
                  <Input
                    value={form.used_since}
                    onChange={onChange("used_since")}
                    required
                    data-testid="input-used-since"
                    placeholder="ex: 2 luni / din martie 2026"
                  />
                </Field>
                <Field
                  label="Social media"
                  hint="Link Facebook sau Instagram (public, ne ajută să te cunoaștem)"
                  testId="field-social"
                >
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="url"
                      value={form.social_link}
                      onChange={onChange("social_link")}
                      data-testid="input-social"
                      placeholder="https://facebook.com/... sau https://instagram.com/..."
                      className="pl-9"
                    />
                  </div>
                </Field>
                <Field label="Cât de des ești activ?" required testId="field-activity">
                  <div className="grid grid-cols-2 gap-2">
                    {ACTIVITY_OPTIONS.map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setForm((f) => ({ ...f, activity_level: opt }))}
                        data-testid={`activity-${opt}`}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
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
                </Field>
              </Section>

              {/* 2. Motivation */}
              <Section idx={2} title="Motivație" subtitle="De ce vrei să intri în staff? Răspunde din suflet.">
                <Field label="Motivația ta" required testId="field-motivation">
                  <Textarea
                    rows={4}
                    minLength={30}
                    value={form.motivation}
                    onChange={onChange("motivation")}
                    required
                    data-testid="input-motivation"
                    placeholder="Scrie minim 2-3 fraze concrete..."
                  />
                </Field>
              </Section>

              {/* 3. Experience */}
              <Section idx={3} title="Experiență" subtitle="Ce ai mai făcut și cum gândești în general.">
                <Field
                  label="Ai mai avut roluri de moderare? Dacă da, unde?"
                  required
                  testId="field-mod-exp"
                >
                  <Textarea
                    rows={3}
                    value={form.moderation_experience}
                    onChange={onChange("moderation_experience")}
                    required
                    data-testid="input-mod-exp"
                    placeholder="ex: Discord X (mod 1 an), forum Y, sau „nu, dar..."
                  />
                </Field>
                <Field
                  label="Cum ai gestiona un conflict între doi utilizatori?"
                  required
                  testId="field-conflict"
                >
                  <Textarea
                    rows={4}
                    value={form.conflict_handling}
                    onChange={onChange("conflict_handling")}
                    required
                    data-testid="input-conflict"
                    placeholder="Descrie pașii pe care i-ai urma..."
                  />
                </Field>
              </Section>

              {/* 4. Scenarios */}
              <Section
                idx={4}
                title="Situații practice"
                subtitle="Cea mai importantă parte. Răspunsuri echilibrate, nu extreme."
              >
                <Field label="Un utilizator spammează în chat. Ce faci?" required testId="field-spam">
                  <Textarea
                    rows={3}
                    value={form.scenario_spam}
                    onChange={onChange("scenario_spam")}
                    required
                    data-testid="input-spam"
                  />
                </Field>
                <Field
                  label='Cineva folosește limbaj toxic, dar spune că "glumește". Cum reacționezi?'
                  required
                  testId="field-toxic"
                >
                  <Textarea
                    rows={3}
                    value={form.scenario_toxic_joke}
                    onChange={onChange("scenario_toxic_joke")}
                    required
                    data-testid="input-toxic"
                  />
                </Field>
                <Field label="Un prieten de-al tău încalcă regulile. Ce faci?" required testId="field-friend">
                  <Textarea
                    rows={3}
                    value={form.scenario_friend_breaks_rules}
                    onChange={onChange("scenario_friend_breaks_rules")}
                    required
                    data-testid="input-friend"
                  />
                </Field>
              </Section>

              {/* 5. Availability */}
              <Section idx={5} title="Disponibilitate" subtitle="Cât poți fi prezent ca staff.">
                <Field label="Câte ore pe zi poți fi activ ca staff?" required testId="field-hours">
                  <Input
                    value={form.hours_per_day}
                    onChange={onChange("hours_per_day")}
                    required
                    data-testid="input-hours"
                    placeholder="ex: 2-3 ore"
                  />
                </Field>
                <Field label="În ce intervale orare?" required testId="field-intervals">
                  <Input
                    value={form.time_intervals}
                    onChange={onChange("time_intervals")}
                    required
                    data-testid="input-intervals"
                    placeholder="ex: 18:00-22:00 zilele lucrătoare, weekend tot ziua"
                  />
                </Field>
              </Section>

              {/* 6. Extra */}
              <Section idx={6} title="Extra (opțional)" subtitle="Spune-ne dacă ai idei de îmbunătățire.">
                <Field label="Ce ai îmbunătăți la Cartoonix?" testId="field-improvements">
                  <Textarea
                    rows={4}
                    value={form.improvements}
                    onChange={onChange("improvements")}
                    data-testid="input-improvements"
                    placeholder="Sugestii concrete, nu obligatoriu — dar apreciat."
                  />
                </Field>
              </Section>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  data-testid="staff-submit"
                  className="w-full h-12 font-semibold text-black text-base"
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
                <p className="text-[11px] text-muted-foreground/70 text-center mt-3">
                  Răspunsurile tale vor fi vizibile doar pentru admin.
                </p>
              </div>
            </form>
          )}
        </>
      )}
    </Frame>
  );
}
