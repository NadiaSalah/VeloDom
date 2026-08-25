/**
 * ----------------------------------------
 * Module: CLI Scaffolds
 * ----------------------------------------
 *
 * Creates convention-first VeloDom project resources and keeps generated
 * templates separate from command parsing and project analysis.
 * ----------------------------------------
 */

import {
  mkdir,
  writeFile
} from "node:fs/promises";
import {
  dirname,
  join,
  relative
} from "node:path";
import {
  normalizeModuleName,
  toPosix,
  toRoutePath
} from "./analyzer.ts";
import {
  STARTER_BRAND_SVG,
  STARTER_FAVICON_SVG
} from "./brand.ts";
import type { CliContext } from "./types.ts";

/** Creates one supported VeloDom resource from parsed CLI values and flags. */
export async function createResource(
  context: CliContext,
  values: string[],
  flags: Set<string>,
  options: Record<string, string> = {}
): Promise<void> {
  const [type, rawName] = values;

  switch (type) {
    case "page":
      await createPage(
        context,
        requireName(rawName, "page"),
        flags,
        options.demo
      );
      break;
    case "component":
      await createComponent(context, requireName(rawName, "component"), flags);
      break;
    case "api":
      await createApi(context, requireName(rawName, "api"));
      break;
    case "demo":
      await createDemo(context, requireName(rawName, "demo"));
      break;
    case "feature":
      await createFeature(context, requireName(rawName, "feature"), flags);
      break;
    case "middleware":
      await createMiddleware(context);
      break;
    case "plugin":
      await createPlugin(context, requireName(rawName, "plugin"));
      break;
    case "project":
      await createProject(context, requireName(rawName, "project"));
      break;
    case "init":
      await createProject(context, requireName(rawName, "project"));
      break;
    default:
      throw new Error(
        "Use vd create page|component|api|demo|feature|middleware|plugin|project."
      );
  }
}

async function createPage(
  context: CliContext,
  name: string,
  flags: Set<string>,
  demo?: string
) {
  if (demo) {
    if (flags.has("single-file")) {
      throw new Error("--demo cannot be combined with --single-file.");
    }

    await createPageDemo(context, name, demo, flags.has("ts"));
    return;
  }

  if (flags.has("single-file")) {
    const file = join(context.cwd, "src", "pages", `${safeName(name)}.vd`);

    await writeNewFile(file, createSingleFilePageTemplate(name));
    context.stdout(`Created page ${relativePath(context.cwd, file)}`);
    return;
  }

  const folder = join(context.cwd, "src", "pages", safeName(name));
  const useTypeScript = flags.has("ts");
  const scriptName = useTypeScript ? "script.ts" : "script.js";
  const configName = useTypeScript ? "config.ts" : "config.js";

  await writeNewFile(join(folder, "index.html"), createPageHtmlTemplate());
  await writeNewFile(join(folder, scriptName), createPageScriptTemplate(name));
  await writeNewFile(join(folder, "style.css"), createStyleTemplate());
  await writeNewFile(
    join(folder, configName),
    createPageConfigTemplate(name, undefined, useTypeScript)
  );
  context.stdout(`Created page ${relativePath(context.cwd, folder)}`);
}

async function createPageDemo(
  context: CliContext,
  name: string,
  kind: string,
  useTypeScript: boolean
) {
  const normalizedKind = kind.trim().toLowerCase();
  const available = ["static", "counter", "request", "form", "seo"];

  if (!available.includes(normalizedKind)) {
    throw new Error(
      `Unknown page demo "${kind}". Use ${available.join(", ")}.`
    );
  }

  const folder = join(context.cwd, "src", "pages", safeName(name));
  const scriptName = useTypeScript ? "script.ts" : "script.js";
  const configName = useTypeScript ? "config.ts" : "config.js";

  await writeNewFile(
    join(folder, "index.html"),
    createPageDemoHtmlTemplate(name, normalizedKind)
  );
  await writeNewFile(
    join(folder, configName),
    createPageDemoConfigTemplate(name, normalizedKind, useTypeScript)
  );

  const script = createPageDemoScriptTemplate(name, normalizedKind);

  if (script) {
    await writeNewFile(join(folder, scriptName), script);
  }

  if (normalizedKind === "request") {
    await writeNewFile(
      join(context.cwd, "src", "api", safeName(name), "get.js"),
      createPageDemoRequestHandler(name)
    );
  }

  context.stdout(
    `Created ${normalizedKind} page demo ${relativePath(context.cwd, folder)}`
  );
}

