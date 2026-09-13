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
import { createProjectSourceIndex } from "../../../packages/velodom/src/cli/project-index.ts";

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

    assert.equal("templates" in inspection, false);
    assert.equal("plugins" in inspection, false);
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

    output.length = 0;

    const focusedInspectCode = await runVeloDomCli([
      "inspect",
      "routes",
      "--json",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });
    const focusedRoutes = JSON.parse(output.join("\n"));

    assert.equal(focusedInspectCode, 0);
    assert.deepEqual(focusedRoutes.map(route => route.path), [
      "/about-us",
      "/"
    ]);

    output.length = 0;

    const explainCode = await runVeloDomCli([
      "explain",
      "src/pages/home/index.html",
      "--json",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });
    const explanation = JSON.parse(output.join("\n"));

    assert.equal(explainCode, 0);
    assert.equal(explanation.subject, "src/pages/home/index.html");
    assert.ok(explanation.details.some(detail => detail.includes("vd-text")));

    output.length = 0;

    const topicCode = await runVeloDomCli([
      "explain",
      "routing",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });

    assert.equal(topicCode, 0);
    assert.match(output.join("\n"), /Same-route hashes/);

    output.length = 0;

    const labCheckCode = await runVeloDomCli([
      "lab",
      "--check",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });

    assert.equal(labCheckCode, 0);
    assert.match(output.join("\n"), /Lab readiness/);
  } finally {
    await removeFixture(root);
  }
});

