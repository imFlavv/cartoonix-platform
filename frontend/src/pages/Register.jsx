import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { LOGO_TRANSPARENT, AVATAR_SEEDS } from "@/data/constants";
import { Check, ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";

const Register = () => {
  const { registerStart, registerVerify } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState("form"); // form | verify
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_SEEDS[0]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const startResendTimer = (seconds) => {
    setResendIn(seconds);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await registerStart({ name, email, password, avatar });
      toast.success("Ți-am trimis un cod de verificare pe email 📧");
      setStep("verify");
      startResendTimer(60);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await registerVerify(email, code.trim());
      toast.success("Cont creat! Bun venit la Cartoonix 🎉");
      navigate("/home");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0) return;
    setError("");
    setBusy(true);
    try {
      await registerStart({ name, email, password, avatar });
      toast.success("Cod retrimis pe email");
      startResendTimer(60);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10 overflow-hidden bg-[#0a0a0a]">
      <div className="absolute inset-0 opacity-30" style={{
        background: "radial-gradient(circle at 70% 20%, rgba(255,204,0,0.3), transparent 55%), radial-gradient(circle at 20% 80%, rgba(236,28,36,0.35), transparent 55%)",
      }} />
      <div className="relative w-full max-w-lg bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <Link to="/home" className="flex justify-center mb-5">
          <img src={LOGO_TRANSPARENT} alt="Cartoonix" className="h-14" />
        </Link>

        {error && (
          <div data-testid="register-error" className="mb-4 p-3 rounded-lg bg-[#ec1c24]/15 border border-[#ec1c24]/40 text-sm text-[#ff6b71]">
            {error}
          </div>
        )}

        {step === "form" ? (
          <>
            <h1 className="font-display text-3xl text-center mb-1">Creează cont</h1>
            <p className="text-center text-sm text-white/50 mb-6">Alege-ți avatarul și pornește aventura</p>
            <form onSubmit={submitForm} className="space-y-4">
              <input
                data-testid="register-name"
                required
                placeholder="Nume"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]"
              />
              <input
                data-testid="register-email"
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]"
              />
              <input
                data-testid="register-password"
                type="password"
                required
                minLength={6}
                placeholder="Parolă (min. 6 caractere)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]"
              />

              <div>
                <p className="text-sm font-semibold text-white/70 mb-2">Alege un avatar</p>
                <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                  {AVATAR_SEEDS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      data-testid={`avatar-option`}
                      onClick={() => setAvatar(a)}
                      className={`relative rounded-full overflow-hidden bg-white/5 border-2 transition-all duration-200 ${
                        avatar === a ? "border-[#ffcc00] scale-105" : "border-transparent hover:border-white/30"
                      }`}
                    >
                      <img src={a} alt="avatar" className="w-full aspect-square object-cover" />
                      {avatar === a && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <Check className="h-4 w-4 text-[#ffcc00]" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button
                data-testid="register-submit"
                type="submit"
                disabled={busy}
                className="w-full py-3 rounded-lg bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-60"
              >
                {busy ? "Se trimite codul..." : "Continuă"}
              </button>
            </form>

            <p className="text-center text-sm text-white/50 mt-6">
              Ai deja cont?{" "}
              <Link to="/login" data-testid="go-login" className="text-[#ffcc00] font-semibold hover:underline">
                Conectează-te
              </Link>
            </p>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <span className="w-14 h-14 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 flex items-center justify-center">
                <MailCheck className="h-7 w-7 text-[#ffcc00]" />
              </span>
            </div>
            <h1 className="font-display text-3xl text-center mb-1">Verifică emailul</h1>
            <p className="text-center text-sm text-white/50 mb-6">
              Am trimis un cod de 6 cifre la<br />
              <span className="text-white/80 font-semibold">{email}</span>
            </p>
            <form onSubmit={submitCode} className="space-y-4">
              <input
                data-testid="register-otp"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="______"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-center text-2xl tracking-[0.5em] placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]"
              />
              <button
                data-testid="register-verify-submit"
                type="submit"
                disabled={busy || code.length < 6}
                className="w-full py-3 rounded-lg bg-[#ec1c24] text-white font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-60"
              >
                {busy ? "Se verifică..." : "Verifică și creează contul"}
              </button>
            </form>

            <div className="flex items-center justify-between mt-6 text-sm">
              <button
                type="button"
                onClick={() => { setStep("form"); setCode(""); setError(""); }}
                className="text-white/60 hover:text-white flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" /> Înapoi
              </button>
              <button
                type="button"
                onClick={resend}
                disabled={resendIn > 0 || busy}
                className="text-[#ffcc00] font-semibold hover:underline disabled:text-white/30 disabled:no-underline"
              >
                {resendIn > 0 ? `Retrimite codul (${resendIn}s)` : "Retrimite codul"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;
