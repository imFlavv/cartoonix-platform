import { useEffect, useState } from "react";
import { Download, Monitor, Tv, Trophy, MessageCircle, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

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
