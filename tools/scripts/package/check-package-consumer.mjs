/**
 * ----------------------------------------
 * Module: Installed Package Consumer Audit
 * ----------------------------------------
 *
 * Packs VeloDom, installs the tarball into an isolated fixture, type-checks
 * consumer TypeScript, and builds the consumer through the installed package.
 * ----------------------------------------
 */

import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  join,
  resolve,
  sep
} from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { Window } from "happy-dom";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../../..", import.meta.url))
);
const packageRoot = join(workspaceRoot, "packages", "velodom");
const temporaryRoot = await mkdtemp(
  join(tmpdir(), "velodom-package-consumer-")
);
const consumerRoot = join(temporaryRoot, "consumer");
const artifactsRoot = join(temporaryRoot, "artifacts");
const cacheRoot = join(temporaryRoot, "npm-cache");
const npmCommand = process.platform === "win32"
  ? process.execPath
  : "npm";
const npmArguments = process.platform === "win32"
  ? [
    join(
      dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js"
    )
  ]
  : [];

try {
  await cp(
    join(workspaceRoot, "tools", "test-fixtures", "package-consumer"),
    consumerRoot,
    {
      recursive: true
    }
  );
  const consumerManifestPath = join(consumerRoot, "package.json");
  const consumerManifest = JSON.parse(
    await readFile(consumerManifestPath, "utf8")
  );

  // Keep the copied install network-independent; root tooling runs the checks.
  consumerManifest.dependencies = {};
  consumerManifest.devDependencies = {};
  await writeFile(
    consumerManifestPath,
    `${JSON.stringify(consumerManifest, null, 2)}\n`
  );
  await mkdir(artifactsRoot, {
    recursive: true
  });

  const packOutput = await run(npmCommand, [
    ...npmArguments,
    "pack",
    "--ignore-scripts",
    "--pack-destination",
    artifactsRoot
  ], {
    cwd: packageRoot,
    env: {
      ...process.env,
      npm_config_dry_run: "false",
      npm_config_cache: cacheRoot
    }
  });
  const tarballName = packOutput
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .at(-1);

  if (!tarballName) {
    throw new Error("npm pack did not return a tarball filename");
  }

  const tarballPath = join(artifactsRoot, basename(tarballName));

  await access(tarballPath);
  await run(npmCommand, [
    ...npmArguments,
    "install",
    tarballPath,
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--no-package-lock",
    "--offline",
    "--omit=dev"
  ], {
    cwd: consumerRoot,
    env: {
      ...process.env,
      npm_config_cache: cacheRoot
    }
  });

  await run(process.execPath, [
    join(workspaceRoot, "node_modules", "typescript", "bin", "tsc"),
    "--project",
    join(consumerRoot, "tsconfig.json"),
    "--noEmit"
  ], {
    cwd: consumerRoot
  });
  await run(process.execPath, [
    join(workspaceRoot, "node_modules", "vite", "bin", "vite.js"),
    "build"
  ], {
    cwd: consumerRoot
  });

  const builtHtml = await readFile(
    join(consumerRoot, "dist", "index.html"),
    "utf8"
  );

  if (!builtHtml.includes("assets/")) {
    throw new Error("Consumer build did not emit an application asset");
  }

  if (
    !builtHtml.includes("Installed VeloDom Package")
    || !builtHtml.includes("data-vd-seo-fallback")
    || !builtHtml.includes(
      "This HTML was statically enriched by the installed VeloDom package."
    )
  ) {
    throw new Error(
      "Consumer build did not render SEO from page config.js"
    );
  }

  const builtAssets = await readJavaScriptAssets(
    join(consumerRoot, "dist", "assets")
  );

  if (
    !builtAssets.includes("Installed package works")
    || !builtAssets.includes(
      "This page was built from the installed VeloDom package."
    )
  ) {
    throw new Error(
      "Consumer build did not discover and compile the fixture page"
    );
  }

  const installedPackageRoot = join(
    consumerRoot,
    "node_modules",
    "velodom"
  );

  for (const file of [
    "AI_CONTEXT.md",
    "docs/QUICK_START.md",
    "docs/SYNTAX_REFERENCE.md",
    "docs/FEATURE_INVENTORY.md",
    "docs/AI_GUIDE.md",
    "templates/default/AGENTS.md"
  ]) {
    await access(join(installedPackageRoot, file));
  }
  await assertInstalledRequestTools(consumerRoot);
  await assertInstalledPageData(consumerRoot);

  const starterCases = [
    {
      args: ["--template", "minimal", "--javascript"],
      name: "minimal-javascript"
    },
    {
      args: ["--template", "minimal", "--typescript", "--tailwind"],
      name: "minimal-typescript-tailwind",
      typecheck: true
    },
    {
      args: ["--template", "blog", "--javascript", "--test-unit"],
      name: "blog-javascript",
      testUnit: true
    },
    {
      args: ["--template", "empty", "--javascript"],
      name: "empty-javascript"
    },
    {
      args: ["--template", "empty", "--typescript"],
      name: "empty-typescript",
      typecheck: true
    },
    {
      args: [
        "--template", "blog", "--typescript", "--tailwind", "--i18n",
        "--pwa", "--test-all"
      ],
      expectedFiles: [
        "src/i18n.ts",
        "src/pwa.ts",
        "src/pages/localization/index.html",
        "public/offline.html",
        "public/velodom-pwa-icon.svg",
        "tests/e2e/home.spec.ts",
        "tests/unit/project.test.js",
        "playwright.config.js"
      ],
      name: "blog-typescript-full",
      testUnit: true,
      typecheck: true
    }
  ];
  const starterBuilds = [];

  for (const starterCase of starterCases) {
    const starterRoot = join(temporaryRoot, starterCase.name);

    await run(process.execPath, [
      join(installedPackageRoot, "bin", "create-velodom.js"),
      starterCase.name,
      ...starterCase.args,
      "--no-eslint",
      "--no-prettier",
      "--no-install",
      "--no-git"
    ], {
      cwd: temporaryRoot
    });

    if (starterCase.name === "minimal-javascript") {
      await applyBeginnerJourney(starterRoot, installedPackageRoot);
    }

    const starterSource = await readProjectText(starterRoot);

    for (const forbidden of [
      "workspace:",
      "../../packages/velodom",
      "packages/velodom/src",
      "velodom/lib/"
    ]) {
      if (starterSource.includes(forbidden)) {
        throw new Error(
          `${starterCase.name} contains forbidden reference: ${forbidden}`
        );
      }
    }

    for (const file of starterCase.expectedFiles || []) {
      await access(join(starterRoot, file));
    }

    await linkStarterDependencies(starterRoot, installedPackageRoot);

    if (starterCase.typecheck) {
      await run(process.execPath, [
        join(workspaceRoot, "node_modules", "typescript", "bin", "tsc"),
        "--noEmit",
        "--project",
        join(starterRoot, "tsconfig.json")
      ], { cwd: starterRoot });
    }

    if (starterCase.testUnit) {
      await run(process.execPath, [
        "--test",
        join(starterRoot, "tests", "unit", "project.test.js")
      ], { cwd: starterRoot });
    }

    await run(process.execPath, [
      join(workspaceRoot, "node_modules", "vite", "bin", "vite.js"),
      "build"
    ], {
      cwd: starterRoot
    });
    await access(join(starterRoot, "dist", "index.html"));
    if (starterCase.name === "minimal-javascript") {
      await assertBeginnerProductionOutput(starterRoot);
    }
    const buildStats = await readStarterBuildStats(starterRoot);

    if (buildStats.totalJavaScriptBytes > 192 * 1024) {
      throw new Error(
        `${starterCase.name} JavaScript exceeds 192 KiB: ${buildStats.totalJavaScriptBytes} bytes`
      );
    }
    if (buildStats.largestJavaScriptBytes > 128 * 1024) {
      throw new Error(
        `${starterCase.name} largest chunk exceeds 128 KiB: ${buildStats.largestJavaScriptBytes} bytes`
      );
    }
    starterBuilds.push({
      name: starterCase.name,
      ...buildStats
    });
    if (starterCase.args.includes("--pwa")) {
      for (const file of [
        "manifest.webmanifest",
        "offline.html",
        "velodom-pwa-register.js",
        "velodom-sw.js"
      ]) {
        await access(join(starterRoot, "dist", file));
      }
    }
  }

  console.log("Generated starter compatibility matrix");
  starterBuilds.forEach(result => {
    console.log(
      `- ${result.name}: ${formatKilobytes(result.totalJavaScriptBytes)} total JS, ${formatKilobytes(result.largestJavaScriptBytes)} largest chunk`
    );
  });
  await assertReferenceConsumers(temporaryRoot, installedPackageRoot);
  console.log(
    "Installed package, generated starters, and reference consumers passed."
  );
} finally {
  if (process.env.VELODOM_KEEP_CONSUMER !== "1") {
    assertSafeTemporaryRoot(temporaryRoot);
    await rm(temporaryRoot, {
      recursive: true,
      force: true
    });
  } else {
    console.log(`Consumer fixture kept at ${temporaryRoot}`);
  }
}