async function createComponent(
  context: CliContext,
  name: string,
  flags: Set<string>
) {
  if (flags.has("single-file")) {
    const file = join(context.cwd, "src", "components", `${safeName(name)}.vd`);

    await writeNewFile(file, createSingleFileComponentTemplate(name));
    context.stdout(`Created component ${relativePath(context.cwd, file)}`);
    return;
  }

  const folder = join(context.cwd, "src", "components", safeName(name));
  const scriptName = flags.has("ts") ? "script.ts" : "script.js";

  await writeNewFile(join(folder, "index.html"), createComponentHtmlTemplate());
  await writeNewFile(join(folder, scriptName), createComponentScriptTemplate(name));
  await writeNewFile(join(folder, "style.css"), createStyleTemplate());
  context.stdout(`Created component ${relativePath(context.cwd, folder)}`);
}

async function createApi(context: CliContext, name: string) {
  const file = join(context.cwd, "src", "api", `${safeName(name)}.js`);

  await writeNewFile(file, createApiTemplate(name));
  context.stdout(`Created API file ${relativePath(context.cwd, file)}`);
}

async function createDemo(context: CliContext, name: string) {
  const folder = join(context.cwd, "src", "pages", safeName(name));

  await writeNewFile(join(folder, "index.html"), createDemoHtmlTemplate());
  await writeNewFile(join(folder, "script.js"), createDemoScriptTemplate(name));
  await writeNewFile(join(folder, "style.css"), createStyleTemplate());
  await writeNewFile(join(folder, "config.js"), createPageConfigTemplate(name));
  context.stdout(`Created demo page ${relativePath(context.cwd, folder)}`);
}

async function createFeature(
  context: CliContext,
  name: string,
  flags: Set<string>
) {
  const feature = safeName(name);
  const pageFolder = join(context.cwd, "src", "pages", feature);

  await writeNewFile(
    join(pageFolder, "index.html"),
    createFeaturePageTemplate(name, flags.has("blog"))
  );
  await writeNewFile(join(pageFolder, "config.js"), createPageConfigTemplate(name));

  if (flags.has("blog")) {
    const cardName = `${feature}/post-card`;
    const componentFolder = join(context.cwd, "src", "components", cardName);
    const apiFile = join(context.cwd, "src", "api", `${feature}.js`);
    const testFile = join(context.cwd, "tests", `${feature.replaceAll("/", "-")}.test.js`);

    await writeNewFile(
      join(pageFolder, "script.js"),
      createFeatureBlogScriptTemplate(name)
    );
    await writeNewFile(
      join(componentFolder, "index.html"),
      createFeatureCardTemplate()
    );
    await writeNewFile(apiFile, createFeatureApiTemplate(name));
    await writeNewFile(testFile, createFeatureTestTemplate(name));
  }

  const template = flags.has("blog") ? "blog" : "minimal";

  context.stdout(
    `Created ${template} feature ${relativePath(context.cwd, pageFolder)}`
  );
}

async function createMiddleware(context: CliContext) {
  const file = join(context.cwd, "src", "api", "middleware.js");

  await writeNewFile(file, createMiddlewareTemplate());
  context.stdout(`Created middleware file ${relativePath(context.cwd, file)}`);
}

async function createPlugin(context: CliContext, name: string) {
  const file = join(context.cwd, "src", "plugins", `${safeName(name)}.js`);

  await writeNewFile(file, createPluginTemplate(name));
  context.stdout(`Created plugin ${relativePath(context.cwd, file)}`);
}

async function createProject(context: CliContext, name: string) {
  const folder = join(context.cwd, safeName(name));

  await writeNewFile(join(folder, "package.json"), createProjectManifest(name));
  await writeNewFile(join(folder, "vite.config.js"), createProjectViteConfig());
  await writeNewFile(join(folder, "jsconfig.json"), createProjectJsConfig());
  await writeNewFile(join(folder, "index.html"), createProjectShell());
  await writeNewFile(
    join(folder, "public", "velodom-favicon.svg"),
    STARTER_FAVICON_SVG
  );
  await writeNewFile(join(folder, "src", "main.js"), createProjectMain());
  await writeNewFile(
    join(folder, "src", "pages", "home", "index.html"),
    createProjectHomeTemplate()
  );
  await writeNewFile(
    join(folder, "src", "pages", "home", "script.js"),
    createProjectHomeScript()
  );
  await writeNewFile(
    join(folder, "src", "pages", "home", "config.js"),
    createProjectHomeConfig()
  );
  await writeNewFile(
    join(folder, "src", "components", "brand-mark", "index.html"),
    createProjectBrandComponent()
  );
  await writeNewFile(
    join(folder, "src", "layouts", "default.vd"),
    createProjectLayoutTemplate()
  );
  await writeNewFile(
    join(folder, "src", "components", "site-nav", "index.html"),
    createProjectNavTemplate()
  );
  await writeNewFile(
    join(folder, "src", "components", "site-nav", "script.js"),
    createProjectNavScript()
  );
  await writeNewFile(
    join(folder, "src", "components", "site-nav", "style.css"),
    createProjectNavStyles()
  );
  await writeNewFile(
    join(folder, "src", "components", "feature-card", "index.html"),
    createProjectFeatureCardTemplate()
  );
  await writeNewFile(
    join(folder, "src", "components", "feature-card", "script.js"),
    createProjectFeatureCardScript()
  );
  await writeNewFile(
    join(folder, "src", "components", "feature-card", "style.css"),
    createProjectFeatureCardStyles()
  );
  await writeNewFile(
    join(folder, "src", "pages", "about.vd"),
    createProjectAboutTemplate()
  );
  await writeNewFile(
    join(folder, "src", "pages", "guide", "index.html"),
    createProjectGuideTemplate()
  );
  await writeNewFile(
    join(folder, "src", "pages", "guide", "config.js"),
    createProjectGuideConfig()
  );
  await writeNewFile(join(folder, "src", "style.css"), createProjectStyles());
  context.stdout(`Created VeloDom project ${relativePath(context.cwd, folder)}`);
}

