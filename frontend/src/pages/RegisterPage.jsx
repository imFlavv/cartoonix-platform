import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { api, mediaUrl, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Check, ChevronLeft, ChevronRight, Sparkles, Crown, AlertCircle } from "lucide-react";

const STEPS = ["Profile", "Plan", "Verify"];

function StepHeader({ step }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-muted-foreground uppercase tracking-[0.25em] text-xs">Step {step + 1} of {STEPS.length}</span>
        <span className="font-medium">{STEPS[step]}</span>
      </div>
      <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
    </div>
  );
}

function Step1Profile({ form, setForm, avatars, onNext }) {
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!form.avatar_url) return setError("Please pick an avatar");
    if (form.nickname.trim().length < 2) return setError("Nickname must be at least 2 characters");
    if (!form.email) return setError("Email is required");
    if (form.password.length < 6) return setError("Password must be at least 6 characters");
    if (form.password !== form.confirm) return setError("Passwords do not match");
    if (!form.accepted_terms) return setError("You must accept the Terms & Conditions");
    setError("");
    onNext();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <Label className="text-sm">Pick your avatar</Label>
        <div data-testid="register-avatar-grid" className="mt-2 grid grid-cols-4 sm:grid-cols-5 gap-3">
          {avatars.map((a) => {
            const selected = form.avatar_url === a.url;
            return (
              <button
                key={a.slug}
                type="button"
                onClick={() => setForm({ ...form, avatar_url: a.url })}
                data-testid="register-avatar-option"
                className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                  selected
                    ? "border-[hsl(var(--primary))] ring-2 ring-[hsl(var(--ring))] scale-[1.03]"
                    : "border-border hover:border-foreground/40"
                }`}
              >
                <img src={mediaUrl(a.url)} alt={a.slug} className="absolute inset-0 h-full w-full object-cover" />
                {selected && (
                  <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-[hsl(var(--primary))] text-white grid place-items-center">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="nickname">Nickname</Label>
          <Input id="nickname" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })}
            data-testid="register-nickname-input" placeholder="DexterFan" className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            data-testid="register-email-input" placeholder="you@example.com" className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            data-testid="register-password-input" className="h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            data-testid="register-confirm-input" className="h-11 rounded-xl" />
        </div>
      </div>
      <label className="flex items-start gap-3 cursor-pointer text-sm">
        <Checkbox checked={form.accepted_terms} onCheckedChange={(v) => setForm({ ...form, accepted_terms: !!v })}
          data-testid="register-terms-checkbox" className="mt-0.5" />
        <span className="text-muted-foreground">
          I accept the{" "}
          <Link to="/terms-and-conditions" target="_blank" className="text-[hsl(var(--primary))] hover:underline">
            Terms & Conditions
          </Link>.
        </span>
      </label>
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive px-3 py-2 text-sm" data-testid="register-step1-error">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      <div className="flex justify-end">
        <Button type="submit" className="rounded-xl h-11" data-testid="register-next-step-button">
          Continue <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

function PlanCard({ name, price, color, features, selected, onSelect, badge, testId }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={testId}
      className={`relative w-full text-left rounded-2xl border-2 p-5 transition-all ${
        selected ? "border-[hsl(var(--primary))] ring-2 ring-[hsl(var(--ring))]" : "border-border hover:border-foreground/30"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Cartoonix</div>
          <div className="font-display text-2xl tracking-wider mt-1" style={{ color }}>{name}</div>
        </div>
        {badge && <Badge className="rounded-full">{badge}</Badge>}
      </div>
      <div className="mt-3 text-2xl font-bold">{price}</div>
      <ul className="mt-4 space-y-1.5 text-sm">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="h-4 w-4 mt-0.5 text-[hsl(var(--accent))] shrink-0" />
            <span className="text-muted-foreground">{f}</span>
          </li>
        ))}
      </ul>
      {selected && (
        <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-[hsl(var(--primary))] text-white grid place-items-center">
          <Check className="h-3.5 w-3.5" />
        </div>
      )}
    </button>
  );
}

