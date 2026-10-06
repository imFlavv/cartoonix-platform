export const WIKI_HEADER_NAV = [
  { label: "Acasă", to: "/wiki" },
  { label: "Platformă", to: "/wiki/platform" },
  { label: "Recompense", to: "/wiki/rewards" },
  { label: "NIX", to: "/wiki/nix" },
  { label: "Mystery Box", to: "/wiki/mystery-box" },
  { label: "Cinema", to: "/wiki/cinema" },
  { label: "LIVE", to: "/wiki/live" },
  { label: "PLUS", to: "/wiki/plus" },
  { label: "Evenimente", to: "/wiki/events" },
  { label: "Anunțuri", to: "/wiki/announcements" },
  { label: "Update Notes", to: "/wiki/updates" },
  { label: "FAQ", to: "/wiki/faq" },
];

export const WIKI_SIDEBAR = [
  {
    title: "Primii Pași",
    items: [{ label: "Primii Pași pe Cartoonix", to: "/wiki/getting-started" }],
  },
  {
    title: "Platformă",
    items: [
      { label: "Ce este Cartoonix?", to: "/wiki/platform" },
      { label: "Vizionarea Desenelor", to: "/wiki/platform#biblioteca-de-desene" },
      { label: "Cartoonix la TV", to: "/wiki/platform#cartoonix-live" },
    ],
  },
  {
    title: "Funcționalități",
    items: [
      { label: "Cinema", to: "/wiki/cinema" },
      { label: "LIVE", to: "/wiki/live" },
      { label: "Profiluri", to: "/wiki/profiles" },
      { label: "Playlisturi", to: "/wiki/profiles#playlisturi" },
      { label: "Chat", to: "/wiki/profiles#chat" },
    ],
  },
  {
    title: "Economie & Recompense",
    items: [
      { label: "NIX", to: "/wiki/nix" },
      { label: "Recompense", to: "/wiki/rewards" },
      { label: "Mystery Box", to: "/wiki/mystery-box" },
      { label: "Chei Mystery Box", to: "/wiki/mystery-box#chei-mystery-box" },
      { label: "Coduri Redeem", to: "/wiki/rewards#coduri-redeem" },
    ],
  },
  {
    title: "Membership",
    items: [{ label: "Cartoonix PLUS", to: "/wiki/plus" }],
  },
  {
    title: "Comunitate",
    items: [
      { label: "Ranguri", to: "/wiki/profiles#ranguri" },
      { label: "Avataruri", to: "/wiki/profiles#avataruri" },
      { label: "Rame de Profil", to: "/wiki/profiles#rame-de-profil" },
      { label: "Hall of Fame", to: "/wiki/profiles#hall-of-fame" },
    ],
  },
  {
    title: "Evenimente",
    items: [
      { label: "Halloween", to: "/wiki/events#halloween" },
      { label: "Crăciun", to: "/wiki/events#craciun" },
      { label: "Concursuri", to: "/wiki/events#concursuri" },
    ],
  },
  {
    title: "Noutăți",
    items: [
      { label: "Anunțuri", to: "/wiki/announcements" },
      { label: "Note de Actualizare", to: "/wiki/updates" },
      { label: "Mentenanță", to: "/wiki/updates#mentenanta" },
    ],
  },
  {
    title: "Ajutor",
    items: [
      { label: "Întrebări Frecvente", to: "/wiki/faq" },
      { label: "Depanare", to: "/wiki/faq#depanare" },
    ],
  },
];

// Canonical reading order, used to compute "previous / next article".
export const ARTICLE_ORDER = [
  "getting-started",
  "platform",
  "nix",
  "rewards",
  "mystery-box",
  "plus",
  "cinema",
  "live",
  "events",
  "profiles",
  "faq",
];
