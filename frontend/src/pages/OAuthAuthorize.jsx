import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { ShieldCheck, Gamepad2, UserRound, AlertTriangle, Loader2 } from "lucide-react";
import { API } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { LOGO_TRANSPARENT } from "@/data/constants";

const appToken = () => sessionStorage.getItem("cx_oidc_token") || localStorage.getItem("cx_token");
const clearOidc = () => {
  sessionStorage.removeItem("cx_oidc_token");
  sessionStorage.removeItem("cx_oidc_name");
};

const ErrorBox = ({ text }) => (
  <div data-testid="oauth-error" className="flex items-start gap-3 p-4 rounded-xl bg-[#ec1c24]/10 border border-[#ec1c24]/30 text-sm">
    <AlertTriangle className="h-5 w-5 text-[#ec1c24] shrink-0" />
    <p className="text-white/80">{text}</p>
  </div>
);

export default function OAuthAuthorize() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [client, setClient] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const params = Object.fromEntries(new URLSearchParams(search));
  const goLogin = () => navigate(`/login?returnTo=${encodeURIComponent(`/oauth/authorize${search}`)}`, { replace: true });

  const handleError = (err) => {
    const detail = err.response?.data?.detail;
    if (detail?.redirect_url) return window.location.replace(detail.redirect_url);
    if (err.response?.status === 401) {
      clearOidc();
      return goLogin();
    }
    setError(typeof detail === "string" ? detail : "Cererea de conectare nu este validă sau aplicația nu este înregistrată.");
    setBusy(false);
  };

  useEffect(() => {
    if (loading) return;
    axios.post(`${API}/oidc/authorize/details`, params)
      .then((res) => (appToken() ? setClient(res.data) : goLogin()))
      .catch(handleError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, search]);

  const decide = async (action) => {
    setBusy(true);
    try {
      const headers = action === "approve" ? { Authorization: `Bearer ${appToken()}` } : {};
      const res = await axios.post(`${API}/oidc/authorize/${action}`, params, { headers });
      clearOidc();
      window.location.assign(res.data.redirect_url);
    } catch (err) {
      handleError(err);
    }
  };

  const switchAccount = () => {
    clearOidc();
    logout();
    goLogin();
  };

  const name = user?.name || sessionStorage.getItem("cx_oidc_name") || "contul tău";

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 bg-[#0a0a0a] bg-cover bg-center" style={{ backgroundImage: "url('/auth-bg.webp')" }}>
      <div className="absolute inset-0 bg-black/65" />
      <div data-testid="oauth-consent" className="relative w-full max-w-md bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <img src={LOGO_TRANSPARENT} alt="Cartoonix" className="h-14 mx-auto mb-6" />
        {error ? <ErrorBox text={error} /> : !client ? (
          <div data-testid="oauth-loading" className="flex justify-center py-10 text-white/50"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-2xl bg-[#ff7a18]/15 text-[#ff7a18] flex items-center justify-center"><Gamepad2 className="h-7 w-7" /></div>
            </div>
            <h1 className="font-display text-2xl text-center" data-testid="oauth-title">
              Continui ca <span className="text-[#ffcc00]">{name}</span> în {client.client_name}?
            </h1>
            <p className="text-center text-sm text-white/50 mt-2">Vei fi trimis înapoi la <span className="text-white/80" data-testid="oauth-redirect-host">{client.redirect_host}</span></p>
            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 text-sm space-y-2.5">
              <p className="text-white/60">{client.client_name} va primi:</p>
              <p className="flex items-center gap-2 text-white/85"><ShieldCheck className="h-4 w-4 text-[#22c55e]" /> Un identificator unic al contului tău</p>
              {client.scopes.includes("profile") && (
                <p className="flex items-center gap-2 text-white/85"><UserRound className="h-4 w-4 text-[#22c55e]" /> Numele tău afișat</p>
              )}
              <p className="text-xs text-white/40 pt-1">Parola, emailul și celelalte date ale contului nu sunt trimise.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button data-testid="oauth-deny-btn" disabled={busy} onClick={() => decide("deny")}
                className="py-3 rounded-xl bg-white/10 hover:bg-white/15 font-semibold transition-colors duration-200 disabled:opacity-50">Refuză</button>
              <button data-testid="oauth-approve-btn" disabled={busy} onClick={() => decide("approve")}
                className="py-3 rounded-xl bg-[#ec1c24] hover:bg-[#ff2d35] font-semibold transition-colors duration-200 disabled:opacity-50">{busy ? "Se trimite..." : "Permite"}</button>
            </div>
            <button data-testid="oauth-switch-account" onClick={switchAccount} className="block mx-auto mt-4 text-xs text-white/50 hover:text-white transition-colors duration-200">
              Nu ești tu? Schimbă contul
            </button>
          </>
        )}
      </div>
    </div>
  );
}
