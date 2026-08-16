import { NavBar } from "@/components/NavBar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FACEBOOK_URL } from "@/data/constants";
import { Facebook, MessageCircle, Tv, Copy, ExternalLink, Palette, Heart, Search, Users, Smile, Ticket, Trophy, UserCog, ListPlus, Download } from "lucide-react";
import { toast } from "sonner";

const copy = (val, label) => {
  try {
    navigator.clipboard?.writeText(val);
    toast.success(`${label} copiat`);
  } catch {
    /* ignore */
  }
};

const TvSetup = () => (
  <div className="space-y-5 text-white/80">
    <div className="p-4 rounded-xl bg-gradient-to-br from-[#ec1c24]/15 to-[#ffcc00]/10 border border-[#ec1c24]/30">
      <div className="flex items-start gap-3">
        <Tv className="h-5 w-5 text-[#ffcc00] shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold text-white mb-1">Bine ai venit la Cartoonix TV!</p>
          <p className="text-white/70">
            Îți mulțumim pentru achiziționarea accesului la <span className="text-[#ffcc00] font-semibold">Cartoonix TV</span>. Mai jos găsești pașii necesari pentru configurarea aplicației, cât și cei pentru autentificare.
          </p>
        </div>
      </div>
    </div>

    <div>
      <h4 className="font-display text-lg text-[#ffcc00] mb-3">Configurarea aplicației</h4>
      <ol className="space-y-3">
        <li className="flex gap-3">
          <span className="shrink-0 h-6 w-6 rounded-full bg-[#ec1c24] text-white text-xs font-bold flex items-center justify-center">1</span>
          <div className="text-sm">
            Instalează aplicația <span className="font-bold text-white">Jellyfin</span> din magazinul de aplicații al televizorului (Google Play, App Store, Samsung Store, LG Content Store etc.).
          </div>
        </li>

        <li className="flex gap-3">
          <span className="shrink-0 h-6 w-6 rounded-full bg-[#ec1c24] text-white text-xs font-bold flex items-center justify-center">2</span>
          <div className="text-sm w-full">
            La prima deschidere, alege <span className="font-bold text-white">{"„Introducere manuală a serverului”"}</span> și folosește:
            <div className="mt-2 p-3 rounded-lg bg-[#0a0a0a] border border-white/10 flex items-center justify-between gap-2">
              <code className="text-[#ffcc00] font-mono text-sm break-all">185.125.109.151</code>
              <button onClick={() => copy("185.125.109.151", "Server IP")} className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-xs font-semibold">
                <Copy className="h-3 w-3" /> Copiază
              </button>
            </div>
            <p className="text-xs text-white/50 mt-2">
              Dacă adresa IP nu funcționează, încearcă cu link-ul direct:
            </p>
            <div className="mt-1.5 p-3 rounded-lg bg-[#0a0a0a] border border-white/10 flex items-center justify-between gap-2">
              <code className="text-[#ffcc00] font-mono text-xs break-all">http://185.125.109.151:8096</code>
              <button onClick={() => copy("http://185.125.109.151:8096", "URL")} className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-xs font-semibold">
                <Copy className="h-3 w-3" /> Copiază
              </button>
            </div>
          </div>
        </li>

        <li className="flex gap-3">
          <span className="shrink-0 h-6 w-6 rounded-full bg-[#ec1c24] text-white text-xs font-bold flex items-center justify-center">3</span>
          <div className="text-sm">
            Selectează opțiunea <span className="font-bold text-white">{"„Adaugă un cont”"}</span>.
          </div>
        </li>

        <li className="flex gap-3">
          <span className="shrink-0 h-6 w-6 rounded-full bg-[#ec1c24] text-white text-xs font-bold flex items-center justify-center">4</span>
          <div className="text-sm w-full">
            Alege <span className="font-bold text-white">{"„Introduce-ți o parolă”"}</span> și autentifică-te folosind emailul și parola setate la crearea contului Cartoonix TV în platformă (pagina <span className="font-semibold text-white">Cont Cartoonix TV</span>).
            <div className="mt-3 rounded-xl overflow-hidden border border-white/10">
              <div className="grid grid-cols-[110px_1fr] text-xs">
                <div className="bg-white/5 px-3 py-2 font-semibold text-white/70 border-b border-white/10">Utilizator</div>
                <div className="bg-[#0a0a0a] px-3 py-2 text-white/70 border-b border-white/10 font-mono">emailul tău Cartoonix</div>
                <div className="bg-white/5 px-3 py-2 font-semibold text-white/70">Parolă</div>
                <div className="bg-[#0a0a0a] px-3 py-2 text-white/70 font-mono">parola setată la crearea contului în platformă</div>
              </div>
            </div>
          </div>
        </li>
      </ol>
    </div>

    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm">
      <p className="text-white/70">
        Dacă întâmpini orice dificultăți în procesul de configurare, ne poți contacta oricând printr-un mesaj privat pe pagina noastră de{" "}
        <a href={FACEBOOK_URL} target="_blank" rel="noreferrer" className="text-[#ffcc00] font-semibold hover:underline inline-flex items-center gap-1">
          Facebook <ExternalLink className="h-3 w-3" />
        </a>
        . Vom răspunde cât mai rapid posibil.
      </p>
      <p className="text-white/60 mt-2">Îți dorim vizionare plăcută! <span className="text-[#ec1c24]">❤️</span></p>
    </div>
  </div>
);

