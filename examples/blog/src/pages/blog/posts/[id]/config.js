const articles = [
  {
    id: "html-first",
    title: "HTML-first is the center of VeloDom",
    excerpt: "VeloDom keeps pages readable as HTML and moves behavior into small scripts.",
    body: "VeloDom starts from real HTML files. A page can remain a folder with index.html, script.js, style.css, and config.js, or it can use one optional .vd file when co-location is clearer.",
    tags: [
      "HTML-first",
      "folder-first",
      "compiler"
    ]
  },
  {
    id: "compiler-first",
    title: "Compiler-first without hiding the DOM",
    excerpt: "Directives are validated and lowered before the browser runtime starts.",
    body: "The compiler understands VeloDom directives, text interpolation, single-file blocks, route metadata, and runtime feature manifests.",
    tags: [
      "compiler",
      "directives",
      "diagnostics"
    ]
  },
  {
    id: "runtime-lightweight",
    title: "Runtime-lightweight by design",
    excerpt: "VeloDom avoids virtual DOM and keeps power features optional.",
    body: "Routing, directives, components, requests, validation, shared state, and developer tooling are designed as clear modules.",
    tags: [
      "runtime",
      "vanilla",
      "performance"
    ]
  },
  {
    id: "developer-experience",
    title: "Developer experience stays local and static",
    excerpt: "VeloDom CLI commands inspect the project without adding browser weight.",
    body: "Commands like vd inspect, vd doctor, vd graph, vd health, vd build-report, and vd docs read source conventions and generated assets.",
    tags: [
      "CLI",
      "doctor",
      "build report"
    ]
  }
];

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
    entries: async () => articles.map(article => ({
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
