import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      toast.error(getErrorMessage(err, "Nu am putut trimite emailul. Încearcă din nou."));
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
            {sent ? (
              <div className="text-center">
                <div className="mx-auto mb-5 inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </div>
                <h1 className="font-display text-2xl tracking-wider">Verifică-ți emailul</h1>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Dacă există un cont asociat adresei{" "}
                  <span className="text-foreground font-medium break-all">{email}</span>, ți-am
                  trimis un link de resetare. Link-ul expiră în 60 de minute.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-6 w-full h-11 rounded-xl"
                  data-testid="forgot-back-to-login"
                >
                  <Link to="/login">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Înapoi la autentificare
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-5 inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/30">
                  <Mail className="h-6 w-6 text-fuchsia-300" />
                </div>
                <h1 className="font-display text-3xl tracking-wider">Ai uitat parola?</h1>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Introdu adresa de email asociată contului tău și îți vom trimite un link de
                  resetare a parolei.
                </p>
                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      placeholder="nume@example.com"
                      className="h-11 rounded-xl"
                      data-testid="forgot-email-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl text-base"
                    data-testid="forgot-submit-button"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Se trimite...
                      </>
                    ) : (
                      "Trimite link de resetare"
                    )}
                  </Button>
                </form>
                <p className="text-sm text-muted-foreground mt-5 text-center">
                  Ți-ai amintit parola?{" "}
                  <Link
                    to="/login"
                    className="text-[hsl(var(--primary))] hover:underline"
                    data-testid="forgot-to-login-link"
                  >
                    Autentifică-te
                  </Link>
                </p>
              </>
            )}
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