async function writeNewFile(file: string, source: string) {
  await mkdir(dirname(file), {
    recursive: true
  });
  await writeFile(file, source, {
    flag: "wx"
  });
}

function safeName(name: string) {
  const normalized = normalizeModuleName(name);

  if (
    normalized.includes("..")
    || normalized.split("/").some(part => !part.trim())
  ) {
    throw new Error(`Invalid VeloDom resource name "${name}".`);
  }

  return normalized;
}

function requireName(value: string | undefined, label: string) {
  if (!value) {
    throw new Error(`Missing ${label} name.`);
  }

  return value;
}

function createPageHtmlTemplate() {
  return `<main class="vd-page">
  <p class="eyebrow">VeloDom page</p>
  <h1>{{ title }}</h1>
  <p vd-text="description"></p>
</main>
`;
}

function createPageScriptTemplate(name: string) {
  const title = titleFromName(name);

  return [
    "export const state = {",
    `  title: "${title}",`,
    "  description: \"Edit this page from its script file.\"",
    "};",
    ""
  ].join("\n");
}

function createPageConfigTemplate(
  name: string,
  route: string = toRoutePath(normalizeModuleName(name)),
  useTypeScript = false
) {
  const title = titleFromName(name);
  const typeImport = useTypeScript
    ? `import type { PageConfig } from "velodom";\n\n`
    : "";
  const typeCheck = useTypeScript ? " satisfies PageConfig" : "";

  return `${typeImport}export default {
  path: "${route}",
  seo: {
    title: "${title}",
    description: "A VeloDom page generated by the CLI."
  }
}${typeCheck};
`;
}

function createPageDemoHtmlTemplate(name: string, kind: string) {
  const title = titleFromName(name);

  switch (kind) {
    case "counter":
      return `<main class="vd-page">
  <p class="eyebrow">Counter demo</p>
  <h1>{{ title }}</h1>
  <button type="button" vd-on:click="count++">
    Count: {{ count }}
  </button>
</main>
`;
    case "request":
      return `<main class="vd-page">
  <p class="eyebrow">Request demo</p>
  <h1>{{ title }}</h1>
  <button type="button" vd-request="${safeName(name).replaceAll("/", ".")}.get" vd-target="result">
    Load a local result
  </button>
  <p vd-if="result" vd-text="result.message"></p>
</main>
`;
    case "form":
      return `<main class="vd-page">
  <p class="eyebrow">Form demo</p>
  <h1>{{ title }}</h1>
  <form vd-on:submit="submit(event)">
    <label>
      Email
      <input type="email" vd-model="email" required>
    </label>
    <button type="submit">Save</button>
  </form>
  <p vd-if="submitted">Saved {{ email }}</p>
</main>
`;
    case "seo":
      return `<main class="vd-page">
  <p class="eyebrow">SEO demo</p>
  <h1>${title}</h1>
  <p>This page has a concise title, description, keywords, and visible static content.</p>
</main>
`;
    default:
      return `<main class="vd-page">
  <p class="eyebrow">Static demo</p>
  <h1>${title}</h1>
  <p>Start with ordinary HTML. Add a script only when this page needs behavior.</p>
</main>
`;
  }
}

function createPageDemoScriptTemplate(name: string, kind: string) {
  const title = titleFromName(name);

  switch (kind) {
    case "counter":
      return `export const state = {
  title: "${title}",
  count: 0
};
`;
    case "request":
      return `export const state = {
  title: "${title}",
  result: null
};
`;
    case "form":
      return `export const state = {
  title: "${title}",
  email: "",
  submitted: false,
  submit(event) {
    event.preventDefault();
    this.submitted = true;
  }
};
`;
    default:
      return "";
  }
}

function createPageDemoConfigTemplate(
  name: string,
  kind: string,
  useTypeScript: boolean
) {
  if (kind !== "seo") {
    return createPageConfigTemplate(name, undefined, useTypeScript);
  }

  const title = titleFromName(name);
  const typeImport = useTypeScript
    ? `import type { PageConfig } from "velodom";\n\n`
    : "";
  const typeCheck = useTypeScript ? " satisfies PageConfig" : "";

  return `${typeImport}export default {
  path: "${toRoutePath(normalizeModuleName(name))}",
  seo: {
    title: "${title}",
    description: "A concise VeloDom SEO page generated by the CLI.",
    keywords: ["VeloDom", "HTML-first", "SEO"]
  }
}${typeCheck};
`;
}