async function linkStarterDependencies(starterRoot, installedPackageRoot) {
  const starterModules = join(starterRoot, "node_modules");
  const linkType = process.platform === "win32" ? "junction" : "dir";

  await mkdir(starterModules, { recursive: true });
  for (const name of ["velodom", "vite", "typescript", "tailwindcss", "daisyui"]) {
    const source = name === "velodom"
      ? installedPackageRoot
      : join(workspaceRoot, "node_modules", name);

    try {
      await access(source);
      if (name === "velodom") {
        await cp(source, join(starterModules, name), { recursive: true });
      } else {
        await symlink(source, join(starterModules, name), linkType);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  for (const scope of ["@playwright", "@tailwindcss", "@types"]) {
    const source = join(workspaceRoot, "node_modules", scope);

    await access(source);
    await symlink(source, join(starterModules, scope), linkType);
  }
}

async function assertReferenceConsumers(temporaryRoot, installedPackageRoot) {
  const cases = [
    { name: "velodom-blog", routes: ["/", "/features", "/reference", "/playground"] },
    { name: "velodom-store", routes: ["/", "/products/:id", "/sign-in", "/admin/products/:id/edit"] }
  ];

  for (const example of cases) {
    const sourceRoot = join(workspaceRoot, "examples", example.name);
    const projectRoot = join(temporaryRoot, example.name);

    // Copy authored files, not workspace dependencies or previous build output.
    await cp(sourceRoot, projectRoot, {
      recursive: true,
      filter: path => !["node_modules", "dist", ".vite", ".velodom"].includes(basename(path))
    });
    await assertPublicImports(projectRoot);
    await linkStarterDependencies(projectRoot, installedPackageRoot);

    const cli = join(projectRoot, "node_modules", "velodom", "bin", "vd.js");
    const inspect = await runProjectAnalysis(cli, "inspect", projectRoot);
    const routes = await runProjectAnalysis(cli, "routes", projectRoot);
    const doctor = await runProjectAnalysis(cli, "doctor", projectRoot);

    if (!doctor.ok || doctor.issues.some(issue => issue.level === "error")) {
      throw new Error(`${example.name} installed doctor reports errors: ${JSON.stringify(doctor.issues)}`);
    }
    for (const path of example.routes) {
      if (!routes.some(route => route.path === path)) {
        throw new Error(`${example.name} installed route explorer missed ${path}`);
      }
    }
    for (const resource of [...inspect.pages, ...inspect.components, ...inspect.layouts]) {
      if (!/^src\/(?:pages|components|layouts)\//.test(resource.source)) {
        throw new Error(`Application helper was incorrectly discovered: ${resource.source}`);
      }
    }
    if (example.name === "velodom-store") {
      await assertStoreContracts(projectRoot);
    }
    await run(process.execPath, [
      join(workspaceRoot, "node_modules", "vite", "bin", "vite.js"), "build"
    ], { cwd: projectRoot });
    await access(join(projectRoot, "dist", "index.html"));
    const output = await readJavaScriptAssets(join(projectRoot, "dist", "assets"));

    if (output.includes("velodom-store-server-fixture-secret-not-for-browser")) {
      throw new Error("Store backend signing material entered a browser asset");
    }
    console.log(`- installed ${example.name}: ${routes.length} routes; inspect/doctor/build passed (${doctor.issues.length} advisory findings)`);
  }
}

async function assertInstalledPageData(consumerRoot) {
  const path = join(consumerRoot, "page-data-smoke.mjs");
  const domHelper = pathToFileURL(join(workspaceRoot, "tools", "test-support", "dom.js")).href;
  await writeFile(path, `
import assert from "node:assert/strict";
import { createApp } from "velodom";
import { installDom } from ${JSON.stringify(domHelper)};
const removeDom = installDom();
const originalNow = Date.now;
let now = 0;
let calls = 0;
Date.now = () => now;
document.body.innerHTML = '<div id="app"></div>';
const data = {
  cache: { maxAgeMs: 10, staleWhileRevalidateMs: 20 },
  load() {
    if (++calls === 2) throw new Error("background read failed");
    return { title: "Article " + calls };
  }
};
const app = createApp({ adapter: { pages: {
  html: { home: async () => '<h1 data-vd-text="data.title"></h1>' },
  data: { home: async () => data }
} } });
try {
  await app.mount();
  assert.equal(document.querySelector("h1").textContent, "Article 1");
  now = 20;
  await app.navigate("/");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(document.querySelector("h1").textContent, "Article 1");
  assert.equal(calls, 2);
  now = 31;
  await app.navigate("/");
  assert.equal(document.querySelector("h1").textContent, "Article 3");
  await app.destroy();
  let finish;
  let started;
  let signal;
  const waiting = new Promise(resolve => { started = resolve; });
  const read = new Promise(resolve => { finish = resolve; });
  const navigationApp = createApp({ adapter: { pages: {
    html: {
      home: async () => '<h1>Home</h1>',
      slow: async () => '<h1 data-vd-text="data.title"></h1>',
      fast: async () => '<h1>Latest page</h1>'
    },
    data: { slow: async () => ({ load(context) {
      signal = context.signal; started(); return read;
    } }) }
  } } });
  try {
    await navigationApp.mount();
    const pending = navigationApp.navigate("/slow");
    await waiting;
    await navigationApp.navigate("/fast");
    assert.equal(await pending, false);
    assert.equal(signal.aborted, true);
    finish({ title: "Obsolete page" });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(document.querySelector("h1").textContent, "Latest page");
  } finally { await navigationApp.destroy(); }
} finally {
  await app.destroy();
  Date.now = originalNow;
  removeDom();
}
`);
  await run(process.execPath, [path], { cwd: consumerRoot });
}

async function assertInstalledRequestTools(consumerRoot) {
  const path = join(consumerRoot, "cache-smoke.mjs");
  await writeFile(path, `
import assert from "node:assert/strict";
import { createRequestCache, withRequestRetry } from "velodom";
let finish;
let calls = 0;
globalThis.fetch = () => {
  calls++;
  return new Promise(resolve => { finish = resolve; });
};
const cache = createRequestCache({ ttlMs: 5000, maxEntries: 2, scope: "public" });
const first = cache.requestJson("https://fixture.test/catalog");
const second = cache.requestJson("https://fixture.test/catalog");
assert.equal(calls, 1);
cache.clear("GET https://fixture.test/catalog");
finish(new Response('{"revision":1}'));
assert.deepEqual(await first, { revision: 1 });
assert.deepEqual(await second, { revision: 1 });
assert.equal(cache.size, 0);
let attempts = 0;
const controller = new AbortController();
controller.abort();
const retry = withRequestRetry(() => { attempts++; return "unexpected"; });
await assert.rejects(retry({}, { signal: controller.signal }), { name: "AbortError" });
assert.equal(attempts, 0);
const delayedController = new AbortController();
const delayed = withRequestRetry(() => {
  attempts++;
  throw new Error("temporary");
}, {
  delayMs: 1000,
  shouldRetry() { delayedController.abort(); return true; }
});
await assert.rejects(delayed({}, { signal: delayedController.signal }), { name: "AbortError" });
assert.equal(attempts, 1);
`);
  await run(process.execPath, [path], { cwd: consumerRoot });
}

async function runProjectAnalysis(cli, command, projectRoot) {
  return JSON.parse(await run(process.execPath, [
    cli, command, "--root", projectRoot, "--json", "--no-logo"
  ], { cwd: projectRoot }));
}

async function assertPublicImports(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      await assertPublicImports(path);
    } else if (/\.(?:js|ts|vd)$/.test(entry.name)) {
      const source = await readFile(path, "utf8");
      // Teaching text may name forbidden paths; only actual imports are checked.
      const imports = source.matchAll(/\b(?:from\s*|import\s*\(?\s*)["']([^"']+)["']/g);

      for (const [, specifier] of imports) {
        if (/^velodom\/(?:lib|src|types)\//.test(specifier) || /(?:^|\/)packages\/velodom\//.test(specifier)) {
          throw new Error(`Reference consumer imports package internals: ${path}: ${specifier}`);
        }
      }
    }
  }
}

async function assertStoreContracts(projectRoot) {
  const fixtureRoot = join(projectRoot, "contract-check");
  await mkdir(fixtureRoot);
  await writeFile(join(fixtureRoot, "consumer.ts"), `
import type { CartLine, CreateOrderInput, StoreQuote, StoreOrder } from "../src/domain/backend/contracts.js";
import { createOrderFromServer, getStoreSession, quoteCartFromServer } from "../src/domain/backend/store-api-client.js";
const lines: CartLine[] = [{ productId: "aurora-lamp", variantId: "midnight", quantity: 1 }];
const quote: StoreQuote = await quoteCartFromServer({ lines }, { signal: new AbortController().signal });
const input: CreateOrderInput = { lines, currency: quote.currency, expectedTotalCents: quote.totalCents, idempotencyKey: "intent-1234" };
const order: StoreOrder = await createOrderFromServer(input);
const session = await getStoreSession();
if (session.authenticated) session.user.tenantId.toUpperCase();
// @ts-expect-error Wire quantities must be numbers, even in JS callers with JSDoc.
quoteCartFromServer({ lines: [{ productId: "aurora-lamp", variantId: "midnight", quantity: "1" }] });
// @ts-expect-error The mock contract never represents a completed payment.
const payment: "charged" = order.paymentStatus;
void payment;
`);
  const handbook = await readFile(join(workspaceRoot, "docs", "README.md"), "utf8");
  const lesson = handbook.split("### JavaScript first, optional typed contracts")[1]
    ?.split("### Configuration and environments")[0];
  const snippets = [...(lesson || "").matchAll(/```(js|ts)\r?\n([\s\S]*?)```/g)];

  if (snippets.length !== 2) {
    throw new Error("The organization lesson must retain checked JS and TS examples");
  }
  for (const [, language, code] of snippets) {
    await writeFile(join(fixtureRoot, `lesson.${language}`), code);
  }
  await writeFile(join(fixtureRoot, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      allowJs: true, checkJs: true, strict: true, noEmit: true,
      module: "ESNext", moduleResolution: "Bundler", target: "ES2022",
      lib: ["ES2022", "DOM", "DOM.Iterable"], types: []
    },
    include: ["consumer.ts", "lesson.js", "lesson.ts"]
  }));
  await run(process.execPath, [
    join(workspaceRoot, "node_modules", "typescript", "bin", "tsc"),
    "--project", join(fixtureRoot, "tsconfig.json")
  ], { cwd: projectRoot });
}

