import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Film,
  PlaySquare,
  Users,
  CreditCard,
  Settings as SettingsIcon,
  LogOut,
  ExternalLink,
  Menu,
  Trophy,
  Bell,
  MessageSquare,
  LifeBuoy,
  Shield,
  ShieldCheck,
  Radio,
  ShoppingBag,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { mediaUrl } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";

const NAV_ITEMS = [
  { to: "/admin", label: "Privire generală", icon: LayoutDashboard, end: true, testId: "admin-nav-overview" },
  { to: "/admin/cartoons", label: "Desene", icon: Film, testId: "admin-nav-cartoons" },
  { to: "/admin/episodes", label: "Episoade", icon: PlaySquare, testId: "admin-nav-episodes" },
  { to: "/admin/users", label: "Utilizatori", icon: Users, testId: "admin-nav-users" },
  { to: "/admin/contests", label: "Concursuri", icon: Trophy, testId: "admin-nav-contests" },
  { to: "/admin/notifications", label: "Notificări", icon: Bell, testId: "admin-nav-notifications" },
  { to: "/admin/chat", label: "Chat", icon: MessageSquare, testId: "admin-nav-chat" },
  { to: "/admin/moderators", label: "Moderatori", icon: ShieldCheck, testId: "admin-nav-moderators" },
  { to: "/admin/live", label: "Maraton Live", icon: Radio, testId: "admin-nav-live" },
  { to: "/admin/shop", label: "Shop", icon: ShoppingBag, testId: "admin-nav-shop" },
  { to: "/admin/staff", label: "Staff Applications", icon: Shield, testId: "admin-nav-staff" },
  { to: "/admin/support", label: "Support", icon: LifeBuoy, testId: "admin-nav-support" },
  { to: "/admin/settings", label: "Setări", icon: SettingsIcon, testId: "admin-nav-settings" },
];

function SidebarContent({ onItemClick }) {
  return (
    <nav data-testid="admin-sidebar-nav" className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end, testId }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onItemClick}
          data-testid={testId}
          className={({ isActive }) =>
            `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-secondary text-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r-full before:bg-[hsl(var(--primary))]"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                data-testid="admin-mobile-menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <div className="p-4 border-b border-border/60">
                <Link to="/admin" className="flex items-center gap-2">
                  <BrandLogo variant="horizontal" size="md" />
                  <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] uppercase tracking-wider">Admin</span>
                </Link>
              </div>
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <Link to="/admin" className="hidden lg:flex items-center gap-2">
            <BrandLogo variant="horizontal" size="md" />
            <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] uppercase tracking-wider">Admin</span>
          </Link>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="hidden sm:inline-flex" data-testid="admin-back-to-site">
            <ExternalLink className="h-4 w-4 mr-2" /> Vizitează site-ul
          </Button>
          <div className="flex items-center gap-2 pl-2">
            {user?.avatar_url && (
              <img
                src={mediaUrl(user.avatar_url)}
                alt={user.nickname}
                className="h-8 w-8 rounded-lg object-cover"
              />
            )}
            <Button variant="ghost" size="icon" onClick={logout} data-testid="admin-logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl flex">
        <aside className="hidden lg:block w-64 shrink-0 border-r border-border/60 min-h-[calc(100vh-4rem)]">
          <SidebarContent />
        </aside>
        <main className="flex-1 p-4 lg:p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
