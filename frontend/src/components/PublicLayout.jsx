import React, { useEffect, useState, useCallback } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User as UserIcon, Shield, Mail, Crown, ArrowRight, Radio } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { mediaUrl, api, getErrorMessage } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";
import { useSettings } from "@/contexts/SettingsContext";
import UserBadges from "@/components/UserBadges";
import InboxPanel from "@/components/InboxPanel";
import AnnouncementBar from "@/components/AnnouncementBar";
import { toast } from "sonner";

function LiveNavButton() {
  const navigate = useNavigate();
  const [state, setState] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await api.get("/live/status");
        if (mounted) setState(data?.state || null);
      } catch {
        /* silent */
      }
    };
    load();
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      load();
    }, 60000);
    const onVis = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mounted = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (state !== "live" && state !== "scheduled") return null;

  const isLive = state === "live";

  return (
    <button
      type="button"
      onClick={() => navigate("/live")}
      data-testid="nav-live-button"
      aria-label={isLive ? "Urmărește transmisiunea live" : "Vezi maratonul programat"}
      className={`relative inline-flex items-center gap-1.5 sm:gap-2 rounded-full border px-2.5 sm:px-3.5 h-9 sm:h-10 text-[10.5px] sm:text-[12px] font-bold uppercase tracking-[0.16em] sm:tracking-[0.18em] transition-colors ${
        isLive
          ? "border-red-500/40 bg-red-500/15 text-red-200 hover:text-white hover:bg-red-500/25 hover:border-red-500/60"
          : "border-white/15 bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] hover:border-white/25"
      }`}
    >
      {isLive ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      ) : (
        <Radio className="h-3.5 w-3.5 text-white/60" />
      )}
      <span>{isLive ? "Live" : <><span className="hidden sm:inline">În curând</span><span className="sm:hidden">Soon</span></>}</span>
    </button>
  );
}

function UpgradeToPlusButton() {
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.post("/users/me/upgrade-checkout");
      if (!data?.stripe_url) {
        throw new Error("Stripe URL missing");
      }
      try {
        localStorage.setItem("cartoonix_upgrade_pending", "1");
      } catch { /* ignore */ }
      toast.message("Redirecționare către Stripe...", { duration: 1800 });
      setTimeout(() => {
        window.location.href = data.stripe_url;
      }, 250);
    } catch (err) {
      toast.error(
        getErrorMessage(err, "Nu am putut deschide pagina de plată. Încearcă din nou.")
      );
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      data-testid="nav-upgrade-to-plus-button"
      className="group inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-2.5 sm:px-4 h-9 sm:h-10 text-[11px] sm:text-[12.5px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.14em] text-black shadow-[0_0_0_1px_rgba(245,194,66,0.5),0_8px_22px_-8px_rgba(245,194,66,0.55)] hover:brightness-110 hover:shadow-[0_0_0_1px_rgba(245,194,66,0.65),0_10px_26px_-8px_rgba(245,194,66,0.7)] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-wait"
    >
      <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      <span className="hidden sm:inline">{loading ? "Se deschide..." : "Upgrade la PLUS"}</span>
      <span className="sm:hidden">{loading ? "..." : "PLUS"}</span>
      <ArrowRight className="hidden sm:inline-block h-3.5 w-3.5 -mr-0.5 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications/unread-count");
      setUnread(Number(data?.notifications || 0));
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    refreshUnread();
    const id = setInterval(() => {
      // Skip the request when the tab is hidden — saves bandwidth and DB load
      // when users have many tabs open.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      refreshUnread();
    }, 120000); // every 2 min instead of 1
    const onVis = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") refreshUnread();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshUnread]);

  const badge = unread > 9 ? "9+" : String(unread);

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) refreshUnread(); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="nav-notifications-button"
          aria-label={`Notificări${unread ? ` (${unread} necitite)` : ""}`}
          className="relative grid h-10 w-10 place-items-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/70 hover:text-white hover:border-white/[0.16] hover:bg-white/[0.06] transition-all"
        >
          <Mail className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span
              data-testid="nav-notifications-badge"
              className="absolute -top-1 -right-1 grid min-w-[18px] h-[18px] place-items-center rounded-full bg-[hsl(var(--accent))] px-1 text-[10px] font-bold text-black ring-2 ring-[#0b0c10]"
            >
              {badge}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[360px] max-w-[92vw] border-white/[0.08] bg-[#101117]/97 backdrop-blur-xl text-white p-4"
      >
        <div className="mb-2 flex items-center gap-2">
          <Mail className="h-4 w-4 text-[hsl(var(--accent))]" />
          <h3 className="text-sm font-semibold tracking-wide">Notificări</h3>
        </div>
        <InboxPanel open={open} onUnreadChange={refreshUnread} />
      </PopoverContent>
    </Popover>
  );
}

