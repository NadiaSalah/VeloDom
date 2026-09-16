/**
 * ----------------------------------------
 * Module: Plugin Manager
 * ----------------------------------------
 *
 * Validates plugin contracts, installs plugins in registration order, and
 * destroys their cleanup hooks in reverse order.
 * ----------------------------------------
 */

import { VD_PLUGIN } from "./constants.ts";
import type {
  PluginCapability,
  PluginConformanceOptions,
  PluginConformanceReport,
  PluginContext,
  PluginManifest,
  PluginManifestDiagnostic,
  VeloDomPlugin
} from "./types.ts";

type PluginCallback<TContext> = (
  context: TContext
) => unknown | Promise<unknown>;

interface NormalizedPlugin<TContext> {
  setup: PluginCallback<TContext>;
  cleanup: PluginCallback<TContext> | null;
}

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

/** Creates an idempotent manager for application plugin setup and cleanup. */
export function createPluginManager(
  plugins: VeloDomPlugin[] = [],
  getContext: () => PluginContext = () => ({} as PluginContext)
) {
  if (!Array.isArray(plugins)) {
    throw new TypeError("VeloDom plugins must be an array");
  }

  assertPluginConformance(plugins, { target: "browser" });
  const records = plugins.map((plugin, index) => normalizePlugin(plugin, index));
  const cleanups: PluginCallback<PluginContext>[] = [];
  let installed = false;

  return {
    async setup() {
      if (installed) return;

      installed = true;

      for (const record of records) {
        const result = await record.setup(getContext());
        const cleanup = typeof result === "function"
          ? (context: PluginContext) => Reflect.apply(
            result,
            undefined,
            [context]
          )
          : record.cleanup;

        if (typeof cleanup === "function") {
          cleanups.push(cleanup);
        }
      }
    },

    async destroy() {
      if (!installed) return;

      installed = false;

      for (const cleanup of cleanups.splice(0).reverse()) {
        await cleanup(getContext());
      }
    }
  };
}

/**
 * Checks a plugin's public shape without installing it in an application.
 *
 * Plugin authors can call this from their own conformance fixtures to catch a
 * malformed setup/cleanup contract before publishing an optional integration.
 */
export function assertPluginConformance(
  plugin: VeloDomPlugin | readonly VeloDomPlugin[],
  options: PluginConformanceOptions = {}
): void {
  const report = inspectPluginConformance(plugin, options);
  const problem = report.diagnostics.find(item => item.severity === "error");

  if (problem) {
    throw new TypeError(`[${problem.code}] ${problem.message}`);
  }
}

/**
 * Inspects plugin shapes, manifests, compatibility, and conflicts without
 * calling setup or cleanup. Legacy manifest-free plugins remain supported.
 */
export function inspectPluginConformance(
  plugin: VeloDomPlugin | readonly VeloDomPlugin[],
  options: PluginConformanceOptions = {}
): PluginConformanceReport {
  const diagnostics: PluginManifestDiagnostic[] = [];
  const manifests: PluginManifest[] = [];
  const plugins = Array.isArray(plugin) ? plugin : [plugin];
  const frameworkVersion = options.frameworkVersion || VD_PLUGIN.FRAMEWORK_VERSION;

  if (!parseVersion(frameworkVersion)) {
    diagnostics.push(createDiagnostic(
      VD_PLUGIN.CODES.COMPATIBILITY,
      `Invalid VeloDom version ${JSON.stringify(frameworkVersion)}.`
    ));
  }
  if (
    options.target !== undefined
    && !isPluginCapability(options.target)
  ) {
    diagnostics.push(createDiagnostic(
      VD_PLUGIN.CODES.CAPABILITY,
      `Unsupported plugin target ${JSON.stringify(options.target)}.`
    ));
  }

  plugins.forEach((candidate, index) => {
    if (!hasPluginShape(candidate)) {
      diagnostics.push(createDiagnostic(
        VD_PLUGIN.CODES.SHAPE,
        `Plugin ${index} must be a function or object with setup().`
      ));
      return;
    }
    if (typeof candidate === "function" || candidate.manifest === undefined) {
      return;
    }

    const manifest = inspectManifest(candidate.manifest, diagnostics);

    if (!manifest) return;
    manifests.push(manifest);
    const compatibility = satisfiesVersion(frameworkVersion, manifest.velodom);

    if (compatibility === null) {
      diagnostics.push(createDiagnostic(
        VD_PLUGIN.CODES.COMPATIBILITY,
        `${manifest.name} has invalid VeloDom range ${JSON.stringify(manifest.velodom)}.`,
        manifest.name
      ));
    } else if (!compatibility) {
      diagnostics.push(createDiagnostic(
        VD_PLUGIN.CODES.COMPATIBILITY,
        `${manifest.name} requires VeloDom ${manifest.velodom}; found ${frameworkVersion}.`,
        manifest.name
      ));
    }
    if (options.target && !manifest.capabilities.includes(options.target)) {
      diagnostics.push(createDiagnostic(
        VD_PLUGIN.CODES.CAPABILITY,
        `${manifest.name} does not declare ${options.target}.`,
        manifest.name
      ));
    }
  });

  inspectManifestRelationships(manifests, diagnostics);

  return {
    compatible: diagnostics.length === 0,
    diagnostics,
    manifests
  };
}

