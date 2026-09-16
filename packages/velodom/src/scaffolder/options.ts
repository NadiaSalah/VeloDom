/**
 * ----------------------------------------
 * Module: Scaffolder Option Resolution
 * ----------------------------------------
 *
 * Merges recommended defaults, interactive answers, and explicit CLI flags
 * into one deterministic plan before filesystem work begins.
 * ----------------------------------------
 */

import { detectPackageManager } from "./package-manager.ts";
import {
  promptForScaffold,
  type InteractiveScaffoldAnswers
} from "./prompts.ts";
import type { ScaffoldPlan, ScaffoldRequest } from "./types.ts";
import {
  normalizeProjectPackageName,
  parsePackageManager,
  parseStarter,
  parseTesting,
  resolveProjectDestination,
  validateScaffoldFlags
} from "./validation.ts";

/** Resolves interactive and scriptable input into a validated scaffold plan. */
export async function resolveScaffoldPlan(request: ScaffoldRequest): Promise<ScaffoldPlan> {
  validateScaffoldFlags(request.flags);
  const detectedPackageManager = detectPackageManager();
  const packageManager = parsePackageManager(
    request.options["package-manager"],
    detectedPackageManager
  );
  const initial = initialAnswers(request);
  const canPrompt = process.stdin.isTTY === true
    && process.stdout.isTTY === true
    && !request.flags.has("yes")
    && (
      request.flags.has("custom")
      // Validation above already guarantees every remaining flag configures
      // the project; keep one allowlist rather than duplicating it here.
      || request.flags.size === 0
    );
  const answers = canPrompt
    ? await promptForScaffold(initial, packageManager)
    : initial;
  const rawProjectName = answers.projectName?.trim();

  if (!rawProjectName) {
    throw new Error(
      "Missing project name. Pass one positionally or run the command in an interactive terminal."
    );
  }

  const starter = parseStarter(answers.starter || request.options.template);
  const testing = answers.testing || parseTesting(request.flags);
  const install = answers.install ?? enabled(request.flags, "install", true);
  const i18n = answers.i18n ?? enabled(request.flags, "i18n", false);
  const requiresRouteExamples = starter === "blog" || i18n;

  if (requiresRouteExamples && answers.router === false) {
    throw new Error(
      `${starter === "blog" ? "The Blog starter" : "The localization example"} requires route examples; remove --no-router.`
    );
  }

  const plan: ScaffoldPlan = {
    destination: resolveProjectDestination(request.context.cwd, rawProjectName),
    eslint: answers.eslint ?? enabled(request.flags, "eslint", true),
    git: answers.git ?? enabled(request.flags, "git", true),
    i18n,
    install,
    lab: answers.lab ?? enabled(request.flags, "lab", false),
    language: answers.language || (request.flags.has("javascript") ? "javascript" : "typescript"),
    packageManager,
    prettier: answers.prettier ?? enabled(request.flags, "prettier", true),
    pwa: answers.pwa ?? enabled(request.flags, "pwa", false),
    projectName: normalizeProjectPackageName(rawProjectName),
    router: requiresRouteExamples
      ? true
      : answers.router ?? enabled(request.flags, "router", false),
    start: install && (answers.start ?? enabled(request.flags, "start", false)),
    starter,
    tailwind: answers.tailwind ?? request.flags.has("tailwind"),
    testing
  };

  return plan;
}

/** Performs the internal `initialAnswers()` operation. */
function initialAnswers(request: ScaffoldRequest): InteractiveScaffoldAnswers {
  const flags = request.flags;
  const testing = parseTesting(flags);

  return {
    projectName: request.projectName,
    starter: request.options.template
      ? parseStarter(request.options.template)
      : undefined,
    mode: flags.has("custom") ? "custom" : flags.has("recommended") || flags.has("yes")
      ? "recommended"
      : undefined,
    language: flags.has("javascript") ? "javascript" : flags.has("typescript")
      ? "typescript"
      : undefined,
    tailwind: flags.has("tailwind") ? true : flags.has("css") ? false : undefined,
    eslint: explicitBoolean(flags, "eslint"),
    prettier: explicitBoolean(flags, "prettier"),
    router: explicitBoolean(flags, "router"),
    i18n: explicitBoolean(flags, "i18n"),
    testing: testing === "none" && !flags.has("no-testing") ? undefined : testing,
    git: explicitBoolean(flags, "git"),
    install: explicitBoolean(flags, "install"),
    lab: explicitBoolean(flags, "lab"),
    pwa: explicitBoolean(flags, "pwa"),
    start: explicitBoolean(flags, "start")
  };
}

/** Performs the internal `enabled()` operation. */
function enabled(flags: Set<string>, name: string, fallback: boolean) {
  return explicitBoolean(flags, name) ?? fallback;
}

/** Performs the internal `explicitBoolean()` operation. */
function explicitBoolean(flags: Set<string>, name: string) {
  if (flags.has(name)) return true;
  if (flags.has(`no-${name}`)) return false;
  return undefined;
}
