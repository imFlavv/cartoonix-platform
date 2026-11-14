import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Monitor, Tv, Trophy, MessageCircle, ShieldCheck, Crown } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const FEATURES = [
  [Tv, "Canale LIVE cu desenele preferate"],
  [Trophy, "Concursuri și evenimente"],
  [MessageCircle, "Comunicare cu membrii comunității"],
];

const STEPS = [
  "Apasă butonul „Descarcă” și salvează fișierul.",
  "Deschide Cartoonix-Desktop-Configurare.exe și urmează pașii de instalare.",
  "Dacă Windows afișează un avertisment, apasă „Mai multe informații” → „Rulează oricum”.",
  "Conectează-te în aplicație cu contul tău Cartoonix.",
];

export const DesktopAppTab = () => {
  const [app, setApp] = useState(null);
  const { user } = useAuth();
  useEffect(() => {
    api.get("/settings/desktop-app").then((res) => setApp(res.data)).catch(() => {});
  }, []);
  if (!app) return <div className="h-40 rounded-2xl bg-white/5 animate-pulse" data-testid="desktop-app-loading" />;
  return (
  <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6" data-testid="desktop-app-tab">
    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 md:p-8 relative overflow-hidden">
      <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#ec1c24]/10 blur-3xl pointer-events-none" />
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-[#ec1c24]/15 text-[#ec1c24] flex items-center justify-center">
          <Monitor className="h-7 w-7" />
        </div>
        <div>
          <h2 className="font-display text-2xl md:text-3xl">Cartoonix Desktop</h2>
          <p className="text-sm text-white/50" data-testid="desktop-app-version">Versiunea {app.version} · Windows{app.size ? ` · ${app.size}` : ""}</p>
        </div>
      </div>
      <p className="text-white/70 mt-5 text-sm md:text-base">Noua experiență Cartoonix pe calculator: urmărește desenele LIVE, ca pe canalele TV cu care am crescut, direct din aplicație.</p>
      <div data-testid="desktop-app-beta-notice" className="mt-5 flex items-start gap-3 p-4 rounded-xl bg-[#ffcc00]/10 border border-[#ffcc00]/30">
        <Crown className="h-5 w-5 text-[#ffcc00] shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-[#ffcc00]">Versiune BETA · doar pentru membrii PLUS</p>
          <p className="text-white/70 mt-0.5">Momentan te poți conecta în aplicația desktop doar cu un cont Cartoonix PLUS activ. Accesul se va deschide pentru toți după perioada de testare.</p>
          {!user?.plus && (
            <Link to="/plus" data-testid="desktop-app-plus-link" className="inline-block mt-2 text-[#ffcc00] font-semibold hover:underline">Devino membru PLUS →</Link>
          )}
        </div>
      </div>
      <ul className="mt-5 space-y-2.5">
        {FEATURES.map(([Icon, text]) => (
          <li key={text} className="flex items-center gap-3 text-sm text-white/80">
            <Icon className="h-4 w-4 text-[#ffcc00]" /> {text}
          </li>
        ))}
      </ul>
      <a
        href={app.url}
        download
        data-testid="desktop-app-download-btn"
        className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#ec1c24] hover:bg-[#ff2d35] hover:-translate-y-0.5 text-white font-semibold transition-[background-color,transform] duration-200"
      >
        <Download className="h-5 w-5" /> Descarcă pentru Windows
      </a>
    </div>
    <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 md:p-8">
      <h3 className="font-display text-xl mb-4 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#22c55e]" /> Cum instalezi</h3>
      <ol className="space-y-3" data-testid="desktop-app-steps">
        {STEPS.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm text-white/75">
            <span className="shrink-0 h-6 w-6 rounded-full bg-white/10 text-xs font-bold flex items-center justify-center">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  </div>
  );
};
