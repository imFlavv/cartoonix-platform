import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { PlusIcon } from "@/components/PlusIcon";
import { Switch } from "@/components/ui/switch";
import { User, CreditCard, Bell, LogOut, ChevronRight, Wand2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  CHAT_STYLE_FONTS,
  CHAT_STYLE_GLOWS,
  CHAT_STYLE_GRADIENTS,
  DEFAULT_CHAT_STYLE,
  chatStyleClasses,
} from "@/lib/chatStyle";

const Section = ({ icon: Icon, title, children }) => (
  <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 mb-5">
    <h2 className="font-display text-2xl mb-4 flex items-center gap-2">
      <Icon className="h-5 w-5 text-[#ffcc00]" /> {title}
    </h2>
    {children}
  </div>
);

const Settings = () => {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [busy, setBusy] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [chatStyle, setChatStyle] = useState({ ...DEFAULT_CHAT_STYLE, ...(user?.chat_style || {}) });
  const [savingStyle, setSavingStyle] = useState(false);

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
    setBusy(true);
    try {
      const { data } = await api.put("/auth/profile", { name });
      setUser(data);
      toast.success("Profil actualizat");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-24 px-4 md:px-12 pb-16 max-w-3xl mx-auto">
        <h1 className="font-display text-4xl md:text-5xl mb-8">Setări</h1>

        <Section icon={User} title="Cont">
          <label className="text-sm text-white/60">Nume afișat</label>
          <div className="flex gap-2 mt-2 mb-4">
            <input data-testid="settings-name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffcc00]" />
            <button data-testid="settings-save-name" onClick={saveName} disabled={busy} className="px-5 rounded-lg bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-60">Salvează</button>
          </div>
          <label className="text-sm text-white/60">Email</label>
          <input value={user?.email || ""} disabled className="w-full mt-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/50" />
        </Section>

        <Section icon={CreditCard} title="Abonament">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold flex items-center gap-2">
                {user?.plus ? <><PlusIcon className="h-5 w-5" /> Cartoonix PLUS</> : "Cont FREE"}
              </p>
              <p className="text-sm text-white/50">{user?.plus ? "50 RON / lună · activ" : "Deblochează toate episoadele și descărcările"}</p>
            </div>
            {!user?.plus && (
              <button data-testid="settings-upgrade" onClick={() => navigate("/plus")} className="flex items-center gap-1 px-4 py-2 rounded-full bg-[#ffcc00] text-black font-bold hover:brightness-110 transition-all duration-200">
                Upgrade <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </Section>

        <Section icon={Bell} title="Preferințe">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">Notificări pe email</span>
            <Switch checked={emailNotif} onCheckedChange={setEmailNotif} data-testid="settings-email-notif" />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">Redare automată episod următor</span>
            <Switch checked={autoplay} onCheckedChange={setAutoplay} data-testid="settings-autoplay" />
          </div>
        </Section>

        {user?.plus && (
          <Section icon={Wand2} title="Stil chat PLUS">
            <p className="text-sm text-white/50 -mt-1 mb-4">Personalizează cum apar mesajele tale în chat. Doar membrii Cartoonix PLUS.</p>

            {/* Live preview */}
            <div data-testid="chat-style-preview" className="rounded-2xl bg-[#0a0a0a] border border-white/10 p-4 mb-5">
              <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2">Previzualizare</p>
              <div className="flex items-start gap-2.5">
                <img src={user?.avatar || `https://api.dicebear.com/9.x/bottts/svg?seed=${user?.email}`} alt="" className="h-8 w-8 rounded-full bg-[#141414] shrink-0" />
                <div>
                  <p className="text-xs text-white/40 mb-0.5 px-1 flex items-center gap-1">
                    {user?.name} <PlusIcon className="h-3.5 w-3.5" />
                  </p>
                  <div className="cx-plus-bubble font-semibold inline-block px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm">
                    <Sparkles className="cx-sparkle h-3 w-3" style={{ top: 4, right: 6 }} />
                    <Sparkles className="cx-sparkle h-2.5 w-2.5" style={{ bottom: 5, left: 8, animationDelay: "0.9s" }} />
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
          </Section>
        )}

        <button data-testid="settings-logout" onClick={() => { logout(); navigate("/home"); }} className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-[#ec1c24] font-bold transition-colors duration-200">
          <LogOut className="h-4 w-4" /> Log Out
        </button>
      </div>
    </div>
  );
};

export default Settings;