function createPageDemoRequestHandler(name: string) {
  const title = titleFromName(name);

  return `export default async function get() {
  return {
    message: "${title} request completed."
  };
}
`;
}

function createSingleFilePageTemplate(name: string) {
  return `<template>
${indent(createPageHtmlTemplate().trimEnd(), 2)}
</template>

<script>
${createPageScriptTemplate(name).trimEnd()}
</script>

<style>
${createStyleTemplate().trimEnd()}
</style>

<config>
${createPageConfigTemplate(name).trimEnd()}
</config>
`;
}

function createComponentHtmlTemplate() {
  return `<article class="vd-card">
  <h2>{{ title }}</h2>
  <div vd-get-child="default"></div>
</article>
`;
}

function createComponentScriptTemplate(name: string) {
  const title = titleFromName(name);

  return [
    "export function init({ state, props }) {",
    `  state.title = props.title || "${title}";`,
    "}",
    ""
  ].join("\n");
}

function createSingleFileComponentTemplate(name: string) {
  return `<template>
${indent(createComponentHtmlTemplate().trimEnd(), 2)}
</template>

<script>
${createComponentScriptTemplate(name).trimEnd()}
</script>

<style>
${createStyleTemplate().trimEnd()}
</style>
`;
}

function createDemoHtmlTemplate() {
  return `<main class="vd-page">
  <p class="eyebrow">VeloDom demo</p>
  <h1>{{ title }}</h1>

  <button type="button" vd-on:click="increment()">
    Count: <span vd-text="count"></span>
  </button>

  <ul>
    <li vd-for="item in items">
      <span vd-text="item"></span>
    </li>
  </ul>
</main>
`;
}

function createDemoScriptTemplate(name: string) {
  const title = titleFromName(name);

  return [
    "export function init({ state }) {",
    `  state.title = "${title} Demo";`,
    "  state.count = 0;",
    "  state.items = [\"HTML-first\", \"Compiler-first\", \"Runtime-lightweight\"];",
    "  state.increment = () => {",
    "    state.count += 1;",
    "  };",
    "}",
    ""
  ].join("\n");
}

function createFeaturePageTemplate(name: string, blog = false) {
  const title = titleFromName(name);

  if (blog) {
    return `<main class="vd-page">
  <h1 vd-text="title"></h1>
  <vd-component
    name="${safeName(name)}/post-card"
    vd-prop-title="posts[0].title"
    vd-prop-excerpt="posts[0].excerpt"
  ></vd-component>
</main>
`;
  }

  return `<main class="vd-page">
  <h1>${title}</h1>
  <p>Start with ordinary HTML. Add a script only when this feature needs behavior.</p>
</main>
`;
}

function createFeatureBlogScriptTemplate(name: string) {
  const title = titleFromName(name);
  const component = `${safeName(name)}/post-card`;

  return `export function init({ state }) {
  state.title = "${title}";
  state.posts = [
    {
      id: 1,
      title: "First ${title} post",
      excerpt: "Replace this local example with your own data."
    }
  ];
  state.cardComponent = "${component}";
}
`;
}

function createFeatureCardTemplate() {
  return `<article class="vd-card">
  <h2 vd-text="props.title"></h2>
  <p vd-text="props.excerpt"></p>
</article>
`;
}

function createFeatureApiTemplate(name: string) {
  const title = titleFromName(name);

  return `/** Application-owned ${title} data. Register it explicitly today, or use file API discovery when enabled. */
export async function list() {
  return [];
}
`;
}

function createFeatureTestTemplate(name: string) {
  const title = titleFromName(name);

  return `import assert from "node:assert/strict";
import test from "node:test";

test("${title} feature is ready for application tests", () => {
  assert.ok(true);
});
`;
}

function createApiTemplate(name: string) {
  const routeName = normalizeModuleName(name).split("/").at(-1) || "handler";

  return [
    "import { requestJson } from \"velodom\";",
    "",
    `export async function ${toIdentifier(routeName)}(params = {}, { signal } = {}) {`,
    "  return requestJson(\"/\", {",
    "    signal",
    "  });",
    "}",
    ""
  ].join("\n");
}

function createMiddlewareTemplate() {
  return [
    "export function trimStringFields(params = {}) {",
    "  return Object.fromEntries(",
    "    Object.entries(params).map(([key, value]) => [",
    "      key,",
    "      typeof value === \"string\" ? value.trim() : value",
    "    ])",
    "  );",
    "}",
    "",
    "export default {",
    "  trimStringFields",
    "};",
    ""
  ].join("\n");
}

