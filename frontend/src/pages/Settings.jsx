import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { PlusIcon } from "@/components/PlusIcon";
import { Switch } from "@/components/ui/switch";
import { User, CreditCard, Bell, LogOut, ChevronRight } from "lucide-react";
import { toast } from "sonner";

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

        <button data-testid="settings-logout" onClick={() => { logout(); navigate("/home"); }} className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-[#ec1c24] font-bold transition-colors duration-200">
          <LogOut className="h-4 w-4" /> Log Out
        </button>
      </div>
    </div>
  );
};

export default Settings;
