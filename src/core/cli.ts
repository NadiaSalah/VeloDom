/**
 * ----------------------------------------
 * Module: VeloDom CLI
 * ----------------------------------------
 *
 * Provides local, static developer tooling for inspecting VeloDom projects
 * and scaffolding convention-first application files without adding browser
 * runtime cost.
 * ----------------------------------------
 */

import {
  mkdir,
  readFile,
  readdir,
  writeFile
} from "node:fs/promises";
import {
  dirname,
  extname,
  join,
  relative,
  resolve
} from "node:path";
import { pathToFileURL } from "node:url";
import { compileTemplate } from "./compiler/index.ts";

interface CliContext {
  cwd: string;
  stderr(message: string): void;
  stdout(message: string): void;
}

interface CliOptions {
  cwd?: string;
  stderr?: (message: string) => void;
  stdout?: (message: string) => void;
}

interface ParsedArgs {
  flags: Set<string>;
  options: Record<string, string>;
  values: string[];
}

interface DiscoveredModule {
  kind: "folder" | "single-file";
  name: string;
  route?: string;
  source: string;
}

interface ProjectInspection {
  apis: string[];
  compilerFeatures: string[];
  components: DiscoveredModule[];
  directiveUsage: Record<string, number>;
  layouts: DiscoveredModule[];
  middleware: string[];
  pages: DiscoveredModule[];
  requestRoutes: string[];
  seo: {
    pagesWithSeo: number;
    totalPages: number;
  };
  tests: string[];
}

const HELP = `VeloDom CLI

Usage:
  vd inspect [--json] [--root <dir>]
  vd stats [--json] [--root <dir>]
  vd routes [--json] [--root <dir>]
  vd create page <name> [--ts] [--single-file] [--root <dir>]
  vd create component <name> [--ts] [--single-file] [--root <dir>]
  vd create api <name> [--root <dir>]
  vd create demo <name> [--root <dir>]
  vd create middleware [--root <dir>]
  vd create plugin <name> [--root <dir>]
  create-velodom <project-name>

Examples:
  vd inspect
  vd stats --json
  vd create page blog/posts/[id] --ts
  vd create component shared/post-card --single-file
`;

