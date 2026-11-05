import { useNavigate } from "react-router-dom";

const BG =
  "https://customer-assets-agu9un31.emergentagent.net/job_cartoon-redesign/artifacts/de96flow_ChatGPT%20Image%20Jul%2029%2C%202026%2C%2002_32_11%20AM.png";

const SECTIONS = [
  {
    id: "desktop", num: "01", icon: "fa-desktop", color: "#3b9cff",
    title: "Cartoonix Desktop", subtitle: "O nouă experiență pe calculator",
    intro: [
      "Pregătim o aplicație dedicată pentru calculatoare, pe care o veți putea descărca și instala direct pe dispozitivele voastre.",
      "Aceasta va deveni principalul loc în care veți putea urmări desenele animate preferate în format LIVE, într-o experiență asemănătoare canalelor de televiziune cu care am crescut. Dar aplicația nu se va limita doar la vizionarea desenelor! Ne dorim să integrăm mai multe funcționalități:",
    ],
    items: [
      ["fa-tv", "Canale LIVE cu desenele voastre preferate."],
      ["fa-trophy", "Concursuri, provocări și evenimente dedicate comunității."],
      ["fa-bullhorn", "Anunțuri și noutăți despre universul Cartoonix."],
      ["fa-comments", "Posibilitatea de a comunica și interacționa cu ceilalți membri."],
      ["fa-user-astronaut", "Un profil personalizat, conectat la contul vostru Cartoonix."],
      ["fa-gift", "Diverse surprize, recompense și funcționalități pe care le vom dezvălui treptat."],
    ],
    outro: "Scopul nostru este să oferim o aplicație modernă, intuitivă și plăcută, care să vă aducă mai aproape de atmosfera copilăriei.",
  },
  {
    id: "land", num: "02", icon: "fa-earth-europe", color: "#22c55e",
    title: "Cartoonix Land", subtitle: "Un univers virtual în care aventura începe!",
    intro: [
      "Una dintre cele mai ambițioase componente la care lucrăm este Cartoonix Land, un joc accesibil direct din browser.",
      "Nu vrem să creăm doar un joc obișnuit, ci o lume virtuală în care fiecare utilizator să aibă propriul personaj și să poată explora diferite tărâmuri, participa la activități și descoperi experiențe noi. În Cartoonix Land veți putea:",
    ],
    items: [
      ["fa-tree", "Explora lumi și zone tematice, fiecare cu propria atmosferă."],
      ["fa-gamepad", "Participa la mini-jocuri, misiuni și activități interactive."],
      ["fa-star", "Acumula experiență, progresa în nivel și debloca noi posibilități."],
      ["fa-coins", "Obține NIX și alte recompense pentru activitățile finalizate."],
      ["fa-ghost", "Participa la evenimente sezoniere și provocări speciale."],
      ["fa-gift", "Câștiga recompense virtuale, dar și premii reale, în cadrul unor activități și concursuri dedicate."],
      ["fa-handshake", "Interacționa cu alți membri ai comunității și participa împreună la diferite aventuri."],
    ],
    outro: "Ne dorim ca timpul petrecut în Cartoonix Land să însemne mai mult decât divertisment. Vrem să vă oferim motive să reveniți, să descoperiți lucruri noi și să simțiți că faceți parte dintr-un univers care evoluează constant. Cartoonix Land va fi unul dintre proiectele centrale ale viitorului Cartoonix, iar conținutul său va fi extins treptat.",
  },
  {
    id: "companion", num: "03", icon: "fa-mobile-screen-button", color: "#ffcc00",
    title: "Cartoonix Companion", subtitle: "Cartoonix mereu alături de voi",
    intro: [
      "Știm că mulți dintre voi utilizați platforma de pe telefon sau tabletă. Tocmai de aceea, pregătim și o aplicație dedicată dispozitivelor mobile.",
      "Aceasta va funcționa ca un companion al universului Cartoonix, oferindu-vă posibilitatea de a rămâne conectați la conturile și activitățile voastre, indiferent unde vă aflați. Printre funcționalitățile pe care dorim să le integrăm se numără:",
    ],
    items: [
      ["fa-id-card", "Administrarea contului și a profilului personal."],
      ["fa-coins", "Verificarea soldului NIX și a recompenselor."],
      ["fa-bell", "Notificări despre concursuri, evenimente și noutăți."],
      ["fa-chart-line", "Urmărirea progresului și a activităților din universul Cartoonix."],
      ["fa-gift", "Acces la beneficiile și surprizele dedicate comunității."],
    ],
    outro: "Astfel, chiar dacă nu vă aflați în fața calculatorului, veți putea rămâne conectați la universul vostru preferat.",
  },
  {
    id: "web", num: "04", icon: "fa-globe", color: "#ec1c24",
    title: "Cartoonix.ro", subtitle: "Punctul central al comunității",
    intro: [
      "Odată cu dezvoltarea noilor aplicații, și website-ul nostru va trece printr-o reorganizare.",
      "Cartoonix.ro nu va dispărea! Acesta va continua să existe, însă va avea un rol mai bine definit, concentrat pe comunitate și pe serviciile disponibile direct în browser. Pe website vor rămâne și vor fi dezvoltate:",
    ],
    items: [
      ["fa-comments", "Chat-ul comunității și funcționalitățile de socializare."],
      ["fa-trophy", "Concursurile și evenimentele organizate."],
      ["fa-bag-shopping", "Cartoonix Shop, cu produse și surprize dedicate."],
      ["fa-user-gear", "Gestionarea conturilor și a anumitor beneficii."],
      ["fa-bullhorn", "Anunțurile oficiale, informațiile și noutățile proiectului."],
      ["fa-earth-europe", "Accesul către Cartoonix Land și celelalte componente ale universului nostru."],
    ],
    outro: "Ne dorim ca fiecare componentă Cartoonix să aibă un scop clar, fără pagini inutile sau funcționalități aglomerate într-un singur loc.",
  },
  {
    id: "devices", num: "05", icon: "fa-display", color: "#a78bfa",
    title: "O experiență adaptată", subtitle: "Fiecărui dispozitiv",
    intro: [
      "Toate aceste schimbări au un obiectiv comun: să facem Cartoonix mai simplu, mai accesibil și mai plăcut de utilizat pentru fiecare dintre voi.",
      "Indiferent dacă ne urmăriți de pe calculator, laptop, telefon sau tabletă, vrem să vă oferim o experiență adaptată dispozitivului folosit.",
    ],
    items: [],
    outro: "Nu vrem să construim doar o platformă care funcționează. Vrem să construim un loc în care să vă facă plăcere să reveniți, un loc în care nostalgia se întâlnește cu tehnologia, jocurile și interacțiunea dintre oameni.",
  },
];

