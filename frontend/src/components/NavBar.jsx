import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Search, Menu, X, Crown, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LOGO_TRANSPARENT } from "@/data/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const NavBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const submitSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/browse?q=${encodeURIComponent(query.trim())}`);
  };

  const links = [
    { to: "/home", label: "Acasă" },
    { to: "/browse", label: "Bibliotecă" },
    { to: "/plus", label: "Cartoonix PLUS" },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-black/70 border-b border-white/10">
      <div className="flex items-center gap-6 px-4 md:px-12 h-16">
        <Link to="/home" data-testid="nav-logo" className="flex items-center shrink-0">
          <img src={LOGO_TRANSPARENT} alt="Cartoonix" className="h-9 md:h-10" />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.label}`}
              className="text-sm font-semibold text-white/80 hover:text-white transition-colors duration-200"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <form onSubmit={submitSearch} className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              data-testid="nav-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Caută desene..."
              className="w-40 md:w-56 pl-9 pr-3 py-2 rounded-full bg-white/10 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#ffcc00] focus:w-64 transition-all duration-300"
            />
          </form>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="nav-avatar-btn" className="relative rounded-full ring-2 ring-transparent hover:ring-[#ffcc00] transition-all duration-200">
                  <img
                    src={user.avatar || `https://api.dicebear.com/9.x/bottts/svg?seed=${user.email}`}
                    alt="avatar"
                    className="h-9 w-9 rounded-full bg-[#141414] object-cover"
                  />
                  {user.plus && (
                    <Crown className="absolute -top-1 -right-1 h-4 w-4 text-[#ffcc00] fill-[#ffcc00]" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#141414] border-white/10 text-white w-52">
                <div className="px-2 py-2">
                  <p className="text-sm font-bold truncate">{user.name}</p>
                  <p className="text-xs text-white/50 truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem data-testid="menu-profile" onClick={() => navigate("/profile")} className="cursor-pointer focus:bg-white/10">
                  Profil & avatar
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-plus" onClick={() => navigate("/plus")} className="cursor-pointer focus:bg-white/10">
                  <Crown className="h-4 w-4 mr-2 text-[#ffcc00]" /> Cartoonix PLUS
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem data-testid="menu-admin" onClick={() => navigate("/admin")} className="cursor-pointer focus:bg-white/10">
                    <Shield className="h-4 w-4 mr-2" /> Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem data-testid="menu-logout" onClick={() => { logout(); navigate("/home"); }} className="cursor-pointer focus:bg-white/10 text-[#ec1c24]">
                  <LogOut className="h-4 w-4 mr-2" /> Deconectare
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/login"
              data-testid="nav-login-btn"
              className="hidden sm:inline-flex items-center px-5 py-2 rounded-full bg-[#ec1c24] text-white text-sm font-bold hover:bg-[#ff2d36] transition-colors duration-200"
            >
              Conectare
            </Link>
          )}

          <button data-testid="nav-mobile-toggle" className="md:hidden text-white" onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-3 border-t border-white/10 pt-3">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-sm font-semibold text-white/80">
              {l.label}
            </Link>
          ))}
          {!user && (
            <Link to="/login" onClick={() => setOpen(false)} className="text-sm font-bold text-[#ec1c24]">
              Conectare
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