function createPluginTemplate(name: string) {
  const pluginName = normalizeModuleName(name).replaceAll("/", "-");

  return [
    "export default {",
    `  name: "${pluginName}",`,
    "  setup() {",
    "    return () => {};",
    "  }",
    "};",
    ""
  ].join("\n");
}

function createProjectManifest(name: string) {
  return `${JSON.stringify({
    name: safeName(name).replaceAll("/", "-"),
    private: true,
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview"
    },
    imports: {
      "#app/*": "./src/*"
    },
    dependencies: {
      velodom: "^1.0.0"
    },
    devDependencies: {
      vite: "^8.1.3"
    }
  }, null, 2)}
`;
}

function createProjectViteConfig() {
  return `import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { velodom } from "velodom/vite-plugin";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  plugins: [
    velodom()
  ]
});
`;
}

function createProjectJsConfig() {
  return `${JSON.stringify({
    compilerOptions: {
      baseUrl: ".",
      ignoreDeprecations: "6.0",
      checkJs: false,
      module: "ESNext",
      moduleResolution: "Bundler",
      paths: {
        "@/*": [
          "src/*"
        ]
      }
    },
    include: [
      "src/**/*.js",
      "src/**/*.ts"
    ]
  }, null, 2)}
`;
}

function createProjectShell() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/svg+xml" href="/velodom-favicon.svg">
    <meta name="description" content="A website built with VeloDom.">
    <title>VeloDom App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`;
}

function createProjectMain() {
  return `import { mountVeloDom } from "velodom/vite";
import "./style.css";

await mountVeloDom();
`;
}

function createProjectHomeTemplate() {
  return `<main class="home-page">
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-content">
      <p class="eyebrow">HTML-first · compiler-first · vanilla friendly</p>
      <h1 id="hero-title">Build visible web apps from ordinary HTML.</h1>
      <p class="hero-copy">VeloDom keeps your pages close to the files you write, then adds routing, state, components, requests, and SEO only when your feature needs them.</p>
      <div class="hero-actions">
        <a class="button button-primary" href="/#principles" vd-nav>Explore the model</a>
        <a class="button button-secondary" href="/about" vd-nav>Open starter examples</a>
        <a class="button button-secondary" href="https://github.com/NadiaSalah/VeloDom" target="_blank" rel="noreferrer">View on GitHub</a>
      </div>
    </div>
    <div class="hero-art" aria-hidden="true">
      <vd-component name="brand-mark"></vd-component>
      <p>Build with a visible mark.</p>
    </div>
  </section>

  <section id="principles" class="principles" aria-labelledby="principles-title">
    <div>
      <p class="eyebrow">A small starting point</p>
      <h2 id="principles-title">Start simple. Grow by convention.</h2>
    </div>
    <div class="principle-grid">
      <article class="principle-card"><span class="card-number">01</span><h3>Readable folders</h3><p>Pages, components, APIs, and styles stay where a new developer expects to find them.</p></article>
      <article class="principle-card"><span class="card-number">02</span><h3>Small directives</h3><p>Add reactive behavior next to the HTML without adopting a second template language.</p></article>
      <article class="principle-card"><span class="card-number">03</span><h3>Lightweight runtime</h3><p>The compiler prepares the page and the browser loads only the capabilities it uses.</p></article>
    </div>
  </section>

</main>
`;
}

function createProjectHomeScript() {
  return `// This page needs no page-owned behavior. The shared layout owns the navbar
// and theme toggle, leaving the page focused on readable HTML.
`;
}

function createProjectHomeConfig() {
  return `export default {
  path: "/",
  layout: "default",
  seo: {
    title: "VeloDom | HTML-first frontend",
    description: "A small VeloDom starter project built with ordinary HTML, components, and reactive state."
  }
};
`;
}

function createProjectBrandComponent() {
  return `<span class="brand-mark">\n${STARTER_BRAND_SVG}\n</span>\n`;
}

function createProjectLayoutTemplate() {
  return `<template>
  <div class="app-layout">
    <vd-component name="site-nav"></vd-component>
    <vd-page></vd-page>
    <footer class="app-footer">
      <span>VeloDom starter · HTML-first and compiler-first</span>
      <a href="https://github.com/NadiaSalah/VeloDom" target="_blank" rel="noreferrer">GitHub</a>
    </footer>
  </div>
</template>

