/**
 * ----------------------------------------
 * Module: Performance Budget Script Tests
 * ----------------------------------------
 *
 * Responsibilities:
 * - Verify optional CSS build-budget behavior.
 * - Keep the default design-system-neutral path unblocked.
 * ----------------------------------------
 */

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const runFile = promisify(execFile);
const workspaceRoot = process.cwd();
const script = join(
  workspaceRoot,
  "tools",
  "scripts",
  "check-performance-budgets.mjs"
);

test("performance budgets keep CSS unconstrained until an app opts in", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-performance-"));

  try {
    await createBuildFixture(root);

    const defaultResult = await runBudgetCheck(root);

    assert.match(defaultResult.stdout, /dist total CSS: not enforced/);

    await assert.rejects(
      runBudgetCheck(root, { VELODOM_CSS_BUDGET_KB: "1" }),
      error => {
        assert.equal(error.code, 1);
        assert.match(error.stdout, /over dist total CSS/);
        return true;
      }
    );

    const enforcedResult = await runBudgetCheck(root, {
      VELODOM_CSS_BUDGET_KB: "3"
    });

    assert.match(enforcedResult.stdout, /ok dist total CSS/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createBuildFixture(root) {
  const assets = join(root, "examples", "velodom-blog", "dist", "assets");
  const packageLib = join(root, "packages", "velodom", "lib");

  await mkdir(assets, { recursive: true });
  await mkdir(packageLib, { recursive: true });
  await writeFile(join(assets, "app.js"), "export {};\n");
  await writeFile(join(assets, "app.css"), "a".repeat(2 * 1024));
  await writeFile(join(packageLib, "index.js"), "export {};\n");
}

async function runBudgetCheck(cwd, environment = {}) {
  return runFile(process.execPath, [script], {
    cwd,
    env: {
      ...process.env,
      ...environment
    }
  });
}
