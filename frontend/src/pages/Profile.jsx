import { useState } from "react";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { AVATAR_SEEDS } from "@/data/constants";
import { Check, Crown } from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
  const { user, setUser } = useAuth();
  const [avatar, setAvatar] = useState(user?.avatar || AVATAR_SEEDS[0]);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.put("/auth/avatar", { avatar });
      setUser(data);
      toast.success("Avatar actualizat!");
    } catch {
      toast.error("Nu s-a putut salva.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-24 px-4 md:px-12 pb-16 max-w-3xl mx-auto">
        <div className="flex items-center gap-5 mb-10">
          <img src={avatar} alt="avatar" className="h-24 w-24 rounded-full bg-[#141414] border-2 border-[#ffcc00]" />
          <div>
            <h1 className="font-display text-4xl">{user?.name}</h1>
            <p className="text-white/50">{user?.email}</p>
            {user?.plus ? (
              <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-[#ffcc00]/15 text-[#ffcc00] text-xs font-bold">
                <Crown className="h-3 w-3" /> Cartoonix PLUS
              </span>
            ) : (
              <span className="inline-block mt-2 px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs font-bold">
                Cont gratuit
              </span>
            )}
          </div>
        </div>

        <h2 className="font-display text-2xl mb-4">Schimbă avatarul</h2>
        <div className="grid grid-cols-5 sm:grid-cols-7 gap-3 mb-8">
          {AVATAR_SEEDS.map((a) => (
            <button
              key={a}
              data-testid="profile-avatar-option"
              onClick={() => setAvatar(a)}
              className={`relative rounded-full overflow-hidden bg-white/5 border-2 transition-all duration-200 ${
                avatar === a ? "border-[#ffcc00] scale-105" : "border-transparent hover:border-white/30"
              }`}
            >
              <img src={a} alt="avatar" className="w-full aspect-square object-cover" />
              {avatar === a && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Check className="h-4 w-4 text-[#ffcc00]" />
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          data-testid="profile-save"
          onClick={save}
          disabled={busy}
          className="px-7 py-3 rounded-full bg-[#ec1c24] font-bold hover:bg-[#ff2d36] transition-colors duration-200 disabled:opacity-60"
        >
          {busy ? "Se salvează..." : "Salvează"}
        </button>
      </div>
    </div>
  );
};

export default Profile;
