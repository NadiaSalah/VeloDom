import assert from "node:assert/strict";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runVeloDomCli } from "../../../packages/velodom/src/cli.ts";

test("CLI inspect and stats read folder and single-file conventions", async () => {
  const root = await createFixture();
  const output = [];

  try {
    const code = await runVeloDomCli([
      "inspect",
      "--json",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });

    assert.equal(code, 0);

    const inspection = JSON.parse(output.join("\n"));

    assert.deepEqual(
      inspection.pages.map(page => [
        page.name,
        page.route
      ]),
      [
        [
          "about",
          "/about-us"
        ],
        [
          "home",
          "/"
        ]
      ]
    );
    assert.deepEqual(
      inspection.components.map(component => component.name),
      ["shared/card"]
    );
    assert.deepEqual(
      inspection.layouts.map(layout => layout.name),
      ["default"]
    );
    assert.equal(inspection.directiveUsage["vd-text"], 2);
    assert.equal(inspection.directiveUsage["vd-pre"], 1);
    assert.equal(inspection.directiveUsage["vd-lazy"], undefined);
    assert.equal(inspection.css.length, 1);
    assert.deepEqual(
      inspection.refs.map(ref => `${ref.owner}:${ref.name}`),
      ["home:titleEl"]
    );
    assert.deepEqual(
      inspection.events.map(event => `${event.owner}:${event.event}:${event.handler}`),
      ["home:click:announce"]
    );
    assert.ok(
      inspection.state.some(state => state.owner === "home" && state.name === "title")
    );
    assert.ok(
      inspection.exposes.some(expose => expose.owner === "home" && expose.name === "announce")
    );
    assert.deepEqual(inspection.seoConfigs, ["src/pages/home/config.ts"]);
    assert.deepEqual(inspection.compilerFeatures, [
      "events",
      "bindings",
      "components",
      "refs",
      "requests",
      "text"
    ].sort());
    assert.deepEqual(inspection.requestRoutes, [
      "posts.getAll"
    ]);
    assert.deepEqual(inspection.seo, {
      pagesWithSeo: 1,
      totalPages: 2
    });
    assert.deepEqual(inspection.middleware, ["src/api/middleware.js"]);

    output.length = 0;

    const doctorCode = await runVeloDomCli([
      "doctor",
      "--json",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });
    const doctor = JSON.parse(output.join("\n"));

    assert.equal(doctorCode, 0);
    assert.equal(
      doctor.issues.some(issue => issue.message.includes("fakeHandler")),
      false
    );

    output.length = 0;

    const statsCode = await runVeloDomCli([
      "stats",
      "--json",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });
    const stats = JSON.parse(output.join("\n"));

    assert.equal(statsCode, 0);
    assert.equal(stats.pages, 2);
    assert.equal(stats.components, 1);
    assert.equal(stats.layouts, 1);
    assert.equal(stats.apiFiles, 3);
    assert.equal(stats.cssFiles, 1);
    assert.equal(stats.requestRoutes, 1);
    assert.equal(stats.compilerFeatures, 6);
    assert.equal(stats.refs, 1);
    assert.equal(stats.eventBindings, 1);
    assert.equal(stats.stateKeys, 4);
    assert.equal(stats.exposeNames, 1);
    assert.deepEqual(stats.seoCoverage, {
      pagesWithSeo: 1,
      totalPages: 2
    });
    assert.equal(stats.seoConfigFiles, 1);
    assert.equal(stats.testFiles, 0);

    output.length = 0;

    const routesCode = await runVeloDomCli([
      "routes",
      "--json",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });
    const routes = JSON.parse(output.join("\n"));

    assert.equal(routesCode, 0);
    assert.deepEqual(
      routes.map(route => route.path),
      [
        "/about-us",
        "/"
      ]
    );

    output.length = 0;

    const reportCode = await runVeloDomCli([
      "build-report",
      "--json",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });
    const report = JSON.parse(output.join("\n"));

    assert.equal(reportCode, 0);
    assert.equal(report.project.pages, 2);
    assert.equal(report.project.components, 1);
    assert.deepEqual(report.project.compilerFeatures, [
      "events",
      "bindings",
      "components",
      "refs",
      "requests",
      "text"
    ].sort());
    assert.ok(report.project.unusedDirectives.includes("for"));
    assert.ok(report.project.unusedRuntimeFeatures.includes("loops"));
    assert.equal(
      report.suggestions.some(suggestion => suggestion.includes("unused runtime")),
      false
    );
    assert.equal(report.dist.jsTotalBytes, Buffer.byteLength("console.log('app');"));
    assert.equal(report.dist.cssTotalBytes, Buffer.byteLength("body { color: red; }"));
    assert.ok(Array.isArray(report.dist.largestRouteChunks));
    assert.ok(Array.isArray(report.dist.repeatedHeavyDependencies));
    assert.ok(Array.isArray(report.suggestions));

    output.length = 0;

    const graphCode = await runVeloDomCli([
      "graph",
      "--json",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });
    const graph = JSON.parse(output.join("\n"));
    const edgeLabels = graph.edges.map(edge => (
      `${edge.from}:${edge.label}:${edge.to}`
    ));

    assert.equal(graphCode, 0);
    assert.ok(edgeLabels.includes("page:home:route:route:/"));
    assert.ok(edgeLabels.includes("page:home:uses component:component:shared/card"));
    assert.ok(edgeLabels.includes("page:home:requests:request:posts.getAll"));
    assert.ok(edgeLabels.includes("page:home:declares ref:ref:home:titleEl"));
    assert.ok(edgeLabels.includes("page:home:owns state:state:home:title"));
    assert.ok(edgeLabels.includes("page:home:exposes:expose:home:announce"));
    assert.ok(edgeLabels.includes("request:posts.getAll:middleware:middleware:trimStringFields"));

    output.length = 0;

    const mermaidCode = await runVeloDomCli([
      "graph",
      "--mermaid",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });

    assert.equal(mermaidCode, 0);
    assert.match(output.join("\n"), /flowchart TD/);

    output.length = 0;

    const healthCode = await runVeloDomCli([
      "health",
      "--json",
      "--min-score",
      "1",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });
    const health = JSON.parse(output.join("\n"));

    assert.equal(healthCode, 0);
    assert.equal(health.threshold, 1);
    assert.equal(typeof health.score, "number");
    assert.ok(Array.isArray(health.signals));

    output.length = 0;

    const docsCode = await runVeloDomCli([
      "docs",
      "--json",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });
    const docs = JSON.parse(output.join("\n"));

    assert.equal(docsCode, 0);
    assert.equal(docs.routes[0].path, "/about-us");
    assert.ok(docs.routes.some(route => route.components.includes("shared/card")));
    assert.deepEqual(docs.seo, {
      pagesWithSeo: 1,
      totalPages: 2
    });

    output.length = 0;

    const markdownCode = await runVeloDomCli([
      "docs",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });

    assert.equal(markdownCode, 0);
    assert.match(output.join("\n"), /# VeloDom Project Documentation/);

    output.length = 0;

    const benchmarkCode = await runVeloDomCli([
      "benchmark",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });

    assert.equal(benchmarkCode, 1);
    assert.match(output.join("\n"), /benchmark:rendering/);
  } finally {
    await removeFixture(root);
  }
});

test("CLI create scaffolds convention-first project resources", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-cli-"));
  const output = [];
  const options = {
    stdout: message => output.push(message),
    stderr: message => output.push(message)
  };

  try {
    assert.equal(await runVeloDomCli([
      "create",
      "page",
      "blog/posts/[id]",
      "--ts",
      "--root",
      root
    ], options), 0);
    assert.equal(await runVeloDomCli([
      "create",
      "component",
      "shared/post-card",
      "--single-file",
      "--root",
      root
    ], options), 0);
    assert.equal(await runVeloDomCli([
      "create",
      "api",
      "posts",
      "--root",
      root
    ], options), 0);
    assert.equal(await runVeloDomCli([
      "create",
      "demo",
      "features/demo",
      "--root",
      root
    ], options), 0);
    assert.equal(await runVeloDomCli([
      "create",
      "feature",
      "articles",
      "--blog",
      "--root",
      root
    ], options), 0);
    assert.equal(await runVeloDomCli([
      "create",
      "middleware",
      "--root",
      root
    ], options), 0);
    assert.equal(await runVeloDomCli([
      "create",
      "plugin",
      "analytics",
      "--root",
      root
    ], options), 0);
    assert.equal(await runVeloDomCli([
      "create",
      "project",
      "starter",
      "--root",
      root
    ], options), 0);

    await assertFile(join(root, "src/pages/blog/posts/[id]/index.html"));
    await assertFile(join(root, "src/pages/blog/posts/[id]/script.ts"));
    await assertFile(join(root, "src/pages/blog/posts/[id]/config.ts"));
    await assertFile(join(root, "src/components/shared/post-card.vd"));
    await assertFile(join(root, "src/api/posts.js"));
    await assertFile(join(root, "src/pages/features/demo/index.html"));
    await assertFile(join(root, "src/pages/articles/index.html"));
    await assertFile(join(root, "src/pages/articles/script.js"));
    await assertFile(join(root, "src/components/articles/post-card/index.html"));
    await assertFile(join(root, "src/api/articles.js"));
    await assertFile(join(root, "tests/articles.test.js"));
    await assertFile(join(root, "src/api/middleware.js"));
    await assertFile(join(root, "src/plugins/analytics.js"));
    await assertFile(join(root, "starter/src/pages/home/config.js"));
    await assertFile(join(root, "starter/public/velodom-favicon.svg"));
    await assertFile(join(root, "starter/src/pages/home/index.html"));
    await assertFile(join(root, "starter/src/pages/home/script.js"));
    await assertFile(join(root, "starter/src/components/brand-mark/index.html"));
    await assertFile(join(root, "starter/src/layouts/default.vd"));
    await assertFile(join(root, "starter/src/components/site-nav/index.html"));
    await assertFile(join(root, "starter/src/components/site-nav/script.js"));
    await assertFile(join(root, "starter/src/components/site-nav/style.css"));
    await assertFile(join(root, "starter/src/components/feature-card/index.html"));
    await assertFile(join(root, "starter/src/components/feature-card/script.js"));
    await assertFile(join(root, "starter/src/pages/about.vd"));
    await assertFile(join(root, "starter/src/pages/guide/index.html"));
    await assertFile(join(root, "starter/src/pages/guide/config.js"));
    await assertFile(join(root, "starter/src/style.css"));
    await assertFile(join(root, "starter/vite.config.js"));
    await assertFile(join(root, "starter/jsconfig.json"));

    const config = await readFile(
      join(root, "src/pages/blog/posts/[id]/config.ts"),
      "utf8"
    );
    const starterMain = await readFile(
      join(root, "starter/src/main.js"),
      "utf8"
    );
    const starterHome = await readFile(
      join(root, "starter/src/pages/home/index.html"),
      "utf8"
    );
    const starterHomeConfig = await readFile(
      join(root, "starter/src/pages/home/config.js"),
      "utf8"
    );
    const starterBrand = await readFile(
      join(root, "starter/src/components/brand-mark/index.html"),
      "utf8"
    );
    const starterShell = await readFile(
      join(root, "starter/index.html"),
      "utf8"
    );
    const starterFavicon = await readFile(
      join(root, "starter/public/velodom-favicon.svg"),
      "utf8"
    );
    const starterAbout = await readFile(
      join(root, "starter/src/pages/about.vd"),
      "utf8"
    );
    const starterNavScript = await readFile(
      join(root, "starter/src/components/site-nav/script.js"),
      "utf8"
    );
    const starterNav = await readFile(
      join(root, "starter/src/components/site-nav/index.html"),
      "utf8"
    );
    const starterLayout = await readFile(
      join(root, "starter/src/layouts/default.vd"),
      "utf8"
    );
    const starterViteConfig = await readFile(
      join(root, "starter/vite.config.js"),
      "utf8"
    );
    const starterManifest = JSON.parse(await readFile(
      join(root, "starter/package.json"),
      "utf8"
    ));
    const starterLockfile = JSON.parse(await readFile(
      join(root, "starter/package-lock.json"),
      "utf8"
    ));

    assert.match(config, /path: "\/blog\/posts\/:id"/);
    assert.match(config, /satisfies PageConfig/);
    assert.match(starterMain, /await mountVeloDom\(\)/);
    assert.match(starterMain, /import "\.\/style\.css"/);
    assert.doesNotMatch(starterMain, /createViteAdapter/);
    assert.match(starterHome, /vd-component name="brand-mark"/);
    assert.match(starterHome, /class="hero-art"/);
    assert.match(starterHome, /Build with a visible mark/);
    assert.match(starterNav, /vd-on:click="toggleTheme\(\)"/);
    assert.match(starterNav, /<span>VeloDom<\/span>/);
    assert.match(starterNav, /href="\/about" vd-nav/);
    assert.match(starterHome, /href="\/#principles" vd-nav/);
    assert.match(starterHome, /href="https:\/\/github\.com\/NadiaSalah\/VeloDom"/);
    assert.match(starterHome, /target="_blank" rel="noreferrer"/);
    assert.match(starterHomeConfig, /layout: "default"/);
    assert.match(starterBrand, /viewBox="0 0 850\.39 850\.39"/);
    assert.doesNotMatch(starterBrand, /<img\b/);
    assert.match(starterShell, /<!doctype html>/i);
    assert.match(starterShell, /name="description"/);
    assert.match(starterShell, /rel="icon" type="image\/svg\+xml" href="\/velodom-favicon\.svg"/);
    assert.match(starterFavicon, /viewBox="0 0 850\.39 850\.39"/);
    assert.match(starterFavicon, /id="Layer_1"/);
    assert.match(starterAbout, /<template>/);
    assert.match(starterAbout, /<style>/);
    assert.match(starterAbout, /<config>/);
    assert.match(starterAbout, /layout: "default"/);
    assert.match(starterNavScript, /aria-current/);
    assert.match(starterNavScript, /localStorage/);
    assert.match(starterLayout, /<vd-component name="site-nav"><\/vd-component>/);
    assert.match(starterLayout, /<vd-page><\/vd-page>/);
    assert.match(starterViteConfig, /from "velodom\/vite-plugin"/);
    assert.match(await readFile(join(root, "starter/jsconfig.json"), "utf8"), /"ignoreDeprecations": "6\.0"/);
    assert.match(starterViteConfig, /"@": fileURLToPath/);
    assert.equal(starterManifest.name, "starter");
    assert.equal(starterManifest.imports["#app/*"], "./src/*");
    assert.equal(starterLockfile.name, "starter");
    assert.equal(starterLockfile.packages[""].name, "starter");

    for (const file of [
      "index.html",
      "jsconfig.json",
      "vite.config.js",
      "public/velodom-favicon.svg",
      "src/main.js",
      "src/style.css",
      "src/components/brand-mark/index.html",
      "src/components/site-nav/index.html",
      "src/components/site-nav/script.js",
      "src/components/site-nav/style.css",
      "src/components/feature-card/index.html",
      "src/components/feature-card/script.js",
      "src/components/feature-card/style.css",
      "src/layouts/default.vd",
      "src/pages/about.vd",
      "src/pages/guide/config.js",
      "src/pages/guide/index.html",
      "src/pages/home/config.js",
      "src/pages/home/index.html",
      "src/pages/home/script.js"
    ]) {
      const generated = await readFile(join(root, "starter", file), "utf8");
      const shipped = await readFile(
        new URL(`../../../packages/velodom/velodomProj/${file}`, import.meta.url),
        "utf8"
      );

      assert.equal(generated, shipped, `Starter drifted from velodomProj/${file}`);
    }
  } finally {
    await removeFixture(root);
  }
});

