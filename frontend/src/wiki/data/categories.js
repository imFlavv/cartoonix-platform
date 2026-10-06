export const WIKI_CATEGORIES = [
  { icon: "Rocket", slug: "getting-started", title: "Primii Pași", desc: "Tot ce trebuie să știi ca să începi să folosești Cartoonix.", count: 4 },
  { icon: "LayoutGrid", slug: "platform", title: "Platforma Cartoonix", desc: "Biblioteca de desene, Cartoonix LIVE și Cartoonix Cinema explicate.", count: 6 },
  { icon: "Gem", slug: "nix", title: "Moneda NIX", desc: "Învață totul despre moneda virtuală Cartoonix și unde poate fi folosită.", count: 5 },
  { icon: "Gift", slug: "rewards", title: "Recompense", desc: "Centrul de recompense, coduri Redeem și campanii de feedback.", count: 4 },
  { icon: "Package", slug: "mystery-box", title: "Mystery Box", desc: "Descoperă chei, recompense, rarități și cum funcționează sistemul.", count: 5 },
  { icon: "Crown", slug: "plus", title: "Cartoonix PLUS", desc: "Beneficiile abonamentului premium Cartoonix PLUS.", count: 4 },
  { icon: "Clapperboard", slug: "cinema", title: "Cinema", desc: "Rezervări, locuri și proiecții speciale la Cartoonix Cinema.", count: 5 },
  { icon: "Tv", slug: "live", title: "LIVE", desc: "Canalele Cartoonix LIVE inspirate din televiziunea clasică.", count: 5 },
  { icon: "PartyPopper", slug: "events", title: "Evenimente Sezoniere", desc: "Halloween, Crăciun și alte evenimente speciale din Cartoonix.", count: 4 },
  { icon: "UserCircle2", slug: "profiles", title: "Profiluri & Personalizare", desc: "Avataruri, rame, ranguri și personalizarea contului tău.", count: 6 },
  { icon: "Users", slug: "profiles", title: "Comunitate", desc: "Chat, ranguri comunitare și Hall of Fame Cartoonix.", count: 3 },
  { icon: "Megaphone", slug: "__announcements", title: "Anunțuri", desc: "Noutăți oficiale, mentenanțe și comunicări importante.", count: 0 },
  { icon: "ScrollText", slug: "__updates", title: "Note de Actualizare", desc: "Ce este nou, ce s-a îmbunătățit și ce s-a reparat pe platformă.", count: 0 },
  { icon: "HelpCircle", slug: "faq", title: "Întrebări Frecvente", desc: "Răspunsuri rapide la cele mai comune întrebări despre Cartoonix.", count: 8 },
];

export function categoryHref(cat) {
  if (cat.slug === "__announcements") return "/wiki/announcements";
  if (cat.slug === "__updates") return "/wiki/updates";
  return `/wiki/${cat.slug}`;
}