/** Runs the VeloDom command-line interface and returns a process exit code. */
export async function runVeloDomCli(
  args: string[],
  options: CliOptions = {}
): Promise<number> {
  const parsed = parseArgs(args);
  const root = resolve(options.cwd || process.cwd(), parsed.options.root || ".");
  const context: CliContext = {
    cwd: root,
    stderr: options.stderr || (message => console.error(message)),
    stdout: options.stdout || (message => console.log(message))
  };
  const [command, ...values] = parsed.values;

  try {
    switch (command) {
      case undefined:
      case "help":
      case "--help":
      case "-h":
        context.stdout(HELP.trimEnd());
        return 0;
      case "inspect":
        await printInspection(context, parsed.flags.has("json"));
        return 0;
      case "stats":
        await printStats(context, parsed.flags.has("json"));
        return 0;
      case "routes":
        await printRoutes(context, parsed.flags.has("json"));
        return 0;
      case "create":
        await createResource(context, values, parsed.flags);
        return 0;
      default:
        context.stderr(`Unknown VeloDom command "${command}".`);
        context.stderr("Run vd help for available commands.");
        return 1;
    }
  } catch (error) {
    context.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

async function printInspection(context: CliContext, json: boolean) {
  const inspection = await inspectProject(context.cwd);

  if (json) {
    context.stdout(JSON.stringify(inspection, null, 2));
    return;
  }

  context.stdout("VeloDom project inspection");
  context.stdout("==========================");
  printModuleGroup(context, "Pages", inspection.pages);
  printModuleGroup(context, "Components", inspection.components);
  printModuleGroup(context, "Layouts", inspection.layouts);
  printList(context, "API files", inspection.apis);
  printList(context, "Request routes", inspection.requestRoutes);
  printList(context, "Middleware files", inspection.middleware);
  printList(context, "Compiler features", inspection.compilerFeatures);
}

async function printStats(context: CliContext, json: boolean) {
  const inspection = await inspectProject(context.cwd);
  const stats = {
    pages: inspection.pages.length,
    components: inspection.components.length,
    layouts: inspection.layouts.length,
    apiFiles: inspection.apis.length,
    compilerFeatures: inspection.compilerFeatures.length,
    middlewareFiles: inspection.middleware.length,
    requestRoutes: inspection.requestRoutes.length,
    seoCoverage: inspection.seo,
    testFiles: inspection.tests.length,
    directiveUsage: inspection.directiveUsage
  };

  if (json) {
    context.stdout(JSON.stringify(stats, null, 2));
    return;
  }

  context.stdout("VeloDom project stats");
  context.stdout("=====================");
  context.stdout(`Pages: ${stats.pages}`);
  context.stdout(`Components: ${stats.components}`);
  context.stdout(`Layouts: ${stats.layouts}`);
  context.stdout(`API files: ${stats.apiFiles}`);
  context.stdout(`Request routes: ${stats.requestRoutes}`);
  context.stdout(`Middleware files: ${stats.middlewareFiles}`);
  context.stdout(`Compiler features: ${stats.compilerFeatures}`);
  context.stdout(`SEO coverage: ${stats.seoCoverage.pagesWithSeo}/${stats.seoCoverage.totalPages}`);
  context.stdout(`Test files: ${stats.testFiles}`);
  context.stdout("Directive usage:");
  Object.entries(stats.directiveUsage)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([name, count]) => {
      context.stdout(`  - ${name}: ${count}`);
    });
}

async function printRoutes(context: CliContext, json: boolean) {
  const inspection = await inspectProject(context.cwd);
  const routes = inspection.pages.map(page => ({
    name: page.name,
    path: page.route || toRoutePath(page.name),
    source: page.source,
    kind: page.kind
  }));

  if (json) {
    context.stdout(JSON.stringify(routes, null, 2));
    return;
  }

  context.stdout("VeloDom routes");
  context.stdout("==============");
  routes.forEach(route => {
    context.stdout(
      `  - ${route.path} (${route.name}, ${route.kind}) -> ${route.source}`
    );
  });
}

async function inspectProject(root: string): Promise<ProjectInspection> {
  const pages = await discoverModules(root, "src/pages", true);
  const components = await discoverModules(root, "src/components", false);
  const layouts = await discoverModules(root, "src/layouts", false);
  const apis = await discoverFiles(root, "src/api", [".js", ".ts"]);
  const requestRoutes = await discoverRequestRoutes(root);
  const middleware = apis.filter(file => (
    /(^|\/)middleware\.(?:js|ts)$/.test(file)
  ));
  const templateSources = [
    ...pages,
    ...components,
    ...layouts
  ].map(module => module.source);

  return {
    apis,
    compilerFeatures: await discoverCompilerFeatures(root, templateSources),
    components,
    directiveUsage: await countDirectives(root, templateSources),
    layouts,
    middleware,
    pages,
    requestRoutes,
    seo: await discoverSeoCoverage(root, pages),
    tests: await discoverFiles(root, "test", [".js", ".ts"])
  };
}

async function discoverModules(
  root: string,
  directory: string,
  includeRoutes: boolean
) {
  const folderFiles = await discoverFiles(root, directory, [".html"]);
  const singleFiles = await discoverFiles(root, directory, [".vd"]);
  const folderModules = await Promise.all(folderFiles
    .filter(file => file.endsWith("/index.html"))
    .map(async file => {
      const name = normalizeModuleName(dirname(file).slice(directory.length + 1));

      return {
        kind: "folder" as const,
        name,
        route: includeRoutes
          ? await readRouteOverride(root, dirname(file), name)
          : undefined,
        source: file
      };
    }));
  const singleModules = await Promise.all(singleFiles.map(async file => {
    const name = normalizeModuleName(
      file.slice(directory.length + 1, -extname(file).length)
    );

    return {
      kind: "single-file" as const,
      name,
      route: includeRoutes
        ? await readSingleFileRouteOverride(root, file, name)
        : undefined,
      source: file
    };
  }));
  const resolved = [
    folderModules,
    singleModules
  ];

  return resolved.flat().sort((left, right) => (
    left.name.localeCompare(right.name)
  ));
}

async function readRouteOverride(
  root: string,
  folder: string,
  name: string
) {
  const config = await readOptionalText(join(root, folder, "config.js"))
    || await readOptionalText(join(root, folder, "page.config.js"));

  return readStaticPath(config) || toRoutePath(name);
}

async function readSingleFileRouteOverride(
  root: string,
  file: string,
  name: string
) {
  const source = await readOptionalText(join(root, file));
  const config = source.match(/<config\b[^>]*>([\s\S]*?)<\/config>/i)?.[1]
    || "";

  return readStaticPath(config) || toRoutePath(name);
}

async function countDirectives(
  root: string,
  files: string[]
) {
  const usage: Record<string, number> = {};

  await Promise.all(files.map(async file => {
    const source = await readOptionalText(join(root, file));

    for (const match of source.matchAll(/\b(?:data-)?vd-[\w:-]+/g)) {
      usage[match[0]] = (usage[match[0]] || 0) + 1;
    }
  }));

  return usage;
}

async function discoverCompilerFeatures(
  root: string,
  files: string[]
) {
  const features = new Set<string>();

  await Promise.all(files.map(async file => {
    const source = await readOptionalText(join(root, file));
    const template = file.endsWith(".vd")
      ? source.match(/<template\b[^>]*>([\s\S]*?)<\/template>/i)?.[1] || ""
      : source;

    try {
      compileTemplate(template, {
        filename: file,
        mode: "production"
      }).manifest.features.forEach(feature => features.add(feature));
    } catch {
      // Inspection stays non-blocking; vd doctor can own hard diagnostics.
    }
  }));

  return [...features].sort();
}

async function discoverRequestRoutes(root: string) {
  const routeFiles = [
    "src/api/routes.js",
    "src/api/routes.ts"
  ];
  const routes = new Set<string>();

  await Promise.all(routeFiles.map(async file => {
    const source = await readOptionalText(join(root, file));

    for (const match of source.matchAll(/["']([^"']+)["']\s*:/g)) {
      routes.add(match[1]);
    }
  }));

  return [...routes].sort();
}

async function discoverSeoCoverage(
  root: string,
  pages: DiscoveredModule[]
) {
  const results = await Promise.all(pages.map(async page => {
    const source = page.source.endsWith(".vd")
      ? await readOptionalText(join(root, page.source))
      : await readOptionalText(
        join(root, dirname(page.source), "config.js")
      ) || await readOptionalText(
        join(root, dirname(page.source), "page.config.js")
      );

    return /\bseo\s*:/.test(source);
  }));

  return {
    pagesWithSeo: results.filter(Boolean).length,
    totalPages: pages.length
  };
}

async function createResource(
  context: CliContext,
  values: string[],
  flags: Set<string>
) {
  const [type, rawName] = values;

  switch (type) {
    case "page":
      await createPage(context, requireName(rawName, "page"), flags);
      break;
    case "component":
      await createComponent(context, requireName(rawName, "component"), flags);
      break;
    case "api":
      await createApi(context, requireName(rawName, "api"), flags);
      break;
    case "demo":
      await createDemo(context, requireName(rawName, "demo"));
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
        "Use vd create page|component|api|middleware|plugin|project."
      );
  }
}

