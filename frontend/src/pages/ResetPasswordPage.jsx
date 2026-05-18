import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, CheckCircle2, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PasswordStrengthMeter, {
  evaluatePasswordStrength,
} from "@/components/PasswordStrengthMeter";
import { api, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const token = search.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);
  const passwordsMatch = password && password === confirm;
  const canSubmit = !!token && strength.allMet && passwordsMatch && !loading;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      if (!strength.allMet) {
        toast.error("Parola nu îndeplinește toate cerințele de securitate.");
      } else if (!passwordsMatch) {
        toast.error("Parolele nu se potrivesc.");
      }
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setDone(true);
      toast.success("Parola a fost resetată cu succes!");
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      toast.error(getErrorMessage(err, "Resetarea a eșuat. Link-ul ar putea fi expirat."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <section className="relative noise-overlay">
        <div className="absolute inset-0 hero-bg opacity-70" />
        <div className="relative mx-auto max-w-md px-4 sm:px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-border bg-card/80 backdrop-blur p-7 shadow-[0_14px_40px_rgba(0,0,0,0.45)]"
          >
            {!token ? (
              <div className="text-center">
                <h1 className="font-display text-2xl tracking-wider">Link invalid</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Link-ul de resetare lipsește sau este incomplet. Cere unul nou de pe pagina
                  "Am uitat parola".
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-6 w-full h-11 rounded-xl"
                >
                  <Link to="/forgot-password">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Cere un link nou
                  </Link>
                </Button>
              </div>
            ) : done ? (
              <div className="text-center">
                <div className="mx-auto mb-5 inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </div>
                <h1 className="font-display text-2xl tracking-wider">Parolă schimbată</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Te redirecționăm către pagina de autentificare...
                </p>
              </div>
            ) : (
              <>
                <div className="mb-5 inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <KeyRound className="h-6 w-6 text-amber-300" />
                </div>
                <h1 className="font-display text-3xl tracking-wider">Setează o parolă nouă</h1>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Alege o parolă puternică pentru a-ți proteja contul.
                </p>
                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Parolă nouă</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        className="h-11 rounded-xl pr-10"
                        data-testid="reset-password-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <PasswordStrengthMeter password={password} className="mt-2" />

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm">Confirmă parola</Label>
                    <Input
                      id="confirm"
                      type={showPw ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="h-11 rounded-xl"
                      data-testid="reset-confirm-input"
                    />
                    {confirm && !passwordsMatch && (
                      <p className="text-xs text-red-400 mt-1">Parolele nu se potrivesc.</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full h-11 rounded-xl text-base"
                    data-testid="reset-submit-button"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Se salvează...
                      </>
                    ) : (
                      "Resetează parola"
                    )}
                  </Button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