test("CLI init is the concise project starter alias", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-cli-init-"));
  const output = [];

  try {
    assert.equal(await runVeloDomCli([
      "init",
      "starter",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    }), 0);

    assert.match(output.join("\n"), /Created VeloDom project starter/);
    await assertFile(join(root, "starter", "src/pages/about.vd"));
    await assertFile(join(root, "starter", "src/layouts/default.vd"));
    await assertFile(join(root, "starter", "public/velodom-favicon.svg"));
  } finally {
    await removeFixture(root);
  }
});

test("CLI types generates optional project declarations from conventions", async () => {
  const root = await createFixture();
  const output = [];

  try {
    await writeFixtureFile(
      root,
      "src/pages/blog/[slug]/index.html",
      `<vd-component name="shared/card" vd-prop-title="article.title"></vd-component>`
    );
    await writeFixtureFile(
      root,
      "src/pages/blog/[slug]/config.js",
      "export default { path: '/blog/:slug' };"
    );

    const code = await runVeloDomCli([
      "types",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });
    const declaration = await readFile(
      join(root, "src", "velodom.generated.d.ts"),
      "utf8"
    );

    assert.equal(code, 0);
    assert.match(output.join("\n"), /Generated src\/velodom.generated\.d\.ts/);
    assert.match(declaration, /declare module "velodom\/app"/);
    assert.match(declaration, /"blog\/\[slug\]": \{ "slug": string \}/);
    assert.match(declaration, /"posts\.getAll": unknown/);
    assert.match(declaration, /"shared\/card": \{ "title"\?: unknown \}/);
  } finally {
    await removeFixture(root);
  }
});