async function createPage(
  context: CliContext,
  name: string,
  flags: Set<string>
) {
  if (flags.has("single-file")) {
    const file = join(context.cwd, "src", "pages", `${safeName(name)}.vd`);

    await writeNewFile(file, createSingleFilePageTemplate(name));
    context.stdout(`Created page ${relativePath(context.cwd, file)}`);
    return;
  }

  const folder = join(context.cwd, "src", "pages", safeName(name));
  const scriptName = flags.has("ts") ? "script.ts" : "script.js";

  await writeNewFile(join(folder, "index.html"), createPageHtmlTemplate(name));
  await writeNewFile(join(folder, scriptName), createPageScriptTemplate(name));
  await writeNewFile(join(folder, "style.css"), createStyleTemplate());
  await writeNewFile(join(folder, "config.js"), createPageConfigTemplate(name));
  context.stdout(`Created page ${relativePath(context.cwd, folder)}`);
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

  await writeNewFile(join(folder, "index.html"), createComponentHtmlTemplate(name));
  await writeNewFile(join(folder, scriptName), createComponentScriptTemplate(name));
  await writeNewFile(join(folder, "style.css"), createStyleTemplate());
  context.stdout(`Created component ${relativePath(context.cwd, folder)}`);
}

async function createApi(
  context: CliContext,
  name: string,
  _flags: Set<string>
) {
  const file = join(context.cwd, "src", "api", `${safeName(name)}.js`);

  await writeNewFile(file, createApiTemplate(name));
  context.stdout(`Created API file ${relativePath(context.cwd, file)}`);
}

async function createDemo(context: CliContext, name: string) {
  const folder = join(context.cwd, "src", "pages", safeName(name));

  await writeNewFile(join(folder, "index.html"), createDemoHtmlTemplate(name));
  await writeNewFile(join(folder, "script.js"), createDemoScriptTemplate(name));
  await writeNewFile(join(folder, "style.css"), createStyleTemplate());
  await writeNewFile(join(folder, "config.js"), createPageConfigTemplate(name));
  context.stdout(`Created demo page ${relativePath(context.cwd, folder)}`);
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
  await writeNewFile(join(folder, "index.html"), createProjectShell());
  await writeNewFile(join(folder, "src", "main.js"), createProjectMain());
  await writeNewFile(join(folder, "src", "pages", "home", "index.html"), createPageHtmlTemplate("home"));
  await writeNewFile(join(folder, "src", "pages", "home", "script.js"), createPageScriptTemplate("home"));
  await writeNewFile(join(folder, "src", "pages", "home", "config.js"), createPageConfigTemplate("home", "/"));
  context.stdout(`Created VeloDom project ${relativePath(context.cwd, folder)}`);
}

