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

test("vd add installs first-party features idempotently with ownership metadata", async () => {
  const root = await createProject();
  const output = [];
  const context = {
    stdout: message => output.push(message),
    stderr: message => output.push(message)
  };

  try {
    assert.equal(await runVeloDomCli(["add", "i18n", "--root", root], context), 0);
    assert.equal(await runVeloDomCli(["add", "tests", "--all", "--root", root], context), 0);
    assert.equal(await runVeloDomCli(["add", "lab", "--root", root], context), 0);
    assert.equal(await runVeloDomCli(["add", "i18n", "--root", root], context), 0);

    const manifest = JSON.parse(await readFile(join(root, ".velodom/features.json"), "utf8"));
    const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    const viteConfig = await readFile(join(root, "vite.config.js"), "utf8");

    assert.deepEqual(Object.keys(manifest.features).sort(), ["i18n", "lab", "tests"]);
    assert.ok(manifest.features.i18n.createdFiles.some(file => file.path === "src/i18n.js"));
    assert.equal(packageJson.scripts.lab, "vd lab");
    assert.equal(packageJson.scripts["test:unit"], "node --test tests/unit/*.test.*");
    assert.equal(packageJson.scripts["test:e2e"], "playwright test");
    assert.equal(packageJson.devDependencies["@playwright/test"], "^1.61.1");
    assert.match(viteConfig, /localization:\s*localizationOptions/);
    await access(join(root, "src/pages/localization/index.html"));
    await access(join(root, "tests/unit/project.test.js"));
    await access(join(root, "tests/e2e/home.spec.js"));
    assert.ok(output.some(line => line.includes("already installed")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("vd add refuses to overwrite an existing application file", async () => {
  const root = await createProject();
  const errors = [];

  try {
    await writeProjectFile(root, "src/i18n.js", "export const userOwned = true;\n");
    const originalPackage = await readFile(join(root, "package.json"), "utf8");
    const originalVite = await readFile(join(root, "vite.config.js"), "utf8");
    const code = await runVeloDomCli(["add", "i18n", "--root", root], {
      stdout: () => {},
      stderr: message => errors.push(message)
    });

    assert.equal(code, 1);
    assert.ok(errors.some(message => message.includes("Refusing to overwrite")));
    assert.equal(await readFile(join(root, "package.json"), "utf8"), originalPackage);
    assert.equal(await readFile(join(root, "vite.config.js"), "utf8"), originalVite);
    await assert.rejects(access(join(root, ".velodom/features.json")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("feature lifecycle reports, presets, upgrades, and removes owned files safely", async () => {
  const root = await createProject();
  const secondRoot = await createProject();
  const output = [];
  const context = {
    stdout: message => output.push(message),
    stderr: message => output.push(message)
  };
  const originalPackage = await readFile(join(root, "package.json"), "utf8");
  const originalVite = await readFile(join(root, "vite.config.js"), "utf8");

  try {
    assert.equal(await runVeloDomCli(["add", "i18n", "--root", root], context), 0);
    assert.equal(await runVeloDomCli(["add", "tests", "--all", "--root", root], context), 0);
    assert.equal(await runVeloDomCli(["add", "lab", "--root", root], context), 0);
    assert.equal(await runVeloDomCli(["features", "--root", root], context), 0);
    assert.match(output.join("\n"), /tests: clean; reversible/);

    assert.equal(await runVeloDomCli([
      "preset", "export", "--out", "velodom-features.json", "--root", root
    ], context), 0);
    const preset = JSON.parse(await readFile(join(root, "velodom-features.json"), "utf8"));
    assert.deepEqual(preset.features.map(item => item.name), ["i18n", "tests", "lab"]);
    assert.equal(preset.features[1].options.mode, "all");

    assert.equal(await runVeloDomCli(["upgrade", "all", "--root", root], context), 0);
    assert.equal(await runVeloDomCli(["remove", "all", "--root", root], context), 0);
    assert.equal(await readFile(join(root, "package.json"), "utf8"), originalPackage);
    assert.equal(await readFile(join(root, "vite.config.js"), "utf8"), originalVite);
    await assert.rejects(access(join(root, "src/i18n.js")));
    await assert.rejects(access(join(root, "tests/unit/project.test.js")));
    await assert.rejects(access(join(root, ".velodom/features.json")));

    await writeProjectFile(
      secondRoot,
      "velodom-features.json",
      `${JSON.stringify(preset, null, 2)}\n`
    );
    assert.equal(await runVeloDomCli([
      "preset", "apply", "velodom-features.json", "--root", secondRoot
    ], context), 0);
    const secondManifest = JSON.parse(await readFile(
      join(secondRoot, ".velodom/features.json"),
      "utf8"
    ));
    assert.deepEqual(Object.keys(secondManifest.features), ["i18n", "tests", "lab"]);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(secondRoot, { recursive: true, force: true });
  }
});

test("feature removal refuses user-modified generated files", async () => {
  const root = await createProject();
  const errors = [];

  try {
    assert.equal(await runVeloDomCli(["add", "i18n", "--root", root], {
      stdout: () => {}, stderr: message => errors.push(message)
    }), 0);
    await writeProjectFile(root, "src/i18n.js", "export const userChanged = true;\n");

    assert.equal(await runVeloDomCli(["features", "--root", root], {
      stdout: message => errors.push(message), stderr: message => errors.push(message)
    }), 1);
    assert.equal(await runVeloDomCli(["remove", "i18n", "--root", root], {
      stdout: () => {}, stderr: message => errors.push(message)
    }), 1);
    assert.match(errors.join("\n"), /user changes/);
    assert.equal(
      await readFile(join(root, "src/i18n.js"), "utf8"),
      "export const userChanged = true;\n"
    );
    await access(join(root, ".velodom/features.json"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createProject() {
  const root = await mkdtemp(join(tmpdir(), "velodom-add-"));
  await writeProjectFile(root, "package.json", `${JSON.stringify({
    name: "fixture",
    private: true,
    type: "module",
    packageManager: "npm@11.6.2",
    scripts: { dev: "vite" },
    dependencies: { velodom: "^1.0.0" },
    devDependencies: { vite: "^8.1.3" }
  }, null, 2)}\n`);
  await writeProjectFile(
    root,
    "vite.config.js",
    'import { velodom } from "velodom/vite-plugin";\nexport default { plugins: [velodom()] };\n'
  );

  return root;
}

async function writeProjectFile(root, file, source) {
  const target = join(root, file);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, source, "utf8");
}