const FAQ = [
  {
    q: "Cum configurez aplicația Cartoonix TV?",
    icon: Tv,
    content: <TvSetup />,
  },
  { q: "Ce este Cartoonix?", a: "Cartoonix este platforma ta de streaming cu desenele copilăriei de pe Cartoon Network, Jetix, Minimax și Boomerang." },
  { q: "Ce include Cartoonix PLUS?", a: "PLUS îți deblochează streaming fără reclame, descărcări offline, avatare exclusive, efecte și fonturi în chat, cameră de chat PLUS și playlisturi nelimitate — la o singură plată, pe viață." },
  {
    q: "Cum schimb fontul din chat?",
    icon: Palette,
    a: "Fonturile și stilul mesajelor din chat sunt o funcție PLUS. Intră în Setări (meniul din dreapta sus → Settings), mergi la secțiunea „Stil chat”, alege fontul dorit (de ex. serif, mono, cursive, handwritten) și apasă Salvează. Mesajele tale din chat vor apărea imediat cu noul font.",
  },
  {
    q: "Cum adaug un episod la favorite?",
    icon: Heart,
    a: "Deschide pagina unui desen animat și apasă iconița inimă ❤️ din dreptul episodului dorit. Inima devine roșie când episodul e la favorite. Îl poți elimina apăsând din nou pe inimă. Găsești toate favoritele tale în bibliotecă.",
  },
  {
    q: "Cum caut un desen animat?",
    icon: Search,
    a: "Folosește bara de căutare din meniul de sus (iconița lupă). Scrie numele desenului și rezultatele apar instant pe măsură ce tastezi — apasă pe cel dorit pentru a-l deschide.",
  },
  {
    q: "Cum creez o vizionare în grup (Watch Party)?",
    icon: Users,
    a: "Intră în secțiunea Watch Party din Lobby și creează o cameră. Ca proprietar, controlezi redarea (play/pauză) pentru toți participanții și poți invita prieteni după numele lor. Membrii FREE pot invita 1 prieten, iar cei PLUS până la 5.",
  },
  {
    q: "Cum folosesc emoji în chat?",
    icon: Smile,
    a: "În chat, apasă butonul cu fața zâmbitoare 🙂 de lângă câmpul de scris și alege emoji-ul dorit — se va insera automat în mesaj.",
  },
  {
    q: "Cum îmi schimb numele afișat?",
    icon: UserCog,
    a: "Mergi în Setări → „Nume afișat”, scrie noul nume și salvează. Atenție: numele poate fi schimbat o singură dată la 30 de zile.",
  },
  {
    q: "Cum folosesc un cod de reducere la PLUS?",
    icon: Ticket,
    a: "Pe pagina de plată (Cartoonix PLUS), apasă „Add promotion code” / „Adaugă cod promoțional”, introdu codul și aplică-l. Prețul se actualizează automat înainte de finalizarea plății.",
  },
  {
    q: "Cum funcționează clasamentul (Leaderboard)?",
    icon: Trophy,
    a: "Clasamentul din Lobby afișează cei mai activi membri pe baza timpului petrecut pe platformă. Cu cât urmărești mai mult conținut, cu atât urci în clasament.",
  },
  {
    q: "Cum îmi creez un playlist?",
    icon: ListPlus,
    a: "Pe pagina unui desen, apasă butonul + din dreptul unui episod și alege un playlist existent sau creează unul nou. Membrii PLUS au playlisturi nelimitate.",
  },
  {
    q: "Cum descarc un episod?",
    icon: Download,
    a: "Membrii PLUS pot descărca orice episod apăsând pe iconița de descărcare din dreptul fiecărui episod, pentru vizionare offline.",
  },
  { q: "Pot anula abonamentul oricând?", a: "Cartoonix PLUS este o plată unică, pe viață — nu există o reînnoire lunară de anulat. Odată activat, accesul rămâne pe contul tău." },
];

const Help = () => (
  <div className="min-h-screen bg-[#0a0a0a] text-white">
    <NavBar />
    <div className="pt-24 px-4 md:px-12 pb-16 max-w-3xl mx-auto">
      <h1 className="font-display text-4xl md:text-5xl mb-2">Help Center</h1>
      <p className="text-white/50 mb-8">Întrebări frecvente și suport</p>

      <Accordion type="single" collapsible className="space-y-3">
        {FAQ.map((f, i) => {
          const Icon = f.icon;
          return (
            <AccordionItem key={i} value={`item-${i}`} className="bg-[#0f0f0f] border border-white/10 rounded-xl px-4">
              <AccordionTrigger data-testid={`faq-trigger-${i}`} className="text-left font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4 text-[#ffcc00]" />} {f.q}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-white/70">
                {f.content ? f.content : f.a}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="mt-10 p-6 bg-[#0f0f0f] border border-white/10 rounded-2xl">
        <h2 className="font-display text-2xl mb-3">Ai nevoie de ajutor?</h2>
        <div className="flex flex-wrap gap-3">
          <a href={FACEBOOK_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 font-semibold transition-colors duration-200">
            <Facebook className="h-4 w-4" /> Facebook
          </a>
          <a href="https://discord.gg" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 font-semibold transition-colors duration-200">
            <MessageCircle className="h-4 w-4" /> Discord
          </a>
        </div>
      </div>
    </div>
  </div>
);

export default Help;
