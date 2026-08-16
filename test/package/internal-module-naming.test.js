import assert from "node:assert/strict";
import {
  access,
  readFile
} from "node:fs/promises";
import {
  join
} from "node:path";
import test from "node:test";

const root = process.cwd();

test("internal router module filenames are frozen", async () => {
  const coreRoot = join(root, "packages", "velodom", "src");
  const pageRouterPath = join(coreRoot, "page-router.ts");
  const requestRouterPath = join(
    coreRoot,
    "requests",
    "request-router.ts"
  );
  const runtimeEntryPath = join(coreRoot, "velodom.ts");
  const requestDirectivePath = join(
    coreRoot,
    "directives",
    "features",
    "requests.ts"
  );

  await Promise.all([
    access(pageRouterPath),
    access(requestRouterPath)
  ]);

  const [
    runtimeEntry,
    requestDirective
  ] = await Promise.all([
    readFile(runtimeEntryPath, "utf8"),
    readFile(requestDirectivePath, "utf8")
  ]);

  assert.match(
    runtimeEntry,
    /from "\.\/page-router\.ts"/
  );
  assert.match(
    runtimeEntry,
    /from "\.\/requests\/request-router\.ts"/
  );
  assert.match(
    requestDirective,
    /from "\.\.\/\.\.\/requests\/request-router\.ts"/
  );
});
