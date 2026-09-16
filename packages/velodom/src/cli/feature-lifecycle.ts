/**
 * ----------------------------------------
 * Module: Feature Lifecycle
 * ----------------------------------------
 *
 * Audits, removes, upgrades, exports, and applies first-party optional feature
 * plans using the installer's ownership hashes. User-modified files are never
 * deleted or restored automatically.
 * ----------------------------------------
 */

import {
  mkdir,
  readFile,
  unlink,
  writeFile
} from "node:fs/promises";
import {
  dirname,
  isAbsolute,
  relative,
  resolve
} from "node:path";
import { VD_FEATURE_INSTALLER } from "../constants.ts";
import {
  hashSource,
  hasValidFeatureOptions,
  installProjectFeature,
  normalizeFeature,
  readFeatureManifest,
  writeFeatureManifest,
  type FeatureInstallResult,
  type FeatureManifest,
  type FeatureManifestEntry,
  type InstallableFeature
} from "./feature-installer.ts";

type ManagedFileState = "clean" | "missing" | "modified";

/** Compatibility facts for one installed first-party feature. */
export interface FeatureCompatibilityItem {
  feature: InstallableFeature;
  reversible: boolean;
  state: ManagedFileState;
  issues: string[];
}

/** Complete compatibility report for the local feature ownership manifest. */
export interface FeatureCompatibilityReport {
  frameworkRange: string;
  manifestVersion: number;
  supportedManifestVersion: number;
  features: FeatureCompatibilityItem[];
}

/** Result returned by a safe feature removal. */
export interface FeatureRemoveResult {
  removedFeatures: InstallableFeature[];
  removedFiles: string[];
  restoredFiles: string[];
}

/** Versioned, data-only preset accepted by the feature lifecycle. */
export interface FeaturePreset {
  features: Array<{
    name: InstallableFeature;
    options: Record<string, string>;
  }>;
  version: number;
}

interface FileSnapshot {
  path: string;
  source: string | null;
}

/** Inspects ownership hashes without changing the project. */
export async function inspectFeatureCompatibility(
  root: string
): Promise<FeatureCompatibilityReport> {
  const manifest = await readFeatureManifest(root);
  const features: FeatureCompatibilityItem[] = [];
  const virtualSources = new Map<string, string | null>();

  for (const [feature, entry] of installedEntries(manifest).reverse()) {
    const report = await inspectFeatureEntry(root, feature, entry, virtualSources);
    features.unshift(report);

    if (report.state === "clean" && report.reversible) {
      entry.createdFiles.forEach(file => virtualSources.set(file.path, null));
      entry.modifiedFiles.forEach(file => {
        virtualSources.set(file.path, file.beforeSource || "");
      });
    }
  }

  return {
    frameworkRange: "velodom@1.x",
    manifestVersion: manifest.version,
    supportedManifestVersion: VD_FEATURE_INSTALLER.MANIFEST_VERSION,
    features
  };
}

/** Removes one feature, or all features in reverse installation order. */
export async function removeProjectFeature(
  root: string,
  requestedFeature: string
): Promise<FeatureRemoveResult> {
  const manifest = await readFeatureManifest(root);
  const targets = resolveLifecycleTargets(manifest, requestedFeature, true);
  const plans = targets.map(feature => {
    const entry = manifest.features[feature];

    if (!entry) throw new Error(`VeloDom feature "${feature}" is not installed.`);
    return { entry, feature };
  });
  const snapshots = await captureManagedSnapshots(root, manifest);
  const removedFiles: string[] = [];
  const restoredFiles: string[] = [];

  try {
    for (const { entry, feature } of plans) {
      await assertEntryCanBeRemoved(root, feature, entry);

      for (const file of entry.createdFiles) {
        const target = resolveManagedPath(root, file.path);

        if (await readText(target) !== null) {
          await unlink(target);
          removedFiles.push(file.path);
        }
      }

      for (const file of entry.modifiedFiles) {
        await writeManagedText(root, file.path, file.beforeSource || "");
        restoredFiles.push(file.path);
      }

      delete manifest.features[feature];
    }

    if (installedEntries(manifest).length === 0) {
      await unlinkIfPresent(resolve(root, VD_FEATURE_INSTALLER.MANIFEST_FILE));
    } else {
      await writeFeatureManifest(root, manifest);
    }
  } catch (error) {
    await restoreSnapshots(root, snapshots);
    throw error;
  }

  return {
    removedFeatures: plans.map(plan => plan.feature),
    removedFiles,
    restoredFiles
  };
}

