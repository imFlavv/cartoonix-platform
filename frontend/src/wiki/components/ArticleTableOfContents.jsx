export const ArticleTableOfContents = ({ toc }) => {
  if (!toc || toc.length === 0) return null;
  return (
    <nav data-testid="wiki-toc" className="hidden xl:block w-60 shrink-0 sticky top-24 self-start">
      <p className="text-xs font-bold uppercase tracking-wide text-white/40 mb-3">Cuprins</p>
      <ul className="space-y-2 border-l border-white/10 pl-4">
        {toc.map((t) => (
          <li key={t.id}>
            <a href={`#${t.id}`} className="text-sm text-[#9b93c2] hover:text-[#c9a3ff] transition-colors">
              {t.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};
