import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { NavBar } from "@/components/NavBar";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft, Megaphone, Calendar, Clock, BadgeCheck, ChevronRight, Star,
  Share2, Link2, Crown, Ban, Sparkles, Zap, Download, HelpCircle, Mail,
} from "lucide-react";
import { catStyle, fmtDate, fmtTime } from "@/data/announcementCategories";
import { LOGO_TRANSPARENT } from "@/data/constants";

const PLUS_BENEFITS = [
  { icon: Ban, title: "Fără reclame", text: "Bucură-te de conținut fără întreruperi publicitare." },
  { icon: Sparkles, title: "Secțiuni exclusive", text: "Acces la secțiuni speciale și conținut dedicat doar ție." },
  { icon: Zap, title: "Acces prioritar", text: "Prioritate la noile funcții și evenimente speciale." },
  { icon: Download, title: "Download offline", text: "Descarcă episoadele preferate și urmărește oriunde, oricând." },
];

const AnnouncementDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get("/notifications")
      .then((res) => setItems((res.data.items || []).filter((n) => !n.user_id)))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const ann = items.find((n) => n.id === id);
  const others = items.filter((n) => n.id !== id).slice(0, 4);

  if (loaded && !ann) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <NavBar />
        <div className="pt-28 px-4 max-w-3xl mx-auto text-center">
          <p className="text-white/50 mb-4">Anunțul nu a fost găsit.</p>
          <button onClick={() => navigate("/lobby/announcements")} className="text-[#ffcc00] font-semibold hover:underline">Înapoi la anunțuri</button>
        </div>
      </div>
    );
  }

  const c = ann ? catStyle(ann) : null;
  const Icon = c?.icon || Megaphone;
  const isPlusAnn = ann && /plus/i.test(ann.cta_link || "");
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const share = (net) => {
    const u = encodeURIComponent(shareUrl);
    const t = encodeURIComponent(ann?.title || "Cartoonix");
    const map = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      whatsapp: `https://wa.me/?text=${t}%20${u}`,
      discord: "https://discord.com/app",
    };
    window.open(map[net], "_blank", "noopener");
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); toast.success("Link copiat!"); }
    catch { toast.error("Nu am putut copia linkul"); }
  };

  const paragraphs = (ann?.body || "").split(/\n+/).filter(Boolean);
  const intro = paragraphs[0] || "";
  const rest = paragraphs.slice(1);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      <div className="pt-24 px-4 md:px-12 pb-16 max-w-6xl mx-auto">
        <button data-testid="detail-back" onClick={() => navigate("/lobby/announcements")} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors duration-200 mb-6">
          <ArrowLeft className="h-5 w-5" /> Înapoi la anunțuri
        </button>

        {!ann ? (
          <div className="h-64 rounded-2xl bg-white/5 animate-pulse" />
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* main */}
            <div className="lg:col-span-2 space-y-6">
              {/* hero card */}
              <div className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${c.grad} p-7 md:p-9`}>
                <div className="absolute -right-6 -top-6 opacity-30 blur-xl" style={{ color: c.accent }}>
                  <Icon className="h-56 w-56" />
                </div>
                <div className="relative max-w-lg">
                  <span className="inline-block px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-widest mb-4" style={{ backgroundColor: `${c.accent}22`, color: c.accent }}>{c.label}</span>
                  <h1 className="font-display text-4xl md:text-5xl leading-tight tracking-wide mb-4">{ann.title}</h1>
                  <p className="text-white/75 leading-relaxed">{intro}</p>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 text-sm text-white/60">
                    <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" style={{ color: c.accent }} /> {fmtDate(ann.created_at)}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" style={{ color: c.accent }} /> {fmtTime(ann.created_at)}</span>
                    <span className="flex items-center gap-2">
                      <img src={LOGO_TRANSPARENT} alt="" className="h-6 w-6 rounded-full bg-white/10 object-contain p-0.5" />
                      Echipa Cartoonix
                      <BadgeCheck className="h-4 w-4 text-[#3b82f6]" />
                    </span>
                  </div>
                </div>
              </div>

              {/* body */}
              <div className="rounded-3xl border border-white/10 bg-[#0f0f0f] p-7 md:p-9 space-y-5">
                {rest.length > 0 ? (
                  rest.map((p, i) => <p key={i} className="text-white/70 leading-relaxed">{p}</p>)
                ) : (
                  <p className="text-white/70 leading-relaxed">{intro}</p>
                )}

                {isPlusAnn && (
                  <div className="pt-2">
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="h-5 w-5 text-[#a855f7]" />
                      <h3 className="font-display text-xl tracking-wide">Ce beneficii primești?</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {PLUS_BENEFITS.map((b) => {
                        const BIcon = b.icon;
                        return (
                          <div key={b.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <span className="grid place-items-center h-10 w-10 rounded-xl bg-[#a855f7]/15 text-[#c084fc] mb-3"><BIcon className="h-5 w-5" /></span>
                            <p className="font-bold uppercase tracking-wide text-sm mb-1">{b.title}</p>
                            <p className="text-xs text-white/50 leading-relaxed">{b.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <p className="text-white/70 leading-relaxed pt-2">Mulțumim că sunteți alături de noi și că susțineți Cartoonix!</p>

                {/* CTA */}
                {ann.cta_label && ann.cta_link ? (
                  <div className="mt-4 rounded-2xl border border-[#a855f7]/30 bg-gradient-to-r from-[#2a1544] to-[#160b26] p-5 flex flex-col sm:flex-row items-center gap-4">
                    <span className="grid place-items-center h-14 w-14 rounded-2xl bg-[#a855f7]/20 text-[#c084fc] shrink-0"><Crown className="h-7 w-7" /></span>
                    <div className="flex-1 text-center sm:text-left">
                      <p className="font-display text-2xl tracking-wide">Devino și tu Cartoonix PLUS!</p>
                      <p className="text-sm text-white/55">Susține platforma și bucură-te de toate beneficiile premium.</p>
                    </div>
                    <button data-testid="detail-cta" onClick={() => navigate(ann.cta_link)}
                      className="px-6 py-3 rounded-xl bg-[#ffcc00] text-black font-extrabold uppercase tracking-wide hover:bg-[#ffd633] transition-colors flex items-center gap-2 shrink-0">
                      <Crown className="h-5 w-5" /> {ann.cta_label}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* sidebar */}
            <div className="space-y-6">
              <div className="rounded-2xl bg-[#0f0f0f] border border-white/10 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-[#ffcc00]" />
                  <h3 className="font-bold text-sm uppercase tracking-widest text-white/70">Alte anunțuri</h3>
                </div>
                <div className="p-3 space-y-1">
                  {others.map((n) => {
                    const oc = catStyle(n);
                    const OIcon = oc.icon;
                    return (
                      <button key={n.id} data-testid="other-announcement" onClick={() => navigate(`/lobby/announcements/${n.id}`)}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors text-left group">
                        <span className={`grid place-items-center h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br ${oc.grad}`}>
                          <OIcon className="h-5 w-5" style={{ color: oc.accent }} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold uppercase tracking-wide truncate">{n.title}</p>
                          <p className="text-xs text-white/45">{fmtDate(n.created_at)}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-white/30 group-hover:text-white/70 transition-colors shrink-0" />
                      </button>
                    );
                  })}
                  {others.length === 0 && <p className="text-white/40 text-sm p-2">—</p>}
                </div>
              </div>

              <div className="rounded-2xl bg-[#0f0f0f] border border-white/10 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Share2 className="h-4 w-4 text-[#a855f7]" />
                  <h3 className="font-bold text-sm uppercase tracking-widest text-white/70">Distribuie anunțul</h3>
                </div>
                <p className="text-sm text-white/50 mb-4">Ajută comunitatea să fie la curent!</p>
                <div className="flex items-center gap-3">
                  <button data-testid="share-facebook" onClick={() => share("facebook")} className="grid place-items-center h-11 w-11 rounded-full bg-[#1877f2] hover:opacity-90 transition-opacity font-bold">f</button>
                  <button data-testid="share-x" onClick={() => share("x")} className="grid place-items-center h-11 w-11 rounded-full bg-black border border-white/20 hover:opacity-90 transition-opacity font-bold">X</button>
                  <button data-testid="share-whatsapp" onClick={() => share("whatsapp")} className="grid place-items-center h-11 w-11 rounded-full bg-[#25d366] hover:opacity-90 transition-opacity text-black font-bold">W</button>
                  <button data-testid="share-discord" onClick={() => share("discord")} className="grid place-items-center h-11 w-11 rounded-full bg-[#5865f2] hover:opacity-90 transition-opacity font-bold">D</button>
                  <button data-testid="share-copy" onClick={copyLink} className="grid place-items-center h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 transition-colors"><Link2 className="h-5 w-5" /></button>
                </div>
              </div>

              <div className="rounded-2xl bg-[#0f0f0f] border border-white/10 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <HelpCircle className="h-4 w-4 text-[#a855f7]" />
                  <h3 className="font-bold text-sm uppercase tracking-widest text-white/70">Ai întrebări?</h3>
                </div>
                <p className="text-sm text-white/50 mb-4">Dacă ai nelămuriri legate de acest anunț, te rugăm să ne contactezi.</p>
                <button data-testid="detail-contact" onClick={() => navigate("/help")}
                  className="w-full py-2.5 rounded-xl border border-white/15 hover:bg-white/5 transition-colors font-semibold flex items-center justify-center gap-2 text-sm">
                  <Mail className="h-4 w-4" /> Contactează-ne
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementDetail;