test("build-time project index retains source and compiler metadata once", async () => {
  const root = await createFixture();

  try {
    const index = await createProjectSourceIndex(root);
    const home = index.templates.find(template => template.module.name === "home");
    const about = index.templates.find(template => template.module.name === "about");

    assert.ok(home);
    assert.ok(about);
    assert.equal(home.kind, "page");
    assert.match(home.script, /announce/);
    assert.match(home.configSource, /seo\s*:/);
    assert.equal(home.configFile, "src/pages/home/config.ts");
    assert.ok(home.compileResult.metadata.some(item => (
      Number.isInteger(item.location?.line) && item.location.line > 0
    )));
    assert.equal(about.module.kind, "single-file");
    assert.match(about.html, /vd-text="title"/);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("CLI check composes static gates and reports browser tests as not run", async () => {
  const root = await createFixture();
  const output = [];

  try {
    await writeFixtureFile(root, "package.json", JSON.stringify({
      scripts: {
        build: "vite build",
        dev: "vite"
      }
    }));
    await writeFixtureFile(
      root,
      "vite.config.js",
      'import { velodom } from "velodom/vite-plugin"; export default { plugins: [velodom()] };'
    );

    const code = await runVeloDomCli([
      "check",
      "--json",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });
    const report = JSON.parse(output.join("\n"));
    const browser = report.steps.find(step => step.id === "browser");

    assert.equal(code, 0);
    assert.equal(report.ok, true);
    assert.equal(browser.status, "not-run");
    assert.match(browser.summary, /real browser test/);
    assert.deepEqual(
      report.steps.slice(0, -1).map(step => step.id),
      ["compiler", "references", "security", "build-sanity", "maintainability"]
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("CLI fix previews and explicitly applies only safe template aliases", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-cli-fix-"));
  const output = [];
  const htmlFile = join(root, "src/pages/home/index.html");
  const vdFile = join(root, "src/components/panel.vd");
  const html = '<button data-vd-on-click.prevent="save()" data-vd-text="label" data-vd-request-state></button>';
  const singleFile = `<template><p data-vd-show="open"></p></template>\n<script>const literal = "data-vd-text";</script>`;
  const io = {
    stdout: message => output.push(message),
    stderr: message => output.push(message)
  };

  try {
    await writeFixtureFile(root, "src/pages/home/index.html", html);
    await writeFixtureFile(root, "src/components/panel.vd", singleFile);

    assert.equal(await runVeloDomCli(["fix", "--json", "--root", root], io), 0);
    const preview = JSON.parse(output.join("\n"));

    assert.equal(preview.mode, "preview");
    assert.equal(preview.fileCount, 2);
    assert.equal(preview.editCount, 4);
    assert.equal(await readFile(htmlFile, "utf8"), html);
    assert.equal(await readFile(vdFile, "utf8"), singleFile);

    output.length = 0;
    assert.equal(await runVeloDomCli([
      "fix",
      "--write",
      "--json",
      "--root",
      root
    ], io), 0);
    assert.equal(
      await readFile(htmlFile, "utf8"),
      '<button vd-on:click.prevent="save()" vd-text="label" vd-auto-state></button>'
    );
    assert.equal(
      await readFile(vdFile, "utf8"),
      `<template><p vd-show="open"></p></template>\n<script>const literal = "data-vd-text";</script>`
    );
  } finally {
    await rm(root, { force: true, recursive: true });
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
      "--template",
      "minimal",
      "--javascript",
      "--lab",
      "--no-eslint",
      "--no-prettier",
      "--no-git",
      "--no-install",
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
    await assertFile(join(root, "starter/src/components/starter-card/index.html"));
    await assertFile(join(root, "starter/AGENTS.md"));
    await assertFile(join(root, "starter/README.md"));
    await assertFile(join(root, "starter/src/style.css"));
    await assertFile(join(root, "starter/vite.config.js"));
    await assertFile(join(root, "starter/jsconfig.json"));

    const config = await readFile(
      join(root, "src/pages/blog/posts/[id]/config.ts"),
      "utf8"
    );
    const articleFeature = await readFile(
      join(root, "src/pages/articles/index.html"),
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
    const starterShell = await readFile(
      join(root, "starter/index.html"),
      "utf8"
    );
    const starterFavicon = await readFile(
      join(root, "starter/public/velodom-favicon.svg"),
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

    assert.match(config, /path: "\/blog\/posts\/:id"/);
    assert.match(config, /satisfies PageConfig/);
    assert.match(articleFeature, /vd-for="post in posts"/);
    assert.match(articleFeature, /vd-props="\{ title: post\.title, excerpt: post\.excerpt \}"/);
    assert.doesNotMatch(articleFeature, /vd-prop-title="posts\[/);
    assert.match(starterMain, /await mountVeloDom\(\)/);
    assert.match(starterMain, /import "\.\/style\.css"/);
    assert.doesNotMatch(starterMain, /createViteAdapter/);
    assert.match(starterHome, /vd-on:click="count\+\+"/);
    assert.match(starterHome, /vd-component name="starter-card"/);
    assert.match(starterShell, /<!doctype html>/i);
    assert.match(starterShell, /name="description"/);
    assert.match(starterShell, /rel="icon" type="image\/svg\+xml" href="\/velodom-favicon\.svg"/);
    assert.match(starterFavicon, /viewBox="0 0 850\.39 850\.39"/);
    assert.match(starterFavicon, /id="Layer_1"/);
    assert.match(starterViteConfig, /from "velodom\/vite-plugin"/);
    assert.match(await readFile(join(root, "starter/jsconfig.json"), "utf8"), /"ignoreDeprecations": "6\.0"/);
    assert.match(starterViteConfig, /"@": fileURLToPath/);
    assert.equal(starterManifest.name, "starter");
    assert.equal(starterManifest.scripts.lab, "vd lab");
    assert.equal(starterManifest.imports["#app/*"], "./src/*");
    assert.deepEqual(Object.keys(starterManifest.devDependencies), ["vite"]);

    for (const file of [
      "src/pages/home/config.js",
      "src/pages/home/index.html",
      "src/pages/home/script.js",
      "src/components/starter-card/index.html"
    ]) {
      const generated = await readFile(join(root, "starter", file), "utf8");
      const shipped = await readFile(
        new URL(`../../../packages/velodom/templates/starters/minimal/${file}`, import.meta.url),
        "utf8"
      );

      assert.equal(generated, shipped, `Starter drifted from templates/starters/minimal/${file}`);
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
      "--template",
      "minimal",
      "--javascript",
      "--no-eslint",
      "--no-prettier",
      "--no-git",
      "--no-install",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    }), 0);

    assert.match(output.join("\n"), /Created VeloDom project in starter/);
    assert.match(output.join("\n"), /npm install/);
    assert.match(output.join("\n"), /npm run dev/);
    await assertFile(join(root, "starter", "src/pages/home/index.html"));
    await assertFile(join(root, "starter", "src/components/starter-card/index.html"));
    await assertFile(join(root, "starter", "public/velodom-favicon.svg"));
  } finally {
    await removeFixture(root);
  }
});

test("CLI project creation refuses a non-empty destination", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-cli-project-safety-"));
  const output = [];

  try {
    await writeFixtureFile(root, "starter/keep.txt", "user-owned\n");

    assert.equal(await runVeloDomCli([
      "init",
      "starter",
      "--no-install",
      "--no-git",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    }), 1);

    assert.match(output.join("\n"), /non-empty folder/);
    assert.equal(
      await readFile(join(root, "starter/keep.txt"), "utf8"),
      "user-owned\n"
    );
  } finally {
    await removeFixture(root);
  }
});

test("CLI composes Blog, TypeScript, Tailwind, localization, and tests", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-cli-blog-"));
  const output = [];

  try {
    const code = await runVeloDomCli([
      "create",
      "my-blog",
      "--template",
      "blog",
      "--typescript",
      "--tailwind",
      "--i18n",
      "--lab",
      "--test-all",
      "--no-eslint",
      "--no-prettier",
      "--no-git",
      "--no-install",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });

    assert.equal(code, 0);
    await assertFile(join(root, "my-blog/src/main.ts"));
    await assertFile(join(root, "my-blog/src/pages/posts/script.ts"));
    await assertFile(join(root, "my-blog/src/pages/localization/script.ts"));
    await assertFile(join(root, "my-blog/src/components/site-nav/index.html"));
    await assertFile(join(root, "my-blog/tests/unit/project.test.js"));
    await assertFile(join(root, "my-blog/tests/e2e/home.spec.ts"));
    const manifest = JSON.parse(await readFile(join(root, "my-blog/package.json"), "utf8"));
    const viteConfig = await readFile(join(root, "my-blog/vite.config.ts"), "utf8");

    assert.equal(manifest.devDependencies.tailwindcss, "^4.3.0");
    assert.equal(manifest.devDependencies["@playwright/test"], "^1.61.1");
    assert.equal(manifest.devDependencies.eslint, undefined);
    assert.equal(manifest.scripts.lab, "vd lab");
    assert.match(viteConfig, /tailwindcss\(\)/);
    assert.match(viteConfig, /localizationOptions/);
    assert.match(await readFile(join(root, "my-blog/README.md"), "utf8"), /npm run lab/);
    assert.match(output.join("\n"), /VeloDom Lab command configured/);
    assert.match(output.join("\n"), /Tailwind CSS configured/);
  } finally {
    await removeFixture(root);
  }
});

test("CLI creates a genuinely small Empty JavaScript project", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-cli-empty-"));
  const output = [];

  try {
    const code = await runVeloDomCli([
      "create",
      "empty app",
      "--template",
      "empty",
      "--javascript",
      "--no-eslint",
      "--no-prettier",
      "--no-git",
      "--no-install",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });

    assert.equal(code, 0);
    await assertFile(join(root, "empty app/src/main.js"));
    await assertFile(join(root, "empty app/src/pages/home/index.html"));
    const manifest = JSON.parse(await readFile(join(root, "empty app/package.json"), "utf8"));

    assert.equal(manifest.name, "empty-app");
    assert.deepEqual(Object.keys(manifest.devDependencies), ["vite"]);
    await assert.rejects(access(join(root, "empty app/eslint.config.js")));
    await assert.rejects(access(join(root, "empty app/tsconfig.json")));
  } finally {
    await removeFixture(root);
  }
});

test("CLI reports project option conflicts without stack traces", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-cli-invalid-"));
  const output = [];
  const io = {
    stdout: message => output.push(message),
    stderr: message => output.push(message)
  };

  try {
    assert.equal(await runVeloDomCli([
      "create",
      "broken",
      "--javascript",
      "--typescript",
      "--no-install",
      "--root",
      root
    ], io), 1);
    assert.match(output.join("\n"), /Cannot use --javascript and --typescript together/);

    output.length = 0;
    assert.equal(await runVeloDomCli([
      "create",
      "broken-lab",
      "--lab",
      "--no-lab",
      "--no-install",
      "--root",
      root
    ], io), 1);
    assert.match(output.join("\n"), /Cannot use --lab and --no-lab together/);

    output.length = 0;
    assert.equal(await runVeloDomCli([
      "create",
      "broken",
      "--template",
      "unknown",
      "--no-install",
      "--root",
      root
    ], io), 1);
    assert.match(output.join("\n"), /Available templates: minimal, blog, empty/);

    output.length = 0;
    assert.equal(await runVeloDomCli([
      "create",
      "broken",
      "--unknown-feature",
      "--no-install",
      "--root",
      root
    ], io), 1);
    assert.match(output.join("\n"), /Unknown project option "--unknown-feature"/);

    output.length = 0;
    assert.equal(await runVeloDomCli([
      "create",
      "broken-start",
      "--start",
      "--no-install",
      "--root",
      root
    ], io), 1);
    assert.match(output.join("\n"), /Cannot use --start without dependency installation/);

    output.length = 0;
    assert.equal(await runVeloDomCli([
      "create",
      "broken-blog",
      "--template",
      "blog",
      "--no-router",
      "--no-install",
      "--root",
      root
    ], io), 1);
    assert.match(output.join("\n"), /Blog starter.*requires route examples/);
  } finally {
    await removeFixture(root);
  }
});

test("CLI exposes help and version without starting project prompts", async () => {
  const output = [];
  const io = {
    stdout: message => output.push(message),
    stderr: message => output.push(message)
  };

  assert.equal(await runVeloDomCli(["create", "--help"], io), 0);
  assert.match(output.join("\n"), /--template minimal\|blog\|empty/);
  assert.match(output.join("\n"), /--lab \| --no-lab/);
  output.length = 0;
  assert.equal(await runVeloDomCli(["--version"], io), 0);
  assert.match(output.join("\n"), /^1\.0\.0$/);
  output.length = 0;
  assert.equal(await runVeloDomCli(["-v"], io), 0);
  assert.match(output.join("\n"), /^1\.0\.0$/);
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
    await writeFixtureFile(
      root,
      "src/components/missing-cards/index.html",
      "<article>Known component</article>"
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
    const componentIssue = report.issues.find(issue => (
      issue.code === "VD_PROJECT_COMPONENT_MISSING"
    ));
    const requestIssue = report.issues.find(issue => (
      issue.code === "VD_PROJECT_REQUEST_MISSING"
    ));

    assert.equal(componentIssue.category, "component");
    assert.deepEqual(componentIssue.location, { line: 3, column: 31 });
    assert.match(componentIssue.suggestion, /missing-cards/);
    assert.equal(requestIssue.category, "request");
    assert.equal(requestIssue.location.line, 5);
    assert.ok(report.issues.every(issue => issue.code && issue.category));

    output.length = 0;
    const explainCode = await runVeloDomCli([
      "explain",
      "VD_PROJECT_COMPONENT_MISSING",
      "--json",
      "--root",
      root
    ], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });
    const explanation = JSON.parse(output.join("\n"));

    assert.equal(explainCode, 0);
    assert.equal(explanation.subject, "VD_PROJECT_COMPONENT_MISSING");
    assert.match(explanation.summary, /component/);
  } finally {
    await removeFixture(root);
  }
});

test("CLI doctor reports an explicitly configured but incomplete Lab setup", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-cli-lab-doctor-"));
  const output = [];

  try {
    await writeFixtureFile(root, "package.json", JSON.stringify({
      scripts: {
        lab: "vd lab"
      }
    }));

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
    assert.match(messages, /requires a dev script/);
    assert.match(messages, /requires a Vite config/);
  } finally {
    await removeFixture(root);
  }
});

test("CLI doctor proves navigation, target, typed prop, expose, and unused-state issues", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-cli-doctor-index-"));
  const output = [];

  try {
    await writeFixtureFile(root, "src/pages/home/index.html", `
      <main>
        <a href="#details" vd-nav>Details</a>
        <p vd-text="used"></p>
        <button vd-request="posts.get" vd-target="$route.posts"></button>
        <vd-component name="card" vd-ref="card" vd-prop-titel="Hello"></vd-component>
        <button vd-on:click="$refs.card.opne()">Open</button>
      </main>
    `);
    await writeFixtureFile(
      root,
      "src/pages/home/script.js",
      'export const state = { used: "yes", unused: true };'
    );
    await writeFixtureFile(
      root,
      "src/pages/home/config.js",
      'export default { path: "/" };'
    );
    await writeFixtureFile(
      root,
      "src/api/routes.js",
      'export default { "posts.get": () => [] };'
    );
    await writeFixtureFile(root, "src/components/card/index.html", "<article></article>");
    await writeFixtureFile(root, "src/components/card/script.ts", `
      import type { ComponentInitContext } from "velodom";
      interface CardProps { title: string; subtitle?: string }
      export function init({ props }: ComponentInitContext<CardProps>) {
        const expose = { open() {} };
        return { expose };
      }
    `);

    const code = await runVeloDomCli(["doctor", "--json", "--root", root], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    });
    const report = JSON.parse(output.join("\n"));
    const codes = report.issues.map(issue => issue.code);
    const propMessages = report.issues
      .filter(issue => issue.code === "VD_PROJECT_COMPONENT_PROP")
      .map(issue => issue.message)
      .join("\n");

    assert.equal(code, 1);
    assert.ok(codes.includes("VD_PROJECT_NAV_TARGET"));
    assert.ok(codes.includes("VD_PROJECT_REQUEST_TARGET"));
    assert.ok(codes.includes("VD_PROJECT_COMPONENT_EXPOSE"));
    assert.ok(codes.includes("VD_PROJECT_STATE_UNUSED"));
    assert.match(propMessages, /requires prop "title"/);
    assert.match(propMessages, /does not declare prop "titel"/);
    assert.match(
      report.issues.find(issue => issue.code === "VD_PROJECT_COMPONENT_EXPOSE").suggestion,
      /open/
    );
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
    "package.json",
    JSON.stringify({
      scripts: { dev: "vite" }
    })
  );
  await writeFixtureFile(
    root,
    "vite.config.js",
    'import { velodom } from "velodom/vite-plugin"; export default { plugins: [velodom()] };'
  );

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