/** Reinstalls clean managed features from current first-party generators. */
export async function upgradeProjectFeature(
  root: string,
  requestedFeature: string
): Promise<FeatureInstallResult[]> {
  const manifest = await readFeatureManifest(root);
  const targets = resolveLifecycleTargets(manifest, requestedFeature, false);
  const originalOrder = installedEntries(manifest)
    .map(([feature]) => feature)
    .filter(feature => targets.includes(feature));
  const entries = new Map(originalOrder.map(feature => [
    feature,
    manifest.features[feature] as FeatureManifestEntry
  ]));
  const snapshots = await captureManagedSnapshots(root, manifest);

  try {
    if (requestedFeature.trim().toLowerCase() === "all") {
      await removeProjectFeature(root, "all");
    } else {
      await removeProjectFeature(root, targets[0] || "");
    }

    const results: FeatureInstallResult[] = [];

    for (const feature of originalOrder) {
      const entry = entries.get(feature);
      results.push(await installProjectFeature(
        root,
        feature,
        flagsFromFeatureOptions(entry?.options || {})
      ));
    }

    return results;
  } catch (error) {
    await restoreSnapshots(root, snapshots);
    throw error;
  }
}

/** Writes a portable data-only preset containing installed feature choices. */
export async function exportFeaturePreset(
  root: string,
  output = ".velodom/preset.json"
): Promise<{ file: string; preset: FeaturePreset }> {
  const manifest = await readFeatureManifest(root);
  const preset: FeaturePreset = {
    features: installedEntries(manifest).map(([name, entry]) => ({
      name,
      options: { ...entry.options }
    })),
    version: 1
  };
  const file = normalizeProjectFile(output);

  await writeManagedText(root, file, `${JSON.stringify(preset, null, 2)}\n`);
  return { file, preset };
}

/** Applies a portable preset through the same conflict-safe installer. */
export async function applyFeaturePreset(
  root: string,
  input: string
): Promise<FeatureInstallResult[]> {
  const file = normalizeProjectFile(input);
  const source = await readText(resolveManagedPath(root, file));

  if (source === null) throw new Error(`Feature preset "${file}" does not exist.`);

  const preset = parseFeaturePreset(source);
  const before = await readFeatureManifest(root);
  const installedBefore = new Set(installedEntries(before).map(([feature]) => feature));
  const newlyInstalled: InstallableFeature[] = [];
  const results: FeatureInstallResult[] = [];

  try {
    for (const item of preset.features) {
      const result = await installProjectFeature(
        root,
        item.name,
        flagsFromFeatureOptions(item.options)
      );
      results.push(result);
      if (!result.alreadyInstalled && !installedBefore.has(item.name)) {
        newlyInstalled.push(item.name);
      }
    }
    return results;
  } catch (error) {
    for (const feature of newlyInstalled.reverse()) {
      await removeProjectFeature(root, feature);
    }
    throw error;
  }
}

/** Inspects one entry and reports only source-provable ownership facts. */
async function inspectFeatureEntry(
  root: string,
  feature: InstallableFeature,
  entry: FeatureManifestEntry,
  virtualSources?: Map<string, string | null>
): Promise<FeatureCompatibilityItem> {
  const issues: string[] = [];
  let state: ManagedFileState = "clean";

  for (const file of entry.createdFiles) {
    const source = await readEntrySource(root, file.path, virtualSources);

    if (source === null) {
      state = "missing";
      issues.push(`missing generated file ${file.path}`);
    } else if (hashSource(source) !== file.hash) {
      state = "modified";
      issues.push(`user-modified generated file ${file.path}`);
    }
  }

  for (const file of entry.modifiedFiles) {
    const source = await readEntrySource(root, file.path, virtualSources);

    if (source === null) {
      state = "missing";
      issues.push(`missing controlled file ${file.path}`);
    } else if (hashSource(source) !== file.afterHash) {
      state = "modified";
      issues.push(`controlled file changed after installation: ${file.path}`);
    }

    if (!file.beforeSource || hashSource(file.beforeSource) !== file.beforeHash) {
      issues.push(`legacy ownership entry cannot restore ${file.path}`);
    }
  }

  return {
    feature,
    reversible: entry.modifiedFiles.every(file => (
      typeof file.beforeSource === "string"
      && hashSource(file.beforeSource) === file.beforeHash
    )),
    state,
    issues
  };
}

/** Reads from a virtual reverse-installation view before falling back to disk. */
async function readEntrySource(
  root: string,
  path: string,
  virtualSources?: Map<string, string | null>
) {
  if (virtualSources?.has(path)) return virtualSources.get(path) ?? null;

  const source = await readText(resolveManagedPath(root, path));
  virtualSources?.set(path, source);
  return source;
}

/** Rejects a removal before any mutation when ownership is not exact. */
async function assertEntryCanBeRemoved(
  root: string,
  feature: InstallableFeature,
  entry: FeatureManifestEntry
) {
  const report = await inspectFeatureEntry(root, feature, entry);

  if (!report.reversible) {
    throw new Error(
      `Refusing to remove "${feature}": its legacy manifest cannot restore controlled files.`
    );
  }
  if (
    report.state === "modified"
    || report.issues.some(issue => issue.startsWith("missing controlled file"))
  ) {
    throw new Error(
      `Refusing to remove "${feature}": managed files contain user changes. Run vd features for details.`
    );
  }
}