function Step2Plan({ form, setForm, onNext, onBack, submitting }) {
  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-4">
        <PlanCard
          name="FREE" price="$0 / month" color="hsl(var(--muted-foreground))"
          testId="plan-select-free"
          selected={form.subscription === "free"} onSelect={() => setForm({ ...form, subscription: "free" })}
          features={[
            "Standard Definition (SD) streaming",
            "Ads between episodes",
            "Basic profile & favorites",
            "Up to 3 hours of daily streaming",
          ]}
        />
        <PlanCard
          name="PLUS" price="$5.99 / month" color="hsl(var(--primary))"
          badge="Best value" testId="plan-select-plus"
          selected={form.subscription === "plus"} onSelect={() => setForm({ ...form, subscription: "plus" })}
          features={[
            "Ad-free experience",
            "Full HD (1080p) streaming",
            "Offline downloads (when possible)",
            "Unlimited streaming",
            "Playlists & favorites",
            "Early access to new uploads",
            "Priority support",
          ]}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-4 inline-flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--accent))]" /> Payments coming soon — your plan is locked in for free during the early preview.
      </p>
      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={onBack} className="rounded-xl h-11" data-testid="register-back-button">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} disabled={submitting} className="rounded-xl h-11" data-testid="register-finalize-button">
          {submitting ? "Creating account..." : (<>Finalize Registration <ChevronRight className="ml-1 h-4 w-4" /></>)}
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
      toast.success("Email verified!");
      onSuccess();
    } catch (err) {
      toast.error(getErrorMessage(err, "Invalid code"));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await resendCode(email);
      toast.success("New code sent to your inbox");
      setResendCooldown(30);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not resend code"));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] grid place-items-center mb-3">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="font-display text-2xl tracking-wider">Check your email</h2>
        <p className="text-sm text-muted-foreground mt-1">
          We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
        </p>
      </div>
      <div>
        <Label className="sr-only">Verification code</Label>
        <Input
          inputMode="numeric"
          maxLength={6}
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          data-testid="verify-code-input"
          placeholder="• • • • • •"
          className="h-14 rounded-xl text-center text-2xl tracking-[0.5em] font-mono"
        />
      </div>
      <Button type="submit" disabled={loading || code.length !== 6} data-testid="otp-submit-button"
        className="w-full h-11 rounded-xl text-base">
        {loading ? "Verifying..." : "Verify and continue"}
      </Button>
      <div className="text-center text-sm text-muted-foreground">
        Didn't get it?{" "}
        <button type="button" onClick={resend} disabled={resendCooldown > 0} data-testid="verify-resend-button"
          className="text-[hsl(var(--primary))] hover:underline disabled:opacity-50">
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
      const { data } = await api.get("/avatars");
      setAvatars(data);
      if (data.length && !form.avatar_url) setForm((f) => ({ ...f, avatar_url: data[0].url }));
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
      toast.success("Account created! Check your inbox for the verification code.");
      setStep(2);
    } catch (err) {
      toast.error(getErrorMessage(err, "Registration failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <section className="relative noise-overlay">
        <div className="absolute inset-0 hero-bg opacity-70" />
        <div className="relative mx-auto max-w-2xl px-4 sm:px-6 py-12">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
            className="rounded-2xl border border-border bg-card/85 backdrop-blur p-7 sm:p-9 shadow-[0_14px_40px_rgba(0,0,0,0.45)]">
            <div className="mb-5 text-center">
              <h1 className="font-display text-3xl sm:text-4xl tracking-wider">Join Cartoonix</h1>
              <p className="text-sm text-muted-foreground mt-1">Three simple steps to the vault.</p>
            </div>
            <StepHeader step={step} />
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
                    navigate(u?.role === "admin" ? "/admin" : "/dashboard");
                  }} />
                )}
              </motion.div>
            </AnimatePresence>
            <p className="text-sm text-muted-foreground mt-6 text-center">
              Already a fan? <Link to="/login" className="text-[hsl(var(--primary))] hover:underline" data-testid="register-to-login-link">Sign in</Link>
            </p>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
