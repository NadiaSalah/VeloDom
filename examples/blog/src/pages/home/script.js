import { listArticles } from "@/api/posts.js";

export async function init({ state }) {
  state.posts = [];
  state.metrics = [
    { label: "Authoring", value: "HTML" },
    { label: "Compiler", value: "Safe" },
    { label: "Runtime", value: "Modular" },
    { label: "Application", value: "Folders" }
  ];
  state.principles = [
    { number: "01", title: "Write a visible feature", text: "A page or component is a readable folder, or an optional .vd file." },
    { number: "02", title: "Add small directives", text: "Use bindings, events, loops, conditionals, and requests where HTML needs behavior." },
    { number: "03", title: "Let the compiler help", text: "Templates, expressions, accessibility signals, and runtime manifests are checked before startup." }
  ];
  state.lessons = [
    { level: "Start", duration: "10 min", title: "Pages and state", description: "Create a route from a folder, export shallow state, and react to an event.", href: "/features#pages" },
    { level: "Templates", duration: "12 min", title: "Directives and interpolation", description: "Render text, conditions, lists, attributes, and form values with safe expressions.", href: "/features#directives" },
    { level: "Composition", duration: "15 min", title: "Components and layouts", description: "Reuse HTML through component folders, props, slots, refs, and application-owned layouts.", href: "/features#components" },
    { level: "Data", duration: "18 min", title: "Requests and forms", description: "Connect local handlers, automatic loading/error state, validation, and progressive form behavior.", href: "/features#requests" },
    { level: "Application", duration: "16 min", title: "API, middleware, and auth", description: "Discover handlers from folders, declare route policy, and use a provider-based server session boundary.", href: "/features#api" },
    { level: "Resilience", duration: "10 min", title: "Cache and retry", description: "Cache public reads deliberately and keep retry behavior explicit for safe requests.", href: "/features#cache" },
    { level: "International", duration: "11 min", title: "RTL and direction", description: "Set language direction through an optional plugin and author layouts with logical CSS.", href: "/features#rtl" },
    { level: "Performance", duration: "9 min", title: "Assets and lazy loading", description: "Use native image loading hints, explicit responsive variants, and compiler-selected runtime features.", href: "/features#assets" },
    { level: "Production", duration: "14 min", title: "SEO and content", description: "Generate route metadata, static content, sitemaps, content records, and locale-aware URLs.", href: "/features#production" },
    { level: "Tooling", duration: "12 min", title: "CLI and verification", description: "Inspect projects, generate types, test components, and keep package boundaries explicit.", href: "/features#tooling" },
    { level: "Reference", duration: "20 min", title: "Complete public API", description: "See every supported package subpath, runtime value, compiler helper, and build-time integration.", href: "/reference" }
  ];

  const result = await listArticles();
  state.posts = result.posts;
}
