import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { PlusIcon } from "@/components/PlusIcon";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User, CreditCard, Bell, LogOut, ChevronRight, Wand2, Sparkles,
  MessageSquare, Tv, Clock, ShieldCheck, Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  CHAT_STYLE_FONTS,
  CHAT_STYLE_GLOWS,
  CHAT_STYLE_GRADIENTS,
  DEFAULT_CHAT_STYLE,
  chatStyleClasses,
} from "@/lib/chatStyle";

const Card = ({ icon: Icon, title, subtitle, children }) => (
  <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 mb-5">
    <div className="mb-4">
      <h2 className="font-display text-2xl flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 text-[#ffcc00]" />} {title}
      </h2>
      {subtitle && <p className="text-sm text-white/50 mt-1">{subtitle}</p>}
    </div>
    {children}
  </div>
);

// Computes days remaining until next allowed nickname change (30-day cooldown)
function nameCooldown(nickname_updated_at) {
  if (!nickname_updated_at) return { locked: false, daysLeft: 0, nextAt: null };
  try {
    const last = new Date(nickname_updated_at);
    const next = new Date(last.getTime() + 30 * 24 * 3600 * 1000);
    const now = new Date();
    if (now >= next) return { locked: false, daysLeft: 0, nextAt: next };
    const ms = next - now;
    const daysLeft = Math.max(1, Math.ceil(ms / (24 * 3600 * 1000)));
    return { locked: true, daysLeft, nextAt: next };
  } catch {
    return { locked: false, daysLeft: 0, nextAt: null };
  }
}