<style>
.app-layout { min-height: 100vh; }
.app-footer { display: flex; justify-content: space-between; gap: 1rem; width: min(1080px, calc(100% - 2rem)); margin: 0 auto; padding: 1.5rem 0 2rem; border-top: 1px solid var(--border); color: var(--muted); font-size: .9rem; }
@media (max-width: 600px) { .app-footer { flex-direction: column; } }
</style>
`;
}

function createProjectNavTemplate() {
  return `<nav class="site-nav" aria-label="Main navigation">
  <div class="site-nav-inner">
    <a class="site-nav-brand" href="/" vd-nav><vd-component name="brand-mark"></vd-component><span>VeloDom</span></a>
    <div class="site-nav-links">
      <a class="site-nav-link" href="/" vd-nav>Home</a>
      <a class="site-nav-link" href="/about" vd-nav>Single-file</a>
      <a class="site-nav-link" href="/guide" vd-nav>Components</a>
    </div>
    <button class="site-theme-toggle" type="button" aria-label="Toggle color theme" vd-on:click="toggleTheme()"><span vd-text="themeIcon" aria-hidden="true"></span><span vd-text="themeLabel"></span></button>
  </div>
</nav>
`;
}

function createProjectNavScript() {
  return `/** Owns shared theme state and keeps the navbar highlight route-aware. */
export function init({ state }) {
  state.theme = "light";
  state.themeIcon = "☾";
  state.themeLabel = "Dark mode";
  state.toggleTheme = () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    state.themeIcon = state.theme === "dark" ? "☀" : "☾";
    state.themeLabel = state.theme === "dark" ? "Light mode" : "Dark mode";
    document.documentElement.dataset.theme = state.theme;
    localStorage.setItem("velodom-theme", state.theme);
  };
}

