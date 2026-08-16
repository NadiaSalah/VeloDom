const articles = [
  {
    id: "html-first",
    title: "HTML-first is the center of VeloDom",
    excerpt: "VeloDom keeps pages readable as HTML and moves behavior into small scripts.",
    body: "VeloDom starts from real HTML files. A page can remain a folder with index.html, script.js, style.css, and config.js, or it can use one optional .vd file when co-location is clearer. The important rule is that HTML remains the authoring surface, while the compiler prepares the runtime work.",
    category: "Architecture",
    readTime: "4 min",
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
    body: "The compiler understands VeloDom directives, text interpolation, single-file blocks, route metadata, and runtime feature manifests. That lets the framework catch common mistakes early and keep the browser runtime focused on the features each page actually uses.",
    category: "Compiler",
    readTime: "5 min",
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
    body: "Routing, directives, components, requests, validation, shared state, and developer tooling are designed as clear modules. The framework does not require JSX, a mandatory store, full SSR, or a browser devtools extension to be useful.",
    category: "Runtime",
    readTime: "3 min",
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
    body: "Commands like vd inspect, vd doctor, vd graph, vd health, vd build-report, and vd docs read folders, templates, route configs, API route registrations, middleware, compiler manifests, and generated assets. This gives practical feedback while preserving the runtime-lightweight principle.",
    category: "Tooling",
    readTime: "6 min",
    tags: [
      "CLI",
      "doctor",
      "build report"
    ]
  }
];

export async function listArticles() {
  return {
    posts: articles
  };
}

export async function getOne(input = {}) {
  const id = input.id ?? input.params?.id;
  const article = articles.find(item => item.id === String(id || ""));

  if (!article) {
    throw new Error(`Article "${id}" was not found`);
  }

  return article;
}

export function getArticleEntries() {
  return articles;
}
