/**
 * ----------------------------------------
 * Module: Scaffolder Validation
 * ----------------------------------------
 *
 * Validates user-controlled project paths and CLI choices before any files
 * are written. Filesystem safety and npm naming are intentionally separate.
 * ----------------------------------------
 */

import { isAbsolute, relative, resolve } from "node:path";
import type {
  ScaffoldPackageManager,
  ScaffoldTesting,
  StarterName
} from "./types.ts";

const STARTERS = ["minimal", "blog", "empty"] as const;
const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;
const SCAFFOLD_FLAGS = new Set([
  "yes", "recommended", "custom", "javascript", "typescript", "css",
  "tailwind", "eslint", "no-eslint", "prettier", "no-prettier", "router",
  "no-router", "i18n", "no-i18n", "testing", "test-unit", "test-e2e",
  "test-all", "no-testing", "git", "no-git", "install", "no-install",
  "lab", "no-lab", "start", "no-start"
]);

/** Validates and resolves a project directory below the current directory. */
export function resolveProjectDestination(cwd: string, input: string) {
  const trimmed = input.trim();

  if (!trimmed || trimmed === "." || trimmed.includes("\0")) {
    throw new Error("Project name must identify a new directory.");
  }

  if (isAbsolute(trimmed)) {
    throw new Error("Use a relative project path, not an absolute path.");
  }

  const segments = trimmed.replaceAll("\\", "/").split("/");

  if (segments.some(segment => segment === "." || segment === ".." || !segment)) {
    throw new Error("Project path cannot contain empty, current, or parent segments.");
  }

  const leaf = segments.at(-1) || "";

  if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(leaf)) {
    throw new Error(`Project folder "${leaf}" is reserved on Windows.`);
  }

  const destination = resolve(cwd, trimmed);
  const relation = relative(resolve(cwd), destination);

  if (!relation || relation === ".." || relation.startsWith(`..${separator()}`)) {
    throw new Error("Project path must stay inside the current directory.");
  }

  return destination;
}

/** Produces an npm-compatible private application name from a safe folder name. */
export function normalizeProjectPackageName(input: string) {
  const leaf = input.trim().replaceAll("\\", "/").split("/").at(-1) || "";
  const normalized = leaf
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .replace(/-{2,}/g, "-");

  if (!normalized || normalized.length > 214) {
    throw new Error("Project name cannot be converted to a valid npm package name.");
  }

  return normalized;
}

/** Parses one supported starter name and reports available values on error. */
export function parseStarter(value: string | undefined): StarterName {
  const normalized = (value || "minimal").trim().toLowerCase();

  if (!STARTERS.includes(normalized as StarterName)) {
    throw new Error(
      `Unknown template "${value}". Available templates: ${STARTERS.join(", ")}.`
    );
  }

  return normalized as StarterName;
}

/** Parses one supported package-manager name. */
export function parsePackageManager(
  value: string | undefined,
  fallback: ScaffoldPackageManager
): ScaffoldPackageManager {
  const normalized = (value || fallback).trim().toLowerCase();

  if (!PACKAGE_MANAGERS.includes(normalized as ScaffoldPackageManager)) {
    throw new Error(
      `Unknown package manager "${value}". Use ${PACKAGE_MANAGERS.join(", ")}.`
    );
  }

  return normalized as ScaffoldPackageManager;
}

/** Resolves mutually exclusive testing flags to a single test plan. */
export function parseTesting(flags: Set<string>): ScaffoldTesting {
  const selected = [
    flags.has("testing") || flags.has("test-all") ? "all" : null,
    flags.has("test-unit") ? "unit" : null,
    flags.has("test-e2e") ? "e2e" : null,
    flags.has("no-testing") ? "none" : null
  ].filter((value): value is ScaffoldTesting => value !== null);

  if (new Set(selected).size > 1) {
    throw new Error("Choose only one testing mode.");
  }

  return selected[0] || "none";
}

/** Rejects CLI flags whose meanings conflict. */
export function validateScaffoldFlags(flags: Set<string>) {
  const pairs: Array<[string, string]> = [
    ["javascript", "typescript"],
    ["css", "tailwind"],
    ["eslint", "no-eslint"],
    ["prettier", "no-prettier"],
    ["router", "no-router"],
    ["i18n", "no-i18n"],
    ["lab", "no-lab"],
    ["git", "no-git"],
    ["install", "no-install"],
    ["start", "no-start"],
    ["recommended", "custom"]
  ];

  for (const [enabled, disabled] of pairs) {
    if (flags.has(enabled) && flags.has(disabled)) {
      throw new Error(`Cannot use --${enabled} and --${disabled} together.`);
    }
  }

  if (flags.has("start") && flags.has("no-install")) {
    throw new Error("Cannot use --start without dependency installation.");
  }

  for (const flag of flags) {
    if (!SCAFFOLD_FLAGS.has(flag)) {
      throw new Error(`Unknown project option "--${flag}". Run vd create --help.`);
    }
  }

  parseTesting(flags);
}

/** Performs the internal `separator()` operation. */
function separator() {
  return process.platform === "win32" ? "\\" : "/";
}
