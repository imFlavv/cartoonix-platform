import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Rocket,
  Sparkles,
  Lock,
  User as UserIcon,
  Crown,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "cartoonix_early_access";

/**
 * Plan definitions (kept in this file to keep the page self-contained).
 * If you change them, also update the marketing copy elsewhere.
 */
const PLANS = {
  free: {
    id: "free",
    name: "FREE",
    tagline: "Pentru fanii loiali",
    price: "0 lei",
    accent: "from-zinc-700 via-zinc-600 to-zinc-700",
    ring: "ring-zinc-400/40",
    features: [
      "Acces complet la toate desenele",
      "Acces la transmisia LIVE",
      "Reclame nostalgice integrate",
      "Calitate până la 720p",
      "1 dispozitiv simultan",
      "Acces standard la concursuri",
      "Profil standard",
    ],
  },
  plus: {
    id: "plus",
    name: "PLUS",
    tagline: "Experiența completă",
    price: "Premium",
    accent: "from-amber-400 via-yellow-400 to-orange-500",
    ring: "ring-amber-300/60",
    features: [
      "Acces complet la toate desenele",
      "Opțiunea de a dezactiva reclamele",
      "Full HD / AI Enhanced Quality",
      "Streaming prioritar și viteză mai bună",
      "Până la 4 dispozitive simultane",
      "Download offline",
      "Profil personalizat + badge PLUS",
      "Early Access la funcții noi",
      "Acces prioritar la concursuri și evenimente",
      "Funcția de REPLAY la live-uri",
      "Posibilitate de vot pentru desene noi",
      "Suport prioritar",
    ],
  },
};

// Helpers for session storage
function loadSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveSession(data) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // noop
  }
}
function clearSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}

