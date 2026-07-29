import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { PlusIcon } from "@/components/PlusIcon";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const MAX_ATTEMPTS = 10;

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [state, setState] = useState("checking"); // checking | success | error | timeout
  const attemptsRef = useRef(0);
  const doneRef = useRef(false);
  // keep latest refreshUser without re-triggering the polling effect
  const refreshUserRef = useRef(refreshUser);
  refreshUserRef.current = refreshUser;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) {
      setState("error");
      return;
    }

    let cancelled = false;
    const poll = async () => {
      if (cancelled || doneRef.current) return;
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setState("timeout");
        return;
      }
      attemptsRef.current += 1;
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (cancelled || doneRef.current) return;
        if (data.payment_status === "paid") {
          doneRef.current = true;
          setState("success");
          try {
            await refreshUserRef.current();
          } catch {
            /* ignore refresh error, PLUS already granted server-side */
          }
          return;
        }
        if (["expired", "failed"].includes(data.payment_status)) {
          doneRef.current = true;
          setState("error");
          return;
        }
        setTimeout(poll, 2000);
      } catch {
        if (cancelled || doneRef.current) return;
        setTimeout(poll, 2000);
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="flex flex-col items-center justify-center pt-40 px-4 text-center">
        {state === "checking" && (
          <>
            <Loader2 className="w-14 h-14 text-[#ffcc00] animate-spin mb-6" />
            <h1 className="text-2xl font-bold mb-2">Confirmăm plata...</h1>
            <p className="text-white/60">Un moment, verificăm tranzacția ta.</p>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-400 mb-6" />
            <div className="flex items-center gap-2 mb-3">
              <h1 className="text-3xl font-extrabold">Bine ai venit în</h1>
              <PlusIcon className="h-8" />
            </div>
            <p className="text-white/70 mb-8 max-w-md">
              Cartoonix PLUS este acum activ pe contul tău, pe viață. Bucură-te de acces
              complet, fără reclame!
            </p>
            <button
              onClick={() => navigate("/home")}
              className="px-8 py-3 rounded-full bg-[#ffcc00] text-black font-bold hover:bg-[#ffd633] transition"
            >
              Începe să explorezi
            </button>
          </>
        )}
        {(state === "error" || state === "timeout") && (
          <>
            <XCircle className="w-16 h-16 text-red-400 mb-6" />
            <h1 className="text-2xl font-bold mb-2">
              {state === "timeout" ? "Plata durează mai mult decât normal" : "Ceva n-a mers bine"}
            </h1>
            <p className="text-white/60 mb-8 max-w-md">
              {state === "timeout"
                ? "Dacă ai fost taxat, PLUS se va activa automat în scurt timp. Reîncarcă pagina de profil."
                : "Nu am putut confirma plata. Dacă ai fost taxat, contactează-ne."}
            </p>
            <button
              onClick={() => navigate("/plus")}
              className="px-8 py-3 rounded-full bg-white/10 border border-white/20 font-bold hover:bg-white/20 transition"
            >
              Înapoi la PLUS
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
