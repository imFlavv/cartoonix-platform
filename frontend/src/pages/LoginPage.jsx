import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { login } = useAuth();
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
      toast.success(`Welcome back, ${u.nickname}!`);
      if (!u.email_verified) {
        navigate("/verify", { state: { email: u.email } });
      } else {
        const next = location.state?.from || (u.role === "admin" ? "/admin" : "/dashboard");
        navigate(next);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <section className="relative noise-overlay">
        <div className="absolute inset-0 hero-bg opacity-70" />
        <div className="relative mx-auto max-w-md px-4 sm:px-6 py-16">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
            className="rounded-2xl border border-border bg-card/80 backdrop-blur p-7 shadow-[0_14px_40px_rgba(0,0,0,0.45)]">
            <h1 className="font-display text-3xl tracking-wider">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to continue your binge.</p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  data-testid="login-email-input" autoComplete="email" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  data-testid="login-password-input" autoComplete="current-password" className="h-11 rounded-xl" />
              </div>
              <Button type="submit" disabled={loading} data-testid="login-submit-button" className="w-full h-11 rounded-xl text-base">
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            <p className="text-sm text-muted-foreground mt-5 text-center">
              New to Cartoonix? <Link to="/register" className="text-[hsl(var(--primary))] hover:underline" data-testid="login-to-register-link">Create an account</Link>
            </p>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
