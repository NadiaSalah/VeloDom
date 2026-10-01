/**
 * ----------------------------------------
 * Module: Larger Project Build Fixture
 * ----------------------------------------
 *
 * Builds a deterministic generated consumer twice with real Vite integration.
 * Structural invariants fail the build; timings are local observations only.
 * ----------------------------------------
 */

import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { listCatalog } from "../../../examples/velodom-store/src/domain/catalog/catalog-service.js";
import { listAdminProducts } from "../../../examples/velodom-store/src/domain/admin/admin-service.js";

const workspaceRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const temporaryRoot = await mkdtemp(join(tmpdir(), "velodom-large-project-"));
const fixtureRoot = join(temporaryRoot, "consumer");
const resolvedTemp = resolve(temporaryRoot);
const tempParent = `${resolve(tmpdir())}${sep}`;

if (
  !resolvedTemp.startsWith(tempParent)
  || !basename(resolvedTemp).startsWith("velodom-large-project-")
) throw new Error("Refusing to remove an unexpected benchmark directory");

try {
  await cp(join(workspaceRoot, "tools", "test-fixtures", "package-consumer"), fixtureRoot, {
    recursive: true
  });
  await symlink(join(workspaceRoot, "node_modules"), join(fixtureRoot, "node_modules"),
    process.platform === "win32" ? "junction" : "dir");

  for (let index = 0; index < 32; index += 1) {
    const folder = join(fixtureRoot, "src", "components", "catalog", `card-${index}`);
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, "index.html"),
      `<article><h2>Card ${index}</h2><p vd-text="title"></p></article>\n`);
  }
  for (let index = 0; index < 80; index += 1) {
    const folder = join(fixtureRoot, "src", "pages", "catalog",
      `department-${Math.floor(index / 10)}`, `page-${index}`);
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, "index.html"),
      `<main><h1>Page ${index}</h1><vd-component name="catalog/card-${index % 32}"></vd-component></main>\n`);
  }

  const configFile = join(fixtureRoot, "vite.config.js");
  const samples = [];
  const chunkCounts = [];

  for (let pass = 0; pass < 3; pass += 1) {
    const started = performance.now();
    await build({
      root: fixtureRoot,
      configFile,
      logLevel: "silent",
      base: pass === 2 ? "/preview/" : "/"
    });
    samples.push(performance.now() - started);
    const assets = await readdir(join(fixtureRoot, "dist", "assets"));
    chunkCounts.push(assets.filter(file => file.endsWith(".js")).length);
  }

  const basedIndex = await readFile(join(fixtureRoot, "dist", "index.html"), "utf8");

  if (
    chunkCounts[0] < 80
    || chunkCounts.some(count => count !== chunkCounts[0])
    || !basedIndex.includes('/preview/assets/')
  ) {
    throw new Error(`Large project route chunks are missing or unstable: ${chunkCounts.join(" / ")}`);
  }

  console.log("VeloDom larger-project production build");
  console.log("=======================================");
  console.log("Fixture: 80 nested pages, 32 shared components, one consumer entry");
  console.log("Environment: local Vite production builds; no backend traffic or concurrent users");
  console.log(`First build: ${samples[0].toFixed(1)}ms`);
  console.log(`Repeated build: ${samples[1].toFixed(1)}ms`);
  console.log(`Base-path build: ${samples[2].toFixed(1)}ms`);
  console.log(`JavaScript chunks: ${chunkCounts[1]} (stable across all builds)`);
  console.log("Base-path assets: /preview/ references verified");

  const responseStarted = performance.now();
  for (let iteration = 0; iteration < 50; iteration += 1) {
    const catalog = await listCatalog({ category: "workspace", sort: "price-asc", page: 1 });
    const admin = await listAdminProducts({ status: "all", page: 1 });
    if (
      !catalog.items.length || catalog.items.length > 4
      || !admin.items.length || admin.items.length > 3
    ) throw new Error("Catalog or administration pagination contract regressed");
  }
  console.log(`Fixture catalog/admin work: ${(performance.now() - responseStarted).toFixed(1)}ms / 100 local reads`);
  console.log("These small fixture reads do not model database latency or shopping concurrency.");
} finally {
  await rm(resolvedTemp, { recursive: true, force: true });
}
