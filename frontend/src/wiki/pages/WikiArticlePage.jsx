import { useParams, Link, Navigate } from "react-router-dom";
import { WIKI_ARTICLES, CATEGORY_LABELS } from "../data/articles";
import { ARTICLE_ORDER } from "../data/nav";
import { getArticleBySlug, getRelatedArticles, getPrevNext, buildToc } from "../data/helpers";
import { WikiBreadcrumbs } from "../components/WikiBreadcrumbs";
import { WikiInfoBox } from "../components/WikiInfoBox";
import { ArticleBlocks } from "../components/ArticleBlocks";
import { ArticleTableOfContents } from "../components/ArticleTableOfContents";
import { RelatedArticles } from "../components/RelatedArticles";
import { HelpfulWidget } from "../components/HelpfulWidget";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function WikiArticlePage() {
  const { slug } = useParams();
  const article = getArticleBySlug(WIKI_ARTICLES, slug);

  if (!article) return <Navigate to="/wiki" replace />;

  const toc = buildToc(article.blocks);
  const infoboxBlock = article.blocks.find((b) => b.type === "infobox");
  const otherBlocks = article.blocks.filter((b) => b.type !== "infobox");
  const related = article.related
    ? article.related.map((s) => getArticleBySlug(WIKI_ARTICLES, s)).filter(Boolean)
    : getRelatedArticles(WIKI_ARTICLES, article);
  const { prev, next } = getPrevNext(ARTICLE_ORDER, article.slug);
  const prevArticle = prev ? getArticleBySlug(WIKI_ARTICLES, prev) : null;
  const nextArticle = next ? getArticleBySlug(WIKI_ARTICLES, next) : null;

  return (
    <div data-testid={`wiki-article-${slug}`} className="flex gap-10">
      <article className="flex-1 min-w-0 cx-wiki-fade-up">
        <WikiBreadcrumbs trail={[{ label: CATEGORY_LABELS[article.category] || "Articol" }, { label: article.title }]} />

        <h1 className="text-3xl sm:text-4xl font-black text-white mt-4 mb-2">{article.title}</h1>
        <p className="text-[#9b93c2] text-lg mb-2">{article.summary}</p>
        <p className="text-xs text-white/40 mb-8">
          Ultima actualizare: {new Date(article.lastUpdated).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}
        </p>

        {infoboxBlock && <WikiInfoBox data={infoboxBlock.data} />}
        <ArticleBlocks blocks={otherBlocks} />

        <RelatedArticles articles={related} />

        <div className="grid sm:grid-cols-2 gap-3 mt-10">
          {prevArticle ? (
            <Link to={`/wiki/${prevArticle.slug}`} data-testid="wiki-prev-article" className="cx-wiki-card p-4 flex items-center gap-2">
              <ChevronLeft className="h-4 w-4 text-[#9b93c2] shrink-0" />
              <div>
                <p className="text-xs text-white/40">Articolul Anterior</p>
                <p className="text-sm font-semibold text-white">{prevArticle.title}</p>
              </div>
            </Link>
          ) : <div />}
          {nextArticle && (
            <Link to={`/wiki/${nextArticle.slug}`} data-testid="wiki-next-article" className="cx-wiki-card p-4 flex items-center justify-end gap-2 text-right">
              <div>
                <p className="text-xs text-white/40">Articolul Următor</p>
                <p className="text-sm font-semibold text-white">{nextArticle.title}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[#9b93c2] shrink-0" />
            </Link>
          )}
        </div>

        <HelpfulWidget />
      </article>

      <ArticleTableOfContents toc={toc} />
    </div>
  );
}
