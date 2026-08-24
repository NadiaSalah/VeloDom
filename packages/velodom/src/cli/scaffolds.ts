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
    createPageHtmlTemplate()
  );
  await writeNewFile(
    join(folder, "src", "pages", "home", "script.js"),
    createPageScriptTemplate("home")
  );
  await writeNewFile(
    join(folder, "src", "pages", "home", "config.js"),
    createPageConfigTemplate("home", "/")
  );
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

await mountVeloDom();
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
