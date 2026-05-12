import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, LogOut, LayoutDashboard, Shield, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mediaUrl } from "@/lib/api";

export function TopNav() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header
      data-testid="top-nav"
      className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" data-testid="nav-logo" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-[hsl(var(--primary))] grid place-items-center font-display text-2xl text-[hsl(var(--primary-foreground))]">C</div>
          <span className="font-display text-2xl tracking-wider">CARTOONIX</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {[
            { to: "/category/jetix-foxkids", label: "JETIX & Fox Kids" },
            { to: "/category/cartoon-network", label: "Cartoon Network" },
            { to: "/category/minimax", label: "Minimax" },
            { to: "/plans", label: "Plans" },
          ].map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              data-testid={`nav-${it.to.replace(/\//g, "-")}`}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "text-foreground bg-secondary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`
              }
            >
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          data-testid="theme-toggle-button"
          onClick={toggleTheme}
          className="rounded-xl"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        {!user ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              data-testid="nav-login-button"
              onClick={() => navigate("/login")}
              className="rounded-xl"
            >
              Log in
            </Button>
            <Button
              size="sm"
              data-testid="nav-register-button"
              onClick={() => navigate("/register")}
              className="rounded-xl"
            >
              Join Cartoonix
            </Button>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="nav-user-menu"
                className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-2 py-1.5 hover:bg-card transition-colors"
              >
                <img
                  src={mediaUrl(user.avatar_url)}
                  alt={user.nickname}
                  className="h-7 w-7 rounded-lg object-cover"
                />
                <span className="text-sm font-medium hidden sm:inline">{user.nickname}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.nickname}</span>
                  <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/dashboard")} data-testid="nav-dashboard-link">
                <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
              </DropdownMenuItem>
              {user.role === "admin" && (
                <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="nav-admin-link">
                  <Shield className="mr-2 h-4 w-4" /> Admin Panel
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} data-testid="nav-logout-button">
                <LogOut className="mr-2 h-4 w-4" /> Log out
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
    <footer data-testid="footer" className="border-t border-border/60 mt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid gap-6 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-xl bg-[hsl(var(--primary))] grid place-items-center font-display text-xl text-[hsl(var(--primary-foreground))]">C</div>
            <span className="font-display text-xl tracking-wider">CARTOONIX</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Stream the classics. A nostalgic vault of cartoons from JETIX & Fox Kids, Cartoon Network, and Minimax.
          </p>
        </div>
        <div className="text-sm">
          <h4 className="font-display tracking-wider text-base mb-3">Browse</h4>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><Link className="hover:text-foreground" to="/category/jetix-foxkids">JETIX & Fox Kids</Link></li>
            <li><Link className="hover:text-foreground" to="/category/cartoon-network">Cartoon Network</Link></li>
            <li><Link className="hover:text-foreground" to="/category/minimax">Minimax</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <h4 className="font-display tracking-wider text-base mb-3">Cartoonix</h4>
          <ul className="space-y-1.5 text-muted-foreground">
            <li><Link className="hover:text-foreground" to="/plans">Plans</Link></li>
            <li><Link className="hover:text-foreground" to="/terms-and-conditions">Terms & Conditions</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © 2026 Cartoonix. All rights reserved.
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
