const articles = [
  {
    id: "html-first",
    title: "HTML-first is the center of VeloDom",
    excerpt: "Readable HTML stays the authoring surface; behavior remains nearby and explicit.",
    body: "VeloDom begins with normal elements, attributes, and forms. A template can be understood before a developer learns a component DSL. Small directives are added only where a real interaction needs them, while larger behavior remains in the nearest script file.",
    takeaway: "The framework reduces ceremony without hiding the document model. HTML remains portable, inspectable, and accessible by default.",
    boundary: "VeloDom does not require JSX, template functions, a virtual DOM, or a global store in order to render a page.",
    exampleLabel: "src/pages/welcome/index.html",
    example: `<main>\n  <h1>{{ title }}</h1>\n  <button vd-on:click="count++">Count: {{ count }}</button>\n</main>`,
    category: "Architecture",
    readTime: "4 min",
    tags: ["HTML-first", "templates", "state"]
  },
  {
    id: "compiler-first",
    title: "Compiler-first without hiding the DOM",
    excerpt: "The compiler validates directives and expressions before browser startup.",
    body: "The compiler parses templates, normalizes preferred directives, validates safe expressions, reports source locations, records runtime features, and surfaces high-confidence accessibility and security signals. This catches predictable errors before a user reaches the page.",
    takeaway: "Work that can be known from a template belongs at build time, which lets the runtime stay smaller and more focused.",
    boundary: "Template expressions are parsed safely. eval, new Function, unsafe members, and arbitrary global access are not part of the expression model.",
    exampleLabel: "template directives",
    example: `<section vd-if="Boolean(user?.name)">\n  <p>Welcome {{ user.name }}</p>\n</section>\n<p vd-else>Sign in to continue.</p>`,
    category: "Compiler",
    readTime: "5 min",
    tags: ["compiler", "diagnostics", "safe expressions"]
  },
  {
    id: "runtime-lightweight",
    title: "Runtime-lightweight by design",
    excerpt: "Only the runtime features a page needs are selected from compiled metadata.",
    body: "VeloDom keeps routing, directives, components, requests, validation, shared state, and development inspection behind explicit contracts. A content page should not become heavier because another part of an application uses a request cache or an optional development panel.",
    takeaway: "The architecture prefers tree-selectable runtime features and build-time intelligence over permanent browser complexity.",
    boundary: "Full SSR reconciliation, a mandatory provider graph, automatic AI, and a general virtual DOM are not V1 runtime requirements.",
    exampleLabel: "explicit optional plugin",
    example: `import { createSharedState } from "velodom";\n\nconst shared = createSharedState({\n  name: "session",\n  initial: { theme: "light" }\n});\n\n// Register only when the application needs it.`,
    category: "Runtime",
    readTime: "4 min",
    tags: ["runtime", "plugins", "performance"]
  },
  {
    id: "developer-experience",
    title: "Developer experience stays local and static",
    excerpt: "Inspect, diagnose, graph, and document a project without increasing browser weight.",
    body: "The VeloDom CLI reads folders, templates, route config, request registrations, compiler metadata, refs, events, and generated build output. Its purpose is to make conventions visible to a developer, not to create a hidden cloud service or runtime dashboard.",
    takeaway: "Tooling can be ambitious while the application runtime remains conservative. That is how VeloDom improves productivity without changing authoring into a framework-specific language.",
    boundary: "AI providers, migration tools, CMS adapters, and hosted deployment integrations are research-only optional work. They are never required to build or run an application.",
    exampleLabel: "terminal",
    example: `vd doctor\nvd graph --mermaid\nvd health\nvd build-report\nvd docs\nvd types`,
    category: "Tooling",
    readTime: "6 min",
    tags: ["CLI", "doctor", "project intelligence"]
  }
];

/** Returns the local documentation articles used by the example application. */
export async function listArticles() {
  return { posts: articles };
}

/** Resolves one local documentation article from request input. */
export async function getOne(input = {}) {
  const id = input.id ?? input.params?.id;
  const article = articles.find(item => item.id === String(id || ""));

  if (!article) {
    throw new Error(`Article "${id}" was not found`);
  }

  return article;
}

/** Returns article records that static SEO config can turn into entries. */
export function getArticleEntries() {
  return articles;
}