const LETTER = [
  "Știm că ultima perioadă nu a fost una ușoară. Au existat probleme, întârzieri și momente în care comunicarea noastră nu a fost la nivelul pe care îl meritați.",
  "Nu vrem să trecem peste aceste lucruri ca și cum nu s-ar fi întâmplat. Ne asumăm greșelile făcute și înțelegem nemulțumirile apărute.",
  "Totuși, vrem să știți că în spatele Cartoonix se lucrează în continuare, iar dorința noastră de a dezvolta acest proiect nu s-a schimbat.",
  "O parte dintre ideile prezentate se află deja în dezvoltare, în timp ce altele necesită încă planificare, testare și ajustări. Nu vrem să anunțăm date de lansare pe care să nu le putem respecta și nici să facem promisiuni pe care nu le putem susține. Din acest motiv, vă rugăm să mai aveți puțină răbdare până când reușim să punem la punct toate elementele necesare.",
  "De acum înainte, ne propunem să comunicăm mai des, să vă prezentăm progresul făcut, să publicăm imagini și informații din culisele dezvoltării și să vă anunțăm atât reușitele, cât și eventualele dificultăți întâmpinate.",
  "Pentru noi, comunitatea Cartoonix nu reprezintă doar un număr de utilizatori. Reprezintă oameni care împărtășesc aceeași pasiune pentru desenele animate, pentru amintirile copilăriei și pentru acele momente pe care, indiferent de vârstă, nu vrem să le uităm.",
  "Cartoonix a început din nostalgie, dar vrem să crească într-un univers în care fiecare dintre voi să-și găsească locul.",
  "Vă mulțumim celor care ați rămas alături de noi, celor care ne-ați susținut, dar și celor care ne-ați oferit critici constructive. Toate aceste lucruri ne ajută să înțelegem ce trebuie să îmbunătățim.",
];

const Section = ({ s, i }) => (
  <section
    data-testid={`vision-section-${s.id}`}
    className="vision-reveal relative bg-black/55 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 overflow-hidden"
    style={{ animationDelay: `${0.15 + i * 0.08}s` }}
  >
    <span className="pointer-events-none absolute -right-4 -top-6 font-display text-[9rem] leading-none opacity-[0.06] select-none">{s.num}</span>
    <div className="flex items-start gap-4 md:gap-5 mb-6">
      <div className="shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center text-2xl"
        style={{ background: `${s.color}1f`, color: s.color, boxShadow: `0 0 30px ${s.color}33` }}>
        <i className={`fa-solid ${s.icon}`} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.25em] font-semibold" style={{ color: s.color }}>Capitolul {s.num}</p>
        <h2 className="font-display text-2xl md:text-3xl mt-1">{s.title}</h2>
        <p className="text-white/60 text-sm md:text-base">{s.subtitle}</p>
      </div>
    </div>
    <div className="space-y-3 text-white/80 leading-relaxed text-sm md:text-base">
      {s.intro.map((p, k) => <p key={k}>{p}</p>)}
    </div>
    {s.items.length > 0 && (
      <ul className="grid sm:grid-cols-2 gap-3 mt-6">
        {s.items.map(([icon, text], k) => (
          <li key={k} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/5 hover:bg-white/[0.08] hover:-translate-y-0.5 transition-[background-color,transform] duration-200">
            <i className={`fa-solid ${icon} mt-1 w-5 text-center`} style={{ color: s.color }} />
            <span className="text-sm text-white/85">{text}</span>
          </li>
        ))}
      </ul>
    )}
    <p className="mt-6 text-white/70 italic border-l-2 pl-4 text-sm md:text-base" style={{ borderColor: s.color }}>{s.outro}</p>
  </section>
);

