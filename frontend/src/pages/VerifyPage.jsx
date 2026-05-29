import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function VerifyPage() {
  const { user, verifyEmail, resendCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || user?.email || "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (user?.email_verified) navigate(user.role === "admin" ? "/admin" : "/profile");
  }, [user, navigate]);

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
      toast.success("Email verificat!");
      navigate(user?.role === "admin" ? "/admin" : "/profile");
    } catch (err) {
      toast.error(getErrorMessage(err, "Cod invalid"));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    try {
      await resendCode(email);
      toast.success("Cod nou trimis");
      setResendCooldown(30);
    } catch (err) {
      toast.error(getErrorMessage(err, "Nu am putut retrimite"));
    }
  };

  return (
    <PublicLayout>
      <section className="relative noise-overlay">
        <div className="absolute inset-0 hero-bg opacity-70" />
        <div className="relative mx-auto max-w-md px-4 py-16">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
            className="rounded-2xl border border-border bg-card/85 backdrop-blur p-7 shadow-[0_14px_40px_rgba(0,0,0,0.45)]">
            <div className="text-center mb-5">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] grid place-items-center mb-3">
                <Sparkles className="h-5 w-5" />
              </div>
              <h1 className="font-display text-3xl tracking-wider">Verifică-ți emailul</h1>
              <p className="text-sm text-muted-foreground mt-1">Introdu codul de 6 cifre primit pe email.</p>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl" data-testid="verify-email-input" />
              </div>
              <div className="space-y-1.5">
                <Label>Cod</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6} inputMode="numeric" placeholder="• • • • • •"
                  data-testid="verify-code-input" className="h-14 rounded-xl text-center text-2xl tracking-[0.5em] font-mono" />
              </div>
              <Button type="submit" disabled={loading || code.length !== 6} data-testid="otp-submit-button" className="w-full h-11 rounded-xl">
                {loading ? "Se verifică..." : "Verifică"}
              </Button>
            </form>
            <div className="text-center text-sm text-muted-foreground mt-4">
              <button onClick={onResend} disabled={resendCooldown > 0} data-testid="verify-resend-button" className="text-[hsl(var(--primary))] hover:underline disabled:opacity-50">
                {resendCooldown > 0 ? `Retrimite în ${resendCooldown}s` : "Retrimite codul"}
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
