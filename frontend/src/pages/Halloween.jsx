import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { HalloweenEventModal } from "@/components/HalloweenEventModal";
import { api } from "@/lib/api";
import { NixCoin } from "@/components/NixCoin";
import { KeyIcon } from "@/components/KeyIcon";
import { PlusIcon } from "@/components/PlusIcon";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  HelpCircle, Castle, Gift, Trophy, User, Truck, Hammer,
  Crown, Sparkles, Clock, MessageSquare, ArrowRight,
} from "lucide-react";

const PUMPKIN = "/halloween/pumpkin-normal.png";
const CARVED = "/halloween/pumpkin-carved.png";

const Card = ({ testId, onClick, className = "", children }) => (
  <button
    data-testid={testId}
    onClick={onClick}
    className={`group relative text-left rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden transition-all duration-300 hover:border-[#ff7a18]/50 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(255,122,24,0.18)] ${className}`}
  >
    {children}
  </button>
);

const Halloween = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);

  const load = () => {
    api.get("/halloween/status").then((res) => setStatus(res.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const enabled = status?.enabled;
  const claimedCount = (status?.rewards || []).filter((r) => r.claimed).length;
  const totalCount = (status?.rewards || []).length;

  return (
    <div data-testid="halloween-hub-page" className="min-h-screen bg-[#0b0616] text-white relative overflow-hidden">
      <NavBar />

      {/* ambient glow */}
      <div className="pointer-events-none fixed inset-0 opacity-70" style={{
        background: "radial-gradient(circle at 15% 10%, rgba(255,122,24,0.20), transparent 45%), radial-gradient(circle at 85% 30%, rgba(168,85,247,0.16), transparent 50%), radial-gradient(circle at 50% 100%, rgba(255,122,24,0.10), transparent 50%)",
      }} />
      <div className="pointer-events-none fixed inset-0 opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      <div className="relative pt-24 px-4 sm:px-6 pb-20 max-w-6xl mx-auto">
        {/* Hero */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-[#ff7a18]/15 border border-[#ff7a18]/40 text-[#ff7a18] text-xs font-bold uppercase tracking-widest">
              🎃 Eveniment sezonier
            </div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-wide">Evenimentul Halloween</h1>
              <button
                data-testid="halloween-info-btn"
                onClick={() => setInfoOpen(true)}
                title="Cum funcționează evenimentul"
                aria-label="Instrucțiuni"
                className="shrink-0 h-9 w-9 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-white/70 hover:text-[#ff7a18] hover:border-[#ff7a18]/50 transition-colors"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>
            <p className="text-white/50 mt-2 max-w-xl">Adună dovleci, sculptează-i, deschide Cutia Misterioasă și deblochează recompense exclusive.</p>
          </div>

          {!loading && (
            <div className="flex items-center gap-2 flex-wrap">
              <span data-testid="hub-pumpkin-count" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 font-bold text-sm">
                <img src={PUMPKIN} alt="" className="h-5 w-5 object-contain" /> {status?.pumpkins ?? 0}
              </span>
              <span data-testid="hub-carved-count" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 font-bold text-sm">
                <img src={CARVED} alt="" className="h-5 w-5 object-contain" /> {status?.carved ?? 0}
              </span>
              <span data-testid="hub-progress" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#a855f7]/15 border border-[#a855f7]/30 text-[#c084fc] font-bold text-sm">
                <Trophy className="h-4 w-4" /> {claimedCount}/{totalCount || 6}
              </span>
            </div>
          )}
        </div>

        {!loading && !enabled && (
          <div data-testid="halloween-inactive-banner" className="mb-8 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-sm text-center">
            Evenimentul nu este activ momentan — dar poți explora în continuare celelalte secțiuni de mai jos.
          </div>
        )}

        {/* Primary cards */}
        <div className="grid md:grid-cols-2 gap-5 mb-6">
          <Card testId="halloween-card-land" onClick={() => navigate("/land")} className="min-h-[220px]">
            <img src="/land-assets/halloween-base.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-45 transition-opacity duration-500 scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0616] via-[#0b0616]/70 to-transparent" />
            <div className="relative p-6 flex flex-col h-full min-h-[220px] justify-end">
              <Castle className="h-8 w-8 text-[#ff7a18] mb-3" />
              <h3 className="font-display text-2xl mb-1">Tărâmul Land</h3>
              <p className="text-white/60 text-sm max-w-sm">Aici se ține evenimentul principal — explorează harta, livrează dovleci la castel și pune-i la sculptat.</p>
              <span className="inline-flex items-center gap-1.5 mt-4 text-[#ff7a18] font-bold text-sm">
                Intră în Land <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Card>

          <Card testId="halloween-card-spin" onClick={() => navigate("/spin")} className="min-h-[220px]">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#ffcc00]/10 blur-2xl" />
            <div className="relative p-6 flex flex-col h-full min-h-[220px] justify-end">
              <KeyIcon className="h-8 w-8 mb-3" />
              <h3 className="font-display text-2xl mb-1">Cutia Misterioasă</h3>
              <p className="text-white/60 text-sm max-w-sm">Folosește chei Mystery Box pentru șansa la NIX, dovleci, invitații PLUS și multe altele.</p>
              <span className="inline-flex items-center gap-1.5 mt-4 text-[#ffcc00] font-bold text-sm">
                Deschide cutia <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Card>
        </div>

        {/* Secondary quick-action cards */}
        <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3 mt-8">Acțiuni rapide</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card testId="halloween-card-quick-event" onClick={() => setEventOpen(true)} className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="h-10 w-10 rounded-xl bg-[#ff7a18]/15 flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5 text-[#ff7a18]" />
              </span>
              <h4 className="font-bold">Livrează &amp; Sculptează</h4>
            </div>
            <p className="text-white/50 text-sm">Gestionează rapid dovlecii tăi, chiar de aici, fără să mergi în Land.</p>
          </Card>

          <Card testId="halloween-card-rewards" onClick={() => navigate("/lobby/rewards")} className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="h-10 w-10 rounded-xl bg-[#a855f7]/15 flex items-center justify-center shrink-0">
                <Gift className="h-5 w-5 text-[#a855f7]" />
              </span>
              <h4 className="font-bold">Recompensele mele</h4>
            </div>
            <p className="text-white/50 text-sm">Vezi și revendică toate recompensele acumulate pe platformă.</p>
          </Card>

          <Card testId="halloween-card-leaderboard" onClick={() => navigate("/clasament")} className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="h-10 w-10 rounded-xl bg-[#39ff14]/10 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 text-[#39ff14]" />
              </span>
              <h4 className="font-bold">Clasament</h4>
            </div>
            <p className="text-white/50 text-sm">Vezi cine adună cei mai mulți dovleci și NIX din comunitate.</p>
          </Card>

          <Card testId="halloween-card-plus" onClick={() => navigate("/plus")} className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="h-10 w-10 rounded-xl bg-[#ffcc00]/15 flex items-center justify-center shrink-0">
                <PlusIcon className="h-5 w-5" />
              </span>
              <h4 className="font-bold">Cartoonix PLUS</h4>
            </div>
            <p className="text-white/50 text-sm">Membrii PLUS pot sculpta 2 dovleci simultan și primesc avantaje exclusive.</p>
          </Card>

          <Card testId="halloween-card-profile" onClick={() => navigate("/profile")} className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-white/80" />
              </span>
              <h4 className="font-bold">Profilul meu</h4>
            </div>
            <p className="text-white/50 text-sm">Inventarul tău de dovleci, chei și vouchere, într-un singur loc.</p>
          </Card>

          <Card testId="halloween-card-nix" onClick={() => navigate("/profile")} className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="h-10 w-10 rounded-xl bg-[#c084fc]/15 flex items-center justify-center shrink-0">
                <NixCoin className="h-5 w-5" />
              </span>
              <h4 className="font-bold">NIX-urile mele</h4>
            </div>
            <p className="text-white/50 text-sm">Verifică soldul tău de NIX și istoricul de câștiguri.</p>
          </Card>
        </div>
      </div>

      {/* How it works modal */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent data-testid="halloween-info-modal" className="bg-[#150a24] border-[#ff7a18]/30 text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <h2 className="font-display text-2xl mb-1 flex items-center gap-2">🎃 Cum funcționează</h2>
          <p className="text-white/50 text-sm mb-5">Ghidul rapid al evenimentului de Halloween.</p>

          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="h-9 w-9 rounded-xl bg-[#ff7a18]/15 flex items-center justify-center shrink-0"><MessageSquare className="h-4.5 w-4.5 text-[#ff7a18]" /></span>
              <div>
                <p className="font-bold text-sm">Cum obții dovleci</p>
                <p className="text-white/60 text-sm mt-0.5">Trimite mesaje în chat — la 50 / 100 / 200 mesaje primești câte 1 dovleac. Stai activ pe platformă: la fiecare 2 ore active primești 1 dovleac.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="h-9 w-9 rounded-xl bg-[#ff7a18]/15 flex items-center justify-center shrink-0"><Hammer className="h-4.5 w-4.5 text-[#ff7a18]" /></span>
              <div>
                <p className="font-bold text-sm">Cum sculptezi</p>
                <p className="text-white/60 text-sm mt-0.5">Pune un dovleac la sculptat dintr-un slot liber. Sculptarea durează 3 ore, apoi îl poți revendica pentru a-l transforma în dovleac sculptat.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="h-9 w-9 rounded-xl bg-[#ffcc00]/15 flex items-center justify-center shrink-0"><Crown className="h-4.5 w-4.5 text-[#ffcc00]" /></span>
              <div>
                <p className="font-bold text-sm">Avantaj PLUS</p>
                <p className="text-white/60 text-sm mt-0.5">Membrii Cartoonix PLUS au 2 sloturi de sculptat în paralel, deci pot obține dovleci sculptați de două ori mai rapid.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="h-9 w-9 rounded-xl bg-[#a855f7]/15 flex items-center justify-center shrink-0"><Sparkles className="h-4.5 w-4.5 text-[#a855f7]" /></span>
              <div>
                <p className="font-bold text-sm">Recompense progresive</p>
                <p className="text-white/60 text-sm mt-0.5">Livrarea și sculptarea dovlecilor deblochează recompense pas cu pas. Finalizează toate activitățile pentru marele premiu: cod voucher Cartoonix PLUS + 20 NIX.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0"><KeyIcon className="h-4.5 w-4.5" /></span>
              <div>
                <p className="font-bold text-sm">Cutia Misterioasă</p>
                <p className="text-white/60 text-sm mt-0.5">Cheile Mystery Box (câștigate din diverse activități) se folosesc în pagina Cutiei Misterioase pentru șansa la NIX, dovleci, chei extra sau invitații PLUS.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 text-xs text-white/40">
            <Clock className="h-3.5 w-3.5" /> Evenimentul poate fi activat/dezactivat periodic de echipa Cartoonix.
          </div>
        </DialogContent>
      </Dialog>

      <HalloweenEventModal open={eventOpen} onClose={() => { setEventOpen(false); load(); }} />
    </div>
  );
};

export default Halloween;