async function discoverFiles(
  root: string,
  directory: string,
  extensions: string[]
) {
  const absolute = join(root, directory);
  const files = await collectFiles(absolute, extensions);

  return files.map(file => toPosix(relative(root, file))).sort();
}

async function collectFiles(
  directory: string,
  extensions: string[]
): Promise<string[]> {
  try {
    const entries = await readdir(directory, {
      withFileTypes: true
    });
    const nested = await Promise.all(entries.map(entry => {
      const absolute = join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectFiles(absolute, extensions);
      }

      return entry.isFile() && extensions.includes(extname(entry.name))
        ? [absolute]
        : [];
    }));

    return nested.flat();
  } catch {
    return [];
  }
}

async function readOptionalText(file: string) {
  try {
    return await readFile(file, "utf8");
  } catch {
    return "";
  }
}

async function writeNewFile(file: string, source: string) {
  await mkdir(dirname(file), {
    recursive: true
  });
  await writeFile(file, source, {
    flag: "wx"
  });
}

function parseArgs(args: string[]): ParsedArgs {
  const flags = new Set<string>();
  const options: Record<string, string> = {};
  const values: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg.startsWith("--")) {
      values.push(arg);
      continue;
    }

    const name = arg.slice(2);

    if (name === "root") {
      const value = args[index + 1];

      if (!value || value.startsWith("--")) {
        throw new Error("--root requires a directory value.");
      }

      options.root = value;
      index += 1;
      continue;
    }

    flags.add(name);
  }

  return {
    flags,
    options,
    values
  };
}

function printModuleGroup(
  context: CliContext,
  title: string,
  modules: DiscoveredModule[]
) {
  context.stdout(`${title}: ${modules.length}`);
  modules.forEach(module => {
    const route = module.route ? ` -> ${module.route}` : "";

    context.stdout(`  - ${module.name} (${module.kind})${route}`);
  });
}

function printList(context: CliContext, title: string, values: string[]) {
  context.stdout(`${title}: ${values.length}`);
  values.forEach(value => context.stdout(`  - ${value}`));
}

function readStaticPath(source: string) {
  return source.match(/\bpath\s*:\s*["']([^"']+)["']/)?.[1] || "";
}

function toRoutePath(name: string) {
  const route = name === "home"
    ? "/"
    : `/${name}`;

  return route.replace(/\[([^\]]+)\]/g, ":$1");
}

function normalizeModuleName(name: string) {
  return toPosix(name).replace(/^\/+|\/+$/g, "") || "index";
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

function requireName(
  value: string | undefined,
  label: string
) {
  if (!value) {
    throw new Error(`Missing ${label} name.`);
  }

  return value;
}

function createPageHtmlTemplate(_name: string) {
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
    "export function init({ state }) {",
    `  state.title = "${title}";`,
    "  state.description = \"Edit this page from its script file.\";",
    "}",
    ""
  ].join("\n");
}

function createPageConfigTemplate(
  name: string,
  route: string = toRoutePath(normalizeModuleName(name))
) {
  const title = titleFromName(name);

  return `export default {
  path: "${route}",
  seo: {
    title: "${title}",
    description: "A VeloDom page generated by the CLI."
  }
};
`;
}

function createSingleFilePageTemplate(name: string) {
  return `<template>
${indent(createPageHtmlTemplate(name).trimEnd(), 2)}
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

function createComponentHtmlTemplate(_name: string) {
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
${indent(createComponentHtmlTemplate(name).trimEnd(), 2)}
</template>

<script>
${createComponentScriptTemplate(name).trimEnd()}
</script>

<style>
${createStyleTemplate().trimEnd()}
</style>
`;
}

function createDemoHtmlTemplate(_name: string) {
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
    dependencies: {
      velodom: "^0.1.0"
    },
    devDependencies: {
      vite: "^8.1.3"
    }
  }, null, 2)}
`;
}

function createProjectShell() {
  return `<div id="app"></div>
<script type="module" src="/src/main.js"></script>
`;
}

function createProjectMain() {
  return `import { createApp } from "velodom";
import { createViteAdapter } from "velodom/vite";

createApp({
  adapter: createViteAdapter()
}).mount("#app");
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

function toPosix(value: string) {
  return value.replaceAll("\\", "/");
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  process.exitCode = await runVeloDomCli(process.argv.slice(2));
}
