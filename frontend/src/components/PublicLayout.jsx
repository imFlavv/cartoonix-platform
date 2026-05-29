import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User as UserIcon, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mediaUrl } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";
import { useSettings } from "@/contexts/SettingsContext";
import UserBadges from "@/components/UserBadges";

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
    { to: "/plans", label: "Abonamente" },
    { to: "/concursuri", label: "Concursuri" },
  ];

  return (
    <header
      data-testid="top-nav"
      className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#0b0c10]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0b0c10]/70"
    >
      {/* hairline gold accent */}
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
                      isActive
                        ? "text-white"
                        : "text-white/55 hover:text-white/90"
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
                  <UserBadges level={user.level} isPlus={isPlus} size={18} gap={3} />
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
                <div className="mt-2 flex items-center justify-between rounded-lg bg-white/[0.04] px-2.5 py-2">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">
                    Badge-urile tale
                  </span>
                  <UserBadges level={user.level} isPlus={isPlus} size={22} gap={4} />
                </div>
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
        )}
      </div>
    </header>
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
            Retrăiește magia copilăriei printr-o colecție nostalgică de desene animate clasice inspirate din universul JETIX, Fox Kids, Cartoon Network și Minimax.
          </p>
        </div>
        <div className="text-sm">
          <h4 className="font-display tracking-wider text-base mb-3">Explorează</h4>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><Link className="hover:text-foreground transition-colors" to="/category/jetix-foxkids">JETIX & Fox Kids</Link></li>
            <li><Link className="hover:text-foreground transition-colors" to="/category/cartoon-network">Cartoon Network</Link></li>
            <li><Link className="hover:text-foreground transition-colors" to="/category/minimax">Minimax</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <h4 className="font-display tracking-wider text-base mb-3">Cartoonix</h4>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><Link className="hover:text-foreground transition-colors" to="/plans">Abonamente</Link></li>
            <li><Link className="hover:text-foreground transition-colors" to="/concursuri">Concursuri</Link></li>
            <li><Link className="hover:text-foreground transition-colors" to="/terms-and-conditions">Termeni și Condiții</Link></li>
          </ul>
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
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
