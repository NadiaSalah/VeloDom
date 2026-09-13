/**
 * ----------------------------------------
 * Module: Project Test Runner
 * ----------------------------------------
 *
 * Selects and executes existing application-owned test scripts. The command
 * never substitutes a placeholder success for a missing test layer.
 * ----------------------------------------
 */

import { join } from "node:path";
import { readOptionalText } from "./analyzer.ts";
import type { CliContext } from "./types.ts";
import {
  resolveProjectPackageManager,
  runPackageScript
} from "../scaffolder/package-manager.ts";

type ProjectTestLayer =
  | "all"
  | "unit"
  | "browser"
  | "compiler"
  | "route"
  | "request"
  | "component"
  | "a11y";

interface TestProjectManifest {
  packageManager?: string;
  scripts?: Record<string, string>;
}

const TEST_LAYERS: readonly ProjectTestLayer[] = [
  "all",
  "unit",
  "browser",
  "compiler",
  "route",
  "request",
  "component",
  "a11y"
];

const TEST_SCRIPT_CANDIDATES: Record<ProjectTestLayer, readonly string[]> = {
  all: ["test"],
  unit: ["test:unit"],
  browser: ["test:browser", "test:e2e"],
  compiler: ["test:compiler"],
  route: ["test:route"],
  request: ["test:request"],
  component: ["test:component"],
  a11y: ["test:a11y", "test:accessibility"]
};

/** Runs one real project-owned test script selected by a VeloDom test layer. */
export async function runProjectTestCommand(
  context: CliContext,
  requestedLayer: string,
  flags: Set<string>
): Promise<number> {
  const manifestSource = await readOptionalText(join(context.cwd, "package.json"));

  if (!manifestSource) {
    throw new Error("vd test requires a package.json in the project root.");
  }

  const manifest = parseTestManifest(manifestSource);
  const layer = resolveTestLayer(requestedLayer, flags);
  const script = selectTestScript(manifest.scripts || {}, layer);
  const command = manifest.scripts?.[script]?.trim() || "";

  if (/\b(?:vd|velodom)\s+test\b/.test(command)) {
    throw new Error(`package.json script "${script}" cannot call vd test recursively.`);
  }

  const packageManager = await resolveProjectPackageManager(
    context.cwd,
    manifest.packageManager
  );

  context.stdout(`Running ${layer} tests through package.json script "${script}".`);
  await runPackageScript(context.cwd, packageManager, script);
  return 0;
}

/** Parses the project manifest without accepting non-object JSON. */
function parseTestManifest(source: string): TestProjectManifest {
  try {
    const parsed: unknown = JSON.parse(source);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }

    return parsed as TestProjectManifest;
  } catch {
    throw new Error("vd test could not parse the project package.json.");
  }
}

/** Resolves one positional or flag-based test layer and rejects ambiguity. */
function resolveTestLayer(
  requestedLayer: string,
  flags: Set<string>
): ProjectTestLayer {
  const positional = requestedLayer.trim().toLowerCase();
  const selected = TEST_LAYERS.filter(layer => flags.has(layer));

  if (positional) {
    if (!TEST_LAYERS.includes(positional as ProjectTestLayer)) {
      throw new Error(
        `Unknown test layer "${requestedLayer}". Use ${TEST_LAYERS.join(", ")}.`
      );
    }
    selected.push(positional as ProjectTestLayer);
  }

  const unique = [...new Set(selected)];

  if (unique.length > 1) {
    throw new Error("vd test accepts only one test layer at a time.");
  }

  return unique[0] || "all";
}

/** Selects the first supported script alias that is actually defined. */
function selectTestScript(
  scripts: Record<string, string>,
  layer: ProjectTestLayer
): string {
  const candidates = TEST_SCRIPT_CANDIDATES[layer];
  const script = candidates.find(name => String(scripts[name] || "").trim());

  if (script) return script;

  throw new Error(
    `vd test ${layer} requires package.json script ${candidates
      .map(name => `"${name}"`)
      .join(" or ")}. Add real tests first or run "vd add tests".`
  );
}