const Settings = () => {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [busy, setBusy] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [chatStyle, setChatStyle] = useState({ ...DEFAULT_CHAT_STYLE, ...(user?.chat_style || {}) });
  const [savingStyle, setSavingStyle] = useState(false);

  const isAdmin = user?.role === "admin";
  const cooldown = nameCooldown(user?.nickname_updated_at);
  const nameLocked = !isAdmin && cooldown.locked && name === (user?.name || "");
  // If user types a different name, we still allow submit attempt — backend enforces the rule.
  const nameChanged = (name || "").trim() !== (user?.name || "").trim();

  const updateStyle = (patch) => setChatStyle((s) => ({ ...s, ...patch }));

  const saveChatStyle = async () => {
    setSavingStyle(true);
    try {
      const { data } = await api.put("/auth/chat-style", chatStyle);
      setUser(data);
      toast.success("Stil chat salvat");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Eroare la salvare");
    } finally {
      setSavingStyle(false);
    }
  };

  const resetChatStyle = () => setChatStyle({ ...DEFAULT_CHAT_STYLE });

  const saveName = async () => {
    if (!nameChanged) return;
    setBusy(true);
    try {
      const { data } = await api.put("/auth/profile", { name: name.trim() });
      setUser(data);
      toast.success("Nume actualizat");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Eroare la salvare");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-24 px-4 md:px-12 pb-16 max-w-3xl mx-auto">
        <h1 className="font-display text-4xl md:text-5xl mb-8">Setări</h1>

        <Tabs defaultValue="general">
          <TabsList data-testid="settings-tabs" className="bg-[#141414] border border-white/10 mb-6 flex flex-wrap h-auto">
            <TabsTrigger value="general" data-testid="tab-general" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
              <User className="h-4 w-4 mr-2" /> Generale
            </TabsTrigger>
            <TabsTrigger value="subscriptions" data-testid="tab-subscriptions" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
              <CreditCard className="h-4 w-4 mr-2" /> Abonamente
            </TabsTrigger>
            <TabsTrigger value="chat" data-testid="tab-chat" className="data-[state=active]:bg-[#ec1c24] data-[state=active]:text-white">
              <MessageSquare className="h-4 w-4 mr-2" /> Chat
            </TabsTrigger>
          </TabsList>

          {/* ---------------- GENERAL ---------------- */}
          <TabsContent value="general">
            <Card icon={User} title="Cont">
              <label className="text-sm text-white/60">Nume afișat</label>
              <div className="flex gap-2 mt-2 mb-2">
                <input
                  data-testid="settings-name"
                  value={name}
                  disabled={nameLocked}
                  onChange={(e) => setName(e.target.value)}
                  className={`flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00] ${nameLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                />
                <button
                  data-testid="settings-save-name"
                  onClick={saveName}
                  disabled={busy || nameLocked || !nameChanged}
                  className="px-5 rounded-lg bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Salvează
                </button>
              </div>
              {cooldown.locked && !isAdmin ? (
                <p data-testid="name-cooldown" className="text-xs text-[#ffcc00] flex items-center gap-1 mb-4">
                  <Lock className="h-3 w-3" />
                  Numele poate fi schimbat o dată la 30 de zile. Următoarea modificare: în {cooldown.daysLeft} zi{cooldown.daysLeft === 1 ? "" : "le"}.
                </p>
              ) : (
                <p className="text-xs text-white/40 flex items-center gap-1 mb-4">
                  <Clock className="h-3 w-3" /> Numele poate fi schimbat o dată la 30 de zile.
                </p>
              )}

              <label className="text-sm text-white/60">Email</label>
              <input value={user?.email || ""} disabled className="w-full mt-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/50" />
            </Card>

            <Card icon={Bell} title="Preferințe">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Notificări pe email</span>
                <Switch checked={emailNotif} onCheckedChange={setEmailNotif} data-testid="settings-email-notif" />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm">Redare automată episod următor</span>
                <Switch checked={autoplay} onCheckedChange={setAutoplay} data-testid="settings-autoplay" />
              </div>
            </Card>

            <button data-testid="settings-logout" onClick={() => { logout(); navigate("/home"); }} className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-[#ec1c24] font-bold transition-colors duration-200">
              <LogOut className="h-4 w-4" /> Log Out
            </button>
          </TabsContent>

          {/* ---------------- SUBSCRIPTIONS ---------------- */}
          <TabsContent value="subscriptions">
            {/* PLUS */}
            <div data-testid="sub-plus-card" className={`relative bg-[#0f0f0f] border rounded-2xl p-6 mb-5 overflow-hidden ${user?.plus ? "border-[#ffcc00]/40" : "border-white/10"}`}>
              {user?.plus && (
                <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
                  background: "radial-gradient(circle at 100% 0%, rgba(255,204,0,0.18), transparent 55%)",
                }} />
              )}
              <div className="relative flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-[#ffcc00]/15 border border-[#ffcc00]/40 flex items-center justify-center shrink-0">
                  <PlusIcon className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-display text-2xl">Cartoonix PLUS</h3>
                    {user?.plus ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/40 text-[10px] font-bold uppercase tracking-wider text-[#22c55e] flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Activ
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/15 text-[10px] font-bold uppercase tracking-wider text-white/60">
                        Inactiv
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/60 mb-4">
                    {user?.plus
                      ? "Ai acces complet la toate beneficiile PLUS: efecte chat, cameră exclusivă, avatare premium și multe altele."
                      : "Deblochează toate beneficiile: efecte chat, cameră exclusivă, avatare premium, playlisturi nelimitate și mai mult."}
                  </p>
                  {!user?.plus && (
                    <button data-testid="sub-plus-upgrade" onClick={() => navigate("/plus")} className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#ffcc00] text-black font-bold hover:brightness-110 transition-all duration-200">
                      Vezi planul PLUS <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* TV APP */}
            <div data-testid="sub-tv-card" className={`bg-[#0f0f0f] border rounded-2xl p-6 mb-5 ${user?.plus ? "border-[#ffcc00]/40" : "border-white/10"}`}>
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-[#ec1c24]/15 border border-[#ec1c24]/40 flex items-center justify-center shrink-0">
                  <Tv className="h-6 w-6 text-[#ec1c24]" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-display text-2xl">Aplicație TV</h3>
                    {user?.plus ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/40 text-[10px] font-bold uppercase tracking-wider text-[#22c55e] flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> Activ
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/15 text-[10px] font-bold uppercase tracking-wider text-white/60">
                        Inactiv
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/60">
                    {user?.plus
                      ? "Poți urmări Cartoonix direct pe televizor prin aplicația noastră dedicată."
                      : "Vizionează Cartoonix pe televizor. Inclus în abonamentul PLUS."}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ---------------- CHAT ---------------- */}
          <TabsContent value="chat">
            {user?.plus ? (
              <Card icon={Wand2} title="Stil chat PLUS" subtitle="Personalizează cum apar mesajele tale în chat. Doar membrii Cartoonix PLUS.">
                {/* Live preview */}
                <div data-testid="chat-style-preview" className="rounded-2xl bg-[#0a0a0a] border border-white/10 p-4 mb-5">
                  <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Previzualizare</p>
                  <div className="flex items-start gap-2.5">
                    <img src={user?.avatar || `https://api.dicebear.com/9.x/bottts/svg?seed=${user?.email}`} alt="" className="h-8 w-8 rounded-full bg-[#141414] shrink-0" />
                    <div>
                      <p className="text-xs text-white/40 mb-0.5 px-1 flex items-center gap-1">
                        {user?.name} <PlusIcon className="h-3.5 w-3.5" />
                      </p>
                      <div className="inline-block px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm bg-[#2a2a2a] text-white/90">
                        <span className={`relative ${chatStyleClasses(chatStyle)}`}>Salut! Așa vor arăta mesajele mele în chat ✨</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Font */}
                <label className="text-sm text-white/60">Font</label>
                <select
                  data-testid="chat-style-font"
                  value={chatStyle.font}
                  onChange={(e) => updateStyle({ font: e.target.value })}
                  className="w-full mt-1 mb-4 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]"
                >
                  {CHAT_STYLE_FONTS.map((f) => (
                    <option key={f.value} value={f.value} className="bg-[#141414]">{f.label}</option>
                  ))}
                </select>

                {/* Glow */}
                <label className="text-sm text-white/60">Glow (strălucire)</label>
                <div className="flex flex-wrap gap-2 mt-1.5 mb-4">
                  {CHAT_STYLE_GLOWS.map((g) => {
                    const active = chatStyle.glow === g.value;
                    return (
                      <button
                        type="button"
                        key={g.value}
                        data-testid={`chat-style-glow-${g.value}`}
                        onClick={() => updateStyle({ glow: g.value })}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                          active ? "border-[#ffcc00] bg-[#ffcc00]/10 text-[#ffcc00]" : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"
                        }`}
                      >
                        <span className="h-3 w-3 rounded-full" style={{ background: g.swatch, boxShadow: g.value !== "none" ? `0 0 8px ${g.swatch}` : "none" }} />
                        {g.label}
                      </button>
                    );
                  })}
                </div>

                {/* Gradient */}
                <label className="text-sm text-white/60">Gradient text</label>
                <div className="flex flex-wrap gap-2 mt-1.5 mb-4">
                  {CHAT_STYLE_GRADIENTS.map((g) => {
                    const active = chatStyle.gradient === g.value;
                    return (
                      <button
                        type="button"
                        key={g.value}
                        data-testid={`chat-style-grad-${g.value}`}
                        onClick={() => updateStyle({ gradient: g.value })}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                          active ? "border-[#ffcc00] bg-[#ffcc00]/10 text-[#ffcc00]" : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"
                        }`}
                      >
                        <span className="h-3 w-6 rounded" style={{ background: g.preview || "#333" }} />
                        {g.label}
                      </button>
                    );
                  })}
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <span className="text-sm font-bold">Bold</span>
                    <Switch data-testid="chat-style-bold" checked={chatStyle.bold} onCheckedChange={(v) => updateStyle({ bold: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <span className="text-sm italic">Italic</span>
                    <Switch data-testid="chat-style-italic" checked={chatStyle.italic} onCheckedChange={(v) => updateStyle({ italic: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <span className="text-sm flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-[#ffcc00]" /> Sparkle</span>
                    <Switch data-testid="chat-style-sparkle" checked={chatStyle.sparkle} onCheckedChange={(v) => updateStyle({ sparkle: v })} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button data-testid="chat-style-save" onClick={saveChatStyle} disabled={savingStyle} className="px-5 py-2.5 rounded-lg bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-60">
                    {savingStyle ? "Se salvează..." : "Salvează stilul"}
                  </button>
                  <button data-testid="chat-style-reset" onClick={resetChatStyle} type="button" className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 font-semibold text-sm">
                    Resetează
                  </button>
                </div>
              </Card>
            ) : (
              <div data-testid="chat-plus-upsell" className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-8 text-center">
                <div className="inline-flex h-14 w-14 rounded-full bg-[#ffcc00]/15 border border-[#ffcc00]/40 items-center justify-center mb-4">
                  <PlusIcon className="h-8 w-8" />
                </div>
                <h3 className="font-display text-2xl mb-2">Setările de chat sunt PLUS</h3>
                <p className="text-sm text-white/60 max-w-md mx-auto mb-5">
                  Font personalizat, glow strălucitor, gradient text, bold/italic și efect sparkle — toate exclusiv pentru membrii Cartoonix PLUS.
                </p>
                <button onClick={() => navigate("/plus")} className="inline-flex items-center gap-1 px-5 py-2.5 rounded-full bg-[#ffcc00] text-black font-bold hover:brightness-110 transition-all duration-200">
                  Devino membru PLUS <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
