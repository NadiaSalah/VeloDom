/**
 * ----------------------------------------
 * Module: CLI Feature Installer
 * ----------------------------------------
 *
 * Adds existing first-party, application-owned capabilities to a project with
 * preflight conflict checks and a generated-file ownership manifest. It never
 * installs packages, deletes files, or silently overwrites user work.
 * ----------------------------------------
 */

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { VD_FEATURE_INSTALLER } from "../constants.ts";
import { readOptionalText } from "./analyzer.ts";
import {
  createLocalizationFeatureFiles,
  createTestingFeatureFiles
} from "../scaffolder/features/optional-files.ts";
import type {
  ScaffoldLanguage,
  ScaffoldTesting
} from "../scaffolder/types.ts";

/** Optional first-party capabilities accepted by `vd add`. */
export type InstallableFeature = "i18n" | "lab" | "tests";

/** Result returned after an idempotent project feature installation. */
export interface FeatureInstallResult {
  alreadyInstalled: boolean;
  createdFiles: string[];
  feature: InstallableFeature;
  modifiedFiles: string[];
  nextSteps: string[];
}

/** One installed feature's generated-file ownership and reversible mutations. */
export interface FeatureManifestEntry {
  createdFiles: Array<{ hash: string; path: string }>;
  existingFiles: string[];
  modifiedFiles: Array<{
    afterHash: string;
    afterSource?: string;
    beforeHash: string;
    beforeSource?: string;
    path: string;
  }>;
  options: Record<string, string>;
}

/** Versioned local ownership contract used by safe feature lifecycle commands. */
export interface FeatureManifest {
  features: Partial<Record<InstallableFeature, FeatureManifestEntry>>;
  version: number;
}

interface ProjectPackageJson {
  devDependencies?: Record<string, string>;
  packageManager?: string;
  scripts?: Record<string, string>;
  [key: string]: unknown;
}

/** Installs one reviewed optional feature into an existing VeloDom project. */
export async function installProjectFeature(
  root: string,
  requestedFeature: string,
  flags: Set<string>
): Promise<FeatureInstallResult> {
  const feature = normalizeFeature(requestedFeature);
  const ownership = await readFeatureManifest(root);
  const installed = ownership.features[feature];

  if (installed) {
    return {
      alreadyInstalled: true,
      createdFiles: installed.createdFiles.map(file => file.path),
      feature,
      modifiedFiles: installed.modifiedFiles.map(file => file.path),
      nextSteps: []
    };
  }

  const packagePath = join(root, "package.json");
  const packageSource = await readOptionalText(packagePath);

  if (!packageSource) {
    throw new Error("vd add requires an existing project package.json.");
  }

  const packageJson = parseProjectPackage(packageSource);
  const language = await detectProjectLanguage(root);
  const generatedFiles: Record<string, string> = {};
  const nextSteps: string[] = [];
  const modifiedSources = new Map<string, { before: string; after: string }>();
  const options: Record<string, string> = {};

  packageJson.scripts ||= {};
  packageJson.devDependencies ||= {};

  if (feature === "lab") {
    addManifestValue(packageJson.scripts, "lab", "vd lab", "package.json scripts");
  }

  if (feature === "tests") {
    const testing = resolveTestingMode(flags);
    const packageManager = readPackageManager(packageJson.packageManager);
    const devCommand = packageManager === "pnpm" || packageManager === "yarn"
      ? `${packageManager} dev`
      : `${packageManager} run dev`;

    Object.assign(
      generatedFiles,
      createTestingFeatureFiles(language, testing, devCommand)
    );
    configureTestScripts(packageJson, testing);
    if (testing === "e2e" || testing === "all") {
      addManifestValue(
        packageJson.devDependencies,
        "@playwright/test",
        "^1.61.1",
        "package.json devDependencies"
      );
      nextSteps.push(
        `${packageManager} install`,
        testing === "all" ? "npx vd test" : "npx vd test browser"
      );
    } else {
      nextSteps.push("npx vd test unit");
    }
    options.mode = testing;
  }

  if (feature === "i18n") {
    Object.assign(generatedFiles, createLocalizationFeatureFiles(language));
    const viteFile = await findViteConfig(root);
    const viteSource = await readOptionalText(join(root, viteFile));

    if (!viteSource) {
      throw new Error("vd add i18n requires vite.config.js or vite.config.ts.");
    }

    const nextViteSource = configureLocalizationVite(
      viteSource,
      language === "typescript" ? "ts" : "js"
    );

    if (nextViteSource !== viteSource) {
      modifiedSources.set(viteFile, {
        before: viteSource,
        after: nextViteSource
      });
    }
    nextSteps.push("Add an app-relative /localization link to your navigation if desired.");
  }

  const generated = await preflightGeneratedFiles(root, generatedFiles);
  const nextPackageSource = `${JSON.stringify(packageJson, null, 2)}\n`;

  if (nextPackageSource !== packageSource) {
    modifiedSources.set("package.json", {
      before: packageSource,
      after: nextPackageSource
    });
  }

  await Promise.all(generated.created.map(async file => {
    const target = join(root, file.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.source, "utf8");
  }));
  await Promise.all([...modifiedSources].map(async ([file, source]) => {
    await writeFile(join(root, file), source.after, "utf8");
  }));

  ownership.features[feature] = {
    createdFiles: generated.created.map(file => ({
      hash: hashSource(file.source),
      path: file.path
    })),
    existingFiles: generated.existing,
    modifiedFiles: [...modifiedSources].map(([path, source]) => ({
      afterHash: hashSource(source.after),
      afterSource: source.after,
      beforeHash: hashSource(source.before),
      beforeSource: source.before,
      path
    })),
    options
  };
  await writeFeatureManifest(root, ownership);

  return {
    alreadyInstalled: false,
    createdFiles: generated.created.map(file => file.path),
    feature,
    modifiedFiles: [...modifiedSources.keys()],
    nextSteps
  };
}

