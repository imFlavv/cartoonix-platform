import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Rocket,
  CheckCircle2,
  Sparkles,
  Loader2,
  Lock,
  Mail,
  User as UserIcon,
  Bell,
  ArrowDown,
  ShieldCheck,
  Clock3,
  Wrench,
} from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { api, getErrorMessage } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1577979749830-f1d742b96791?crop=entropy&cs=srgb&fm=jpg&q=85&w=1920";

const STORAGE_KEY = "cartoonix_tv_last_reg_id";

// Small utility for smooth-scrolling to an anchor.
function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// -----------------------------
// Success card (after payment)
// -----------------------------
function SuccessCard({ email }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.08] via-transparent to-transparent p-8 shadow-[0_30px_100px_-30px_rgba(16,185,129,0.35)] backdrop-blur-xl"
      data-testid="ctv-success-card"
    >
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-400/15 ring-1 ring-emerald-400/30">
          <CheckCircle2 className="h-7 w-7 text-emerald-300" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-2xl tracking-tight text-white">
            Contul tău a fost rezervat cu succes!
          </h3>
          <p className="mt-2 text-white/70 leading-relaxed">
            Mulțumim pentru încrederea acordată. Am marcat pre-înregistrarea ta
            ca <span className="font-semibold text-emerald-300">activă</span>{" "}
            {email ? (
              <>
                pentru adresa{" "}
                <span className="font-semibold text-white">{email}</span>.
              </>
            ) : (
              <>și plata a fost confirmată.</>
            )}{" "}
            Vei fi contactat pe email imediat ce aplicația
            <span className="font-semibold text-white"> Cartoonix TV</span> este
            gata de lansare.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white/75">
              <Bell className="h-3.5 w-3.5 text-emerald-300" /> Notificare la
              lansare
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white/75">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Loc
              rezervat pe viață
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white/75">
              <Clock3 className="h-3.5 w-3.5 text-emerald-300" /> Acces
              prioritar
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// -----------------------------
// "Coming Soon" placeholder (used when admin turned the page off)
// -----------------------------
function ComingSoonPlaceholder() {
  return (
    <PublicLayout>
      <section className="relative min-h-[70vh] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 0%, hsla(var(--accent) / 0.14), transparent 60%)",
          }}
        />
        <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-[hsl(var(--accent))]/25 to-transparent ring-1 ring-[hsl(var(--accent))]/30">
            <Wrench className="h-9 w-9 text-[hsl(var(--accent))]" />
          </div>
          <h1 className="mt-8 font-display text-4xl sm:text-5xl tracking-tight text-white">
            Pagina Cartoonix TV este în lucru
          </h1>
          <p className="mt-4 max-w-lg text-white/60 leading-relaxed">
            Facem ultimele ajustări la pagina de pre-înregistrare. Revenim în
            curând cu detalii complete despre aplicație și modul în care te poți
            înscrie.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}

// -----------------------------
// Feature card
// -----------------------------
function FeatureCard({ emoji, title, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay }}
      className="group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-6 backdrop-blur-xl transition-all hover:border-[hsl(var(--accent))]/30 hover:shadow-[0_20px_60px_-20px_hsla(var(--accent)/0.35)]"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[hsl(var(--accent))]/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[hsl(var(--accent))]/20 to-transparent ring-1 ring-[hsl(var(--accent))]/25 text-2xl">
          {emoji}
        </div>
        <h3 className="font-display text-lg tracking-wide text-white">
          {title}
        </h3>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-white/60">{children}</p>
    </motion.div>
  );
}