export const VisionPage = () => {
  const navigate = useNavigate();
  return (
    <div data-testid="vision-page" className="min-h-screen text-white relative bg-[#0a0a0a]">
      <style>{`@keyframes visionUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}.vision-reveal{opacity:0;animation:visionUp .8s cubic-bezier(.2,.7,.2,1) forwards}`}</style>
      <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${BG}")` }} />
      <div className="fixed inset-0" style={{ background: "radial-gradient(circle at 50% 20%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.82) 65%, rgba(0,0,0,0.92) 100%)" }} />

      <div className="relative max-w-4xl mx-auto px-5 md:px-8 py-14 md:py-20 space-y-8">
        <header className="vision-reveal text-center" data-testid="vision-hero">
          <img src="/cartoonix-logo.png" alt="Cartoonix" className="h-16 md:h-20 mx-auto mb-6 drop-shadow-[0_4px_20px_rgba(59,156,255,0.4)]" />
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs uppercase tracking-[0.25em] text-white/80">
            <i className="fa-solid fa-wand-magic-sparkles text-[#ffcc00]" /> O nouă etapă
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl mt-5 leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            Mai mult decât o platformă.<br />
            <span className="text-[#3b9cff]">Un univers al nostalgiei!</span>
          </h1>
        </header>

        <section className="vision-reveal bg-black/55 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 space-y-4 text-white/85 leading-relaxed text-sm md:text-base" style={{ animationDelay: "0.1s" }} data-testid="vision-intro">
          <p className="font-display text-xl md:text-2xl text-white">Dragi membri ai comunității Cartoonix,</p>
          <p>Astăzi vrem să vorbim deschis cu voi despre viitorul proiectului nostru, despre direcția în care ne îndreptăm și, mai ales, despre schimbările pe care le pregătim. Ne dorim să fim cât mai transparenți și să vă ținem la curent cu tot ceea ce se întâmplă în spatele platformei.</p>
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#ec1c24]/10 border border-[#ec1c24]/30">
            <i className="fa-solid fa-heart text-[#ec1c24] mt-1" />
            <p className="text-white">În primul rând, vrem să vă transmitem un lucru foarte important: <strong>Cartoonix nu a fost abandonat și nu am renunțat niciodată la acest proiect!</strong></p>
          </div>
          <p>Din contră, în ultima perioadă am început să regândim întregul concept Cartoonix. Ne-am dat seama că ceea ce ne dorim să construim este mult mai mult decât un simplu website pe care puteți urmări desene animate.</p>
          <p>Vrem ca Cartoonix să devină un adevărat univers al nostalgiei. Un loc în care amintirile copilăriei prind din nou viață, în care puteți descoperi lucruri noi, participa la activități, câștiga recompense, interacționa cu alți membri și, cel mai important, face parte dintr-o comunitate construită în jurul unei pasiuni comune.</p>
          <p>Pentru a transforma această viziune în realitate, pregătim câteva schimbări importante în modul în care veți putea utiliza Cartoonix.</p>
        </section>

        {SECTIONS.map((s, i) => <Section key={s.id} s={s} i={i} />)}

        <section data-testid="vision-letter" className="vision-reveal relative rounded-3xl p-6 md:p-10 border border-[#3b9cff]/30 bg-gradient-to-b from-[#3b9cff]/15 to-black/60 backdrop-blur-xl" style={{ animationDelay: "0.6s" }}>
          <h2 className="font-display text-2xl md:text-3xl flex items-center gap-3 mb-6">
            <i className="fa-solid fa-heart text-[#ec1c24]" /> Un mesaj pentru comunitatea noastră
          </h2>
          <div className="space-y-4 text-white/85 leading-relaxed text-sm md:text-base">
            {LETTER.map((p, k) => <p key={k}>{p}</p>)}
          </div>
          <p className="font-display text-2xl md:text-3xl mt-8 text-center">Nu este sfârșitul Cartoonix.<br /><span className="text-[#ffcc00]">Este începutul unei noi etape.</span></p>
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-[#3b9cff] font-semibold flex items-center justify-center gap-2">
              <i className="fa-solid fa-star" /> Cartoonix – Copilăria nu se uită. Acum își construiește propriul univers.
            </p>
            <p className="mt-4 text-white/60 text-sm">Cu drag,</p>
            <p className="font-display text-xl">Echipa Cartoonix</p>
          </div>
        </section>

        <div className="text-center pb-6">
          <button
            data-testid="vision-admin-login"
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/20 text-sm font-semibold text-white/80 transition-colors duration-200"
          >
            <i className="fa-solid fa-shield-halved" /> Acces administrator
          </button>
        </div>
      </div>
    </div>
  );
};
