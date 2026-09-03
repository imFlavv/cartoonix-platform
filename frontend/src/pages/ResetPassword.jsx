import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { LOGO_TRANSPARENT } from "@/data/constants";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Parola trebuie să aibă cel puțin 6 caractere.");
      return;
    }
    if (password !== confirm) {
      setError("Parolele nu coincid.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      toast.success("Parola a fost schimbată!");
      navigate("/login");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 overflow-hidden bg-[#0a0a0a] bg-cover bg-center" style={{ backgroundImage: "url('/auth-bg.webp')" }}>
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 opacity-30" style={{
        background: "radial-gradient(circle at 30% 20%, rgba(236,28,36,0.4), transparent 55%), radial-gradient(circle at 80% 80%, rgba(255,204,0,0.25), transparent 55%)",
      }} />
      <div className="relative w-full max-w-md bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <Link to="/home" className="flex justify-center mb-6">
          <img src={LOGO_TRANSPARENT} alt="Cartoonix" className="h-16" />
        </Link>
        <h1 className="font-display text-3xl text-center mb-1">Parolă nouă</h1>
        <p className="text-center text-sm text-white/50 mb-6">Alege o parolă nouă pentru contul tău</p>

        {error && (
          <div data-testid="reset-error" className="mb-4 p-3 rounded-lg bg-[#ec1c24]/15 border border-[#ec1c24]/40 text-sm text-[#ff6b71]">
            {error}
          </div>
        )}

        {!token ? (
          <div className="text-center">
            <div className="mb-4 p-4 rounded-lg bg-[#ec1c24]/15 border border-[#ec1c24]/40 text-sm text-[#ff6b71]">
              Link invalid. Cere din nou resetarea parolei.
            </div>
            <Link to="/login" data-testid="reset-back-login" className="text-[#ffcc00] font-semibold hover:underline text-sm">
              Înapoi la conectare
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <input
              data-testid="reset-password"
              type="password"
              required
              placeholder="Parolă nouă"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]"
            />
            <input
              data-testid="reset-password-confirm"
              type="password"
              required
              placeholder="Confirmă parola"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]"
            />
            <button
              data-testid="reset-submit"
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-lg bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-60"
            >
              {busy ? "Se salvează..." : "Schimbă parola"}
            </button>
            <Link to="/login" data-testid="reset-back-login-2" className="block text-center text-sm text-white/50 hover:text-[#ffcc00] transition-colors">
              Înapoi la conectare
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