// -----------------------------
// Main page
// -----------------------------
function CartoonixTvLanding() {
  const [searchParams, setSearchParams] = useSearchParams();
  const stripeSessionId = searchParams.get("session_id");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [success, setSuccess] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const alreadyVerifiedRef = useRef(false);

  useEffect(() => {
    if (!stripeSessionId) return;
    if (alreadyVerifiedRef.current) return;
    alreadyVerifiedRef.current = true;

    setVerifying(true);
    api
      .post("/cartoonix-tv/confirm-payment", { session_id: stripeSessionId })
      .then(({ data }) => {
        const reg = data?.registration || {};
        setSuccess({ email: reg.email || "" });
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
          /* ignore */
        }
        toast.success("Plată confirmată! Contul tău este rezervat.");
        setSearchParams({}, { replace: true });
        setTimeout(() => scrollToId("preinregistrare"), 200);
      })
      .catch((err) => {
        toast.error("Nu am putut confirma plata", {
          description: getErrorMessage(err),
        });
        alreadyVerifiedRef.current = false;
      })
      .finally(() => setVerifying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripeSessionId]);

  const validate = () => {
    const next = {};
    if (!name.trim() || name.trim().length < 2) {
      next.name = "Introdu un nume valid (minim 2 caractere).";
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      next.email = "Adresa de email nu este validă.";
    }
    if (!password || password.length < 6) {
      next.password = "Parola trebuie să aibă cel puțin 6 caractere.";
    }
    if (!accepted) {
      next.accepted =
        "Trebuie să fii de acord să fii contactat la lansarea aplicației.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { data } = await api.post("/cartoonix-tv/register", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        accepted: true,
      });
      try {
        localStorage.setItem(STORAGE_KEY, data.id || "");
      } catch (e) {
        /* ignore */
      }
      if (data?.stripe_url) {
        toast.success("Contul a fost pregătit. Te trimitem la plată...");
        setTimeout(() => {
          window.location.href = data.stripe_url;
        }, 400);
      } else {
        toast.error("Link-ul de plată nu este disponibil momentan.");
        setSubmitting(false);
      }
    } catch (err) {
      toast.error("Înregistrarea a eșuat", {
        description: getErrorMessage(err),
      });
      setSubmitting(false);
    }
  };

  const FEATURES = useMemo(
    () => [
      {
        emoji: "📺",
        title: "LIVE TV 24/7",
        text: "Canalul 1 va transmite non-stop desene animate, exact ca un post TV clasic. Deschizi aplicația și te bucuri instant de conținut, fără să alegi episoade.",
      },
      {
        emoji: "🎬",
        title: "Bibliotecă de desene animate",
        text: "Colecții cu desene animate inspirate din programele care au marcat copilăria, precum Jetix, Cartoon Network și Minimax. Toate într-un singur loc.",
      },
      {
        emoji: "📱",
        title: "Aplicație dedicată pentru TV",
        text: "Interfață optimizată pentru Android TV, Google TV și alte dispozitive compatibile. Ușor de utilizat cu telecomanda, gândită pentru ecrane mari.",
      },
      {
        emoji: "🚀",
        title: "Actualizări constante",
        text: "În viitor vom adăuga noi funcționalități, noi seriale și mai multe canale LIVE. Contul tău primește gratuit toate îmbunătățirile.",
      },
    ],
    []
  );

  return (
    <PublicLayout>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/85 via-black/75 to-[#0b0c10]" />
        <div className="pointer-events-none absolute left-[15%] top-[25%] -z-10 h-[420px] w-[420px] rounded-full bg-[hsl(var(--accent))]/[0.18] blur-[140px]" />
        <div className="pointer-events-none absolute right-[10%] bottom-[10%] -z-10 h-[380px] w-[380px] rounded-full bg-blue-500/[0.15] blur-[130px]" />

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span
              data-testid="ctv-kicker"
              className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/[0.09] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.32em] text-[hsl(var(--accent))] backdrop-blur"
            >
              <Sparkles className="h-3 w-3" />
              În curând · Pre-înregistrare deschisă
            </span>

            <h1 className="mt-6 font-display text-5xl leading-[0.98] tracking-tight text-white sm:text-7xl lg:text-[92px]">
              <span className="bg-gradient-to-r from-white via-[hsl(var(--accent))] to-white bg-[length:200%_auto] bg-clip-text text-transparent animate-[shimmer_6s_linear_infinite]">
                Cartoonix TV
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl font-display text-xl tracking-wide text-white/85 sm:text-2xl">
              Retrăiește copilăria direct pe televizorul tău!
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base">
              Aplicația Cartoonix TV este în dezvoltare și va aduce o experiență
              unică pentru iubitorii desenelor animate clasice.
              Pre-înregistrează-te acum pentru a fi printre primii utilizatori.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                data-testid="ctv-cta-hero"
                onClick={() => scrollToId("preinregistrare")}
                className="group h-14 rounded-full bg-gradient-to-r from-[hsl(var(--accent))] via-[hsl(var(--accent))] to-red-500 px-8 text-base font-bold tracking-wide text-[hsl(var(--accent-foreground))] shadow-[0_20px_60px_-15px_hsla(var(--accent)/0.7)] transition-all hover:scale-[1.03] hover:shadow-[0_25px_70px_-15px_hsla(var(--accent)/0.85)]"
                size="lg"
              >
                Pre-înregistrează-mă
                <ArrowDown className="ml-2 h-5 w-5 transition-transform group-hover:translate-y-0.5" />
              </Button>
              <button
                type="button"
                onClick={() => scrollToId("features")}
                className="text-sm font-medium text-white/60 underline underline-offset-4 transition-colors hover:text-white"
              >
                Vezi ce vei primi ↓
              </button>
            </div>

            <div className="mt-14 flex flex-wrap items-center justify-center gap-3 text-[11px] uppercase tracking-[0.24em] text-white/50">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--accent))] opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
                </span>
                Locuri disponibile
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 backdrop-blur">
                <ShieldCheck className="h-3 w-3 text-[hsl(var(--accent))]" />
                Plată sigură prin Stripe
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="relative">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <span className="inline-block text-[10px] font-black uppercase tracking-[0.32em] text-[hsl(var(--accent))]">
              Ce vei găsi în aplicație
            </span>
            <h2 className="mt-3 font-display text-3xl tracking-tight text-white sm:text-5xl">
              Toată magia unui post de TV clasic,
              <br className="hidden sm:block" />
              într-o aplicație modernă.
            </h2>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <FeatureCard
                key={f.title}
                emoji={f.emoji}
                title={f.title}
                delay={i * 0.08}
              >
                {f.text}
              </FeatureCard>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ONE-TIME FEE ===== */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-[hsl(var(--accent))]/[0.04] to-transparent" />
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55 }}
            className="relative overflow-hidden rounded-[36px] border border-white/[0.08] bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent p-8 shadow-[0_40px_120px_-40px_hsla(var(--accent)/0.4)] backdrop-blur-xl sm:p-12"
          >
            <div className="pointer-events-none absolute -top-20 -right-24 h-72 w-72 rounded-full bg-[hsl(var(--accent))]/[0.18] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-24 h-72 w-72 rounded-full bg-blue-500/[0.15] blur-3xl" />

            <div className="relative text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/[0.09] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-[hsl(var(--accent))]">
                <Sparkles className="h-3 w-3" />
                Taxă unică
              </span>
              <h2 className="mt-4 font-display text-3xl tracking-tight text-white sm:text-5xl">
                Acces pe viață cu o singură plată
              </h2>

              <div className="mt-8 inline-flex items-baseline gap-3">
                <span className="font-display text-6xl font-black leading-none tracking-tight text-white sm:text-8xl">
                  50
                </span>
                <span className="font-display text-2xl font-bold uppercase tracking-widest text-[hsl(var(--accent))] sm:text-3xl">
                  RON
                </span>
                <span className="text-sm font-medium uppercase tracking-widest text-white/45">
                  / cont
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold uppercase tracking-widest text-white/60">
                Fără abonament lunar · Fără plată anuală
              </p>
              <p className="mt-1 text-xs uppercase tracking-widest text-white/40">
                O singură plată pentru activarea contului
              </p>
            </div>

            <div className="relative mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                "Infrastructura serverelor",
                "Transmiterea stabilă a canalelor LIVE",
                "Costurile de trafic și stocare",
                "Dezvoltarea aplicației",
                "Mentenanță și îmbunătățiri viitoare",
                "Suport tehnic dedicat",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 backdrop-blur"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--accent))]" />
                  <span className="text-sm text-white/75">{item}</span>
                </div>
              ))}
            </div>

            <p className="relative mt-8 text-center text-xs italic leading-relaxed text-white/45">
              Ne dorim să construim o platformă stabilă și de lungă durată, iar
              această contribuție unică ne ajută să oferim o experiență de
              calitate tuturor utilizatorilor.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===== PRE-REGISTRATION FORM ===== */}
      <section id="preinregistrare" className="relative scroll-mt-20">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/3 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[hsl(var(--accent))]/[0.08] blur-[140px]" />
        </div>
        <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
          {success ? (
            <SuccessCard email={success.email} />
          ) : verifying ? (
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-10 text-center backdrop-blur-xl">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[hsl(var(--accent))]" />
              <p className="mt-4 text-sm text-white/70">
                Confirmăm plata ta, te rugăm să aștepți...
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent p-8 shadow-[0_40px_120px_-40px_hsla(var(--accent)/0.35)] backdrop-blur-xl sm:p-10"
              data-testid="ctv-preregister-card"
            >
              <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[hsl(var(--accent))]/[0.15] blur-3xl" />

              <div className="relative text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/[0.09] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-[hsl(var(--accent))]">
                  <Rocket className="h-3 w-3" /> Pre-înregistrare
                </span>
                <h2 className="mt-4 font-display text-3xl tracking-tight text-white sm:text-4xl">
                  Rezervă-ți contul acum
                </h2>
                <p className="mt-2 text-sm text-white/60">
                  Completează formularul și vei fi redirecționat către plata
                  sigură prin Stripe.
                </p>
              </div>

              <form
                onSubmit={onSubmit}
                className="relative mt-8 space-y-4"
                noValidate
              >
                <div className="space-y-2">
                  <Label
                    htmlFor="ctv-name"
                    className="text-xs font-semibold uppercase tracking-widest text-white/60"
                  >
                    Nume
                  </Label>
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <Input
                      id="ctv-name"
                      data-testid="ctv-input-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      placeholder="Numele tău"
                      className="h-12 rounded-xl border-white/10 bg-black/40 pl-11 text-white placeholder:text-white/30 focus-visible:ring-[hsl(var(--accent))]/40"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-xs text-red-400">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="ctv-email"
                    className="text-xs font-semibold uppercase tracking-widest text-white/60"
                  >
                    Adresă de e-mail
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <Input
                      id="ctv-email"
                      data-testid="ctv-input-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      type="email"
                      placeholder="nume@email.ro"
                      className="h-12 rounded-xl border-white/10 bg-black/40 pl-11 text-white placeholder:text-white/30 focus-visible:ring-[hsl(var(--accent))]/40"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-400">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="ctv-password"
                    className="text-xs font-semibold uppercase tracking-widest text-white/60"
                  >
                    Parolă
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <Input
                      id="ctv-password"
                      data-testid="ctv-input-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      type="password"
                      placeholder="Minim 6 caractere"
                      className="h-12 rounded-xl border-white/10 bg-black/40 pl-11 text-white placeholder:text-white/30 focus-visible:ring-[hsl(var(--accent))]/40"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-400">{errors.password}</p>
                  )}
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-black/25 p-4">
                  <Checkbox
                    id="ctv-consent"
                    data-testid="ctv-input-consent"
                    checked={accepted}
                    onCheckedChange={(v) => setAccepted(!!v)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="ctv-consent"
                    className="text-sm leading-relaxed text-white/70"
                  >
                    Sunt de acord să fiu contactat la lansarea aplicației.
                  </label>
                </div>
                {errors.accepted && (
                  <p className="-mt-2 text-xs text-red-400">
                    {errors.accepted}
                  </p>
                )}

                <Button
                  data-testid="ctv-submit"
                  type="submit"
                  disabled={submitting}
                  className="group h-14 w-full rounded-2xl bg-gradient-to-r from-[hsl(var(--accent))] via-[hsl(var(--accent))] to-red-500 text-base font-bold tracking-wide text-[hsl(var(--accent-foreground))] shadow-[0_20px_60px_-15px_hsla(var(--accent)/0.6)] transition-all hover:scale-[1.02] hover:shadow-[0_25px_70px_-15px_hsla(var(--accent)/0.8)] disabled:opacity-70 disabled:hover:scale-100"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Se pregătește contul...
                    </>
                  ) : (
                    <>Rezervă-mi contul · 50 RON</>
                  )}
                </Button>

                <p className="pt-1 text-center text-[11px] leading-relaxed text-white/40">
                  Vei fi redirecționat către Stripe pentru finalizarea plății.
                  După confirmare, contul tău va fi rezervat automat.
                </p>
              </form>
            </motion.div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

export default function LiveTvPage() {
  const { settings, loading: settingsLoading } = useSettings() || {};
  const { user, loading: authLoading } = useAuth() || {};

  if (settingsLoading || authLoading) {
    return (
      <PublicLayout>
        <div className="grid min-h-[60vh] place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--accent))]" />
        </div>
      </PublicLayout>
    );
  }

  const isAdmin = user?.role === "admin";
  const enabled = settings?.cartoonix_tv_enabled !== false;

  if (!enabled && !isAdmin) {
    return <ComingSoonPlaceholder />;
  }

  return <CartoonixTvLanding />;
}