async function applyBeginnerJourney(starterRoot, installedPackageRoot) {
  await run(process.execPath, [
    join(installedPackageRoot, "bin", "vd.js"),
    "create",
    "component",
    "welcome-note",
    "--root",
    starterRoot
  ], { cwd: starterRoot });

  const lesson = await readBeginnerJourney();
  const page = lesson.html.replace(
    "</main>",
    `  <vd-component
    name="welcome-note"
    vd-prop-title="Ready to build"
  ></vd-component>
</main>`
  );

  await writeFile(
    join(starterRoot, "src", "pages", "home", "index.html"),
    `${page.trim()}\n`
  );
  await writeFile(
    join(starterRoot, "src", "pages", "home", "script.js"),
    `${lesson.script.trim()}\n`
  );

  await access(join(
    starterRoot,
    "src",
    "components",
    "welcome-note",
    "index.html"
  ));
}

async function readBeginnerJourney() {
  const source = await readFile(join(
    workspaceRoot,
    "examples",
    "velodom-blog",
    "src",
    "pages",
    "home",
    "index.html"
  ), "utf8");
  const window = new Window();
  window.document.body.innerHTML = source;
  const snippets = [...window.document.querySelectorAll(
    'section[aria-labelledby="first-feature"] pre[vd-pre] code'
  )].map(node => node.textContent);

  await window.close();
  if (snippets.length !== 2 || snippets.some(snippet => !snippet.trim())) {
    throw new Error("The copy-to-project beginner lesson must contain HTML and script snippets");
  }

  return {
    html: snippets[0],
    script: snippets[1]
  };
}

