/**
 * ----------------------------------------
 * Tests: CSS and Asset Intelligence
 * ----------------------------------------
 *
 * Verifies conservative build-only ownership, duplication, usage, intrinsic
 * dimension, responsive-image, LCP, and logical-property diagnostics.
 * ----------------------------------------
 */

import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { runVeloDomCli } from "../../../packages/velodom/src/cli.ts";
import { createCssAssetIntelligence } from "../../../packages/velodom/src/cli/css-assets.ts";
import { createProjectSourceIndex } from "../../../packages/velodom/src/cli/project-index.ts";

test("CSS and asset intelligence reports only static build evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-css-assets-"));
  const hero = createPngFixture(1200, 600, 110 * 1024);

  try {
    await writeFixture(root, "src/pages/home/index.html", `
      <main class="used">
        <img src="/assets/hero.png" loading="lazy" alt="Hero">
      </main>
    `);
    await writeFixture(root, "src/pages/home/style.css", `
      .used { color: rebeccapurple; padding: 1rem; }
      .dead {
        margin-left: 1rem;
        color: tomato;
      }
    `);
    await writeFixture(root, "src/components/card/index.html", "<article class=\"card\">Card</article>");
    await writeFixture(root, "src/components/shell/index.html", '<vd-component name="card"></vd-component>');
    await writeFixture(root, "src/layouts/default/index.html", '<vd-page></vd-page><vd-component name="shell"></vd-component>');
    await writeFixture(root, "src/components/card/style.css", `
      .card { color: rebeccapurple; padding: 1rem; }
    `);
    await writeFixture(root, "src/assets/hero.png", hero);
    await writeFixture(root, "src/assets/hero-copy.png", hero);
    await writeFixture(
      root,
      "src/assets/unused.svg",
      '<svg viewBox="0 0 20 10" xmlns="http://www.w3.org/2000/svg"></svg>'
    );
    await writeFixture(root, "index.html", '<div id="app"></div>');

    const index = await createProjectSourceIndex(root);
    const report = await createCssAssetIntelligence(root, index);

    assert.equal(report.css.files.length, 2);
    assert.ok(report.css.duplicates.some(item => (
      item.files.includes("src/pages/home/style.css")
      && item.files.includes("src/components/card/style.css")
    )));
    assert.ok(report.css.possiblyUnusedSelectors.some(item => (
      item.file === "src/pages/home/style.css" && item.message.includes(".dead")
    )));
    assert.ok(report.css.logicalProperties.some(item => (
      item.message.includes("margin-inline-start")
    )));
    assert.deepEqual(
      report.css.routeAttribution.find(item => item.file === "src/components/card/style.css")?.routes,
      ["/"]
    );

    assert.ok(report.assets.duplicates.some(item => item.files.length === 2));
    assert.ok(report.assets.unused.some(item => item.file === "src/assets/unused.svg"));
    assert.ok(report.assets.missingDimensions.some(item => item.file === "src/pages/home/index.html"));
    assert.ok(report.assets.responsiveAdvice.some(item => item.message.includes("1200px")));
    assert.ok(report.assets.lcpAdvice.some(item => item.message.includes("possible LCP")));
    assert.ok(report.summary.findings >= 7);

    const output = [];
    assert.equal(await runVeloDomCli(["inspect", "assets", "--json", "--root", root], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    }), 0);
    assert.equal(JSON.parse(output.join("\n")).files.length, 3);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

/** Writes a nested fixture file without bypassing the test's owned temp root. */
async function writeFixture(root, relativePath, content) {
  const file = join(root, relativePath);

  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

/** Creates the smallest header needed for deterministic PNG metadata tests. */
function createPngFixture(width, height, bytes) {
  const source = Buffer.alloc(bytes);

  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(source, 0);
  source.writeUInt32BE(width, 16);
  source.writeUInt32BE(height, 20);
  return source;
}