export function TopNav() {
  const { user, logout } = useAuth();
  const { settings } = useSettings() || {};
  const navigate = useNavigate();
  const presentationOn = !!settings?.presentation_mode;
  const restrictedView = presentationOn && user?.role !== "admin";
  const isPlus = user?.subscription === "plus";

  const NAV_ITEMS = [
    { to: "/category/jetix-foxkids", label: "JETIX & Fox Kids" },
    { to: "/category/cartoon-network", label: "Cartoon Network" },
    { to: "/category/minimax", label: "Minimax" },
    ...(user && settings?.support_enabled !== false
      ? [{ to: "/support", label: "Support" }]
      : []),
  ];

  return (
    <header
      data-testid="top-nav"
      className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#0b0c10]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0b0c10]/70"
    >
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent))]/30 to-transparent" />
      <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" data-testid="nav-logo" className="flex items-center group shrink-0">
          <BrandLogo variant="horizontal" size="md" />
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 ml-3">
          {restrictedView
            ? null
            : NAV_ITEMS.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  data-testid={`nav-${it.to.replace(/\//g, "-")}`}
                  className={({ isActive }) =>
                    `relative px-3.5 py-2 rounded-lg text-[13px] font-medium tracking-wide transition-all duration-200 ${
                      isActive ? "text-white" : "text-white/55 hover:text-white/90"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {it.label}
                      <span
                        className={`pointer-events-none absolute left-3.5 right-3.5 -bottom-[2px] h-[2px] rounded-full bg-[hsl(var(--accent))] transition-all duration-300 ${
                          isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              ))}
        </nav>

        <div className="flex-1" />

        {!user ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              data-testid="nav-login-button"
              onClick={() => navigate("/login")}
              className="rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06]"
            >
              Autentificare
            </Button>
            <Button
              size="sm"
              data-testid="nav-register-button"
              onClick={() => navigate("/register")}
              className="rounded-xl bg-[hsl(var(--accent))] text-black hover:bg-[hsl(var(--accent))]/90 font-semibold"
            >
              Alătură-te
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="nav-user-menu"
                  className="group flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] py-1.5 pl-1.5 pr-3 hover:border-white/[0.16] hover:bg-white/[0.06] transition-all duration-200"
                >
                  <span className="relative">
                    <img
                      src={mediaUrl(user.avatar_url)}
                      alt={user.nickname}
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-white/10"
                    />
                    {isPlus && (
                      <span className="absolute -inset-0.5 rounded-full ring-1 ring-[hsl(var(--accent))]/50" />
                    )}
                  </span>
                  <span className="hidden sm:flex items-center gap-2 min-w-0">
                    <span className="text-[13px] font-semibold text-white/90 truncate max-w-[120px]">
                      {user.nickname}
                    </span>
                    <UserBadges isPlus={isPlus} size={18} />
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 border-white/[0.08] bg-[#101117]/95 backdrop-blur-xl"
              >
                <DropdownMenuLabel>
                  <div className="flex items-center gap-3 py-1">
                    <img
                      src={mediaUrl(user.avatar_url)}
                      alt=""
                      className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold truncate">{user.nickname}</span>
                      <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                    </div>
                  </div>
                  {isPlus && (
                    <div className="mt-2 flex items-center justify-between rounded-lg bg-white/[0.04] px-2.5 py-2">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">
                        Cont
                      </span>
                      <UserBadges isPlus size={22} />
                    </div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="nav-dashboard-link">
                  <UserIcon className="mr-2 h-4 w-4" /> Profilul meu
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="nav-admin-link">
                    <Shield className="mr-2 h-4 w-4" /> Panou Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem onClick={logout} data-testid="nav-logout-button">
                  <LogOut className="mr-2 h-4 w-4" /> Deconectare
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <NotificationsBell />
            <LiveNavButton />
            {!isPlus && <UpgradeToPlusButton />}
          </div>
        )}
      </div>
    </header>
  );
}

