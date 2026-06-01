import React, { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

/**
 * UpgradeReturnPage
 * -----------------
 * Handles the Stripe success redirect (`?session_id=...`) for the FREE → PLUS
 * upgrade flow when the user initiated the upgrade from the regular platform
 * (i.e. the "Upgrade la PLUS" button in the header), and early-access mode is
 * OFF.
 *
 * Stripe Payment Link is configured with a fixed success URL pointing to
 * `/early-access?session_id={CHECKOUT_SESSION_ID}`. In normal platform mode the
 * `/early-access` route used to redirect to `/`, which **dropped** the
 * `session_id` and the upgrade was never confirmed. This page calls
 * `POST /api/users/me/confirm-upgrade`, refreshes the user, shows feedback and
 * sends the user back to the home page (or to `/profile` as a fallback).
 */
export default function UpgradeReturnPage() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { user, fetchMe, loading: authLoading } = useAuth() || {};
  const calledRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    const sessionId = search.get("session_id");
    if (!sessionId) {
      navigate("/", { replace: true });
      return;
    }
    if (!user) {
      // Not logged in — send them to login so they can come back.
      navigate("/login", { replace: true });
      return;
    }
    if (calledRef.current) return;
    calledRef.current = true;

    (async () => {
      try {
        await api.post("/users/me/confirm-upgrade", { session_id: sessionId });
        if (fetchMe) await fetchMe();
        try {
          localStorage.removeItem("cartoonix_upgrade_pending");
        } catch {
          /* ignore */
        }
        toast.success("UPGRADE REALIZAT CU SUCCES!", {
          description: "Contul tău este acum CARTOONIX PLUS. Mulțumim!",
          duration: 6000,
        });
      } catch (err) {
        const alreadyPlus = user?.subscription === "plus";
        if (alreadyPlus) {
          toast.success("Ai deja planul CARTOONIX PLUS.");
        } else {
          const msg =
            err?.response?.data?.detail ||
            "Nu am putut confirma upgrade-ul. Dacă plata a fost efectuată, contactează suportul.";
          toast.error(msg);
        }
      } finally {
        navigate("/", { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  return (
    <div className="min-h-screen w-full grid place-items-center bg-[#0a0a0c] text-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
        <p className="text-sm uppercase tracking-[0.2em] text-white/70">
          Confirmăm plata...
        </p>
      </div>
    </div>
  );
}
