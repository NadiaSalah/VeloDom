import assert from "node:assert/strict";
import {
  mkdtemp,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runVeloDomCli } from "../../../packages/velodom/src/cli.ts";

test("vd test executes the selected existing project script", async () => {
  const root = await createTestProject({
    test: "node -e \"process.exit(9)\"",
    "test:unit": "node -e \"process.exit(0)\"",
    "test:e2e": "node -e \"process.exit(0)\""
  });
  const output = [];

  try {
    assert.equal(await runVeloDomCli(["test", "unit", "--root", root], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    }), 0);
    assert.match(output.join("\n"), /script "test:unit"/);

    output.length = 0;
    assert.equal(await runVeloDomCli(["test", "--browser", "--root", root], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    }), 0);
    assert.match(output.join("\n"), /script "test:e2e"/);

    output.length = 0;
    assert.equal(await runVeloDomCli(["test", "--root", root], {
      stdout: message => output.push(message),
      stderr: message => output.push(message)
    }), 1);
    assert.match(output.join("\n"), /exited with code 9/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("vd test fails clearly when a requested layer has no real script", async () => {
  const root = await createTestProject({ test: "node -e \"process.exit(0)\"" });
  const errors = [];

  try {
    assert.equal(await runVeloDomCli(["test", "route", "--root", root], {
      stdout: () => {},
      stderr: message => errors.push(message)
    }), 1);
    assert.match(errors.join("\n"), /"test:route"/);
    assert.match(errors.join("\n"), /real tests/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createTestProject(scripts) {
  const root = await mkdtemp(join(tmpdir(), "velodom-test-command-"));

  await writeFile(join(root, "package.json"), JSON.stringify({
    private: true,
    scripts
  }, null, 2));
  return root;
}
