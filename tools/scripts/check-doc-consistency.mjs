/**
 * ----------------------------------------
 * Module: Documentation Consistency Audit
 * ----------------------------------------
 *
 * Keeps current product documentation aligned with the package manifest and
 * the intentionally consolidated documentation layout. Historical changelog
 * language is deliberately excluded from these current-state checks.
 * ----------------------------------------
 */

import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../..", import.meta.url))
);
const packageManifest = JSON.parse(await readWorkspaceFile(
  "packages/velodom/package.json"
));
const releaseGuide = await readWorkspaceFile("docs/RELEASING.md");
const canonicalGuide = await readWorkspaceFile("docs/README.md");
const cliSource = await readWorkspaceFile("packages/velodom/src/cli.ts");
const directiveSource = await readWorkspaceFile(
  "packages/velodom/src/shared/directives.ts"
);
const publicApiSources = await Promise.all([
  "packages/velodom/src/index.ts",
  "packages/velodom/src/compiler/index.ts",
  "packages/velodom/src/content.ts",
  "packages/velodom/src/localization.ts",
  "packages/velodom/src/node.ts",
  "packages/velodom/src/assets.ts",
  "packages/velodom/src/devtools.ts",
  "packages/velodom/src/adapters/vite.ts",
  "packages/velodom/src/vite-plugin/index.ts",
  "packages/velodom/src/testing.ts"
].map(readWorkspaceFile));
const currentGuides = await Promise.all([
  "README.md",
  "docs/README.md",
  "docs/TODO.md",
  "docs/NOTES.md",
  "docs/RELEASING.md",
  "packages/velodom/README.md"
].map(async path => ({ path, source: await readWorkspaceFile(path) })));
const violations = [];
const publicImports = Object.keys(packageManifest.exports || {}).map(name => (
  name === "."
    ? "velodom"
    : `velodom/${name.slice(2)}`
));
const removedGuides = [
  "ADAPTERS.md",
  "ARCHITECTURE.md",
  "ASSETS.md",
  "BROWSERS.md",
  "CONTENT_MODE_DESIGN.md",
  "DEPLOYMENT.md",
  "DEVTOOLS_PROTOCOL.md",
  "DOCUMENTATION_MAP.md",
  "DX_RUBRIC.md",
  "EDITOR_INTELLIGENCE.md",
  "FRAMEWORK_IDENTITY.md",
  "FUTURE_RESEARCH.md",
  "LOCALIZATION_DESIGN.md",
  "PROGRESSIVE_FORMS.md",
  "RELEASE_DECISION.md",
  "STATIC_RENDERING_DESIGN.md"
];
const legacyProductLabel = /\bV1\.\d+\b|\bV[2-9]\b|\bPost-V1\b|\bPhase\s+\d+\b/;
const privateImport = /(?:from\s+|import\()\s*["'](?:velodom\/lib\/|packages\/velodom\/src\/)/;
const cliCommands = new Set(
  [...cliSource.matchAll(/case "([a-z-]+)":/g)]
    .map(match => match[1])
    .filter(command => !command.startsWith("-"))
);
const documentedCanonicalCommands = collectDocumentedCliCommands(canonicalGuide);
const publicApiNames = new Set(
  publicApiSources.flatMap(collectPublicValueExports)
);
const preferredDirectives = collectPreferredDirectives(directiveSource);

if (packageManifest.private !== true) {
  violations.push("packages/velodom must remain private until human publication approval");
}

for (const publicImport of publicImports) {
  if (!releaseGuide.includes(`\`${publicImport}\``)) {
    violations.push(
      `docs/RELEASING.md must document public export "${publicImport}"`
    );
  }
}

for (const publicApiName of publicApiNames) {
  if (!new RegExp(`\\b${publicApiName}\\b`).test(canonicalGuide)) {
    violations.push(
      `docs/README.md must document public API "${publicApiName}"`
    );
  }
}

for (const directive of preferredDirectives) {
  if (!canonicalGuide.includes(`vd-${directive}`)) {
    violations.push(
      `docs/README.md must document preferred directive "vd-${directive}"`
    );
  }
}

for (const command of cliCommands) {
  if (!documentedCanonicalCommands.has(command)) {
    violations.push(`docs/README.md must document CLI command "vd ${command}"`);
  }
}

for (const guide of currentGuides) {
  for (const removedGuide of removedGuides) {
    if (guide.source.includes(removedGuide)) {
      violations.push(`${guide.path} references removed guide ${removedGuide}`);
    }
  }

  if (legacyProductLabel.test(guide.source)) {
    violations.push(`${guide.path} uses a legacy product-generation label`);
  }

  if (privateImport.test(guide.source)) {
    violations.push(`${guide.path} shows a private framework import`);
  }

  for (const command of collectDocumentedCliCommands(guide.source)) {
    if (!cliCommands.has(command)) {
      violations.push(
        `${guide.path} documents unavailable CLI command "vd ${command}"`
      );
    }
  }
}

if (violations.length) {
  console.error([
    "VeloDom documentation consistency check failed:",
    ...violations.map(violation => `- ${violation}`)
  ].join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    [
      "VeloDom documentation consistency check passed",
      `(${publicImports.length} package exports,`,
      `${publicApiNames.size} public values,`,
      `${preferredDirectives.size} preferred directives,`,
      `${cliCommands.size} CLI commands).`
    ].join(" ")
  );
}

/**
 * Reads a UTF-8 file from the repository root.
 *
 * @param {string} relativePath Workspace-relative path.
 * @returns {Promise<string>} File contents.
 */
function readWorkspaceFile(relativePath) {
  return readFile(join(workspaceRoot, relativePath), "utf8");
}

/**
 * Collects CLI command names only from shell/text examples so ordinary prose
 * about `vd-*` directives cannot be mistaken for a command.
 *
 * @param {string} source Markdown source.
 * @returns {Set<string>} Documented VeloDom CLI command names.
 */
function collectDocumentedCliCommands(source) {
  const commands = new Set();

  for (const block of source.matchAll(/```(?:bash|text)\s*\n([\s\S]*?)```/g)) {
    for (const match of block[1].matchAll(/^\s*vd\s+([a-z][a-z-]*)\b/gm)) {
      commands.add(match[1]);
    }
  }

  return commands;
}

/**
 * Collects runtime values from a public entry module while excluding
 * type-only exports. Both direct declarations and named re-exports are
 * supported because VeloDom keeps implementation files private.
 *
 * @param {string} source TypeScript entry-module source.
 * @returns {string[]} Public value names.
 */
function collectPublicValueExports(source) {
  const names = [];

  for (const match of source.matchAll(
    /^export\s+(?:async\s+)?(?:function|class|const)\s+([A-Za-z_$][\w$]*)/gm
  )) {
    names.push(match[1]);
  }

  for (const match of source.matchAll(/\bexport\s*{([\s\S]*?)}\s*from\s*["']/g)) {
    for (const entry of match[1].split(",")) {
      const normalized = entry
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .trim();

      if (!normalized || normalized.startsWith("type ")) {
        continue;
      }

      const alias = normalized.match(/\bas\s+([A-Za-z_$][\w$]*)$/);
      const name = alias?.[1] || normalized.match(/^([A-Za-z_$][\w$]*)/)?.[1];

      if (name) {
        names.push(name);
      }
    }
  }

  return names;
}

/**
 * Reads the compiler's canonical directive vocabulary. Prefix directives such
 * as `prop-` remain prefixes in the result so the guide can document the whole
 * directive family without listing arbitrary property names.
 *
 * @param {string} source Directive-contract source.
 * @returns {Set<string>} Preferred directive names.
 */
function collectPreferredDirectives(source) {
  const declaration = source.match(
    /PREFERRED_DIRECTIVES\s*=\s*Object\.freeze\(\[([\s\S]*?)]\)/
  );

  return new Set(
    [...(declaration?.[1] || "").matchAll(/["']([^"']+)["']/g)]
      .map(match => match[1])
  );
}
