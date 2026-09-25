// Rank titles (după numărul de mesaje pe chat) + progres spre nivelul următor.

export const RANK_LEVELS = [
  { min: 0, title: "Membru" },
  { min: 25, title: "Membru Activ" },
  { min: 100, title: "Membru Avansat" },
  { min: 300, title: "Veteran" },
  { min: 800, title: "Super Fan" },
  { min: 2000, title: "Legendă Cartoonix" },
];

export const rankTitle = (count) => {
  const c = Number(count) || 0;
  let title = RANK_LEVELS[0].title;
  for (const lvl of RANK_LEVELS) {
    if (c >= lvl.min) title = lvl.title;
  }
  return title;
};

// Returnează informații pentru bara de progres pe pagina de profil.
export const rankInfo = (count) => {
  const c = Math.max(0, Number(count) || 0);
  let idx = 0;
  for (let i = 0; i < RANK_LEVELS.length; i++) {
    if (c >= RANK_LEVELS[i].min) idx = i;
  }
  const current = RANK_LEVELS[idx];
  const next = RANK_LEVELS[idx + 1] || null;
  const isMax = !next;
  const spanStart = current.min;
  const spanEnd = next ? next.min : current.min;
  const progress = isMax ? 100 : Math.min(100, Math.round(((c - spanStart) / (spanEnd - spanStart)) * 100));
  const remaining = isMax ? 0 : Math.max(0, spanEnd - c);
  return {
    title: current.title,
    nextTitle: next ? next.title : null,
    count: c,
    currentMin: spanStart,
    nextMin: spanEnd,
    progress,
    remaining,
    isMax,
    level: idx + 1,
    maxLevel: RANK_LEVELS.length,
  };
};