/** Resolves a feature selection while preserving safe reverse removal order. */
function resolveLifecycleTargets(
  manifest: FeatureManifest,
  requestedFeature: string,
  reverse: boolean
): InstallableFeature[] {
  const installed = installedEntries(manifest).map(([feature]) => feature);
  const requested = requestedFeature.trim().toLowerCase();

  if (!requested) throw new Error("A feature name or all is required.");
  if (requested === "all") return reverse ? installed.reverse() : installed;

  const feature = normalizeFeature(requested);

  if (!manifest.features[feature]) {
    throw new Error(`VeloDom feature "${feature}" is not installed.`);
  }
  return [feature];
}

/** Returns installed entries in manifest insertion order. */
function installedEntries(
  manifest: FeatureManifest
): Array<[InstallableFeature, FeatureManifestEntry]> {
  return Object.entries(manifest.features).filter(
    (entry): entry is [InstallableFeature, FeatureManifestEntry] => Boolean(entry[1])
  );
}

/** Converts recorded installer options back to the supported flags. */
function flagsFromFeatureOptions(options: Record<string, string>): Set<string> {
  const flags = new Set<string>();

  if (options.mode === "unit" || options.mode === "e2e" || options.mode === "all") {
    flags.add(options.mode);
  }
  return flags;
}

/** Captures all owned files so an interrupted upgrade can roll back exactly. */
async function captureManagedSnapshots(
  root: string,
  manifest: FeatureManifest
): Promise<FileSnapshot[]> {
  const paths = new Set<string>([VD_FEATURE_INSTALLER.MANIFEST_FILE]);

  for (const [, entry] of installedEntries(manifest)) {
    entry.createdFiles.forEach(file => paths.add(file.path));
    entry.modifiedFiles.forEach(file => paths.add(file.path));
  }

  return await Promise.all([...paths].map(async path => ({
    path,
    source: await readText(resolveManagedPath(root, path))
  })));
}

/** Restores a transaction snapshot after a failed upgrade. */
async function restoreSnapshots(root: string, snapshots: FileSnapshot[]) {
  for (const snapshot of snapshots) {
    if (snapshot.source === null) {
      await unlinkIfPresent(resolveManagedPath(root, snapshot.path));
    } else {
      await writeManagedText(root, snapshot.path, snapshot.source);
    }
  }
}

/** Parses and bounds a preset to known data-only feature choices. */
function parseFeaturePreset(source: string): FeaturePreset {
  try {
    const value = JSON.parse(source) as Partial<FeaturePreset>;

    if (value.version !== 1 || !Array.isArray(value.features)) {
      throw new Error("unsupported preset");
    }

    const names = new Set<string>();
    const features = value.features.map(item => {
      if (!item || typeof item !== "object") throw new Error("invalid feature");
      const name = normalizeFeature(String(item.name || ""));
      if (names.has(name)) throw new Error(`duplicate feature ${name}`);
      names.add(name);
      const options = item.options && typeof item.options === "object"
        ? Object.fromEntries(Object.entries(item.options).map(([key, option]) => [
          key,
          String(option)
        ]))
        : {};

      if (!hasValidFeatureOptions(name, options)) throw new Error(`invalid ${name} options`);
      return { name, options };
    });

    return { features, version: 1 };
  } catch (error) {
    throw new Error(
      `Invalid VeloDom feature preset: ${error instanceof Error ? error.message : String(error)}.`,
      { cause: error }
    );
  }
}

/** Resolves a manifest-owned path and rejects traversal or absolute input. */
function resolveManagedPath(root: string, path: string): string {
  const relativePath = normalizeProjectFile(path);
  const target = resolve(root, relativePath);
  const fromRoot = relative(resolve(root), target);

  if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
    throw new Error(`Managed path escapes the project root: ${path}.`);
  }
  return target;
}

/** Normalizes one project-local data path. */
function normalizeProjectFile(path: string): string {
  const normalized = String(path || "").trim().replaceAll("\\", "/");

  if (
    !normalized
    || normalized.includes("\0")
    || isAbsolute(normalized)
    || normalized.split("/").some(part => part === ".." || part === "." || !part)
  ) {
    throw new Error(`Use a project-relative file path, received "${path}".`);
  }
  return normalized;
}

/** Reads one managed text file while preserving missing versus empty. */
async function readText(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/** Writes a managed file after creating only its containing directory. */
async function writeManagedText(root: string, path: string, source: string) {
  const target = resolveManagedPath(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, source, "utf8");
}

/** Deletes one exact file and ignores only an already-missing path. */
async function unlinkIfPresent(file: string) {
  try {
    await unlink(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