/** Updates active navigation state after route changes. */
export function mounted({ ctx, state }) {
  const links = [...document.querySelectorAll(".site-nav-link")];

  const updateActiveLink = () => {
    const currentPath = normalizePath(window.location.pathname);

    links.forEach(link => {
      const targetPath = normalizePath(new URL(link.href, window.location.origin).pathname);
      const active = targetPath === currentPath;

      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  };

  updateActiveLink();
  if (localStorage.getItem("velodom-theme") === "dark") state.toggleTheme();
  window.addEventListener("popstate", updateActiveLink);
  window.addEventListener("hashchange", updateActiveLink);
  ctx.onCleanup(() => {
    window.removeEventListener("popstate", updateActiveLink);
    window.removeEventListener("hashchange", updateActiveLink);
  });
}

function normalizePath(path) {
  const value = String(path || "/").replace(/\\/+$/, "");
  return value || "/";
}
`;
}

function createProjectNavStyles() {
  return `.site-nav { border-bottom: 1px solid var(--border); background: color-mix(in srgb, var(--page) 88%, transparent); backdrop-filter: blur(14px); }
.site-nav-inner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; width: min(1080px, calc(100% - 2rem)); min-height: 4.25rem; margin: 0 auto; }
.site-nav-brand { display: inline-flex; align-items: center; gap: .6rem; color: var(--text); font-size: 1.1rem; font-weight: 900; letter-spacing: -.04em; text-decoration: none; }
.site-nav-brand .brand-mark { width: 2.25rem; height: 2.25rem; border-radius: .65rem; overflow: hidden; }
.site-nav-brand .brand-icon { display: block; width: 100%; height: 100%; }
.site-nav-links { display: flex; align-items: center; gap: .35rem; }
.site-nav-link { padding: .55rem .75rem; border-radius: .65rem; color: var(--muted); font-size: .9rem; font-weight: 750; text-decoration: none; }
.site-nav-link:hover, .site-nav-link.is-active { background: var(--surface-muted); color: var(--accent-strong); }
.site-theme-toggle { display: inline-flex; align-items: center; gap: .45rem; padding: .55rem .75rem; border: 1px solid var(--border); border-radius: .65rem; background: var(--surface); color: var(--text); font: inherit; font-size: .85rem; font-weight: 750; cursor: pointer; }
.site-theme-toggle:hover { border-color: var(--accent); }
@media (max-width: 520px) { .site-nav-inner { align-items: flex-start; flex-direction: column; justify-content: center; padding: .75rem 0; } .site-nav-links { flex: 1; } .site-theme-toggle span:last-child { display: none; } }
`;
}

function createProjectFeatureCardTemplate() {
  return `<article class="feature-card">
  <span class="feature-card-label">Component</span>
  <h2 vd-text="title"></h2>
  <p vd-text="text"></p>
</article>
`;
}

function createProjectFeatureCardScript() {
  return `/** Copies public component props into local render state. */
export function init({ props, state }) {
  state.title = props.title || "A reusable component";
  state.text = props.text || "Keep repeated markup in src/components.";
}
`;
}

function createProjectFeatureCardStyles() {
  return `.feature-card { padding: 1.5rem; border: 1px solid var(--border); border-radius: 1.25rem; background: var(--surface); box-shadow: var(--shadow); }
.feature-card-label { color: var(--accent); font-size: .72rem; font-weight: 850; letter-spacing: .12em; text-transform: uppercase; }
.feature-card h2 { margin-top: .8rem; font-size: 1.25rem; }
.feature-card p { margin: .65rem 0 0; color: var(--muted); line-height: 1.65; }
`;
}

function createProjectAboutTemplate() {
  return `<template>
  <main class="lesson-page">
    <p class="eyebrow">Single-file page</p>
    <h1>Everything for this small page lives in one <code>.vd</code> file.</h1>
    <p class="lesson-copy">VeloDom keeps the template, behavior, style, and route configuration together when that makes a feature easier to understand.</p>
    <button class="button button-primary" type="button" vd-on:click="increment()">Clicked {{ count }} times</button>
    <div class="lesson-grid">
      <article><h2>Four familiar blocks</h2><ol><li><strong>template</strong> — readable HTML</li><li><strong>script</strong> — plain JavaScript state</li><li><strong>style</strong> — local presentation</li><li><strong>config</strong> — route and SEO metadata</li></ol></article>
      <pre vd-pre><code>&lt;template&gt;...&lt;/template&gt;

&lt;script&gt;
${"export"} const state = { count: 0 };
&lt;/script&gt;

&lt;style&gt;main { padding: 2rem; }&lt;/style&gt;

&lt;config&gt;
${"export"} default { path: "/about", layout: "default" };
&lt;/config&gt;</code></pre>
    </div>
  </main>
</template>

<script>
${"export"} const state = { count: 0 };
${"export"} function init({ state }) {
  state.increment = () => { state.count += 1; };
}
</script>

<style>
.lesson-page { width: min(1080px, calc(100% - 2rem)); margin: 0 auto; padding: clamp(3rem, 8vw, 6rem) 0; }
.lesson-page h1 { max-width: 800px; }
.lesson-page code { color: var(--accent-strong); }
.lesson-copy { max-width: 650px; margin: 1.5rem 0 2rem; color: var(--muted); font-size: 1.15rem; line-height: 1.75; }
.lesson-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; margin-top: 3rem; }
.lesson-grid article, .lesson-grid pre { padding: 1.5rem; border: 1px solid var(--border); border-radius: 1.25rem; background: var(--surface); box-shadow: var(--shadow); }
.lesson-grid h2 { font-size: 1.3rem; }
.lesson-grid ol { display: grid; gap: .75rem; padding-inline-start: 1.25rem; color: var(--muted); line-height: 1.6; }
.lesson-grid pre { overflow: auto; border-color: rgb(129 140 248 / .45); background: radial-gradient(circle at 90% 0%, rgb(99 102 241 / .28), transparent 42%), linear-gradient(145deg, #111a38, #060a18 70%); box-shadow: 0 24px 60px rgb(15 23 42 / .25), inset 0 1px 0 rgb(255 255 255 / .08); color: #e0e7ff; line-height: 1.6; }
.lesson-grid pre code { display: block; color: #e0e7ff; font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; font-size: .92rem; text-shadow: 0 0 14px rgb(129 140 248 / .35); }
@media (max-width: 720px) { .lesson-grid { grid-template-columns: 1fr; } }
</style>

<config>
${"export"} default {
  path: "/about",
  layout: "default",
  seo: { title: "Single-file page | VeloDom", description: "A simple VeloDom .vd page showing template, script, style, and config together." }
};
</config>
`;
}

function createProjectGuideTemplate() {
  return `<main class="lesson-page">
  <p class="eyebrow">Components and layout</p>
  <h1>Reuse HTML with a component, then wrap pages with a layout.</h1>
  <p class="lesson-copy">This page uses <code>src/layouts/default.vd</code> for the navbar and footer. Its cards come from one component folder with a separate <code>script.js</code> file.</p>
  <div class="component-grid">
    <vd-component name="feature-card" vd-prop-title="HTML stays visible" vd-prop-text="Write normal elements first. Add a directive only when the page needs behavior."></vd-component>
    <vd-component name="feature-card" vd-prop-title="JavaScript stays nearby" vd-prop-text="Component state and lifecycle code live in its own script.js file."></vd-component>
    <vd-component name="feature-card" vd-prop-title="Layout is shared" vd-prop-text="A layout can provide navigation, a footer, and a consistent shell for many pages."></vd-component>
  </div>
</main>
`;
}

function createProjectGuideConfig() {
  return `export default {
  path: "/guide",
  layout: "default",
  seo: { title: "Components and layout | VeloDom", description: "A practical VeloDom example using a shared layout and a JavaScript-backed component." }
};
`;
}

function createProjectStyles() {
  return `:root {
  color-scheme: light;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  background: #f8fafc;
  color: #0f172a;
  --page: #f8fafc;
  --surface: #ffffff;
  --surface-muted: #eef2ff;
  --text: #0f172a;
  --muted: #475569;
  --border: #dbe4f0;
  --accent: #4f46e5;
  --accent-strong: #3730a3;
  --shadow: 0 24px 70px rgb(15 23 42 / .12);
}
:root[data-theme="dark"] { color-scheme: dark; --page: #0b1120; --surface: #111827; --surface-muted: #1e1b4b; --text: #f8fafc; --muted: #cbd5e1; --border: #26354b; --accent: #818cf8; --accent-strong: #a5b4fc; --shadow: 0 24px 70px rgb(2 6 23 / .45); }
* { box-sizing: border-box; }
body { margin: 0; background: var(--page); color: var(--text); transition: background 180ms ease, color 180ms ease; }
a { color: inherit; }
.home-page { min-height: 100vh; }
.hero, .principles { width: min(1080px, calc(100% - 2rem)); margin-inline: auto; }
.brand-mark { display: inline-flex; width: 2.5rem; height: 2.5rem; border-radius: .75rem; overflow: hidden; box-shadow: 0 8px 20px rgb(79 70 229 / .24); }
.brand-icon { display: block; width: 100%; height: 100%; }
.button { border: 1px solid var(--border); border-radius: .8rem; font: inherit; font-weight: 700; cursor: pointer; transition: transform 160ms ease, border-color 160ms ease; }
.button:hover { transform: translateY(-2px); border-color: var(--accent); }
.hero { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(15rem, .75fr); align-items: center; gap: clamp(2rem, 7vw, 7rem); padding-block: clamp(4rem, 12vw, 8rem) 5rem; }
.hero-content { min-width: 0; }
.hero-art { display: grid; justify-items: center; gap: 1rem; padding: clamp(1.5rem, 5vw, 3rem); border: 1px solid var(--border); border-radius: 2rem; background: linear-gradient(145deg, rgb(99 102 241 / .14), transparent 70%), var(--surface); box-shadow: var(--shadow); transform: rotate(2deg); }
.hero-art .brand-mark { width: min(100%, 18rem); height: auto; aspect-ratio: 1; border-radius: 2rem; box-shadow: 0 22px 48px rgb(79 70 229 / .28); }
.hero-art p { margin: 0; color: var(--muted); font-size: .85rem; letter-spacing: .08em; text-transform: uppercase; }
.eyebrow { margin: 0; color: var(--accent); font-size: .76rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
h1, h2, h3 { margin: 0; line-height: 1.08; }
h1 { max-width: 780px; margin-top: 1rem; font-size: clamp(2.7rem, 7vw, 5.8rem); letter-spacing: -.06em; }
.hero-copy { max-width: 680px; margin: 1.5rem 0 0; color: var(--muted); font-size: clamp(1.05rem, 2vw, 1.3rem); line-height: 1.75; }
.hero-actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 2rem; }
.lesson-page { width: min(1080px, calc(100% - 2rem)); margin: 0 auto; padding: clamp(3rem, 8vw, 6rem) 0; }
.lesson-page h1 { max-width: 800px; }
.lesson-page code { color: var(--accent-strong); }
.lesson-copy { max-width: 650px; margin: 1.5rem 0 2rem; color: var(--muted); font-size: 1.15rem; line-height: 1.75; }
.component-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; margin-top: 3rem; }
.button { display: inline-flex; align-items: center; justify-content: center; padding: .8rem 1rem; text-decoration: none; }
.button-primary { border-color: var(--accent); background: var(--accent); color: white; }
.button-secondary { background: var(--surface); color: var(--text); }
.principles { padding-block: 1rem 5rem; }
.principles h2 { margin-top: .65rem; font-size: clamp(1.8rem, 4vw, 3rem); letter-spacing: -.04em; }
.principle-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 2rem; }
.principle-card { padding: 1.35rem; border: 1px solid var(--border); border-radius: 1.2rem; background: var(--surface); box-shadow: var(--shadow); }
.card-number { color: var(--accent); font-size: .75rem; font-weight: 900; letter-spacing: .1em; }
.principle-card h3 { margin-top: 1.5rem; font-size: 1.2rem; }
.principle-card p { margin: .75rem 0 0; color: var(--muted); line-height: 1.65; }
@media (max-width: 760px) { .hero { grid-template-columns: 1fr; gap: 2.5rem; } .hero-art { max-width: 22rem; margin-inline: auto; transform: none; } }
@media (max-width: 720px) { .principle-grid, .component-grid { grid-template-columns: 1fr; } }
`;
}

function createStyleTemplate() {
  return `.vd-page,
.vd-card {
  padding: 2rem;
}
`;
}

function titleFromName(name: string) {
  return normalizeModuleName(name)
    .split("/")
    .at(-1)
    ?.replace(/\[|\]/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase())
    || "VeloDom";
}

function toIdentifier(name: string) {
  const normalized = name
    .replace(/^[^A-Za-z_$]+/, "")
    .replace(/[^A-Za-z0-9_$]+(.)?/g, (_match, next: string | undefined) => (
      next ? next.toUpperCase() : ""
    ));

  return normalized || "handler";
}

function indent(source: string, spaces: number) {
  const padding = " ".repeat(spaces);

  return source
    .split("\n")
    .map(line => `${padding}${line}`)
    .join("\n");
}

function relativePath(root: string, file: string) {
  return toPosix(relative(root, file));
}
