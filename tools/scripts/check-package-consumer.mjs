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
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../..", import.meta.url))
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
    join(workspaceRoot, "test-fixtures", "package-consumer"),
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

  console.log(
    "Installed VeloDom package consumer check passed."
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