/** Normalizes the plugin. */
function normalizePlugin(
  plugin: unknown,
  index: number
): NormalizedPlugin<PluginContext> {
  if (typeof plugin === "function") {
    return {
      setup: context => Reflect.apply(plugin, undefined, [context]),
      cleanup: null
    };
  }

  if (
    plugin
    && typeof plugin === "object"
    && "setup" in plugin
    && typeof plugin.setup === "function"
  ) {
    const setup = plugin.setup;
    const cleanup = "cleanup" in plugin
      && typeof plugin.cleanup === "function"
      ? plugin.cleanup
      : null;

    return {
      setup: context => Reflect.apply(setup, plugin, [context]),
      cleanup: cleanup
        ? context => Reflect.apply(cleanup, plugin, [context])
        : null
    };
  }

  throw new TypeError(
    `Plugin at index ${index} must be a function or an object with setup()`
  );
}

/** Checks the executable shape without invoking application code. */
function hasPluginShape(plugin: unknown): plugin is VeloDomPlugin {
  return typeof plugin === "function" || Boolean(
    plugin
    && typeof plugin === "object"
    && "setup" in plugin
    && typeof plugin.setup === "function"
  );
}

/** Validates and copies a manifest so callers never receive mutable input. */
function inspectManifest(
  value: unknown,
  diagnostics: PluginManifestDiagnostic[]
): PluginManifest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    diagnostics.push(createDiagnostic(
      VD_PLUGIN.CODES.MANIFEST,
      "Plugin manifest must be an object."
    ));
    return null;
  }

  const candidate = value as Partial<PluginManifest>;
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const version = typeof candidate.version === "string"
    ? candidate.version.trim()
    : "";
  const velodom = typeof candidate.velodom === "string"
    ? candidate.velodom.trim()
    : "";
  const capabilities = Array.isArray(candidate.capabilities)
    ? [...candidate.capabilities]
    : [];
  const conflicts = candidate.conflicts === undefined
    ? []
    : Array.isArray(candidate.conflicts)
      ? [...candidate.conflicts]
      : null;
  const manifestPlugin = name || undefined;
  let valid = true;

  if (!isPluginName(name)) {
    diagnostics.push(createDiagnostic(
      VD_PLUGIN.CODES.MANIFEST,
      "Plugin name must be lowercase and package-style.",
      manifestPlugin
    ));
    valid = false;
  }
  if (!parseVersion(version)) {
    diagnostics.push(createDiagnostic(
      VD_PLUGIN.CODES.MANIFEST,
      `${name || "Plugin"} needs an exact semantic version.`,
      manifestPlugin
    ));
    valid = false;
  }
  if (!velodom) {
    diagnostics.push(createDiagnostic(
      VD_PLUGIN.CODES.COMPATIBILITY,
      `${name || "Plugin"} needs a VeloDom range.`,
      manifestPlugin
    ));
    valid = false;
  }
  if (
    capabilities.length === 0
    || capabilities.some(item => !isPluginCapability(item))
    || new Set(capabilities).size !== capabilities.length
  ) {
    diagnostics.push(createDiagnostic(
      VD_PLUGIN.CODES.CAPABILITY,
      `${name || "Plugin"} needs unique browser, build, or node capabilities.`,
      manifestPlugin
    ));
    valid = false;
  }
  if (
    conflicts === null
    || conflicts.some(item => !isPluginName(item) || item === name)
    || new Set(conflicts).size !== conflicts.length
  ) {
    diagnostics.push(createDiagnostic(
      VD_PLUGIN.CODES.CONFLICT,
      `${name || "Plugin"} has invalid conflicts.`,
      manifestPlugin
    ));
    valid = false;
  }

  return valid && conflicts
    ? {
      name,
      version,
      velodom,
      capabilities: capabilities as PluginCapability[],
      ...(conflicts.length ? { conflicts } : {})
    }
    : null;
}