test("CLI doctor reports static project problems", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-cli-"));
  const output = [];

  try {
    await writeFixtureFile(
      root,
      "src/pages/home/index.html",
      `
        <main>
          <vd-component name="missing-card"></vd-component>
          <button vd-on:click="broken("></button>
          <button vd-request="posts.missing"></button>
        </main>
      `
    );
    await writeFixtureFile(
      root,
      "src/pages/home/config.js",
      "export default { path: 'bad' };"
    );
    await writeFixtureFile(
      root,
      "src/api/routes.js",
      "export default { \"posts.getAll\": () => [] };"
    );

    const code = await runVeloDomCli([
      "doctor",
      "--json",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });
    const report = JSON.parse(output.join("\n"));
    const messages = report.issues.map(issue => issue.message).join("\n");

    assert.equal(code, 1);
    assert.equal(report.ok, false);
    assert.match(messages, /Component "missing-card"/);
    assert.match(messages, /Request "posts.missing"/);
    assert.match(messages, /Expected an expression/);
    assert.match(messages, /path should start/);
  } finally {
    await removeFixture(root);
  }
});

test("CLI page demos generate only the files their focused examples need", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-cli-"));
  const output = [];
  const options = {
    stdout: message => output.push(message),
    stderr: message => output.push(message)
  };

  try {
    for (const kind of ["static", "counter", "request", "form", "seo"]) {
      const code = await runVeloDomCli([
        "create",
        "page",
        kind,
        "--demo",
        kind,
        "--root",
        root
      ], options);

      assert.equal(code, 0);
      await assertFile(join(root, "src/pages", kind, "index.html"));
      await assertFile(join(root, "src/pages", kind, "config.js"));
    }

    await assertFile(join(root, "src/pages/counter/script.js"));
    await assertFile(join(root, "src/pages/request/script.js"));
    await assertFile(join(root, "src/pages/form/script.js"));
    await assertFile(join(root, "src/api/request/get.js"));
    await assert.rejects(access(join(root, "src/pages/static/script.js")));
    await assert.rejects(access(join(root, "src/pages/seo/script.js")));

    const requestTemplate = await readFile(
      join(root, "src/pages/request/index.html"),
      "utf8"
    );
    const seoConfig = await readFile(
      join(root, "src/pages/seo/config.js"),
      "utf8"
    );

    assert.match(requestTemplate, /vd-request="request\.get"/);
    assert.match(seoConfig, /keywords/);
  } finally {
    await removeFixture(root);
  }
});

