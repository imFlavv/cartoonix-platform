import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import {
  Search, Menu, X, LogOut, Shield, HelpCircle, Bell,
  Facebook, Instagram, Youtube, Music2, MessageCircle, User, Settings, CheckCheck, Inbox,
  Home, Clapperboard, Users, Film, Tv, Coins, Heart, ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { LOGO_TRANSPARENT, FACEBOOK_URL, TIKTOK_URL, INSTAGRAM_URL, YOUTUBE_URL } from "@/data/constants";
import { PlusIcon } from "@/components/PlusIcon";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `acum ${Math.max(1, Math.floor(diff / 60))} min`;
  if (diff < 86400) return `acum ${Math.floor(diff / 3600)} h`;
  return `acum ${Math.floor(diff / 86400)} zile`;
};

export const NavBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [allShows, setAllShows] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifs, setNotifs] = useState({ items: [], unread: 0 });

  const ensureShows = () => {
    if (allShows.length === 0) {
      api.get("/shows").then((r) => setAllShows(r.data || [])).catch(() => {});
    }
  };
  const searchResults = query.trim()
    ? allShows.filter((s) => (s.title || "").toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];
  const goToShow = (id) => {
    setQuery("");
    setSearchFocused(false);
    navigate(`/show/${id}`);
  };

  const loadNotifs = useCallback(() => {
    if (!user) return;
    api.get("/notifications").then((res) => setNotifs(res.data)).catch(() => {});
  }, [user]);

  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  const markAllRead = async () => {
    await api.post("/notifications/read-all");
    loadNotifs();
  };

  const wpRespond = async (roomId, accept) => {
    try {
      await api.post(`/watchparty/${roomId}/respond`, { accept });
      loadNotifs();
      if (accept) {
        toast.success("Te-ai alăturat watch party-ului!");
        navigate("/watch-party");
      } else {
        toast.success("Invitație refuzată");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Invitația nu mai este disponibilă");
      loadNotifs();
    }
  };

  const submitSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/browse?q=${encodeURIComponent(query.trim())}`);
  };

  const links = [
    { to: "/home", label: "Acasă", icon: Home },
    { to: "/browse", label: "Bibliotecă", icon: Clapperboard },
    { to: "/live", label: "Live TV", icon: Tv },
    { to: "/lobby", label: "Lobby", icon: Users },
    { to: "/cinema", label: "Cinema", icon: Film },
    { to: "/doneaza", label: "Donează", icon: Heart },
    { to: "/plus", label: "Cartoonix PLUS", plus: true },
  ];

  const isActive = (to) => location.pathname === to || location.pathname.startsWith(to + "/");

  const iconBtn = "relative flex items-center justify-center h-10 w-10 rounded-xl text-white/60 hover:text-white transition-colors duration-200";

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#0b0b0e]/95 border-b border-white/[0.06]">
      <div className="flex items-center gap-3 px-4 md:px-6 h-16">
        <Link to="/home" data-testid="nav-logo" className="flex items-center shrink-0">
          <img src={LOGO_TRANSPARENT} alt="Cartoonix" className="h-9 md:h-10" />
        </Link>

        {/* vertical divider */}
        <div className="hidden sm:block h-7 w-px bg-white/10 mx-1" />

        {/* Search (flat, no box) */}
        <div className="relative hidden sm:block">
          <form onSubmit={submitSearch} className="flex items-center gap-2">
            <Search className="h-4 w-4 text-white/40 shrink-0" />
            <input
              data-testid="nav-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { ensureShows(); setSearchFocused(true); }}
              onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
              placeholder="Caută..."
              className="w-24 md:w-40 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none focus:w-52 transition-all duration-300"
            />
          </form>
          {searchFocused && query.trim() && (
            <div data-testid="nav-search-results" className="absolute top-full mt-2 right-0 w-72 bg-[#141414] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[60]">
              {searchResults.length === 0 ? (
                <p className="px-4 py-3 text-sm text-white/40">Niciun desen găsit</p>
              ) : (
                searchResults.map((s) => (
                  <button
                    key={s.id}
                    data-testid={`nav-search-result-${s.id}`}
                    onMouseDown={(e) => { e.preventDefault(); goToShow(s.id); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 transition-colors duration-150 text-left"
                  >
                    {s.thumbnail ? (
                      <img src={s.thumbnail} alt="" className="h-11 w-8 object-cover rounded shrink-0" />
                    ) : (
                      <div className="h-11 w-8 rounded bg-white/10 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{s.title}</p>
                      <p className="text-xs text-white/40 truncate">{s.channel}{s.episode_count != null ? ` · ${s.episode_count} ep.` : (s.episodes ? ` · ${s.episodes.length} ep.` : "")}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Category pills (flat, centered) */}
        <nav className="hidden lg:flex items-center gap-1 mx-auto">
          {links.map((l) => {
            const Icon = l.icon;
            const active = isActive(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                data-testid={`nav-${l.label}`}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  active ? "text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {l.plus ? <PlusIcon className="h-4 w-4" /> : Icon ? <Icon className="h-4 w-4" /> : null}
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 md:gap-2">
          {/* Help */}
          <Popover>
            <PopoverTrigger asChild>
              <button data-testid="nav-help-btn" className={iconBtn} aria-label="Ajutor">
                <HelpCircle className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 bg-[#141414] border-white/10 text-white p-2">
              <button data-testid="help-center" onClick={() => navigate("/help")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors duration-200 text-sm font-semibold">
                <HelpCircle className="h-4 w-4 text-white/70" /> Help Center
              </button>
              <button data-testid="help-tickets" onClick={() => navigate("/support")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors duration-200 text-sm font-semibold">
                <Inbox className="h-4 w-4 text-white/70" /> Solicitările mele
              </button>
              <a href="https://discord.gg" target="_blank" rel="noreferrer" data-testid="help-discord" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors duration-200 text-sm font-semibold">
                <MessageCircle className="h-4 w-4 text-white/70" /> Discord
              </a>
              <div className="border-t border-white/10 mt-2 pt-3 flex items-center justify-around">
                <a href={FACEBOOK_URL} target="_blank" rel="noreferrer" className={iconBtn} aria-label="Facebook"><Facebook className="h-4 w-4" /></a>
                <a href={YOUTUBE_URL} target="_blank" rel="noreferrer" className={iconBtn} aria-label="YouTube"><Youtube className="h-4 w-4" /></a>
                <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className={iconBtn} aria-label="Instagram"><Instagram className="h-4 w-4" /></a>
                <a href={TIKTOK_URL} target="_blank" rel="noreferrer" className={iconBtn} aria-label="TikTok"><Music2 className="h-4 w-4" /></a>
              </div>
            </PopoverContent>
          </Popover>

          {user ? (
            <>
              {/* Notifications */}
              <Popover onOpenChange={(o) => { if (o) loadNotifs(); }}>
                <PopoverTrigger asChild>
                  <button data-testid="nav-notif-btn" className={iconBtn} aria-label="Notificări">
                    <Bell className="h-5 w-5" />
                    {notifs.unread > 0 && (
                      <span data-testid="notif-badge" className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#3b82f6] ring-2 ring-[#0b0b0e]" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[380px] max-w-[92vw] p-0 bg-[#101010] border-white/10 text-white overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <span className="font-display text-xl tracking-wide">Notificări</span>
                    {notifs.unread > 0 && <span className="h-2 w-2 rounded-full bg-[#ec1c24]" />}
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {notifs.items.length === 0 ? (
                      <p className="p-6 text-center text-white/40 text-sm">Nicio notificare</p>
                    ) : (
                      notifs.items.map((n) => (
                        <div key={n.id} data-testid={`notif-${n.id}`} className="px-4 py-4 border-b border-white/5 hover:bg-white/5 transition-colors duration-200">
                          <div className="flex items-start gap-2">
                            {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-[#ec1c24] shrink-0" />}
                            <div className="flex-1">
                              <p className="font-bold text-sm leading-snug">{n.title}</p>
                              <p className="text-xs text-white/40 mt-0.5">{timeAgo(n.created_at)}</p>
                            </div>
                          </div>
                          {n.image && (
                            <img src={n.image} alt="" className="mt-3 w-full h-36 object-cover rounded-lg" />
                          )}
                          <p className="text-sm text-white/70 mt-3 leading-relaxed">{n.body}</p>
                          {n.type === "watchparty_invite" && n.room_id && (
                            <div className="mt-3 flex gap-2" data-testid={`wp-notif-${n.room_id}`}>
                              <button onClick={() => wpRespond(n.room_id, true)} className="flex-1 py-2 rounded-lg bg-[#22c55e] text-black text-sm font-bold">Acceptă</button>
                              <button onClick={() => wpRespond(n.room_id, false)} className="flex-1 py-2 rounded-lg bg-white/10 text-sm font-bold hover:bg-white/20">Refuză</button>
                            </div>
                          )}
                          {n.cta_label && (
                            <button
                              onClick={() => navigate(n.cta_link || "/home")}
                              className="mt-3 w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors duration-200"
                            >
                              {n.cta_label}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <button data-testid="notif-read-all" onClick={markAllRead} className="w-full flex items-center justify-center gap-2 py-3 border-t border-white/10 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors duration-200">
                    <CheckCheck className="h-4 w-4" /> Marchează toate ca citite
                  </button>
                </PopoverContent>
              </Popover>

              {/* Points wallet pill */}
              <button
                data-testid="nav-points-pill"
                onClick={() => navigate("/profile")}
                title="Punctele mele"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#ffcc00]/10 border border-[#ffcc00]/30 text-[#ffcc00] text-sm font-bold hover:bg-[#ffcc00]/20 transition-colors duration-200"
              >
                <Coins className="h-4 w-4" />
                <span data-testid="nav-points-value">{user.points ?? 0}</span>
              </button>

              {/* Avatar */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button data-testid="nav-avatar-btn" className="rounded-lg ring-1 ring-white/10 hover:ring-2 hover:ring-[#ffcc00] transition-all duration-200 ml-0.5 overflow-hidden">
                    <img
                      src={user.avatar || `https://api.dicebear.com/9.x/bottts/svg?seed=${user.email}`}
                      alt="avatar"
                      className="h-9 w-9 rounded-lg bg-[#141414] object-cover"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#141414] border-white/10 text-white w-60">
                  <div className="flex items-center justify-between px-2 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{user.name}</p>
                      <p className="text-xs text-white/50 truncate">{user.email}</p>
                    </div>
                    {user.plus ? (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#ffcc00]/15 text-[#ffcc00] text-[10px] font-bold shrink-0">
                        <PlusIcon className="h-3 w-3" /> PLUS
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full border border-white/20 text-white/60 text-[10px] font-bold shrink-0">FREE</span>
                    )}
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem data-testid="menu-profile" onClick={() => navigate("/profile")} className="cursor-pointer focus:bg-white/10">
                    <User className="h-4 w-4 mr-2" /> My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem data-testid="menu-settings" onClick={() => navigate("/settings")} className="cursor-pointer focus:bg-white/10">
                    <Settings className="h-4 w-4 mr-2" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem data-testid="menu-shop" onClick={() => navigate("/shop")} className="cursor-pointer focus:bg-white/10">
                    <ShoppingBag className="h-4 w-4 mr-2" /> Magazin puncte
                  </DropdownMenuItem>
                  {user.plus && (
                    <DropdownMenuItem data-testid="menu-tv-account" onClick={() => navigate("/cont-tv")} className="cursor-pointer focus:bg-white/10 text-[#ffcc00]">
                      <Tv className="h-4 w-4 mr-2" /> Cont Cartoonix TV
                    </DropdownMenuItem>
                  )}
                  {user.role === "admin" && (
                    <DropdownMenuItem data-testid="menu-admin" onClick={() => navigate("/admin")} className="cursor-pointer focus:bg-white/10">
                      <Shield className="h-4 w-4 mr-2" /> Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem data-testid="menu-logout" onClick={() => { logout(); navigate("/home"); }} className="cursor-pointer focus:bg-white/10 text-[#ec1c24]">
                    <LogOut className="h-4 w-4 mr-2" /> Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link
              to="/login"
              data-testid="nav-login-btn"
              className="hidden sm:inline-flex items-center px-5 py-2 rounded-full bg-[#ec1c24] text-white text-sm font-bold hover:bg-[#ff2d36] transition-colors duration-200 ml-1"
            >
              Conectare
            </Link>
          )}

          {/* separator + facebook */}
          <div className="hidden sm:block h-6 w-px bg-white/15 mx-1" />
          <a href={FACEBOOK_URL} target="_blank" rel="noreferrer" data-testid="nav-facebook" className={`hidden sm:flex ${iconBtn}`} aria-label="Facebook Cartoonix">
            <Facebook className="h-5 w-5" />
          </a>

          <button data-testid="nav-mobile-toggle" className="lg:hidden text-white ml-1" onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden px-4 pb-4 flex flex-col gap-2 border-t border-white/10 pt-3">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.04] text-sm font-semibold text-white/80 hover:text-white">
                {l.plus ? <PlusIcon className="h-4 w-4" /> : Icon ? <Icon className="h-4 w-4" /> : null} {l.label}
              </Link>
            );
          })}
          {!user && (
            <Link to="/login" onClick={() => setOpen(false)} className="text-sm font-bold text-[#ec1c24] px-3 py-2">
              Conectare
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
