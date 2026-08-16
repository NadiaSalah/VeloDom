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
import { runVeloDomCli } from "../../src/core/cli.ts";

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
    assert.deepEqual(inspection.compilerFeatures, [
      "bindings",
      "text"
    ]);
    assert.deepEqual(inspection.requestRoutes, [
      "posts.getAll"
    ]);
    assert.deepEqual(inspection.seo, {
      pagesWithSeo: 1,
      totalPages: 2
    });
    assert.deepEqual(inspection.middleware, ["src/api/middleware.js"]);

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
    assert.equal(stats.requestRoutes, 1);
    assert.equal(stats.compilerFeatures, 2);
    assert.deepEqual(stats.seoCoverage, {
      pagesWithSeo: 1,
      totalPages: 2
    });
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
    await assertFile(join(root, "src/components/shared/post-card.vd"));
    await assertFile(join(root, "src/api/posts.js"));
    await assertFile(join(root, "src/pages/features/demo/index.html"));
    await assertFile(join(root, "src/api/middleware.js"));
    await assertFile(join(root, "src/plugins/analytics.js"));
    await assertFile(join(root, "starter/src/pages/home/config.js"));

    const config = await readFile(
      join(root, "src/pages/blog/posts/[id]/config.js"),
      "utf8"
    );

    assert.match(config, /path: "\/blog\/posts\/:id"/);
  } finally {
    await removeFixture(root);
  }
});

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "velodom-cli-"));

  await writeFixtureFile(
    root,
    "src/pages/home/index.html",
    "<main><h1 vd-text=\"title\"></h1></main>"
  );
  await writeFixtureFile(
    root,
    "src/pages/home/config.js",
    "export default { path: '/', seo: { title: 'Home' } };"
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
    "export default { \"posts.getAll\": () => [] };"
  );
  await writeFixtureFile(
    root,
    "src/api/middleware.js",
    "export default {};"
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
