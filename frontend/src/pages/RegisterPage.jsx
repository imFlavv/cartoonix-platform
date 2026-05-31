import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faCrown,
  faEnvelope,
  faLock,
  faCheck,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faImages,
  faEnvelopeOpenText,
  faTv,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { PLUS_BADGE_URL } from "@/lib/badges";

const FREE_BENEFITS = [
  "Streaming SD",
  "Reclame între episoade",
  "Istoric limitat",
  "Profil basic",
];

const PLUS_BENEFITS = [
  "Streaming Full HD",
  "Funcția de favorite & playlist",
  "Badge PLUS în platformă și pe chat",
  "Acces pe chat la camera PLUS",
  "Prioritate la server / video loading",
  "Acces anticipat la funcții noi",
  "Suport prioritar",
  "Profil personalizabil",
  "Concursuri exclusive",
  "Descărcare episoade",
];

const PLUS_PREVIEW_COUNT = 5;

const STEPS = [
  { label: "Profil", icon: faUser },
  { label: "Plan", icon: faCrown },
  { label: "Verificare", icon: faEnvelopeOpenText },
];

function BrandPanel({ step, nickname }) {
  return (
    <div className="relative hidden lg:flex flex-col justify-between brand-panel p-10 overflow-hidden">
      <div className="absolute inset-0 scanlines opacity-60" />
      <div className="relative">
        <h2 className="font-display text-5xl leading-none tracking-[0.06em] text-[hsl(var(--accent))]">
          CARTOONIX
        </h2>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/55">
          {nickname ? (
            <>Bun venit, <span className="text-white font-medium">{nickname}</span>! Mai e doar un pas.</>
          ) : (
            "Creează-ți contul în câțiva pași și intră în tezaurul nostalgic."
          )}
        </p>
      </div>

      <ol className="relative mt-10 space-y-3">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.label} className="flex items-center gap-3">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 transition-colors ${
                  done
                    ? "bg-[hsl(var(--accent))] text-black ring-[hsl(var(--accent))]"
                    : active
                    ? "bg-white/[0.06] text-[hsl(var(--accent))] ring-[hsl(var(--accent))]/40"
                    : "bg-white/[0.03] text-white/30 ring-white/10"
                }`}
              >
                <FontAwesomeIcon icon={done ? faCheck : s.icon} className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className={`text-[10px] uppercase tracking-[0.25em] ${active ? "text-[hsl(var(--accent))]" : "text-white/30"}`}>
                  Pasul {i + 1}
                </div>
                <div className={`text-sm font-medium ${active || done ? "text-white" : "text-white/40"}`}>{s.label}</div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="relative mt-auto pt-10">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <img src={PLUS_BADGE_URL} alt="" className="h-8 w-auto" />
            <div>
              <div className="text-sm font-semibold text-white">Cartoonix PLUS</div>
              <div className="text-xs text-white/45">Badge exclusiv, fără reclame, Full HD.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step1Profile({ form, setForm, avatars, onNext }) {
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!form.avatar_url) return setError("Te rugăm să alegi un avatar");
    if (form.nickname.trim().length < 2) return setError("Pseudonimul trebuie să aibă minim 2 caractere");
    if (!form.email) return setError("Emailul este obligatoriu");
    if (form.password.length < 6) return setError("Parola trebuie să aibă minim 6 caractere");
    if (form.password !== form.confirm) return setError("Parolele nu se potrivesc");
    if (!form.accepted_terms) return setError("Trebuie să accepți Termenii și Condițiile");
    setError("");
    onNext();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <Label className="text-sm text-white/70 inline-flex items-center gap-2">
          <FontAwesomeIcon icon={faImages} className="h-3.5 w-3.5 text-[hsl(var(--accent))]" /> Alege-ți avatarul
        </Label>
        <div data-testid="register-avatar-grid" className="mt-2.5 grid grid-cols-5 sm:grid-cols-6 gap-2.5">
          {(Array.isArray(avatars) ? avatars : []).map((a) => {
            const selected = form.avatar_url === a.url;
            return (
              <button
                key={a.slug}
                type="button"
                onClick={() => setForm({ ...form, avatar_url: a.url })}
                data-testid="register-avatar-option"
                className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                  selected
                    ? "border-[hsl(var(--accent))] ring-2 ring-[hsl(var(--accent))]/40 scale-[1.04]"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <img src={mediaUrl(a.url)} alt={a.slug} className="absolute inset-0 h-full w-full object-cover" />
                {selected && (
                  <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-[hsl(var(--accent))] text-black grid place-items-center">
                    <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nickname" className="text-white/70">Pseudonim</Label>
          <div className="input-icon-wrap">
            <FontAwesomeIcon icon={faUser} className="fa-leading h-4 w-4" />
            <Input id="nickname" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              data-testid="register-nickname-input" placeholder="DexterFan" className="h-12 rounded-xl pl-11 bg-white/[0.03] border-white/10 focus-visible:ring-[hsl(var(--accent))]" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-white/70">Email</Label>
          <div className="input-icon-wrap">
            <FontAwesomeIcon icon={faEnvelope} className="fa-leading h-4 w-4" />
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid="register-email-input" placeholder="tu@exemplu.ro" className="h-12 rounded-xl pl-11 bg-white/[0.03] border-white/10 focus-visible:ring-[hsl(var(--accent))]" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-white/70">Parolă</Label>
          <div className="input-icon-wrap">
            <FontAwesomeIcon icon={faLock} className="fa-leading h-4 w-4" />
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              data-testid="register-password-input" placeholder="••••••••" className="h-12 rounded-xl pl-11 bg-white/[0.03] border-white/10 focus-visible:ring-[hsl(var(--accent))]" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-white/70">Confirmă parola</Label>
          <div className="input-icon-wrap">
            <FontAwesomeIcon icon={faLock} className="fa-leading h-4 w-4" />
            <Input id="confirm" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              data-testid="register-confirm-input" placeholder="••••••••" className="h-12 rounded-xl pl-11 bg-white/[0.03] border-white/10 focus-visible:ring-[hsl(var(--accent))]" />
          </div>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer text-sm">
        <Checkbox checked={form.accepted_terms} onCheckedChange={(v) => setForm({ ...form, accepted_terms: !!v })}
          data-testid="register-terms-checkbox" className="mt-0.5" />
        <span className="text-white/50">
          Accept{" "}
          <Link to="/terms-and-conditions" target="_blank" className="text-[hsl(var(--accent))] hover:underline">
            Termenii și Condițiile
          </Link>.
        </span>
      </label>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 px-3 py-2.5 text-sm" data-testid="register-step1-error">
          <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4 rotate-45" /> {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" className="rounded-xl h-12 px-6 font-semibold bg-[hsl(var(--accent))] text-black hover:bg-[hsl(var(--accent))]/90" data-testid="register-next-step-button">
          Continuă <FontAwesomeIcon icon={faChevronRight} className="ml-2 h-3.5 w-3.5" />
        </Button>
      </div>
    </form>
  );
}

function PlanCard({
  name,
  price,
  features,
  selected,
  onSelect,
  badge,
  accent,
  icon,
  testId,
  footer,
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={testId}
      className={`relative w-full text-left rounded-2xl border-2 p-5 transition-all ${
        selected
          ? "border-[hsl(var(--accent))] ring-2 ring-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/[0.04]"
          : "border-white/10 hover:border-white/25 bg-white/[0.02]"
      }`}
    >
      {badge && (
        <span
          className="absolute -top-2.5 right-3 rounded-full bg-[hsl(var(--accent))] px-2 py-[2px] text-[9px] font-bold uppercase tracking-[0.12em] text-black shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
          data-testid={`${testId}-badge`}
        >
          {badge}
        </span>
      )}
      <div className="flex items-start justify-between pr-2">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.05] ring-1 ring-white/10"
            style={{ color: accent }}
          >
            <FontAwesomeIcon icon={icon} className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">Cartoonix</div>
            <div className="font-display text-2xl tracking-wider" style={{ color: accent }}>
              {name}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold text-white">{price}</div>
      <ul className="mt-4 space-y-1.5 text-sm">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <FontAwesomeIcon
              icon={faCheck}
              className="h-3.5 w-3.5 mt-1 text-[hsl(var(--accent))] shrink-0"
            />
            <span className="text-white/55">{f}</span>
          </li>
        ))}
      </ul>
      {footer}
      {selected && (
        <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-[hsl(var(--accent))] text-black grid place-items-center">
          <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
        </div>
      )}
    </button>
  );
}

function PlusBenefitsDialog({ children }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md" data-testid="plus-benefits-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display tracking-wider">
            <img src={PLUS_BADGE_URL} alt="" className="h-7 w-auto" />
            Toate beneficiile PLUS
          </DialogTitle>
          <DialogDescription>
            Tot ce primești cu Cartoonix PLUS, într-o singură listă.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2.5 mt-1">
          {PLUS_BENEFITS.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.05] px-3 py-2.5"
              data-testid={`plus-benefit-row-${i}`}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]">
                <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
              </span>
              <span className="text-sm text-white/85">{b}</span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function Step2Plan({ form, setForm, onNext, onBack, submitting }) {
  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-4">
        <PlanCard
          name="FREE"
          price="0 $ / lună"
          accent="hsl(var(--muted-foreground))"
          icon={faTv}
          testId="plan-select-free"
          selected={form.subscription === "free"}
          onSelect={() => setForm({ ...form, subscription: "free" })}
          features={FREE_BENEFITS}
        />
        <PlanCard
          name="PLUS"
          price="5,99 $ / lună"
          accent="hsl(var(--accent))"
          icon={faBolt}
          badge="Recomandat"
          testId="plan-select-plus"
          selected={form.subscription === "plus"}
          onSelect={() => setForm({ ...form, subscription: "plus" })}
          features={PLUS_BENEFITS.slice(0, PLUS_PREVIEW_COUNT)}
          footer={
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-3 pt-3 border-t border-white/[0.06]"
            >
              <PlusBenefitsDialog>
                <button
                  type="button"
                  data-testid="see-all-plus-benefits-button"
                  className="group inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--accent))] hover:text-white transition-colors"
                >
                  Vezi toate beneficiile
                  <FontAwesomeIcon
                    icon={faChevronRight}
                    className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5"
                  />
                </button>
              </PlusBenefitsDialog>
            </div>
          }
        />
      </div>
      <p className="text-xs text-white/40 mt-4 inline-flex items-center gap-2">
        <img src={PLUS_BADGE_URL} alt="" className="h-4 w-auto" /> Plățile vor fi disponibile în curând — abonamentul tău este gratuit pe perioada preview-ului.
      </p>
      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={onBack} className="rounded-xl h-12 text-white/70 hover:text-white hover:bg-white/[0.06]" data-testid="register-back-button">
          <FontAwesomeIcon icon={faChevronLeft} className="mr-2 h-3.5 w-3.5" /> Înapoi
        </Button>
        <Button onClick={onNext} disabled={submitting} className="rounded-xl h-12 px-6 font-semibold bg-[hsl(var(--accent))] text-black hover:bg-[hsl(var(--accent))]/90" data-testid="register-finalize-button">
          {submitting ? "Se creează contul..." : (<>Finalizează <FontAwesomeIcon icon={faChevronRight} className="ml-2 h-3.5 w-3.5" /></>)}
        </Button>
      </div>
    </div>
  );
}

function Step3Verify({ email, onSuccess }) {
  const { verifyEmail, resendCode } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyEmail(email, code);
      toast.success("Cont creat cu succes!");
      onSuccess();
    } catch (err) {
      toast.error(getErrorMessage(err, "Cod invalid"));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await resendCode(email);
      toast.success("Un cod nou a fost trimis pe email");
      setResendCooldown(30);
    } catch (err) {
      toast.error(getErrorMessage(err, "Nu am putut retrimite codul"));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-[hsl(var(--accent))] text-black grid place-items-center mb-3">
          <FontAwesomeIcon icon={faEnvelopeOpenText} className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl tracking-wider text-white">Verifică-ți emailul</h2>
        <p className="text-sm text-white/45 mt-1">
          Am trimis un cod de 6 cifre la <span className="text-white font-medium">{email}</span>
        </p>
      </div>
      <div>
        <Label className="sr-only">Cod de verificare</Label>
        <Input
          inputMode="numeric"
          maxLength={6}
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          data-testid="verify-code-input"
          placeholder="• • • • • •"
          className="h-14 rounded-xl text-center text-2xl tracking-[0.5em] font-mono bg-white/[0.03] border-white/10 focus-visible:ring-[hsl(var(--accent))]"
        />
      </div>
      <Button type="submit" disabled={loading || code.length !== 6} data-testid="otp-submit-button"
        className="w-full h-12 rounded-xl text-base font-semibold bg-[hsl(var(--accent))] text-black hover:bg-[hsl(var(--accent))]/90">
        {loading ? "Se verifică..." : "Verifică și continuă"}
      </Button>
      <div className="text-center text-sm text-white/45">
        Nu ai primit codul?{" "}
        <button type="button" onClick={resend} disabled={resendCooldown > 0} data-testid="verify-resend-button"
          className="text-[hsl(var(--accent))] hover:underline disabled:opacity-50">
          {resendCooldown > 0 ? `Retrimite în ${resendCooldown}s` : "Retrimite codul"}
        </button>
      </div>
    </form>
  );
}

export default function RegisterPage() {
  const { register, user } = useAuth();
  const { settings } = useSettings() || {};
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [avatars, setAvatars] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    avatar_url: "",
    nickname: "",
    email: "",
    password: "",
    confirm: "",
    accepted_terms: false,
    subscription: "free",
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/avatars");
        const list = Array.isArray(data) ? data : [];
        setAvatars(list);
        if (list.length && !form.avatar_url) setForm((f) => ({ ...f, avatar_url: list[0].url }));
      } catch (err) {
        console.error("Failed to load avatars", err);
        setAvatars([]);
      }
    })();
    // eslint-disable-next-line
  }, []);

  const doRegister = async () => {
    setSubmitting(true);
    try {
      await register({
        avatar_url: form.avatar_url,
        nickname: form.nickname.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        subscription: form.subscription,
        accepted_terms: form.accepted_terms,
      });
      toast.success("Cod trimis! Verifică emailul pentru codul de confirmare.");
      setStep(2);
    } catch (err) {
      toast.error(getErrorMessage(err, "Înregistrarea a eșuat"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <section className="relative min-h-[calc(100vh-68px)] grid place-items-center px-4 py-12">
        <div className="absolute inset-0 gold-glow" />
        <div className="absolute inset-0 auth-grid opacity-[0.5]" />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0c0d12]/80 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
        >
          <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
            <BrandPanel step={step} nickname={step > 0 ? form.nickname : ""} />

            <div className="relative p-8 sm:p-10">
              <div className="mb-6">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-white/50">
                  Pasul {step + 1} din {STEPS.length}
                </span>
                <h1 className="mt-4 font-display text-3xl sm:text-4xl tracking-wider text-white">
                  {step === 0 && "Alătură-te Cartoonix"}
                  {step === 1 && "Alege-ți planul"}
                  {step === 2 && "Aproape gata"}
                </h1>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                >
                  {step === 0 && (
                    <Step1Profile form={form} setForm={setForm} avatars={avatars} onNext={() => setStep(1)} />
                  )}
                  {step === 1 && (
                    <Step2Plan form={form} setForm={setForm} onNext={doRegister} onBack={() => setStep(0)} submitting={submitting} />
                  )}
                  {step === 2 && (
                    <Step3Verify email={form.email} onSuccess={() => {
                      const u = user;
                      if (settings?.presentation_mode && u?.role !== "admin") {
                        toast.info("Cont creat! Accesul la platformă va fi disponibil în curând.");
                        navigate("/");
                      } else {
                        navigate(u?.role === "admin" ? "/admin" : "/profile");
                      }
                    }} />
                  )}
                </motion.div>
              </AnimatePresence>

              <p className="text-sm text-white/45 mt-6 text-center">
                Ai deja cont?{" "}
                <Link to="/login" className="font-semibold text-[hsl(var(--accent))] hover:underline underline-offset-4" data-testid="register-to-login-link">
                  Autentifică-te
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </PublicLayout>
  );
}