/** Resolves aliases without growing a second third-party plugin registry. */
export function normalizeFeature(value: string): InstallableFeature {
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, InstallableFeature> = {
    i18n: "i18n",
    lab: "lab",
    localization: "i18n",
    test: "tests",
    testing: "tests",
    tests: "tests"
  };
  const feature = aliases[normalized];

  if (!feature) {
    throw new Error(
      `Unknown optional feature "${value}". Available features: ${VD_FEATURE_INSTALLER.FEATURES.join(", ")}.`
    );
  }

  return feature;
}

/** Selects a real test layer; unit is the small default. */
function resolveTestingMode(
  flags: Set<string>
): Exclude<ScaffoldTesting, "none"> {
  const selected = [
    flags.has("unit") || flags.has("test-unit") ? "unit" : null,
    flags.has("e2e") || flags.has("test-e2e") ? "e2e" : null,
    flags.has("all") || flags.has("test-all") ? "all" : null
  ].filter((value): value is Exclude<ScaffoldTesting, "none"> => value !== null);

  if (selected.length > 1) throw new Error("Choose only one tests mode.");

  return selected[0] || "unit";
}

/** Adds one script/dependency without replacing a conflicting user value. */
function addManifestValue(
  record: Record<string, string>,
  key: string,
  value: string,
  label: string
) {
  if (record[key] !== undefined && record[key] !== value) {
    throw new Error(`${label}.${key} already has a different value.`);
  }

  record[key] = value;
}

/** Adds scripts that execute the selected test layers rather than placeholders. */
function configureTestScripts(
  packageJson: ProjectPackageJson,
  testing: Exclude<ScaffoldTesting, "none">
) {
  const scripts = packageJson.scripts || {};

  if (testing === "unit" || testing === "all") {
    addManifestValue(scripts, "test:unit", "node --test tests/unit/*.test.*", "package.json scripts");
  }
  if (testing === "e2e" || testing === "all") {
    addManifestValue(scripts, "test:e2e", "playwright test", "package.json scripts");
  }

  const testCommand = testing === "unit"
    ? scripts["test:unit"] || "node --test tests/unit/*.test.*"
    : testing === "e2e"
      ? scripts["test:e2e"] || "playwright test"
      : `${scripts["test:unit"]} && ${scripts["test:e2e"]}`;
  addManifestValue(scripts, "test", testCommand, "package.json scripts");
  packageJson.scripts = scripts;
}

