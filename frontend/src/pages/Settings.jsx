import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { PlusIcon } from "@/components/PlusIcon";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  User, CreditCard, Bell, LogOut, ChevronRight, Wand2, Sparkles,
  MessageSquare, Tv, Clock, ShieldCheck, Lock, Palette, Camera, Trash2,
  Type, Check, Crown, Shield, Eye, RotateCcw, Save,
} from "lucide-react";
import { toast } from "sonner";
import {
  CHAT_STYLE_FONTS,
  CHAT_STYLE_GLOWS,
  CHAT_STYLE_GRADIENTS,
  CHAT_STYLE_BUBBLES,
  CHAT_STYLE_NAME_COLORS,
  nameColorHex,
  DEFAULT_CHAT_STYLE,
  chatStyleClasses,
} from "@/lib/chatStyle";
import { SkinnedBubble } from "@/components/SkinnedBubble";
import { AVATAR_SEEDS, PREMIUM_AVATARS } from "@/data/constants";

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
  const [avatar, setAvatar] = useState(user?.avatar || AVATAR_SEEDS[0]);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const isPlus = !!user?.plus;

  const saveAvatar = async (chosen) => {
    const a = chosen || avatar;
    if (PREMIUM_AVATARS.includes(a) && !isPlus) {
      toast.error("Avatarele PLUS sunt doar pentru membrii Cartoonix PLUS");
      return;
    }
    setSavingAvatar(true);
    try {
      const { data } = await api.put("/auth/avatar", { avatar: a });
      setUser(data);
      setAvatar(a);
      toast.success("Avatar actualizat!");
      setAvatarOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Eroare la salvarea avatarului");
    } finally {
      setSavingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    setSavingAvatar(true);
    try {
      const { data } = await api.put("/auth/avatar", { avatar: AVATAR_SEEDS[0] });
      setUser(data);
      setAvatar(AVATAR_SEEDS[0]);
      toast.success("Avatar resetat");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Eroare");
    } finally {
      setSavingAvatar(false);
    }
  };

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
      <div className="pt-24 px-4 md:px-12 pb-16 max-w-5xl mx-auto">
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
              <Palette className="h-4 w-4 mr-2" /> Personalizare
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

          {/* ---------------- PERSONALIZARE ---------------- */}
          <TabsContent value="chat" className="space-y-5">
            {/* Top row: Profil & Avatar + Previzualizare */}
            <div className="grid lg:grid-cols-2 gap-5">
              {/* PROFIL & AVATAR */}
              <Card icon={User} title="Profil & Avatar" subtitle="Personalizează-ți identitatea în chat-ul Cartoonix.">
                <div className="flex items-start gap-5">
                  <div className="relative shrink-0">
                    <span className={`block h-24 w-24 rounded-full overflow-hidden ${PREMIUM_AVATARS.includes(avatar) && isPlus ? "cx-premium-ring" : "border-2 border-[#ffcc00]/60"}`}>
                      <img src={avatar} alt="avatar" className="h-full w-full object-cover bg-[#141414]" />
                    </span>
                    <button
                      type="button"
                      data-testid="open-avatar-picker-icon"
                      onClick={() => setAvatarOpen(true)}
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-[#1c1c1c] border border-white/20 flex items-center justify-center hover:bg-[#2a2a2a] transition-colors"
                      title="Alege avatar"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-sm text-white/60">Nume afișat</label>
                    <input
                      data-testid="settings-name"
                      value={name}
                      disabled={nameLocked}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={20}
                      className={`w-full mt-1.5 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00] ${nameLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                    />
                    <div className="flex items-center justify-between mt-1.5">
                      {cooldown.locked && !isAdmin ? (
                        <span data-testid="name-cooldown" className="text-xs text-[#ffcc00] flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Următoarea modificare în {cooldown.daysLeft} zi{cooldown.daysLeft === 1 ? "" : "le"}.
                        </span>
                      ) : (
                        <span className="text-xs text-white/40 flex items-center gap-1"><Clock className="h-3 w-3" /> Se poate schimba o dată la 30 de zile.</span>
                      )}
                      <button
                        data-testid="settings-save-name"
                        onClick={saveName}
                        disabled={busy || nameLocked || !nameChanged}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Salvează
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-5">
                  <button
                    type="button"
                    data-testid="open-avatar-picker"
                    onClick={() => setAvatarOpen(true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 font-semibold text-sm transition-colors"
                  >
                    <Camera className="h-4 w-4" /> Alege avatar
                  </button>
                  <button
                    type="button"
                    data-testid="remove-avatar"
                    onClick={removeAvatar}
                    disabled={savingAvatar}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-[#ec1c24]/20 text-[#ec1c24] font-semibold text-sm transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> Șterge
                  </button>
                </div>

                {/* Culoare nume (PLUS) */}
                <div className="mt-5">
                  <label className="text-sm text-white/60 flex items-center gap-1.5">
                    Culoare nume {!isPlus && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[#ffcc00]"><Lock className="h-3 w-3" /> PLUS</span>}
                  </label>
                  <div className={`flex flex-wrap gap-2.5 mt-2 ${!isPlus ? "opacity-50 pointer-events-none" : ""}`}>
                    {CHAT_STYLE_NAME_COLORS.map((c) => {
                      const active = (chatStyle.name_color || "default") === c.value;
                      return (
                        <button
                          type="button"
                          key={c.value}
                          data-testid={`name-color-${c.value}`}
                          onClick={() => updateStyle({ name_color: c.value })}
                          className={`h-7 w-7 rounded-full border-2 transition-all ${active ? "ring-2 ring-white ring-offset-2 ring-offset-[#0f0f0f] scale-110" : "border-white/20 hover:scale-105"}`}
                          style={{ background: c.hex }}
                          title={c.value}
                        />
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* PREVIZUALIZARE CHAT */}
              <Card icon={Eye} title="Previzualizare chat" subtitle="Vezi cum va arăta profilul și mesajele tale în chat.">
                <div data-testid="chat-style-preview" className="rounded-2xl bg-[#0a0a0a] border border-white/10 p-4 h-full">
                  <div className="flex items-start gap-2.5">
                    <span className={`block h-9 w-9 rounded-full overflow-hidden shrink-0 ${PREMIUM_AVATARS.includes(avatar) && isPlus ? "cx-premium-ring" : ""}`}>
                      <img src={avatar} alt="" className="h-full w-full object-cover bg-[#141414]" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs mb-0.5 px-1 flex items-center gap-1.5">
                        <span className="font-semibold" style={isPlus && nameColorHex(chatStyle.name_color) ? { color: nameColorHex(chatStyle.name_color) } : { color: "#e5e5e5" }}>
                          {user?.name || "Cartoonix"}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-1.5 py-[1px] text-[9px] font-extrabold uppercase tracking-wide leading-none ${isPlus ? "bg-[#a855f7] text-white" : "bg-white/10 text-white/70"}`}>
                          {isPlus ? "PLUS" : "MEMBRU"}
                        </span>
                        <span className="text-white/40">astăzi, 14:32</span>
                      </p>
                      {isPlus && chatStyle.bubble && chatStyle.bubble !== "none" ? (
                        <SkinnedBubble testId="chat-style-preview-bubble" skin={chatStyle.bubble} textClasses={chatStyleClasses(chatStyle)}>
                          Salut! Așa vor arăta mesajele mele în chat ✨
                        </SkinnedBubble>
                      ) : (
                        <div className="inline-block px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm bg-[#2a2a2a] text-white/90">
                          <span className={`relative ${isPlus ? chatStyleClasses(chatStyle) : ""}`}>Salut! Așa vor arăta mesajele mele în chat ✨</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* STIL MESAJ */}
            <Card icon={MessageSquare} title="Stil mesaj" subtitle="Alege cum vor arăta mesajele tale în chat. Fiecare stil are un aspect unic.">
              {!isPlus && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-[#ffcc00]/10 border border-[#ffcc00]/30 px-4 py-2.5">
                  <span className="text-sm text-[#ffcc00] flex items-center gap-2"><Lock className="h-4 w-4" /> Stilurile de mesaj sunt exclusiv PLUS.</span>
                  <button onClick={() => navigate("/plus")} className="text-xs px-3 py-1.5 rounded-full bg-[#ffcc00] text-black font-bold hover:brightness-110 transition-all whitespace-nowrap">Devino PLUS</button>
                </div>
              )}
              <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 ${!isPlus ? "opacity-50 pointer-events-none" : ""}`}>
                {CHAT_STYLE_BUBBLES.map((b) => {
                  const active = (chatStyle.bubble || "none") === b.value;
                  return (
                    <button
                      type="button"
                      key={b.value}
                      data-testid={`chat-style-bubble-${b.value}`}
                      onClick={() => updateStyle({ bubble: b.value })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition ${active ? "border-[#ffcc00] bg-[#ffcc00]/10" : "border-white/10 bg-white/5 hover:border-white/25"}`}
                    >
                      <span className="h-12 flex items-center justify-center">
                        {b.thumb ? (
                          <img src={b.thumb} alt="" className="h-11 w-11 object-contain" />
                        ) : b.value === "neon" ? (
                          <span className="cx-bubble-css cx-bubble-neon !px-2 !py-1 !text-[10px]">abc</span>
                        ) : b.value === "retro" ? (
                          <span className="cx-bubble-css cx-bubble-retro !px-2 !py-1 !text-[10px]">abc</span>
                        ) : (
                          <span className="h-9 w-12 rounded-lg bg-[#2a2a2a] border border-white/10 flex items-center justify-center text-[10px] text-white/50">abc</span>
                        )}
                      </span>
                      <span className={`text-sm font-bold ${active ? "text-[#ffcc00]" : "text-white"}`}>{b.label}</span>
                      <span className="text-[10px] text-white/45 leading-tight">{b.desc}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* TEXT & EFECTE */}
            <Card icon={Wand2} title="Text & efecte" subtitle="Configurează fontul, culorile și efectele pentru mesajele tale.">
              {!isPlus && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-[#ffcc00]/10 border border-[#ffcc00]/30 px-4 py-2.5">
                  <span className="text-sm text-[#ffcc00] flex items-center gap-2"><Lock className="h-4 w-4" /> Efectele de text sunt exclusiv PLUS.</span>
                  <button onClick={() => navigate("/plus")} className="text-xs px-3 py-1.5 rounded-full bg-[#ffcc00] text-black font-bold hover:brightness-110 transition-all whitespace-nowrap">Devino PLUS</button>
                </div>
              )}
              <div className={!isPlus ? "opacity-50 pointer-events-none" : ""}>
                <div className="grid sm:grid-cols-2 gap-5 mb-4">
                  {/* Font */}
                  <div>
                    <label className="text-sm text-white/60">Font</label>
                    <select
                      data-testid="chat-style-font"
                      value={chatStyle.font}
                      onChange={(e) => updateStyle({ font: e.target.value })}
                      className="w-full mt-1.5 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]"
                    >
                      {CHAT_STYLE_FONTS.map((f) => (
                        <option key={f.value} value={f.value} className="bg-[#141414]">{f.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Culoare nume în chat */}
                  <div>
                    <label className="text-sm text-white/60">Culoare nume în chat</label>
                    <div className="flex flex-wrap gap-2.5 mt-2.5">
                      {CHAT_STYLE_NAME_COLORS.map((c) => {
                        const active = (chatStyle.name_color || "default") === c.value;
                        return (
                          <button
                            type="button"
                            key={c.value}
                            data-testid={`name-color-fx-${c.value}`}
                            onClick={() => updateStyle({ name_color: c.value })}
                            className={`h-7 w-7 rounded-full border-2 transition-all ${active ? "ring-2 ring-white ring-offset-2 ring-offset-[#0f0f0f] scale-110" : "border-white/20 hover:scale-105"}`}
                            style={{ background: c.hex }}
                            title={c.value}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

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
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${active ? "border-[#ffcc00] bg-[#ffcc00]/10 text-[#ffcc00]" : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"}`}
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
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${active ? "border-[#ffcc00] bg-[#ffcc00]/10 text-[#ffcc00]" : "border-white/10 bg-white/5 text-white/70 hover:border-white/25"}`}
                      >
                        <span className="h-3 w-6 rounded" style={{ background: g.preview || "#333" }} />
                        {g.label}
                      </button>
                    );
                  })}
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <span className="text-sm font-black">Bold</span>
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
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <span className="text-sm flex items-center gap-1.5"><Type className="h-3.5 w-3.5 text-white/70" /> Umbră text</span>
                    <Switch data-testid="chat-style-shadow" checked={chatStyle.shadow} onCheckedChange={(v) => updateStyle({ shadow: v })} />
                  </div>
                </div>
              </div>
            </Card>

            {/* BADGE & IDENTITATE (read-only) */}
            <Card icon={Shield} title="Badge & identitate" subtitle="Statutul tău actual în platformă. Se afișează lângă numele tău în chat.">
              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-extrabold uppercase tracking-wide text-sm ${isPlus ? "bg-[#a855f7] text-white" : "bg-white/10 text-white"}`}>
                  {isPlus ? <><PlusIcon className="h-4 w-4" /> PLUS</> : <><Crown className="h-4 w-4" /> Membru</>}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">{isPlus ? "Membru Cartoonix PLUS" : "Membru"}</p>
                  <p className="text-xs text-white/50">
                    {isPlus ? "Acces exclusiv la efecte, avatare și camere PLUS." : "Badge-ul standard al comunității. Mai multe statuturi vor fi disponibile în curând."}
                  </p>
                </div>
              </div>
            </Card>

            {/* Save bar (PLUS only for style) */}
            {isPlus && (
              <div className="flex items-center gap-2">
                <button data-testid="chat-style-save" onClick={saveChatStyle} disabled={savingStyle} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-60">
                  <Save className="h-4 w-4" /> {savingStyle ? "Se salvează..." : "Salvează stilul"}
                </button>
                <button data-testid="chat-style-reset" onClick={resetChatStyle} type="button" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 font-semibold text-sm">
                  <RotateCcw className="h-4 w-4" /> Resetează
                </button>
              </div>
            )}

            {/* Avatar picker dialog */}
            <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
              <DialogContent className="bg-[#141414] border-white/10 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display text-2xl">Alege avatar</DialogTitle></DialogHeader>
                <div>
                  <p className="text-sm text-white/50 mb-3">Avatare standard</p>
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
                    {AVATAR_SEEDS.map((a) => {
                      const selected = avatar === a;
                      return (
                        <button
                          key={a}
                          type="button"
                          data-testid="avatar-option"
                          onClick={() => saveAvatar(a)}
                          className={`relative rounded-full overflow-hidden border-2 transition-all ${selected ? "border-[#ffcc00] scale-105" : "border-transparent hover:border-white/30"}`}
                        >
                          <img src={a} alt="avatar" className="w-full aspect-square object-cover bg-[#141414]" />
                          {selected && (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Check className="h-5 w-5 text-[#ffcc00]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 mt-6 mb-3">
                    <PlusIcon className="h-5 w-5" />
                    <p className="text-sm font-bold">Avatare PLUS</p>
                    {!isPlus && <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-[#ffcc00]"><Lock className="h-3 w-3" /> Blocate</span>}
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
                    {PREMIUM_AVATARS.map((a) => {
                      const selected = avatar === a;
                      return (
                        <button
                          key={a}
                          type="button"
                          data-testid="premium-avatar-option"
                          onClick={() => { if (!isPlus) { toast.error("Avatarele PLUS sunt doar pentru membrii Cartoonix PLUS"); navigate("/plus"); return; } saveAvatar(a); }}
                          className={`relative rounded-full transition-all ${selected ? "scale-105" : ""}`}
                        >
                          <span className={`block rounded-full overflow-hidden ${isPlus ? "cx-premium-ring" : "border-2 border-white/10"}`}>
                            <img src={a} alt="avatar PLUS" className={`w-full aspect-square object-cover bg-white/5 rounded-full ${!isPlus ? "opacity-70" : ""}`} />
                          </span>
                          {!isPlus && (
                            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                              <Lock className="h-4 w-4 text-white/80" />
                            </span>
                          )}
                          {selected && isPlus && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <Check className="h-5 w-5 text-[#ffcc00]" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {!isPlus && (
                    <button onClick={() => navigate("/plus")} className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#ffcc00] text-black font-bold hover:brightness-110 transition-all">
                      Deblochează avatarele PLUS <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
