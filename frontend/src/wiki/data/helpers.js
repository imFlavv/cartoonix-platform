export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function buildToc(blocks) {
  return (blocks || [])
    .filter((b) => b.type === "heading")
    .map((b) => ({ id: slugify(b.text), text: b.text }));
}

export function getArticleBySlug(articles, slug) {
  return articles.find((a) => a.slug === slug) || null;
}

export function getRelatedArticles(articles, article, limit = 3) {
  if (!article) return [];
  return articles
    .filter((a) => a.slug !== article.slug && a.category === article.category)
    .slice(0, limit);
}

export function getPrevNext(order, slug) {
  const idx = order.indexOf(slug);
  if (idx === -1) return { prev: null, next: null };
  return { prev: order[idx - 1] || null, next: order[idx + 1] || null };
}

function textOf(blocks) {
  return (blocks || [])
    .map((b) => b.text || (b.items || []).map((i) => (typeof i === "string" ? i : i.q + " " + i.a)).join(" "))
    .filter(Boolean)
    .join(" ");
}

export function buildSearchIndex({ articles, announcements, updates }) {
  const items = [];
  articles.forEach((a) => {
    items.push({
      group: "Articole",
      title: a.title,
      subtitle: a.summary,
      url: `/wiki/${a.slug}`,
      haystack: `${a.title} ${a.summary} ${textOf(a.blocks)}`.toLowerCase(),
    });
  });
  announcements.forEach((a) => {
    items.push({
      group: "Anunțuri",
      title: a.title,
      subtitle: a.excerpt,
      url: `/wiki/announcements/${a.slug}`,
      haystack: `${a.title} ${a.excerpt} ${a.body || ""}`.toLowerCase(),
    });
  });
  updates.forEach((u) => {
    items.push({
      group: "Note de Actualizare",
      title: u.title,
      subtitle: u.period,
      url: `/wiki/updates`,
      haystack: `${u.title} ${u.period} ${[...(u.new || []), ...(u.improved || []), ...(u.fixed || [])].join(" ")}`.toLowerCase(),
    });
  });
  return items;
}

export function searchWiki(index, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return index.filter((item) => item.haystack.includes(q)).slice(0, 30);
}
