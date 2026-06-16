import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { watchPartyApi } from "@/lib/watchparty";
import { toast } from "sonner";
import { Tv, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";

/**
 * Inline button that creates (or reuses) a Watch Party for the current user
 * and navigates to its lobby. Visible only to PLUS members and admins.
 *
 * Props:
 *  - variant: "primary" | "subtle" | "card"
 *  - episodeId / cartoonId: optional pre-seed for the queue
 *  - label: override the button label
 *  - onCreated(party): optional callback
 */
export default function CreateWatchPartyButton({
  variant = "primary",
  episodeId,
  cartoonId,
  label,
  onCreated,
  fullWidth = false,
  className = "",
}) {
  const { user } = useAuth() || {};
  const { settings } = useSettings() || {};
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!user) return null;
  // Feature disabled platform-wide by an admin — hide the entry point entirely.
  if (settings && settings.watch_party_enabled === false) return null;
  const isAdmin = user.role === "admin";
  const isPlus = user.subscription === "plus";
  const canUse = isPlus || isAdmin;

  const handleClick = async () => {
    if (loading) return;
    if (!canUse) {
      toast.error("Watch Party este disponibil doar pentru membrii PLUS.");
      return;
    }
    setLoading(true);
    try {
      const { party } = await watchPartyApi.create({
        initial_episode_id: episodeId || null,
        cartoon_id: cartoonId || null,
      });
      if (onCreated) onCreated(party);
      navigate(`/watch-party/${party.public_code}`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Nu am putut crea camera."));
    } finally {
      setLoading(false);
    }
  };

  const baseTestId = "create-watch-party-button";

  if (variant === "card") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !canUse}
        data-testid={baseTestId}
        className={`group relative w-full rounded-2xl border border-pink-300/30 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-pink-300/55 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        style={{
          background:
            "linear-gradient(135deg, rgba(244,114,182,0.16), rgba(168,85,247,0.10))",
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <span
            className="inline-grid place-items-center h-9 w-9 rounded-lg"
            style={{
              background:
                "linear-gradient(135deg, rgba(244,114,182,0.35), rgba(168,85,247,0.35))",
              border: "1px solid rgba(244,114,182,0.45)",
            }}
          >
            <Tv className="h-4 w-4 text-pink-100" strokeWidth={2.2} />
          </span>
          <span className="text-[10.5px] uppercase tracking-[0.32em] text-pink-200/85 font-semibold inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> PLUS Exclusiv
          </span>
        </div>
        <div className="text-[15px] font-semibold text-white">
          {label || "Crează un Watch Party"}
        </div>
        <p className="mt-1 text-[12.5px] text-white/65 leading-relaxed">
          Urmărește sincronizat alături de până la 5 prieteni PLUS.
        </p>
        <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-pink-200/80">
          <Users className="h-3.5 w-3.5" /> max 6 participanți
        </div>
      </button>
    );
  }

  if (variant === "subtle") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || !canUse}
        data-testid={baseTestId}
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-medium text-white/85 border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-60 disabled:cursor-not-allowed ${
          fullWidth ? "w-full justify-center" : ""
        } ${className}`}
      >
        <Tv className="h-4 w-4" />
        {label || (loading ? "Se creează..." : "Watch Party")}
      </button>
    );
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={loading || !canUse}
      data-testid={baseTestId}
      className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 text-white font-semibold hover:brightness-110 ${
        fullWidth ? "w-full" : ""
      } ${className}`}
    >
      <Tv className="h-4 w-4" />
      {label || (loading ? "Se creează..." : "Watch Party")}
    </Button>
  );
}
