import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { getErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faLock,
  faRightToBracket,
  faTv,
  faBolt,
  faUsers,
  faStar,
  faCirclePlay,
} from "@fortawesome/free-solid-svg-icons";

const PERKS = [
  { icon: faTv, text: "Trei canale legendare, un singur tezaur" },
  { icon: faBolt, text: "Streaming fără reclame cu Cartoonix PLUS" },
  { icon: faUsers, text: "Chat live alături de superfani" },
  { icon: faStar, text: "Conținut curat, selectat de comunitate" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { settings } = useSettings() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Bine ai revenit, ${u.nickname}!`);
      if (!u.email_verified) {
        navigate("/verify", { state: { email: u.email } });
      } else if (settings?.presentation_mode && u.role !== "admin") {
        toast.info("Accesul la platformă va fi disponibil în curând.");
        navigate("/");
      } else {
        const next = location.state?.from || (u.role === "admin" ? "/admin" : "/profile");
        navigate(next);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Autentificare eșuată"));
    } finally {
      setLoading(false);
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
          <div className="grid lg:grid-cols-2">
            {/* ===== Brand panel ===== */}
            <div className="relative hidden lg:flex flex-col justify-between brand-panel p-10 overflow-hidden">
              <div className="absolute inset-0 scanlines opacity-60" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[hsl(var(--accent))]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> On Air
                </div>
                <h2 className="mt-7 font-display text-6xl leading-none tracking-[0.06em] text-[hsl(var(--accent))]">
                  CARTOONIX
                </h2>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/55">
                  Reia maratonul de unde ai rămas. Desenele care au definit copilăria, într-un singur loc premium.
                </p>
              </div>

              <ul className="relative mt-10 space-y-4">
                {PERKS.map((p, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-white/75">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.05] ring-1 ring-white/10 text-[hsl(var(--accent))]">
                      <FontAwesomeIcon icon={p.icon} className="h-4 w-4" />
                    </span>
                    {p.text}
                  </li>
                ))}
              </ul>
            </div>

            {/* ===== Form panel ===== */}
            <div className="relative p-8 sm:p-10">
              <div className="mb-7">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-white/50">
                  <FontAwesomeIcon icon={faCirclePlay} className="h-3 w-3 text-[hsl(var(--accent))]" /> Autentificare
                </span>
                <h1 className="mt-4 font-display text-4xl tracking-wider text-white">Bine ai revenit</h1>
                <p className="text-sm text-white/45 mt-1">Continuă maratonul tău nostalgic.</p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-white/70">Email</Label>
                  <div className="input-icon-wrap">
                    <FontAwesomeIcon icon={faEnvelope} className="fa-leading h-4 w-4" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="login-email-input"
                      autoComplete="email"
                      placeholder="tu@exemplu.ro"
                      className="h-12 rounded-xl pl-11 bg-white/[0.03] border-white/10 focus-visible:ring-[hsl(var(--accent))]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-white/70">Parolă</Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-white/45 hover:text-[hsl(var(--accent))] transition-colors"
                      data-testid="login-forgot-password-link"
                    >
                      Am uitat parola
                    </Link>
                  </div>
                  <div className="input-icon-wrap">
                    <FontAwesomeIcon icon={faLock} className="fa-leading h-4 w-4" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      data-testid="login-password-input"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="h-12 rounded-xl pl-11 bg-white/[0.03] border-white/10 focus-visible:ring-[hsl(var(--accent))]"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  data-testid="login-submit-button"
                  className="w-full h-12 rounded-xl text-base font-semibold bg-[hsl(var(--accent))] text-black hover:bg-[hsl(var(--accent))]/90"
                >
                  {loading ? "Se autentifică..." : (
                    <>
                      Autentificare <FontAwesomeIcon icon={faRightToBracket} className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/30">
                <span className="h-px flex-1 bg-white/10" /> sau <span className="h-px flex-1 bg-white/10" />
              </div>

              <p className="text-sm text-white/50 text-center">
                Nou pe Cartoonix?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-[hsl(var(--accent))] hover:underline underline-offset-4"
                  data-testid="login-to-register-link"
                >
                  Creează un cont
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </PublicLayout>
  );
}