/** Adds build-time localization to the familiar generated Vite configuration. */
function configureLocalizationVite(source: string, extension: "js" | "ts") {
  let result = source;

  if (!/\blocalizationOptions\b/.test(result)) {
    const importLine = `import { localizationOptions } from "./src/i18n.${extension}";`;
    const velodomImport = /import\s+\{\s*velodom\s*\}\s+from\s+["']velodom\/vite-plugin["'];?/;

    if (!velodomImport.test(result)) {
      throw new Error("vite.config must import velodom from velodom/vite-plugin before adding i18n.");
    }
    result = result.replace(velodomImport, match => `${match}\n${importLine}`);
  }

  if (/\bvelodom\(\s*\)/.test(result)) {
    return result.replace(
      /\bvelodom\(\s*\)/,
      "velodom({ localization: localizationOptions })"
    );
  }

  if (/\bvelodom\(\s*\{[^}]*\blocalization\s*:/s.test(result)) return result;
  if (/\bvelodom\(\s*\{/s.test(result)) {
    return result.replace(/\bvelodom\(\s*\{/, "velodom({ localization: localizationOptions,");
  }

  throw new Error("Could not safely update the velodom(...) call in the Vite config.");
}

/** Verifies every generated path before the installer performs any write. */
async function preflightGeneratedFiles(
  root: string,
  files: Record<string, string>
) {
  const created: Array<{ path: string; source: string }> = [];
  const existing: string[] = [];

  for (const [path, source] of Object.entries(files)) {
    const current = await readOptionalText(join(root, path));

    if (current === "") {
      created.push({ path, source });
    } else if (current === source) {
      existing.push(path);
    } else {
      throw new Error(`Refusing to overwrite existing user file ${path}.`);
    }
  }

  return { created, existing };
}

/** Reads and validates package JSON before applying controlled mutations. */
function parseProjectPackage(source: string): ProjectPackageJson {
  try {
    const value: unknown = JSON.parse(source);

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("not an object");
    }

    return value as ProjectPackageJson;
  } catch {
    throw new Error("vd add requires valid JSON in package.json.");
  }
}

/** Detects application source language without requiring TypeScript. */
async function detectProjectLanguage(root: string): Promise<ScaffoldLanguage> {
  return await readOptionalText(join(root, "tsconfig.json"))
    ? "typescript"
    : "javascript";
}

/** Finds the project Vite configuration using supported starter names. */
async function findViteConfig(root: string) {
  for (const file of ["vite.config.ts", "vite.config.js", "vite.config.mjs"]) {
    if (await readOptionalText(join(root, file))) return file;
  }

  return "vite.config.js";
}

/** Uses the package manager declaration for generated command hints. */
function readPackageManager(value: string | undefined) {
  const name = value?.split("@", 1)[0];

  return name === "pnpm" || name === "yarn" || name === "bun" ? name : "npm";
}

/** Reads the feature ownership file or creates its initial contract. */
export async function readFeatureManifest(root: string): Promise<FeatureManifest> {
  const source = await readOptionalText(
    join(root, VD_FEATURE_INSTALLER.MANIFEST_FILE)
  );

  if (!source) {
    return {
      features: {},
      version: VD_FEATURE_INSTALLER.MANIFEST_VERSION
    };
  }

  try {
    const value = JSON.parse(source) as Partial<FeatureManifest>;

    if (!isFeatureManifest(value)) {
      throw new Error("unsupported manifest");
    }

    return value;
  } catch {
    throw new Error(`Invalid ${VD_FEATURE_INSTALLER.MANIFEST_FILE}.`);
  }
}

/** Validates ownership metadata before lifecycle code trusts file records. */
function isFeatureManifest(value: Partial<FeatureManifest>): value is FeatureManifest {
  if (
    value.version !== VD_FEATURE_INSTALLER.MANIFEST_VERSION
    || !value.features
    || typeof value.features !== "object"
    || Array.isArray(value.features)
  ) {
    return false;
  }

  for (const [feature, candidate] of Object.entries(value.features)) {
    if (!VD_FEATURE_INSTALLER.FEATURES.includes(feature as InstallableFeature)) {
      return false;
    }
    if (!candidate || typeof candidate !== "object") return false;

    const entry = candidate as Partial<FeatureManifestEntry>;

    if (
      !Array.isArray(entry.createdFiles)
      || !entry.createdFiles.every(file => (
        file && typeof file.path === "string" && typeof file.hash === "string"
      ))
      || !Array.isArray(entry.existingFiles)
      || !entry.existingFiles.every(file => typeof file === "string")
      || !Array.isArray(entry.modifiedFiles)
      || !entry.modifiedFiles.every(file => (
        file
        && typeof file.path === "string"
        && typeof file.beforeHash === "string"
        && typeof file.afterHash === "string"
        && (file.beforeSource === undefined || typeof file.beforeSource === "string")
        && (file.afterSource === undefined || typeof file.afterSource === "string")
      ))
      || !entry.options
      || typeof entry.options !== "object"
      || Array.isArray(entry.options)
      || !Object.values(entry.options).every(option => typeof option === "string")
    ) {
      return false;
    }
  }

  return true;
}

/** Writes a stable ownership manifest after all feature writes succeed. */
export async function writeFeatureManifest(root: string, manifest: FeatureManifest) {
  const file = join(root, VD_FEATURE_INSTALLER.MANIFEST_FILE);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

/** Creates a stable source hash used by future safe lifecycle commands. */
export function hashSource(source: string) {
  return createHash("sha256").update(source).digest("hex");
}