/** Reports duplicate names and declared pair conflicts deterministically. */
function inspectManifestRelationships(
  manifests: readonly PluginManifest[],
  diagnostics: PluginManifestDiagnostic[]
) {
  const names = new Set<string>();

  manifests.forEach(manifest => {
    if (names.has(manifest.name)) {
      diagnostics.push(createDiagnostic(
        VD_PLUGIN.CODES.DUPLICATE,
        `${manifest.name} is duplicated.`,
        manifest.name
      ));
    }
    names.add(manifest.name);
  });

  const reportedPairs = new Set<string>();

  manifests.forEach(manifest => {
    manifest.conflicts?.forEach(conflict => {
      if (!names.has(conflict)) return;
      const pair = [manifest.name, conflict].sort().join(":");

      if (reportedPairs.has(pair)) return;
      reportedPairs.add(pair);
      diagnostics.push(createDiagnostic(
        VD_PLUGIN.CODES.CONFLICT,
        `${manifest.name} conflicts with ${conflict}.`,
        manifest.name
      ));
    });
  });
}

/** Creates one stable, machine-readable conformance finding. */
function createDiagnostic(
  code: string,
  message: string,
  plugin?: string
): PluginManifestDiagnostic {
  return {
    code,
    message,
    ...(plugin ? { plugin } : {}),
    severity: "error"
  };
}

/** Accepts npm-style unscoped or scoped lowercase names without URLs. */
function isPluginName(value: unknown): value is string {
  return typeof value === "string"
    && /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(value);
}

/** Restricts capabilities to surfaces VeloDom can verify independently. */
function isPluginCapability(value: unknown): value is PluginCapability {
  return typeof value === "string"
    && VD_PLUGIN.CAPABILITIES.includes(value as PluginCapability);
}

/** Parses stable semantic versions; prerelease/build labels do not affect bounds. */
function parseVersion(value: string): ParsedVersion | null {
  const match = String(value).match(
    /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
  );

  return match?.[1] && match[2] && match[3]
    ? {
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3])
    }
    : null;
}

/** Evaluates a deliberately small, documented semantic-version range subset. */
function satisfiesVersion(version: string, range: string): boolean | null {
  const current = parseVersion(version);
  const normalized = String(range).trim();

  if (!current) return null;
  if (normalized === "*") return true;
  const exact = parseVersion(normalized);

  if (exact) return compareVersion(current, exact) === 0;
  const wildcard = normalized.match(/^(\d+)\.(?:x|\*)$/i);

  if (wildcard?.[1]) return current.major === Number(wildcard[1]);
  if (normalized.startsWith("^") || normalized.startsWith("~")) {
    const operator = normalized[0];
    const lower = parseVersion(normalized.slice(1));

    if (!lower) return null;
    const upper = operator === "~"
      ? { major: lower.major, minor: lower.minor + 1, patch: 0 }
      : getCaretUpperBound(lower);

    return compareVersion(current, lower) >= 0
      && compareVersion(current, upper) < 0;
  }

  const comparators = normalized.split(/\s+/).filter(Boolean);

  if (comparators.length === 0) return null;
  const results = comparators.map(token => {
    const match = token.match(/^(>=|<=|>|<|=)(.+)$/);
    const expected = match?.[2] ? parseVersion(match[2]) : null;

    if (!match?.[1] || !expected) return null;
    const comparison = compareVersion(current, expected);

    if (match[1] === ">=") return comparison >= 0;
    if (match[1] === "<=") return comparison <= 0;
    if (match[1] === ">") return comparison > 0;
    if (match[1] === "<") return comparison < 0;
    return comparison === 0;
  });

  return results.includes(null) ? null : results.every(Boolean);
}

/** Applies standard caret upper bounds for stable pre-1.0 compatibility. */
function getCaretUpperBound(version: ParsedVersion): ParsedVersion {
  if (version.major > 0) {
    return { major: version.major + 1, minor: 0, patch: 0 };
  }
  if (version.minor > 0) {
    return { major: 0, minor: version.minor + 1, patch: 0 };
  }
  return { major: 0, minor: 0, patch: version.patch + 1 };
}

/** Compares numeric semantic-version cores. */
function compareVersion(left: ParsedVersion, right: ParsedVersion) {
  return left.major - right.major
    || left.minor - right.minor
    || left.patch - right.patch;
}