async function assertBeginnerProductionOutput(starterRoot) {
  await access(join(starterRoot, "dist", "velodom-favicon.svg"));
  const output = await readProjectText(join(starterRoot, "dist"));

  if (
    /\b(?:src|href)=["']\/src\//.test(output)
    || /url\((?:["'])?\/src\//.test(output)
  ) {
    throw new Error("Beginner production output retained a source-only asset URL");
  }
  for (const expected of ["Ready to build", "vd-card"]) {
    if (!output.includes(expected)) {
      throw new Error(`Beginner production output is missing ${JSON.stringify(expected)}`);
    }
  }
}

async function readJavaScriptAssets(directory) {
  const entries = await readdir(directory, {
    withFileTypes: true
  });
  const sources = await Promise.all(
    entries
      .filter(entry => entry.isFile() && entry.name.endsWith(".js"))
      .map(entry => readFile(join(directory, entry.name), "utf8"))
  );

  return sources.join("\n");
}

async function readStarterBuildStats(starterRoot) {
  const assetsRoot = join(starterRoot, "dist", "assets");
  const files = await readdir(assetsRoot, { withFileTypes: true });
  const sizes = await Promise.all(files
    .filter(entry => entry.isFile() && entry.name.endsWith(".js"))
    .map(async entry => (await stat(join(assetsRoot, entry.name))).size));

  return {
    largestJavaScriptBytes: Math.max(0, ...sizes),
    totalJavaScriptBytes: sizes.reduce((total, size) => total + size, 0)
  };
}

function formatKilobytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

async function readProjectText(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const sources = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return entry.name === "node_modules" ? "" : readProjectText(path);
    }

    if (!entry.isFile() || !/\.(?:html|js|json|md|ts|vd|css)$/.test(entry.name)) {
      return "";
    }

    return readFile(path, "utf8");
  }));

  return sources.join("\n");
}

function assertSafeTemporaryRoot(directory) {
  const resolvedTemp = resolve(tmpdir());
  const resolvedDirectory = resolve(directory);

  if (
    !resolvedDirectory.startsWith(`${resolvedTemp}${sep}`)
    || !basename(resolvedDirectory).startsWith(
      "velodom-package-consumer-"
    )
  ) {
    throw new Error(
      `Refusing to remove unexpected consumer directory: ${resolvedDirectory}`
    );
  }
}

function run(command, args, options) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      ...options,
      shell: false,
      stdio: [
        "ignore",
        "pipe",
        "pipe"
      ]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", chunk => {
      stdout += chunk;
    });
    child.stderr.on("data", chunk => {
      stderr += chunk;
    });
    child.on("error", rejectPromise);
    child.on("close", code => {
      if (code === 0) {
        resolvePromise(stdout);
        return;
      }

      rejectPromise(new Error([
        `Command failed (${code}): ${command} ${args.join(" ")}`,
        stdout,
        stderr
      ].filter(Boolean).join("\n")));
    });
  });
}