export function AnpcBadges({ className = "" }) {
  return (
    <div
      data-testid="anpc-badges"
      className={`flex flex-col gap-2 ${className}`}
    >
      <a
        href="https://reclamatiisal.anpc.ro/"
        target="_blank"
        rel="noopener noreferrer nofollow"
        aria-label="ANPC — Soluționarea Alternativă a Litigiilor"
        data-testid="footer-anpc-sal"
        className="block rounded-md bg-white p-0.5 ring-1 ring-white/15 hover:ring-white/30 transition-all hover:-translate-y-0.5"
      >
        <img
          src="/badges/anpc-sal.png"
          alt="ANPC — Soluționarea Alternativă a Litigiilor"
          className="h-7 w-auto block"
          loading="lazy"
        />
      </a>
      <a
        href="https://consumer-redress.ec.europa.eu/site-relocation_en?event=main.home2.show&lng=EN"
        target="_blank"
        rel="noopener noreferrer nofollow"
        aria-label="Soluționarea Online a Litigiilor — Comisia Europeană"
        data-testid="footer-anpc-sol"
        className="block rounded-md bg-white p-0.5 ring-1 ring-white/15 hover:ring-white/30 transition-all hover:-translate-y-0.5"
      >
        <img
          src="/badges/anpc-sol.png"
          alt="Soluționarea Online a Litigiilor — Comisia Europeană"
          className="h-7 w-auto block"
          loading="lazy"
        />
      </a>
    </div>
  );
}

export function Footer() {
  return (
    <footer data-testid="footer" className="border-t border-white/[0.06] mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid gap-6 sm:grid-cols-3">
        <div>
          <div className="mb-3">
            <BrandLogo variant="horizontal" size="md" />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Platforma dedicată generației Jetix, Cartoon Network și Minimax.
          </p>
        </div>
        <div className="text-sm">
          <h4 className="font-display tracking-wider text-base mb-3">Explorează</h4>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><Link className="hover:text-foreground transition-colors" to="/category/jetix-foxkids">JETIX & Fox Kids</Link></li>
            <li><Link className="hover:text-foreground transition-colors" to="/category/cartoon-network">Cartoon Network</Link></li>
            <li><Link className="hover:text-foreground transition-colors" to="/category/minimax">Minimax</Link></li>
            <li><Link className="hover:text-foreground transition-colors" to="/castigatori">Câștigători</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-display tracking-wider text-base mb-3">Cartoonix</h4>
              <ul className="space-y-1.5 text-muted-foreground">
                <li><Link className="hover:text-foreground transition-colors" to="/terms-and-conditions">Termeni și Condiții</Link></li>
                <li><Link className="hover:text-foreground transition-colors" to="/gdpr">Politică de Confidențialitate (GDPR)</Link></li>
              </ul>
            </div>
            <AnpcBadges className="shrink-0" />
          </div>
        </div>
      </div>
      <div className="border-t border-white/[0.06] py-4 text-center text-xs text-muted-foreground">
        © 2026 Cartoonix. Toate drepturile rezervate.
      </div>
    </footer>
  );
}

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopNav />
      <AnnouncementBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
