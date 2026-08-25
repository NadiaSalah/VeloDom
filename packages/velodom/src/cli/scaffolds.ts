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
  await writeNewFile(join(folder, "public", "velodom-mark.svg"), createProjectLogo());
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
  <header class="site-header">
    <a class="brand" href="/" vd-nav aria-label="VeloDom home">
      <vd-component name="brand-mark"></vd-component>
      <span>VeloDom</span>
    </a>
    <button class="theme-toggle" type="button" aria-label="Toggle color theme" vd-on:click="toggleTheme()">
      <span vd-text="themeIcon" aria-hidden="true"></span>
      <span vd-text="themeLabel"></span>
    </button>
  </header>

  <section class="hero" aria-labelledby="hero-title">
    <p class="eyebrow">HTML-first · compiler-first · vanilla friendly</p>
    <h1 id="hero-title">Build visible web apps from ordinary HTML.</h1>
    <p class="hero-copy">VeloDom keeps your pages close to the files you write, then adds routing, state, components, requests, and SEO only when your feature needs them.</p>
    <div class="hero-actions">
      <a class="button button-primary" href="#principles">Explore the model</a>
      <a class="button button-secondary" href="https://github.com/NadiaSalah/velodom">View on GitHub</a>
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

  <footer class="site-footer"><span>VeloDom starter project</span><span>Theme: <strong vd-text="theme"></strong></span></footer>
</main>
`;
}

function createProjectHomeScript() {
  return `export const state = {
  theme: "light",
  themeIcon: "☾",
  themeLabel: "Dark mode"
};

/** Connects the starter theme button to the page state. */
export function init({ state }) {
  state.toggleTheme = () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    state.themeIcon = state.theme === "dark" ? "☀" : "☾";
    state.themeLabel = state.theme === "dark" ? "Light mode" : "Dark mode";
    document.documentElement.dataset.theme = state.theme;
    localStorage.setItem("velodom-theme", state.theme);
  };
}

/** Restores the user's theme preference after the page mounts. */
export function mounted({ state }) {
  if (localStorage.getItem("velodom-theme") === "dark") state.toggleTheme();
}
`;
}

function createProjectHomeConfig() {
  return `export default {
  path: "/",
  seo: {
    title: "VeloDom | HTML-first frontend",
    description: "A small VeloDom starter project built with ordinary HTML, components, and reactive state."
  }
};
`;
}

function createProjectBrandComponent() {
  return `<span class="brand-mark" aria-hidden="true"><img src="/velodom-mark.svg" alt=""></span>\n`;
}

function createProjectLogo() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-labelledby="title">
  <title>VeloDom</title>
  <rect width="64" height="64" rx="18" fill="#111827"/>
  <path d="M13 19h10l9 24 9-24h10L38 51H26z" fill="#38bdf8"/>
  <path d="M18 19h8l6 16-4 9z" fill="#818cf8"/>
</svg>
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
  --text: #0f172a;
  --muted: #475569;
  --border: #dbe4f0;
  --accent: #4f46e5;
  --shadow: 0 24px 70px rgb(15 23 42 / .12);
}
:root[data-theme="dark"] { color-scheme: dark; --page: #0b1120; --surface: #111827; --text: #f8fafc; --muted: #cbd5e1; --border: #26354b; --accent: #818cf8; --shadow: 0 24px 70px rgb(2 6 23 / .45); }
* { box-sizing: border-box; }
body { margin: 0; background: var(--page); color: var(--text); transition: background 180ms ease, color 180ms ease; }
a { color: inherit; }
.home-page { min-height: 100vh; }
.site-header, .hero, .principles, .site-footer { width: min(1080px, calc(100% - 2rem)); margin-inline: auto; }
.site-header { display: flex; align-items: center; justify-content: space-between; padding-block: 1.25rem; }
.brand { display: inline-flex; align-items: center; gap: .65rem; font-size: 1.15rem; font-weight: 800; text-decoration: none; }
.brand-mark { display: inline-grid; width: 2.4rem; height: 2.4rem; place-items: center; border-radius: .75rem; overflow: hidden; box-shadow: 0 8px 20px rgb(79 70 229 / .24); }
.brand-mark img { display: block; width: 100%; height: 100%; }
.theme-toggle, .button { border: 1px solid var(--border); border-radius: .8rem; font: inherit; font-weight: 700; cursor: pointer; transition: transform 160ms ease, border-color 160ms ease; }
.theme-toggle { display: inline-flex; align-items: center; gap: .5rem; padding: .55rem .8rem; background: var(--surface); color: var(--text); }
.theme-toggle:hover, .button:hover { transform: translateY(-2px); border-color: var(--accent); }
.hero { padding-block: clamp(4rem, 12vw, 8rem) 5rem; }
.eyebrow { margin: 0; color: var(--accent); font-size: .76rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
h1, h2, h3 { margin: 0; line-height: 1.08; }
h1 { max-width: 780px; margin-top: 1rem; font-size: clamp(2.7rem, 7vw, 5.8rem); letter-spacing: -.06em; }
.hero-copy { max-width: 680px; margin: 1.5rem 0 0; color: var(--muted); font-size: clamp(1.05rem, 2vw, 1.3rem); line-height: 1.75; }
.hero-actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 2rem; }
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
.site-footer { display: flex; justify-content: space-between; gap: 1rem; padding-block: 1.5rem 2rem; border-top: 1px solid var(--border); color: var(--muted); font-size: .9rem; }
@media (max-width: 720px) { .principle-grid { grid-template-columns: 1fr; } .site-footer { flex-direction: column; } .theme-toggle span:last-child { display: none; } }
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
