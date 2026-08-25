import { getArticleEntries } from "../../../../api/posts.js";

export default {
  seo: {
    title: "VeloDom Article",
    description: "Read a VeloDom V1 framework article.",
    lang: "en",
    robots: "index,follow",
    summary: {
      heading: "VeloDom framework article",
      text: "A dynamic VeloDom article page generated from local framework content."
    },
    entries: async () => getArticleEntries().map(article => ({
      path: `/blog/posts/${article.id}`,
      title: `${article.title} | VeloDom`,
      description: article.excerpt,
      canonical: `/blog/posts/${article.id}`,
      lang: "en",
      robots: "index,follow",
      keywords: [
        "VeloDom",
        ...article.tags
      ],
      openGraph: {
        type: "article",
        title: article.title,
        description: article.excerpt
      },
      summary: {
        heading: article.title,
        text: article.body
      },
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: article.title,
        description: article.excerpt,
        articleBody: article.body,
        url: `/blog/posts/${article.id}`
      }
    }))
  }
};