// =====================================================================
//                              STEPPER UI
// =====================================================================
function Stepper({ step }) {
  const labels = ["Date personale", "Alege planul", "Confirmare email"];
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-2">
        {labels.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} className="flex-1 flex items-center">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div
                  className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full grid place-items-center text-xs font-bold transition-all shrink-0 ${
                    done
                      ? "bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white"
                      : active
                      ? "bg-white text-black ring-4 ring-fuchsia-500/30"
                      : "bg-white/10 text-white/40"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={`hidden sm:inline text-[11px] tracking-[0.18em] uppercase truncate ${
                    active ? "text-white" : "text-white/40"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < labels.length - 1 && (
                <div
                  className={`flex-1 h-px mx-2 sm:mx-4 ${
                    done ? "bg-gradient-to-r from-fuchsia-500 to-indigo-500" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================================
//                              STEP 1
// =====================================================================
function Step1Profile({ form, setForm, onNext, loading }) {
  const [err, setErr] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (form.nickname.trim().length < 2) return setErr("Pseudonimul trebuie să aibă minim 2 caractere");
    if (!form.email.trim()) return setErr("Emailul este obligatoriu");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setErr("Email invalid");
    if (form.password.length < 6) return setErr("Parola trebuie să aibă minim 6 caractere");
    if (form.password !== form.confirm) return setErr("Parolele nu se potrivesc");
    if (!form.accepted_terms) return setErr("Trebuie să accepți Termenii și Condițiile");
    setErr("");
    onNext();
  };

  return (
    <form onSubmit={submit} className="space-y-5" data-testid="ea-step1-form">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="ea-nickname" className="text-xs uppercase tracking-[0.18em] text-white/60">Pseudonim</Label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              id="ea-nickname"
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              data-testid="ea-nickname-input"
              placeholder="DexterFan"
              className="h-12 pl-10 rounded-xl bg-white/5 border-white/10 focus-visible:border-fuchsia-400/60"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ea-email" className="text-xs uppercase tracking-[0.18em] text-white/60">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              id="ea-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid="ea-email-input"
              placeholder="tu@cartoonix.ro"
              className="h-12 pl-10 rounded-xl bg-white/5 border-white/10 focus-visible:border-fuchsia-400/60"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ea-password" className="text-xs uppercase tracking-[0.18em] text-white/60">Parolă</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              id="ea-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              data-testid="ea-password-input"
              placeholder="Min. 6 caractere"
              className="h-12 pl-10 rounded-xl bg-white/5 border-white/10 focus-visible:border-fuchsia-400/60"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ea-confirm" className="text-xs uppercase tracking-[0.18em] text-white/60">Confirmă parola</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              id="ea-confirm"
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              data-testid="ea-confirm-input"
              placeholder="Reintrodu parola"
              className="h-12 pl-10 rounded-xl bg-white/5 border-white/10 focus-visible:border-fuchsia-400/60"
            />
          </div>
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm cursor-pointer group select-none">
        <Checkbox
          checked={form.accepted_terms}
          onCheckedChange={(v) => setForm({ ...form, accepted_terms: !!v })}
          data-testid="ea-terms-checkbox"
          className="mt-0.5 border-white/30 data-[state=checked]:bg-fuchsia-500 data-[state=checked]:border-fuchsia-500"
        />
        <span className="text-white/70 group-hover:text-white/90 transition-colors">
          Am citit și sunt de acord cu{" "}
          <a href="/terms-and-conditions" target="_blank" rel="noreferrer" className="text-fuchsia-300 hover:underline">
            Termenii și Condițiile
          </a>
        </span>
      </label>

      {err && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        data-testid="ea-step1-next"
        className="w-full h-12 rounded-xl text-base bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white font-semibold tracking-wide"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Continuă
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </form>
  );
}

// =====================================================================
//                              STEP 2
// =====================================================================
function Step2Plan({ form, setForm, onChoose, loading, onBack }) {
  const Card = ({ plan }) => {
    const selected = form.plan === plan.id;
    const isPlus = plan.id === "plus";
    return (
      <button
        type="button"
        onClick={() => setForm({ ...form, plan: plan.id })}
        data-testid={`ea-plan-${plan.id}`}
        className={`relative text-left rounded-2xl p-5 sm:p-6 transition-all overflow-hidden ${
          selected
            ? `bg-gradient-to-br ${plan.accent} ring-4 ${plan.ring} ${isPlus ? "text-black" : "text-white"}`
            : "bg-white/5 border border-white/10 hover:border-white/30 text-white"
        }`}
      >
        {isPlus && (
          <span
            className={`absolute top-4 right-4 inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.18em] uppercase px-2 py-1 rounded-full ${
              selected ? "bg-black text-amber-300" : "bg-amber-400/15 text-amber-300 border border-amber-400/40"
            }`}
          >
            <Crown className="h-3 w-3" /> Recomandat
          </span>
        )}
        <div className="flex items-center gap-2">
          <span
            className={`h-9 w-9 rounded-xl grid place-items-center ${
              selected
                ? isPlus
                  ? "bg-black text-amber-300"
                  : "bg-white/20 text-white"
                : isPlus
                ? "bg-amber-400/15 text-amber-300"
                : "bg-white/10 text-white/70"
            }`}
          >
            {isPlus ? <Crown className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </span>
          <h3 className="font-display text-2xl sm:text-3xl tracking-wider">{plan.name}</h3>
        </div>
        <p className={`mt-1.5 text-xs sm:text-sm ${selected && isPlus ? "text-black/70" : "text-white/60"}`}>
          {plan.tagline}
        </p>
        <ul className="mt-5 space-y-2 sm:space-y-2.5 text-[13px] sm:text-sm">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 leading-snug">
              <span
                className={`mt-0.5 h-4 w-4 rounded-full grid place-items-center shrink-0 ${
                  selected
                    ? isPlus
                      ? "bg-black text-amber-300"
                      : "bg-white/30 text-white"
                    : "bg-white/10 text-white/70"
                }`}
              >
                <Check className="h-2.5 w-2.5" />
              </span>
              <span className={selected && isPlus ? "text-black/85" : "text-white/85"}>{f}</span>
            </li>
          ))}
        </ul>
        {selected && (
          <div className={`mt-5 text-[11px] uppercase tracking-[0.22em] font-bold ${
            isPlus ? "text-black" : "text-white"
          }`}>
            ✓ Selectat
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6" data-testid="ea-step2">
      <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
        <Card plan={PLANS.free} />
        <Card plan={PLANS.plus} />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70 leading-relaxed">
        {form.plan === "plus" ? (
          <div className="flex items-start gap-3">
            <Crown className="h-4 w-4 text-amber-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-white/90 font-medium">Următor pas: plată sigură via Stripe</p>
              <p className="text-white/55 text-xs mt-1">
                Vei fi redirecționat spre Stripe pentru a finaliza plata. După confirmare,
                te vei întoarce automat pentru a-ți confirma emailul și activa contul PLUS.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-fuchsia-300 mt-0.5 shrink-0" />
            <div>
              <p className="text-white/90 font-medium">Următor pas: confirmare email</p>
              <p className="text-white/55 text-xs mt-1">
                Îți vom trimite un cod de 6 cifre pentru confirmarea adresei de email.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
        <Button
          type="button"
          onClick={onBack}
          variant="ghost"
          data-testid="ea-step2-back"
          className="sm:flex-none h-12 px-5 rounded-xl text-white/60 hover:text-white"
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Înapoi
        </Button>
        <Button
          type="button"
          onClick={onChoose}
          disabled={loading || !form.plan}
          data-testid="ea-step2-continue"
          className={`flex-1 h-12 rounded-xl text-base font-semibold tracking-wide ${
            form.plan === "plus"
              ? "bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 hover:opacity-90 text-black"
              : "bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white"
          }`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {form.plan === "plus" ? (
            <>
              Plătește și continuă
              <ExternalLink className="ml-1.5 h-4 w-4" />
            </>
          ) : (
            <>
              Continuă cu FREE
              <ChevronRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// =====================================================================
//                              STEP 3
// =====================================================================
function Step3Verify({ token, email, onSuccess, onBack }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/early-access/verify", { token, code });
      if (data?.access_token) localStorage.setItem("cartoonix_token", data.access_token);
      onSuccess(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Cod invalid"));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await api.post("/early-access/resend", { token });
      toast.success("Un cod nou a fost trimis pe email");
      setCooldown(30);
    } catch (err) {
      toast.error(getErrorMessage(err, "Nu am putut retrimite codul"));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6" data-testid="ea-step3-form">
      <div className="text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white grid place-items-center mb-4 shadow-lg shadow-fuchsia-500/20">
          <Mail className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl sm:text-3xl tracking-wider text-white">Verifică-ți emailul</h2>
        <p className="text-sm text-white/60 mt-2">
          Am trimis un cod de 6 cifre la <span className="text-white font-medium">{email}</span>
        </p>
      </div>
      <div>
        <Label className="sr-only">Cod de verificare</Label>
        <Input
          ref={inputRef}
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          data-testid="ea-verify-code-input"
          placeholder="• • • • • •"
          className="h-16 rounded-xl text-center text-3xl tracking-[0.45em] font-mono bg-white/5 border-white/10 focus-visible:border-fuchsia-400/60"
        />
      </div>
      <Button
        type="submit"
        disabled={loading || code.length !== 6}
        data-testid="ea-verify-submit"
        className="w-full h-12 rounded-xl text-base bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white font-semibold tracking-wide"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Verifică și creează cont
      </Button>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="text-white/40 hover:text-white/70 transition-colors text-xs uppercase tracking-[0.18em]"
        >
          ← Schimbă planul
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0}
          data-testid="ea-verify-resend"
          className="text-fuchsia-300 hover:text-fuchsia-200 disabled:opacity-50 disabled:text-white/40"
        >
          {cooldown > 0 ? `Retrimite în ${cooldown}s` : "Retrimite codul"}
        </button>
      </div>
    </form>
  );
}

// =====================================================================
//                          MAIN PAGE COMPONENT
// =====================================================================
export default function EarlyAccessPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const { fetchMe } = useAuth() || {};

  const [step, setStep] = useState(0);
  const [token, setToken] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    nickname: "",
    email: "",
    password: "",
    confirm: "",
    accepted_terms: false,
    plan: "free",
  });

  // ---- Restore session on mount (Stripe redirect comes back here) ----
  useEffect(() => {
    const stored = loadSession();
    if (stored) {
      setForm((f) => ({
        ...f,
        nickname: stored.nickname || "",
        email: stored.email || "",
        plan: stored.plan || "free",
        accepted_terms: !!stored.accepted_terms,
      }));
      if (stored.token) setToken(stored.token);
      if (typeof stored.step === "number") setStep(stored.step);
    }
    // eslint-disable-next-line
  }, []);

  // ---- Stripe return: if URL has session_id and we have a pending PLUS token ----
  useEffect(() => {
    const sessionId = search.get("session_id");
    if (!sessionId) return;
    const stored = loadSession();
    if (!stored?.token) {
      // We have a session_id but no local token — clean and ignore.
      const next = new URLSearchParams(search);
      next.delete("session_id");
      setSearch(next, { replace: true });
      return;
    }
    if (stored.payment_confirmed) {
      // Already confirmed in a prior visit, just jump to step 3.
      setStep(2);
      const next = new URLSearchParams(search);
      next.delete("session_id");
      setSearch(next, { replace: true });
      return;
    }
    (async () => {
      setConfirming(true);
      try {
        await api.post("/early-access/confirm-payment", {
          token: stored.token,
          session_id: sessionId,
        });
        const updated = { ...stored, payment_confirmed: true, step: 2 };
        saveSession(updated);
        setStep(2);
        toast.success("Plata confirmată!", {
          description: "Verifică-ți emailul pentru codul de confirmare.",
        });
      } catch (err) {
        toast.error(getErrorMessage(err, "Nu am putut confirma plata."));
      } finally {
        setConfirming(false);
        const next = new URLSearchParams(search);
        next.delete("session_id");
        setSearch(next, { replace: true });
      }
    })();
    // eslint-disable-next-line
  }, []);

  // =================== Handlers ===================
  const handleStep1Next = async () => {
    // Just advance to plan selection — we don't hit backend until plan is chosen.
    setStep(1);
  };

  const handleStep2Choose = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post("/early-access/register", {
        nickname: form.nickname.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        plan: form.plan,
        accepted_terms: form.accepted_terms,
      });
      setToken(data.token);
      const baseSession = {
        nickname: form.nickname.trim(),
        email: form.email.trim().toLowerCase(),
        plan: form.plan,
        accepted_terms: form.accepted_terms,
        token: data.token,
      };

      if (data.next === "payment") {
        // PLUS — redirect to Stripe.
        saveSession({ ...baseSession, step: 1, payment_confirmed: false });
        toast.message("Redirecționare către Stripe...", { duration: 1800 });
        // Small delay so the toast renders before unloading.
        setTimeout(() => {
          window.location.href = data.stripe_url;
        }, 400);
      } else {
        // FREE — go straight to verification.
        saveSession({ ...baseSession, step: 2, payment_confirmed: true });
        setStep(2);
        toast.success("Cod trimis! Verifică-ți emailul.");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Nu am putut continua. Încearcă din nou."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerified = async () => {
    clearSession();
    toast.success("Cont creat cu succes!");
    if (fetchMe) await fetchMe();
    navigate("/", { replace: true });
  };

  // =================== Render ===================
  const stepNode = useMemo(() => {
    if (confirming) {
      return (
        <div className="py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400 mx-auto" />
          <p className="mt-4 text-white/70">Confirmăm plata...</p>
        </div>
      );
    }
    if (step === 0) {
      return (
        <Step1Profile
          form={form}
          setForm={setForm}
          onNext={handleStep1Next}
          loading={submitting}
        />
      );
    }
    if (step === 1) {
      return (
        <Step2Plan
          form={form}
          setForm={setForm}
          onChoose={handleStep2Choose}
          loading={submitting}
          onBack={() => setStep(0)}
        />
      );
    }
    return (
      <Step3Verify
        token={token}
        email={form.email}
        onSuccess={handleVerified}
        onBack={() => setStep(1)}
      />
    );
    // eslint-disable-next-line
  }, [step, form, submitting, confirming, token]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0c] text-white">
      {/* ---------- BACKGROUND LAYERS ---------- */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 600px at 50% 0%, rgba(217,70,239,0.16), transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-[460px] w-[460px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(217,70,239,0.35), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(99,102,241,0.32), transparent 70%)",
        }}
      />

      {/* ---------- CONTENT ---------- */}
      <main className="relative z-10 min-h-screen flex items-start sm:items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
        <div className="w-full max-w-3xl" data-testid="early-access-page">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 mb-5">
              <Rocket className="h-3.5 w-3.5 text-fuchsia-300" />
              <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-fuchsia-200">
                Early Access
              </span>
            </div>
            <h1
              className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-wider leading-tight"
              style={{
                backgroundImage:
                  "linear-gradient(92deg, #ff5e5e 0%, #d946ef 35%, #818cf8 70%, #ff5e5e 100%)",
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Fii printre primii pe Cartoonix
            </h1>
            <p className="mt-3 text-sm sm:text-base text-white/60 max-w-xl mx-auto">
              Lansăm oficial pe <span className="text-white font-semibold">1 Iunie 2026</span>.
              Rezervă-ți locul în 3 pași simpli.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl shadow-black/40 p-6 sm:p-8">
            <Stepper step={confirming ? 1 : step} />
            <AnimatePresence mode="wait">
              <motion.div
                key={confirming ? "confirming" : step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {stepNode}
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="mt-8 text-center text-[11px] tracking-[0.22em] uppercase text-white/30">
            © Cartoonix · Lansare 1 Iunie 2026
          </p>
        </div>
      </main>
    </div>
  );
}
