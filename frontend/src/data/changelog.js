// Curated release history for the public /changelog page.
// Each month groups one or more dated entries; each entry has a short list
// of user-facing highlights (internal/technical notes are intentionally omitted).
export const CHANGELOG = [
  {
    month: "Iulie 2026",
    entries: [
      {
        date: "16 iulie 2026",
        title: "Lansarea Cartoonix",
        items: [
          "Platformă de streaming pentru desene animate clasice: colecții tematice, playlist-uri, favorite.",
          "Profiluri de utilizator, chat comunitar și panou de administrare.",
        ],
      },
    ],
  },
  {
    month: "August 2026",
    entries: [
      {
        date: "10 august",
        title: "Prima trecere de polish",
        items: [
          "Panoul de administrare finalizat, cont demo de admin configurat.",
          "Diverse ajustări de poziționare și imagine nouă pentru caseta „Concursuri”.",
        ],
      },
      {
        date: "13 august",
        title: "Watch Party",
        items: [
          "Vizionare sincronizată alături de prieteni, în timp real.",
          "Corectare configurare autentificare (.env).",
        ],
      },
      {
        date: "14 august",
        title: "Reparații chat & episoade gratuite",
        items: [
          "Toate episoadele sunt acum gratuite la vizionare — descărcarea rămâne exclusiv PLUS.",
          "Reparat un crash critic la trimiterea mesajelor în chat.",
          "Buton „Golește chat” pentru admini, per cameră.",
          "Paginare pentru solicitările de suport în Admin.",
          "Reparate imaginile din Lobby și viteza de încărcare a paginii.",
        ],
      },
      {
        date: "16 august",
        title: "Chat: limite, reacții & pagini legale",
        items: [
          "Pagina Termeni și Condiții actualizată.",
          "Reparări plăți Stripe (inclusiv activarea PLUS la vouchere 100%).",
          "Diagnostic clar pentru eroarea „Cartoonix TV nu este configurat” (/cont-tv).",
          "Pagina Help extinsă + ghid Cartoonix TV corectat.",
          "Casete flotante noi: „Hai pe chat!” și „Cartoonix PLUS”.",
          "Reparat un bug critic (eroare 500) la trimiterea mesajelor.",
          "Limite noi în chat: maximum 120 caractere/mesaj și 10 secunde între mesaje (adminii sunt exceptați).",
          "Reacții la mesaje (👍 ❤️ 😂) — o singură reacție per utilizator, per mesaj.",
        ],
      },
      {
        date: "17 august",
        title: "Rafinare chat & favorite pe desene întregi",
        items: [
          "Favorite pentru desene întregi, nu doar pentru episoade individuale.",
          "Badge „Verified” (bifă albastră) pentru administratori în chat.",
          "Rafinare vizuală completă a paginii de chat: contoare, insigne, statistici.",
          "Reparat conturul roșu al episodului activ din lista de episoade.",
        ],
      },
      {
        date: "18 august",
        title: "Optimizare viteză",
        items: ["Reparată o problemă de încetinire la încărcarea listei de desene."],
      },
      {
        date: "20 august",
        title: "Cartoonix Land",
        items: ["Lansarea paginii „Cartoonix Land”, un hub vizual dedicat, cu imagine proprie la rezoluție HD."],
      },
      {
        date: "21 august",
        title: "Unelte noi în Admin",
        items: [
          "Adminii pot crea manual conturi de utilizator, fără verificare prin email.",
          "Reparată eroarea generică de trimitere a codului de verificare (OTP).",
          "Descărcarea episoadelor poate fi dezactivată per desen animat, din Admin.",
          "Reparat un bug de acces pe pagina Cartoonix Land.",
        ],
      },
      {
        date: "22 august",
        title: "Cartoonix TV — lansare BETA",
        items: [
          "Redare continuă din playlist-uri și din lista de Favorite — trece automat la episodul următor.",
          "Lansarea Cartoonix TV (/live): canal continuu, non-stop, cu program (EPG) afișat lateral.",
          "Cartoonix TV este disponibil în BETA, exclusiv pentru membrii PLUS.",
        ],
      },
      {
        date: "23 august",
        title: "Donații & sistem de puncte",
        items: [
          "Reparate repetările și tăierile episoadelor pe Cartoonix TV.",
          "Pagină de donații (/doneaza): 1 RON = 1 punct, creditare automată și instantă.",
          "Wallet nou în Profil + pastilă cu puncte, mereu vizibilă în meniul de sus.",
          "Badge special pentru donatori în chat + pagina /shop (magazin de puncte, „În curând”).",
        ],
      },
      {
        date: "24 august",
        title: "Cartoonix TV — redare fluentă",
        items: ["Reparată redarea Cartoonix TV pentru a fi complet fluentă, fără sărituri înapoi la intro."],
      },
      {
        date: "26 august",
        title: "Recompense, vouchere & clasamente",
        items: [
          "Durate reale ale episoadelor, calculate automat — elimină tăieri și repetări pe Cartoonix TV.",
          "Fullscreen funcțional pe mobil pentru Cartoonix TV.",
          "Zona „Recompensele tale” (/lobby/rewards): puncte, recompense revendicate, coduri voucher.",
          "Produse noi de revendicat: Invitație PLUS, Bilet cinema, Voucher eMAG.",
          "Admin: generare coduri voucher, gestionare cereri de recompense, istoric complet.",
          "Clasament „Top Puncte” adăugat lângă „Top Timp Online”; adminii exclusi din toate clasamentele.",
          "Badge donator animat (GIF) în chat.",
        ],
      },
    ],
  },
  {
    month: "Septembrie 2026",
    entries: [
      {
        date: "1 septembrie",
        title: "Cartoonix Cinema + compatibilitate Smart TV",
        items: [
          "Compatibilitate extinsă cu Smart TV-uri mai vechi — mesaje de eroare clare, în loc de ecran negru.",
          "Lansarea Cartoonix Cinema (/cinema): săli virtuale, locuri PLUS (aurii), bilete-suvenir în profil.",
          "Chat lateral în sală + control din Admin (lumini, pornire film, reclame pre-show).",
          "Design nou pentru /cinema: carduri de sală, program zilnic, eveniment special.",
          "Fundal nou pentru ecranul de încărcare al platformei.",
        ],
      },
      {
        date: "3 septembrie",
        title: "Resetare parolă & avatare noi",
        items: [
          "Resetare parolă direct din pagina de autentificare.",
          "Fundal nou pentru paginile de login, înregistrare și resetare parolă.",
          "3 avatare PLUS noi, animate: Mickey, purcelușul cu coroană și pisicuța care doarme.",
          "Secțiunea de anunțuri redesenată complet.",
        ],
      },
      {
        date: "9 septembrie",
        title: "Mystery Box (prima variantă — roată)",
        items: [
          "Pagina /spin: roata norocului cu animație, premii (inclusiv voucher PLUS).",
          "Panouri noi în Admin: oferirea de rotiri și editarea șanselor de câștig.",
        ],
      },
      {
        date: "13 septembrie",
        title: "Storage box",
        items: ["Suport complet pentru cutii de recompense (storage box)."],
      },
      {
        date: "25 septembrie",
        title: "Roluri de chat & mod Halloween",
        items: [
          "Roluri și personalizare noi în chat, plus rank-uri pentru utilizatori.",
          "Meniu nou „Halloween” (icon dovleac) în bara de navigare → /land.",
          "Mod Halloween pentru /land, activabil din Admin.",
          "Corecturi de aliniere și claritate pentru imaginile tematice de Halloween.",
        ],
      },
      {
        date: "26 septembrie",
        title: "Evenimentul Halloween + NIX + Mystery Box nou",
        items: [
          "Eveniment Halloween complet: colectare dovleci, sculptare, sloturi multiple pentru membri PLUS, recompense progresive.",
          "Reparat un bug de „farming” (anti-cheat) la acumularea timpului online.",
          "Cutia Misterioasă (/spin) transformată într-un sistem „case opening” (reel orizontal animat).",
          "NIX — noua moneda oficială Cartoonix: rebrand complet al „punctelor” în toată platforma, cu icon dedicat.",
          "Animații și sunete noi pe /spin: monede zburătoare, chime la câștig, fanfară la premiul mare.",
        ],
      },
      {
        date: "28 septembrie",
        title: "Hub Halloween, canale TV & Cast",
        items: [
          "Reparat un bug de unicitate a numelui de utilizator la înregistrare.",
          "Pagină nouă /halloween: hub central pentru evenimentul Halloween, cu instrucțiuni complete.",
          "Avatar special Halloween — premiu nou la Cutia Misterioasă (3% șansă).",
          "Galerie cu avatarele speciale câștigate, în Profil.",
          "Fundal nou, mai întunecat, pentru pagina /spin.",
          "Selector de canale pe Cartoonix TV (/live): Canalul General + canale dedicate pe categorii.",
          "Buton „Transmite pe TV” (Cast) pe Cartoonix TV, compatibil cu Chromecast și AirPlay.",
        ],
      },
    ],
  },
];