test("CLI discovers file API routes and named middleware without registries", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-cli-"));
  const output = [];

  try {
    await writeFixtureFile(root, "src/api/posts/get.js", "export default () => []; ");
    await writeFixtureFile(root, "src/api/posts.js", "export const helper = () => []; ");
    await writeFixtureFile(root, "src/api/middleware/auth.js", "export default params => params;");

    const code = await runVeloDomCli([
      "inspect",
      "--json",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });
    const inspection = JSON.parse(output.join("\n"));

    assert.equal(code, 0);
    assert.deepEqual(inspection.requestRoutes, ["posts.get"]);
    assert.deepEqual(inspection.middleware, ["src/api/middleware/auth.js"]);
  } finally {
    await removeFixture(root);
  }
});

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "velodom-cli-"));

  await writeFixtureFile(
    root,
    "src/pages/home/index.html",
    `
      <main>
        <h1 vd-text="title"></h1>
        <button vd-ref="titleEl" vd-on:click="announce()">Announce</button>
        <vd-component name="shared/card"></vd-component>
        <button vd-request="posts.getAll"></button>
        <pre vd-pre><code><button vd-lazy vd-on:click="fakeHandler()"></button></code></pre>
      </main>
    `
  );
  await writeFixtureFile(
    root,
    "src/pages/home/script.ts",
    `type ComponentExpose = Record<string, unknown>;

    export const state = {
      initial: 1,
      nested: { enabled: true }
    };

    export function init({ state }) {
      state.title = "Home";
      state.announce = () => {};
      const announce = state.announce;
      const expose: ComponentExpose = { announce };

      return {
        state,
        expose
      };
    }`
  );
  await writeFixtureFile(
    root,
    "src/pages/home/config.ts",
    "export default { path: '/', seo: { title: 'Home' } };"
  );
  await writeFixtureFile(
    root,
    "src/pages/home/style.css",
    "main { display: block; }"
  );
  await writeFixtureFile(
    root,
    "src/pages/about.vd",
    `<template><main vd-text="title"></main></template>
<config>export default { path: "/about-us" };</config>`
  );
  await writeFixtureFile(
    root,
    "src/components/shared/card/index.html",
    "<article vd-class=\"{ active }\"></article>"
  );
  await writeFixtureFile(
    root,
    "src/layouts/default.vd",
    "<template><main><vd-page></vd-page></main></template>"
  );
  await writeFixtureFile(
    root,
    "src/api/posts.js",
    "export async function getAll() { return []; }"
  );
  await writeFixtureFile(
    root,
    "src/api/routes.js",
    "export default { \"posts.getAll\": { handler: () => [], middleware: [\"trimStringFields\"] } };"
  );
  await writeFixtureFile(
    root,
    "src/api/middleware.js",
    "export default { trimStringFields: value => value };"
  );
  await writeFixtureFile(
    root,
    "dist/assets/main.js",
    "console.log('app');"
  );
  await writeFixtureFile(
    root,
    "dist/assets/main.css",
    "body { color: red; }"
  );

  return root;
}

async function writeFixtureFile(root, file, source) {
  const target = join(root, file);

  await mkdir(join(target, ".."), {
    recursive: true
  });
  await writeFile(target, source);
}

async function assertFile(file) {
  await access(file);
}

async function removeFixture(root) {
  await rm(root, {
    recursive: true,
    force: true
  });
}
