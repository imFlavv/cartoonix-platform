import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Crown,
  Sparkles,
  LogOut,
  Rocket,
  ArrowUpRight,
  Loader2,
  Trophy,
  Settings as SettingsIcon,
  Inbox,
  UserCircle2,
  Check,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PasswordStrengthMeter, {
  evaluatePasswordStrength,
} from "@/components/PasswordStrengthMeter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api, mediaUrl } from "@/lib/api";

const LAUNCH_DATE = new Date("2026-06-01T00:00:00+03:00");

function useCountdown(target) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, done: diff <= 0 };
}

function Cell({ value, label }) {
  const text = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative rounded-2xl bg-gradient-to-br from-[#1a1d24] to-[#101218] border border-white/10 px-4 sm:px-6 py-4 sm:py-6 min-w-[72px] sm:min-w-[110px] shadow-[0_18px_48px_-12px_rgba(0,0,0,0.6)]"
      >
        <span
          className="block text-center font-display text-4xl sm:text-6xl font-bold tabular-nums tracking-tight"
          style={{
            backgroundImage:
              "linear-gradient(180deg,#ffffff 0%,#cbd5e1 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {text}
        </span>
      </div>
      <span className="mt-2 text-[10px] sm:text-[11px] tracking-[0.28em] uppercase text-white/40 font-semibold">
        {label}
      </span>
    </div>
  );
}

/**
 * UserBar — avatar (with red glow ring) + nickname + plan badge + optional UPGRADE button +
 * a settings cog with dropdown (Inbox, Avatar).
 */
function UserBar({ user, isPlus, onUpgrade, upgrading, onOpenInbox, onOpenAvatar, onOpenPassword }) {
  const avatarSrc = user?.avatar_url ? mediaUrl(user.avatar_url) : "";

  return (
    <div
      data-testid="ea-user-bar"
      className="mx-auto inline-flex items-center gap-3 sm:gap-4 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md pl-2 pr-2 sm:pl-3 sm:pr-2.5 py-2 shadow-[0_18px_48px_-18px_rgba(0,0,0,0.6)]"
    >
      {/* Avatar with red glow ring (like the user's reference image) */}
      <div className="relative flex-shrink-0">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full blur-md opacity-80"
          style={{ background: "radial-gradient(closest-side, rgba(239,68,68,0.7), transparent 70%)" }}
        />
        <span
          aria-hidden
          className="absolute -inset-0.5 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, #ef4444, #f97316, #ef4444, #b91c1c, #ef4444)",
          }}
        />
        <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-full overflow-hidden border-2 border-[#0a0a0c]">
          {avatarSrc ? (
            <img src={avatarSrc} alt={user?.nickname || "Avatar"} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center text-sm font-bold">
              {(user?.nickname || "C").slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Nickname */}
      <span
        data-testid="ea-user-nickname"
        className="font-semibold text-white text-sm sm:text-base max-w-[120px] sm:max-w-none truncate"
      >
        {user?.nickname || "Cartoonix Fan"}
      </span>

      {/* Divider */}
      <span className="h-6 w-px bg-white/15" aria-hidden />

      {/* Plan badge */}
      {isPlus ? (
        <span
          data-testid="ea-plan-badge"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-black font-bold shadow-md shadow-amber-400/20"
        >
          <Crown className="h-3.5 w-3.5" />
          <span className="tracking-[0.16em] text-[11px]">PLUS</span>
        </span>
      ) : (
        <span
          data-testid="ea-plan-badge"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white"
        >
          <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
          <span className="tracking-[0.16em] text-[11px] font-semibold">FREE</span>
        </span>
      )}

      {/* Upgrade button — only for FREE users */}
      {!isPlus && (
        <button
          type="button"
          data-testid="ea-upgrade-button"
          onClick={onUpgrade}
          disabled={upgrading}
          className="group relative inline-flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-bold tracking-[0.18em] uppercase text-black bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 hover:from-amber-200 hover:via-yellow-300 hover:to-orange-300 transition-all shadow-[0_8px_22px_-6px_rgba(251,191,36,0.55)] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {upgrading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>...</span>
            </>
          ) : (
            <>
              <span>Upgrade</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </>
          )}
        </button>
      )}

      {/* Divider before cog */}
      <span className="h-6 w-px bg-white/15" aria-hidden />

      {/* Settings cog with dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Setări cont"
            data-testid="ea-settings-button"
            className="relative inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/[0.06] border border-white/10 hover:bg-white/[0.10] hover:border-white/20 text-white/70 hover:text-white transition-all"
          >
            <SettingsIcon className="h-4 w-4 transition-transform duration-500 hover:rotate-90" strokeWidth={2.1} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={10}
          className="w-56 bg-[#101218] border border-white/10 text-white shadow-2xl shadow-black/60 rounded-xl p-1.5"
          data-testid="ea-settings-menu"
        >
          <DropdownMenuLabel className="text-[10px] tracking-[0.22em] uppercase text-white/40 font-semibold px-2 pt-1.5 pb-1">
            Contul meu
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={onOpenInbox}
            data-testid="ea-menu-inbox"
            className="rounded-lg px-2.5 py-2 cursor-pointer focus:bg-white/10 focus:text-white text-sm gap-2.5"
          >
            <Inbox className="h-4 w-4 text-fuchsia-300" />
            <span className="flex-1">Inbox</span>
            <span className="text-[9px] tracking-[0.18em] uppercase text-white/35 font-semibold">Soon</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10 my-1" />
          <DropdownMenuItem
            onClick={onOpenAvatar}
            data-testid="ea-menu-avatar"
            className="rounded-lg px-2.5 py-2 cursor-pointer focus:bg-white/10 focus:text-white text-sm gap-2.5"
          >
            <UserCircle2 className="h-4 w-4 text-indigo-300" />
            <span className="flex-1">Avatar</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onOpenPassword}
            data-testid="ea-menu-password"
            className="rounded-lg px-2.5 py-2 cursor-pointer focus:bg-white/10 focus:text-white text-sm gap-2.5"
          >
            <KeyRound className="h-4 w-4 text-amber-300" />
            <span className="flex-1">Parolă</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function EarlyAccessSuccessPage() {
  const { user, logout, fetchMe } = useAuth() || {};
  const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const { days, hours, minutes, seconds } = useCountdown(LAUNCH_DATE);
  const [upgrading, setUpgrading] = useState(false);
  const [confirmingUpgrade, setConfirmingUpgrade] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [avatars, setAvatars] = useState([]);
  const [avatarsLoading, setAvatarsLoading] = useState(false);
  const [savingAvatarUrl, setSavingAvatarUrl] = useState(null);
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwShow, setPwShow] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const confirmedRef = useRef(false);

  const isPlus = user?.subscription === "plus";

  const doLogout = async () => {
    if (logout) await logout();
    navigate("/early-access", { replace: true });
  };

  // ---- Avatar picker ----
  const openAvatarPicker = async () => {
    setAvatarOpen(true);
    if (avatars.length > 0) return;
    setAvatarsLoading(true);
    try {
      const { data } = await api.get("/avatars");
      setAvatars(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Nu am putut încărca lista de avatare.");
    } finally {
      setAvatarsLoading(false);
    }
  };

  const chooseAvatar = async (avatarUrl) => {
    if (!avatarUrl || avatarUrl === user?.avatar_url) return;
    setSavingAvatarUrl(avatarUrl);
    try {
      await api.patch("/auth/me", { avatar_url: avatarUrl });
      if (fetchMe) await fetchMe();
      toast.success("Avatar actualizat!");
      setAvatarOpen(false);
    } catch (err) {
      toast.error(
        err?.response?.data?.detail || "Nu am putut salva avatarul. Încearcă din nou."
      );
    } finally {
      setSavingAvatarUrl(null);
    }
  };

  // ---- Change password ----
  const openPasswordDialog = () => {
    setPwOld("");
    setPwNew("");
    setPwConfirm("");
    setPwShow(false);
    setPasswordOpen(true);
  };

  const handleChangePassword = async (e) => {
    e?.preventDefault?.();
    const strength = evaluatePasswordStrength(pwNew);
    if (!pwOld) {
      toast.error("Introdu parola actuală.");
      return;
    }
    if (!strength.allMet) {
      toast.error("Parola nouă nu îndeplinește toate cerințele de securitate.");
      return;
    }
    if (pwNew !== pwConfirm) {
      toast.error("Parolele nu se potrivesc.");
      return;
    }
    if (pwOld === pwNew) {
      toast.error("Parola nouă trebuie să fie diferită de cea actuală.");
      return;
    }
    setPwSaving(true);
    try {
      await api.post("/auth/change-password", {
        old_password: pwOld,
        new_password: pwNew,
      });
      toast.success("Parola a fost schimbată cu succes!");
      setPasswordOpen(false);
    } catch (err) {
      toast.error(
        err?.response?.data?.detail || "Schimbarea parolei a eșuat."
      );
    } finally {
      setPwSaving(false);
    }
  };

  const handleUpgrade = async () => {
    if (upgrading || isPlus) return;
    setUpgrading(true);
    try {
      const { data } = await api.post("/users/me/upgrade-checkout");
      if (!data?.stripe_url) {
        throw new Error("Stripe URL missing");
      }
      // Mark that we're heading out for an upgrade so we can react on return.
      try {
        localStorage.setItem("cartoonix_upgrade_pending", "1");
      } catch { /* ignore */ }
      toast.message("Redirecționare către Stripe...", { duration: 1800 });
      setTimeout(() => {
        window.location.href = data.stripe_url;
      }, 250);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Nu am putut deschide pagina de plată. Încearcă din nou.";
      toast.error(msg);
      setUpgrading(false);
    }
  };

  // ---- Stripe return: detect session_id and confirm the upgrade ----
  useEffect(() => {
    const sessionId = search.get("session_id");
    if (!sessionId) return;
    if (confirmedRef.current) return;
    if (!user) return; // wait until auth ready
    if (user.subscription === "plus") {
      // Already PLUS — just clean URL.
      const next = new URLSearchParams(search);
      next.delete("session_id");
      setSearch(next, { replace: true });
      return;
    }

    confirmedRef.current = true;
    (async () => {
      setConfirmingUpgrade(true);
      try {
        await api.post("/users/me/confirm-upgrade", { session_id: sessionId });
        if (fetchMe) await fetchMe();
        toast.success("UPGRADE REALIZAT CU SUCCES!", {
          description: "Contul tău este acum CARTOONIX PLUS. Mulțumim!",
          duration: 6000,
        });
      } catch (err) {
        const msg =
          err?.response?.data?.detail ||
          "Nu am putut confirma upgrade-ul. Dacă plata a fost efectuată, contactează suportul.";
        toast.error(msg);
      } finally {
        try { localStorage.removeItem("cartoonix_upgrade_pending"); } catch { /* ignore */ }
        setConfirmingUpgrade(false);
        const next = new URLSearchParams(search);
        next.delete("session_id");
        setSearch(next, { replace: true });
      }
    })();
    // eslint-disable-next-line
  }, [user]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0c] text-white">
      {/* ---------- BACKGROUND LAYERS ---------- */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 600px at 50% 0%, rgba(217,70,239,0.14), transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(217,70,239,0.32), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-48 h-[580px] w-[580px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(250,204,21,0.22), transparent 70%)",
        }}
      />

      <main className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-3xl text-center" data-testid="early-access-success">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-emerald-200">
              Cont activat
            </span>
          </div>

          {/* Heading */}
          <h1
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-wider leading-tight"
            style={{
              backgroundImage:
                "linear-gradient(92deg, #ff5e5e 0%, #d946ef 35%, #818cf8 70%, #ff5e5e 100%)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            EȘTI ÎNREGISTRAT!
          </h1>

          {/* Welcome message */}
          <p className="mt-6 text-base sm:text-lg text-white/80">
            Bun venit, <span className="font-semibold text-white">{user?.nickname || "Cartoonix Fan"}</span>!
            Locul tău e rezervat.
          </p>

          {/* User bar (replaces the lone plan pill) */}
          <div className="mt-6 flex justify-center">
            <UserBar
              user={user}
              isPlus={isPlus}
              onUpgrade={handleUpgrade}
              upgrading={upgrading || confirmingUpgrade}
              onOpenInbox={() => setInboxOpen(true)}
              onOpenAvatar={openAvatarPicker}
              onOpenPassword={openPasswordDialog}
            />
          </div>

          {/* Contests CTA */}
          <div className="mt-7 flex justify-center">
            <button
              type="button"
              onClick={() => navigate("/concursuri-cartoonix")}
              data-testid="ea-contests-button"
              className="group relative inline-flex items-center gap-3 rounded-full px-6 py-3 text-sm font-bold tracking-[0.22em] uppercase text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.99]"
              style={{
                background:
                  "linear-gradient(120deg, rgba(217,70,239,0.20) 0%, rgba(129,140,248,0.20) 50%, rgba(250,204,21,0.20) 100%)",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow:
                  "0 12px 38px -10px rgba(217,70,239,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              {/* Animated shimmer */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
                  transform: "translateX(-100%)",
                  animation: "ea-shine 1.6s ease-in-out infinite",
                }}
              />
              <Trophy
                className="h-4 w-4 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.55)] transition-transform group-hover:rotate-[-6deg]"
                strokeWidth={2.4}
              />
              <span className="relative z-10">Vezi concursuri</span>
              <ArrowUpRight className="relative z-10 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>

          {/* Local keyframes for the shimmer effect */}
          <style>{`
            @keyframes ea-shine {
              0%   { transform: translateX(-100%); }
              60%  { transform: translateX(100%);  }
              100% { transform: translateX(100%);  }
            }
          `}</style>

          {/* Divider */}
          <div className="mx-auto mt-12 mb-8 h-px w-32 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {/* Countdown label */}
          <p className="text-[11px] sm:text-xs tracking-[0.32em] uppercase text-white/40 font-semibold mb-6">
            <Rocket className="inline h-3.5 w-3.5 mr-2 -mt-0.5 text-fuchsia-300" />
            Lansare oficială · 1 Iunie 2026
          </p>

          {/* Countdown */}
          <div
            data-testid="ea-countdown"
            className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap"
          >
            <Cell value={days} label="Zile" />
            <Cell value={hours} label="Ore" />
            <Cell value={minutes} label="Minute" />
            <Cell value={seconds} label="Secunde" />
          </div>

          {/* Closing message */}
          <p className="mt-12 text-sm text-white/55 max-w-md mx-auto leading-relaxed">
            Te vom anunța pe email când platforma e gata. Până atunci, mulțumim
            că ne ești alături!
          </p>

          {/* Logout */}
          <div className="mt-10">
            <Button
              variant="ghost"
              onClick={doLogout}
              data-testid="ea-logout-button"
              className="text-white/50 hover:text-white text-xs uppercase tracking-[0.22em]"
            >
              <LogOut className="h-3.5 w-3.5 mr-2" />
              Deconectează-te
            </Button>
          </div>

          {/* Footer */}
          <p className="mt-16 text-[10px] tracking-[0.32em] text-white/25 uppercase">
            © Cartoonix
          </p>
        </div>
      </main>

      {/* --- INBOX DIALOG --- */}
      <Dialog open={inboxOpen} onOpenChange={setInboxOpen}>
        <DialogContent
          className="bg-[#101218] border border-white/10 text-white max-w-md rounded-2xl"
          data-testid="ea-inbox-dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Inbox className="h-5 w-5 text-fuchsia-300" />
              Inbox
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Aici vei primi mesajele și notificările din platformă.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] py-10 flex flex-col items-center justify-center text-center">
            <div className="relative mb-4">
              <span
                aria-hidden
                className="absolute inset-0 rounded-full blur-xl opacity-60"
                style={{
                  background:
                    "radial-gradient(closest-side, rgba(217,70,239,0.45), transparent 70%)",
                }}
              />
              <div className="relative h-14 w-14 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center">
                <Inbox className="h-6 w-6 text-white/70" />
              </div>
            </div>
            <p className="text-sm text-white/75 font-medium">Niciun mesaj nou</p>
            <p className="text-xs text-white/40 mt-1.5 max-w-[260px]">
              Mesageria și notificările vor fi disponibile odată cu lansarea platformei.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- AVATAR PICKER DIALOG --- */}
      <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
        <DialogContent
          className="bg-[#101218] border border-white/10 text-white max-w-2xl rounded-2xl"
          data-testid="ea-avatar-dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <UserCircle2 className="h-5 w-5 text-indigo-300" />
              Schimbă avatarul
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Alege un nou avatar din selecția de mai jos.
            </DialogDescription>
          </DialogHeader>

          {avatarsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-white/50" />
            </div>
          ) : (
            <div
              className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 max-h-[60vh] overflow-y-auto pr-1 -mr-1"
              data-testid="ea-avatar-grid"
            >
              {avatars.map((a) => {
                const isCurrent = a.url === user?.avatar_url;
                const isSaving = savingAvatarUrl === a.url;
                return (
                  <button
                    type="button"
                    key={a.id || a.url}
                    onClick={() => chooseAvatar(a.url)}
                    disabled={!!savingAvatarUrl || isCurrent}
                    data-testid={`ea-avatar-option-${a.id || ""}`}
                    className={`group relative rounded-2xl overflow-hidden aspect-square transition-all duration-200 ${
                      isCurrent
                        ? "ring-2 ring-fuchsia-400 ring-offset-2 ring-offset-[#101218]"
                        : "ring-1 ring-white/10 hover:ring-fuchsia-400/60 hover:-translate-y-0.5"
                    } disabled:cursor-not-allowed`}
                  >
                    <img
                      src={mediaUrl(a.url)}
                      alt={a.label || "Avatar"}
                      className="absolute inset-0 h-full w-full object-cover bg-secondary"
                    />
                    {/* Hover overlay */}
                    <div
                      className={`absolute inset-0 transition-opacity ${
                        isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      } bg-gradient-to-t from-black/60 to-transparent`}
                    />
                    {isCurrent && (
                      <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-fuchsia-500 text-white flex items-center justify-center shadow-md">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    {isSaving && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
              {!avatarsLoading && avatars.length === 0 && (
                <p className="col-span-full text-center text-sm text-white/50 py-10">
                  Nu sunt avatare disponibile momentan.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* --- CHANGE PASSWORD DIALOG --- */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent
          className="bg-[#101218] border border-white/10 text-white max-w-md rounded-2xl"
          data-testid="ea-password-dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-amber-300" />
              Schimbă parola
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Pentru securitate, introdu parola actuală și alege o parolă nouă, puternică.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <Label htmlFor="pwOld" className="text-white/80">Parola actuală</Label>
              <div className="relative">
                <Input
                  id="pwOld"
                  type={pwShow ? "text" : "password"}
                  value={pwOld}
                  onChange={(e) => setPwOld(e.target.value)}
                  autoComplete="current-password"
                  className="h-11 rounded-xl bg-white/[0.04] border-white/10 text-white pr-10"
                  data-testid="pw-old-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setPwShow((v) => !v)}
                  aria-label={pwShow ? "Ascunde parolele" : "Arată parolele"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-white/10 text-white/55"
                >
                  {pwShow ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pwNew" className="text-white/80">Parolă nouă</Label>
              <Input
                id="pwNew"
                type={pwShow ? "text" : "password"}
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                autoComplete="new-password"
                className="h-11 rounded-xl bg-white/[0.04] border-white/10 text-white"
                data-testid="pw-new-input"
                required
              />
            </div>

            <PasswordStrengthMeter password={pwNew} className="-mt-1" />

            <div className="space-y-1.5">
              <Label htmlFor="pwConfirm" className="text-white/80">Confirmă parola nouă</Label>
              <Input
                id="pwConfirm"
                type={pwShow ? "text" : "password"}
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                autoComplete="new-password"
                className="h-11 rounded-xl bg-white/[0.04] border-white/10 text-white"
                data-testid="pw-confirm-input"
                required
              />
              {pwConfirm && pwNew !== pwConfirm && (
                <p className="text-xs text-red-400 mt-1">Parolele nu se potrivesc.</p>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPasswordOpen(false)}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                Anulează
              </Button>
              <Button
                type="submit"
                disabled={pwSaving}
                className="h-11 rounded-xl font-bold tracking-[0.18em] uppercase text-xs text-black bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 hover:from-amber-200 hover:via-yellow-300 hover:to-orange-300 shadow-[0_10px_28px_-8px_rgba(251,191,36,0.5)] disabled:opacity-70"
                data-testid="pw-submit-button"
              >
                {pwSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Se salvează...
                  </>
                ) : (
                  "Schimbă parola"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
