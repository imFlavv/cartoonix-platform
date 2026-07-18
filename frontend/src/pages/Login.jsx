import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { LOGO_TRANSPARENT } from "@/data/constants";
import { toast } from "sonner";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Bine ai revenit!");
      navigate("/home");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden bg-[#0a0a0a]">
      <div className="absolute inset-0 opacity-30" style={{
        background: "radial-gradient(circle at 30% 20%, rgba(236,28,36,0.4), transparent 55%), radial-gradient(circle at 80% 80%, rgba(255,204,0,0.25), transparent 55%)",
      }} />
      <div className="relative w-full max-w-md bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <Link to="/home" className="flex justify-center mb-6">
          <img src={LOGO_TRANSPARENT} alt="Cartoonix" className="h-16" />
        </Link>
        <h1 className="font-display text-3xl text-center mb-1">Conectare</h1>
        <p className="text-center text-sm text-white/50 mb-6">Intră în lumea desenelor copilăriei</p>

        {error && (
          <div data-testid="login-error" className="mb-4 p-3 rounded-lg bg-[#ec1c24]/15 border border-[#ec1c24]/40 text-sm text-[#ff6b71]">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <input
            data-testid="login-email"
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]"
          />
          <input
            data-testid="login-password"
            type="password"
            required
            placeholder="Parolă"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]"
          />
          <button
            data-testid="login-submit"
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-lg bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-60"
          >
            {busy ? "Se conectează..." : "Conectare"}
          </button>
        </form>

        <p className="text-center text-sm text-white/50 mt-6">
          Nu ai cont?{" "}
          <Link to="/register" data-testid="go-register" className="text-[#ffcc00] font-semibold hover:underline">
            Înregistrează-te
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
