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
const repositoryGuide = await readWorkspaceFile("docs/README.md");
const syntaxReference = await readWorkspaceFile(
  "packages/velodom/docs/SYNTAX_REFERENCE.md"
);
const featureInventory = await readWorkspaceFile(
  "packages/velodom/docs/FEATURE_INVENTORY.md"
);
const showcaseReference = await readWorkspaceFile(
  "examples/velodom-blog/src/pages/reference/index.html"
);
const showcaseFeatures = await readWorkspaceFile(
  "examples/velodom-blog/src/pages/features/index.html"
);
const showcaseLearning = await readWorkspaceFile(
  "examples/velodom-blog/src/content/learning.js"
);
const packageAiContext = await readWorkspaceFile(
  "packages/velodom/AI_CONTEXT.md"
);
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
  "packages/velodom/README.md",
  "packages/velodom/AI_CONTEXT.md",
  "packages/velodom/docs/QUICK_START.md",
  "packages/velodom/docs/SYNTAX_REFERENCE.md",
  "packages/velodom/docs/FEATURE_INVENTORY.md",
  "packages/velodom/docs/AI_GUIDE.md",
  "packages/velodom/templates/default/AGENTS.md",
  "examples/velodom-blog/README.md"
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
const directLifecycleCleanup = /\b(?:init|mounted|destroy)\s*\(\s*\{[^}]*\bonCleanup\b/;
const bareHashNavigation = /<a\b(?=[^>]*\bvd-nav\b)(?=[^>]*\bhref=["']#)[^>]*>/i;
const obsoleteShowcasePath = /examples[\\/]+blog(?:[\\/"'`]|$)/i;
const staleReleaseClaim =
  /(?:currently published\s+`?velodom|uses published version|is now public with the|private:\s*true\s+in the publishable)/i;
const cliCommands = collectImplementedCliCommands(cliSource);
const documentedCanonicalCommands = collectDocumentedCliCommands(repositoryGuide);
const completePublicGuide = `${repositoryGuide}\n${syntaxReference}\n${featureInventory}`;
const publicApiNames = new Set(
  publicApiSources.flatMap(collectPublicValueExports)
);
const preferredDirectives = collectPreferredDirectives(directiveSource);

if (packageManifest.private === true) {
  if (!releaseGuide.includes("private")) {
    violations.push(
      "docs/RELEASING.md must explain the private package publication guard"
    );
  }
} else {
  if (!releaseGuide.includes("publishConfig.access = public")) {
    violations.push(
      "docs/RELEASING.md must describe the public package publication intent"
    );
  }
  if (!repositoryGuide.includes("npmjs.com/package/velodom")) {
    violations.push(
      "docs/README.md must link to the intended npm package page"
    );
  }
}

for (const publicImport of publicImports) {
  if (!releaseGuide.includes(`\`${publicImport}\``)) {
    violations.push(
      `docs/RELEASING.md must document public export "${publicImport}"`
    );
  }
}

for (const publicApiName of publicApiNames) {
  if (!new RegExp(`\\b${publicApiName}\\b`).test(completePublicGuide)) {
    violations.push(
      `docs/README.md must document public API "${publicApiName}"`
    );
  }
}

for (const directive of preferredDirectives) {
  if (!syntaxReference.includes(`vd-${directive}`)) {
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

for (const publicImport of publicImports) {
  if (!showcaseReference.includes(`<code>${publicImport}</code>`)) {
    violations.push(
      `the showcase reference must list package export "${publicImport}"`
    );
  }
}

for (const command of cliCommands) {
  if (!new RegExp(`\\bvd ${command}\\b`).test(showcaseReference)) {
    violations.push(
      `the showcase reference must document CLI command "vd ${command}"`
    );
  }
}

for (const [label, count] of [
  ["public values", publicApiNames.size],
  ["package exports", publicImports.length],
  ["preferred directives", preferredDirectives.size],
  ["CLI commands", cliCommands.size]
]) {
  if (!showcaseReference.includes(`${count} ${label}`)) {
    violations.push(
      `the showcase reference must report "${count} ${label}"`
    );
  }
}

for (const [label, count] of [
  ["Public values", publicApiNames.size],
  ["Directives", preferredDirectives.size],
  ["Package exports", publicImports.length],
  ["CLI commands", cliCommands.size]
]) {
  if (!showcaseLearning.includes(
    `{ label: "${label}", value: "${count}" }`
  )) {
    violations.push(
      `the showcase home must report ${label.toLowerCase()} as ${count}`
    );
  }
}

for (const [pattern, message] of [
  [/vd-progressive-form/, "uses removed vd-progressive-form syntax"],
  [/createLocaleFormatter\s*\(\s*{/, "uses the old locale formatter signature"],
  [/src\/pages\/index\.html/, "uses an obsolete root-page convention"],
  [/href=&quot;\/#|href="\/#/, "uses a cross-page hash as a root-page hash"]
]) {
  if (pattern.test(showcaseFeatures)) {
    violations.push(`the showcase features page ${message}`);
  }
}

for (const required of [
  "docs/SYNTAX_REFERENCE.md",
  "docs/FEATURE_INVENTORY.md",
  "docs/AI_GUIDE.md"
]) {
  if (!packageAiContext.includes(required)) {
    violations.push(
      `packages/velodom/AI_CONTEXT.md must route agents to "${required}"`
    );
  }
}

for (const requiredFile of ["AI_CONTEXT.md", "docs", "templates"]) {
  if (!packageManifest.files?.includes(requiredFile)) {
    violations.push(`package artifact files must include "${requiredFile}"`);
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

  if (directLifecycleCleanup.test(guide.source)) {
    violations.push(
      `${guide.path} destructures onCleanup directly; use ctx.onCleanup()`
    );
  }

  if (bareHashNavigation.test(guide.source)) {
    violations.push(
      `${guide.path} shows a bare hash vd-nav target; use an app-relative path`
    );
  }

  if (obsoleteShowcasePath.test(guide.source)) {
    violations.push(
      `${guide.path} references obsolete examples/blog; use examples/velodom-blog`
    );
  }

  if (staleReleaseClaim.test(guide.source)) {
    violations.push(
      `${guide.path} contains a stale pre-release publication claim`
    );
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
    for (const match of block[1].matchAll(/^\s*vd\s+([a-z][a-z0-9-]*)\b/gm)) {
      commands.add(match[1]);
    }
  }

  return commands;
}

/**
 * Reads only the primary command dispatcher so nested view names do not become
 * fictional top-level CLI commands in documentation metrics.
 *
 * @param {string} source CLI TypeScript source.
 * @returns {Set<string>} Implemented top-level command names.
 */
function collectImplementedCliCommands(source) {
  const dispatcher = source.match(
    /switch \(command\) \{([\s\S]*?)\n    \}\n  \} catch/
  )?.[1] || "";

  return new Set(
    [...dispatcher.matchAll(/case "([a-z][a-z0-9-]*)":/g)]
      .map(match => match[1])
      .filter(command => !command.startsWith("-"))
  );
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
