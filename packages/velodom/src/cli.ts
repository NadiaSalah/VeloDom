/**
 * ----------------------------------------
 * Module: VeloDom CLI
 * ----------------------------------------
 *
 * Provides local, static developer tooling for inspecting VeloDom projects
 * and scaffolding convention-first application files without adding browser
 * runtime cost.
 * ----------------------------------------
 */

import {
  spawn,
  type SpawnOptions
} from "node:child_process";
import {
  mkdir,
  readFile,
  stat,
  writeFile
} from "node:fs/promises";
import {
  dirname,
  join,
  relative,
  resolve
} from "node:path";
import { pathToFileURL } from "node:url";
import { VD_DIRECTIVE_RUNTIME_FEATURES } from "./constants.ts";
import {
  readVeloDomBuildMetadata,
  type VeloDomBuildChunkMetadata,
  type VeloDomBuildMetadata
} from "./build-metadata.ts";
import { compileTemplate } from "./compiler/index.ts";
import type {
  CompilerDiagnostic
} from "./compiler/types.ts";
import { PREFERRED_DIRECTIVES } from "./shared/directives.ts";
import {
  findProtectedStatePathKey,
  isAppRelativePath
} from "./shared/path.ts";
import {
  discoverFiles,
  normalizeModuleName,
  pageConfigPaths,
  readOptionalText,
  readPageConfigSource,
  readStaticPath,
  toRoutePath
} from "./cli/analyzer.ts";
import {
  createProjectSourceIndex,
  findIndexedTemplate,
  type ProjectSourceIndex
} from "./cli/project-index.ts";
import {
  explainDiagnostic,
  locateSourceToken,
  suggestNearestName,
  type ProjectDiagnostic,
  type ProjectDiagnosticCategory
} from "./cli/diagnostics.ts";
import {
  applyProjectFixPlan,
  createProjectFixPlan
} from "./cli/fixes.ts";
import { installProjectFeature } from "./cli/feature-installer.ts";
import {
  formatBytes,
  printDependencySignals,
  printList,
  printModuleGroup,
  printSizeGroup
} from "./cli/reporters.ts";
import { createResource } from "./cli/scaffolds.ts";
import type {
  CliContext,
  DiscoveredModule,
  FileSizeReport,
  ParsedArgs
} from "./cli/types.ts";
import {
  runPackageScript
} from "./scaffolder/package-manager.ts";
import type {
  ScaffoldPackageManager
} from "./scaffolder/types.ts";

interface CliOptions {
  cwd?: string;
  stderr?: (message: string) => void;
  stdout?: (message: string) => void;
}

interface ProjectInspection extends ProjectSourceIndex {
  compilerFeatures: string[];
  directiveUsage: Record<string, number>;
  events: Array<{
    event: string;
    expression: string;
    handler?: string;
    owner: string;
    source: string;
  }>;
  exposes: Array<{
    name: string;
    owner: string;
    source: string;
  }>;
  middleware: string[];
  refs: Array<{
    name: string;
    owner: string;
    source: string;
  }>;
  requestRoutes: string[];
  seo: {
    pagesWithSeo: number;
    totalPages: number;
  };
  seoConfigs: string[];
  state: Array<{
    name: string;
    owner: string;
    source: string;
  }>;
}

interface DoctorIssue {
  category?: ProjectDiagnosticCategory;
  code?: string;
  file: string;
  level: "error" | "warning";
  location?: CompilerDiagnostic["location"];
  message: string;
  suggestion?: string;
}

interface CliExplanation {
  details: string[];
  diagnostics?: CompilerDiagnostic[];
  subject: string;
  summary: string;
}

interface CheckStep {
  diagnostics: string[];
  id: string;
  status: "passed" | "failed" | "not-run";
  summary: string;
}

interface ComponentPropFacts {
  all: Set<string>;
  required: Set<string>;
}

interface ProjectGraph {
  edges: Array<{
    from: string;
    label: string;
    to: string;
  }>;
  nodes: Array<{
    id: string;
    label: string;
    type: string;
  }>;
}

const HELP = `VeloDom CLI

Usage:
  vd lab [--check] [--debug] [--root <dir>]
  vd inspect [--json] [--root <dir>]
  vd inspect routes|components|config|build [--json] [--root <dir>]
  vd doctor [--json] [--root <dir>]
  vd check [--json] [--root <dir>]
  vd fix [--write] [--json] [--root <dir>]
  vd explain <file|topic> [--json] [--root <dir>]
  vd stats [--json] [--root <dir>]
  vd routes [--json] [--root <dir>]
  vd graph [--json] [--mermaid] [--root <dir>]
  vd health [--json] [--min-score <0-100>] [--root <dir>]
  vd benchmark [--root <dir>]
  vd build-report [--json] [--root <dir>]
  vd docs [--json] [--root <dir>]
  vd types [--out <file>] [--root <dir>]
  vd add i18n|tests|lab [--unit|--e2e|--all] [--root <dir>]
  vd create [project-name] [project options]
  vd init [project-name] [project options]
  vd create page <name> [--ts] [--single-file] [--demo <kind>] [--root <dir>]
  vd create component <name> [--ts] [--single-file] [--root <dir>]
  vd create api <name> [--root <dir>]
  vd create demo <name> [--root <dir>]
  vd create feature <name> [--blog] [--root <dir>]
  vd create middleware [--root <dir>]
  vd create plugin <name> [--root <dir>]
  create-velodom [project-name] [project options]

Project options:
  --template minimal|blog|empty
  --recommended | --custom | --yes
  --javascript | --typescript
  --css | --tailwind
  --eslint | --no-eslint
  --prettier | --no-prettier
  --router | --no-router
  --i18n | --no-i18n
  --lab | --no-lab
  --testing | --test-unit | --test-e2e | --test-all | --no-testing
  --git | --no-git
  --install | --no-install
  --start | --no-start
  --package-manager npm|pnpm|yarn|bun

Examples:
  vd lab
  vd check
  vd explain src/pages/home/index.html
  vd explain routing
  vd inspect
  vd stats --json
  vd create page blog/posts/[id] --ts
  vd create page counter --demo counter
  vd create component shared/post-card --single-file
  vd add i18n
  vd add tests --unit
  vd create feature articles --blog
  vd create my-site --recommended
  npx create-velodom@latest my-site --template minimal --typescript
`;

const RESOURCE_TYPES = new Set([
  "page",
  "component",
  "api",
  "demo",
  "feature",
  "middleware",
  "plugin",
  "project",
  "init"
]);

/** Runs the VeloDom command-line interface and returns a process exit code. */
export async function runVeloDomCli(
  args: string[],
  options: CliOptions = {}
): Promise<number> {
  const parsed = parseArgs(args);
  const root = resolve(options.cwd || process.cwd(), parsed.options.root || ".");
  const context: CliContext = {
    cwd: root,
    stderr: options.stderr || (message => console.error(message)),
    stdout: options.stdout || (message => console.log(message))
  };
  const [command, ...values] = parsed.values;

  try {
    if (
      command === undefined
      && (parsed.flags.has("version") || parsed.flags.has("v"))
    ) {
      context.stdout(await readCliVersion());
      return 0;
    }

    switch (command) {
      case undefined:
      case "help":
      case "--help":
      case "-h":
        context.stdout(HELP.trimEnd());
        return 0;
      case "version":
      case "--version":
      case "-v":
        context.stdout(await readCliVersion());
        return 0;
      case "inspect":
        if (values[0] === "build") {
          await printBuildReport(context, parsed.flags.has("json"));
        } else {
          await printInspection(
            context,
            parsed.flags.has("json"),
            values[0]
          );
        }
        return 0;
      case "lab":
        return runLabCommand(context, parsed.flags);
      case "doctor":
        return printDoctor(context, parsed.flags.has("json"));
      case "check":
        return printCheck(context, parsed.flags.has("json"));
      case "fix":
        return printFix(context, parsed.flags);
      case "explain":
        await printExplanation(
          context,
          values.join(" "),
          parsed.flags.has("json")
        );
        return 0;
      case "stats":
        await printStats(context, parsed.flags.has("json"));
        return 0;
      case "routes":
        await printRoutes(context, parsed.flags.has("json"));
        return 0;
      case "graph":
        await printGraph(context, parsed.flags);
        return 0;
      case "health":
        return printHealth(context, parsed);
      case "benchmark":
        return runBenchmarkCommand(context);
      case "build-report":
        await printBuildReport(context, parsed.flags.has("json"));
        return 0;
      case "docs":
        await printGeneratedDocs(context, parsed.flags.has("json"));
        return 0;
      case "types":
        await writeApplicationDeclarations(context, parsed.options.out);
        return 0;
      case "add":
        return await runAddFeatureCommand(
          context,
          values[0] || "",
          parsed.flags
        );
      case "init":
        await createResource(
          context,
          ["init", values[0] || ""],
          parsed.flags,
          parsed.options
        );
        return 0;
      case "create":
        if (parsed.flags.has("help")) {
          context.stdout(HELP.trimEnd());
          return 0;
        }
        await createResource(
          context,
          RESOURCE_TYPES.has(values[0] || "") ? values : ["project", values[0] || ""],
          parsed.flags,
          parsed.options
        );
        return 0;
      default:
        context.stderr(`Unknown VeloDom command "${command}".`);
        context.stderr("Run vd help for available commands.");
        return 1;
    }
  } catch (error) {
    context.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

/** Adds one existing optional first-party capability to the current project. */
async function runAddFeatureCommand(
  context: CliContext,
  feature: string,
  flags: Set<string>
) {
  if (!feature) {
    throw new Error("vd add requires one feature: i18n, tests, or lab.");
  }

  const result = await installProjectFeature(context.cwd, feature, flags);

  if (flags.has("json")) {
    context.stdout(JSON.stringify(result, null, 2));
    return 0;
  }

  context.stdout(
    result.alreadyInstalled
      ? `VeloDom feature "${result.feature}" is already installed.`
      : `Added VeloDom feature "${result.feature}".`
  );
  result.createdFiles.forEach(file => context.stdout(`  created ${file}`));
  result.modifiedFiles.forEach(file => context.stdout(`  updated ${file}`));
  result.nextSteps.forEach(step => context.stdout(`  next: ${step}`));

  return 0;
}

/** Prints the inspection. */
async function printInspection(
  context: CliContext,
  json: boolean,
  section = ""
) {
  const inspection = await inspectProject(context.cwd);
  const selected = selectInspectionSection(inspection, section);

  if (json) {
    context.stdout(JSON.stringify(selected, null, 2));
    return;
  }

  if (section) {
    printSelectedInspection(context, section, selected);
    return;
  }

  context.stdout("VeloDom project inspection");
  context.stdout("==========================");
  printModuleGroup(context, "Pages", inspection.pages);
  printModuleGroup(context, "Components", inspection.components);
  printModuleGroup(context, "Layouts", inspection.layouts);
  printList(context, "API files", inspection.apis);
  printList(context, "CSS files", inspection.css);
  printList(context, "Request routes", inspection.requestRoutes);
  printList(context, "Middleware files", inspection.middleware);
  printList(context, "Compiler features", inspection.compilerFeatures);
  printList(context, "SEO config files", inspection.seoConfigs);
  printList(context, "Refs", inspection.refs.map(ref => `${ref.owner}.${ref.name}`));
  printList(context, "Events", inspection.events.map(event => (
    `${event.owner}.${event.event} -> ${event.expression}`
  )));
  printList(context, "State", inspection.state.map(state => (
    `${state.owner}.${state.name}`
  )));
  printList(context, "Exposes", inspection.exposes.map(expose => (
    `${expose.owner}.${expose.name}`
  )));
}

/** Runs the existing project dev script with the optional Lab environment. */
async function runLabCommand(
  context: CliContext,
  flags: Set<string>
) {
  const manifestSource = await readOptionalText(join(context.cwd, "package.json"));

  if (!manifestSource) {
    context.stderr("vd lab requires a package.json in the project root.");
    return 1;
  }

  let manifest: {
    packageManager?: string;
    scripts?: Record<string, string>;
  };

  try {
    manifest = JSON.parse(manifestSource);
  } catch {
    context.stderr("vd lab could not parse the project package.json.");
    return 1;
  }

  const devScript = String(manifest.scripts?.dev || "").trim();

  if (!devScript) {
    context.stderr("vd lab requires a package.json dev script that starts Vite.");
    return 1;
  }

  if (/\bvd\s+lab\b/.test(devScript)) {
    context.stderr("The project dev script cannot call vd lab recursively.");
    return 1;
  }

  const viteConfig = await findViteConfig(context.cwd);

  if (!viteConfig) {
    context.stderr(
      "vd lab requires a Vite config using the VeloDom Vite plugin."
    );
    return 1;
  }

  if (flags.has("check")) {
    context.stdout("VeloDom Lab readiness");
    context.stdout("======================");
    context.stdout("  ✓ package.json dev script found");
    context.stdout(`  ✓ Vite config found: ${relative(context.cwd, viteConfig).replaceAll("\\", "/")}`);
    context.stdout("  ✓ Lab remains opt-in and development-only");
    return 0;
  }

  const packageManager = await resolveLabPackageManager(
    context.cwd,
    manifest.packageManager
  );

  context.stdout(
    `Starting VeloDom Lab through ${packageManager}'s Vite dev server…`
  );
  await runPackageScript(context.cwd, packageManager, "dev", {
      ...process.env,
      VELODOM_LAB: "1",
      VELODOM_LAB_DEBUG: flags.has("debug") ? "1" : "0"
  });
  return 0;
}

/** Resolves the local package manager without introducing a global preference. */
async function resolveLabPackageManager(
  root: string,
  declared: string | undefined
): Promise<ScaffoldPackageManager> {
  const requested = declared?.split("@")[0]?.toLowerCase();
  const supported: ScaffoldPackageManager[] = ["npm", "pnpm", "yarn", "bun"];

  if (supported.includes(requested as ScaffoldPackageManager)) {
    return requested as ScaffoldPackageManager;
  }

  const locks: Array<[string, ScaffoldPackageManager]> = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"]
  ];

  for (const [file, packageManager] of locks) {
    try {
      if ((await stat(join(root, file))).isFile()) return packageManager;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  return "npm";
}

/** Prints a deterministic framework or source explanation without external AI. */
async function printExplanation(
  context: CliContext,
  requested: string,
  json: boolean
) {
  const subject = requested.trim();

  if (!subject) {
    throw new Error(
      "vd explain requires a VeloDom file or topic such as state, routing, requests, components, compiler, or lab."
    );
  }

  const file = await resolveExplanationFile(context.cwd, subject);
  const diagnostic = explainDiagnostic(subject);
  const explanation = file
    ? await explainTemplateFile(context.cwd, file)
    : diagnostic
      ? {
          details: diagnostic.details,
          subject: diagnostic.code,
          summary: `${diagnostic.summary} Category: ${diagnostic.category}.`
        }
      : explainFrameworkTopic(subject);

  if (!explanation) {
    throw new Error(
      `No deterministic VeloDom explanation is available for "${subject}".`
    );
  }

  if (json) {
    context.stdout(JSON.stringify(explanation, null, 2));
    return;
  }

  context.stdout(`VeloDom explanation: ${explanation.subject}`);
  context.stdout("=".repeat(21 + explanation.subject.length));
  context.stdout(explanation.summary);
  explanation.details.forEach(detail => context.stdout(`  - ${detail}`));
  if (explanation.diagnostics?.length) {
    context.stdout("Diagnostics:");
    explanation.diagnostics.forEach(diagnostic => {
      context.stdout(
        `  - ${diagnostic.severity.toUpperCase()} ${diagnostic.code}: ${diagnostic.message}`
      );
    });
  }
}

/** Selects a supported `vd inspect` view from the shared inspection result. */
function selectInspectionSection(
  inspection: ProjectInspection,
  section: string
): unknown {
  switch (section) {
    case "":
      return inspection;
    case "routes":
      return inspection.pages.map(page => ({
        kind: page.kind,
        name: page.name,
        path: page.route || toRoutePath(page.name),
        source: page.source
      }));
    case "components":
      return inspection.components;
    case "config":
      return {
        apiFiles: inspection.apis,
        middleware: inspection.middleware,
        requestRoutes: inspection.requestRoutes,
        seo: inspection.seo,
        seoConfigs: inspection.seoConfigs
      };
    default:
      throw new Error(
        `Unknown inspection section "${section}". Use routes, components, config, or build.`
      );
  }
}

/** Prints one focused inspection view. */
function printSelectedInspection(
  context: CliContext,
  section: string,
  selected: unknown
) {
  context.stdout(`VeloDom ${section} inspection`);
  context.stdout("=".repeat(18 + section.length));

  if (section === "routes") {
    (selected as Array<Record<string, unknown>>).forEach(route => {
      context.stdout(`  - ${route.path} (${route.name}) -> ${route.source}`);
    });
    return;
  }

  if (section === "components") {
    printModuleGroup(context, "Components", selected as DiscoveredModule[]);
    return;
  }

  const config = selected as Record<string, unknown>;

  Object.entries(config).forEach(([name, value]) => {
    context.stdout(`  - ${name}: ${JSON.stringify(value)}`);
  });
}

/** Finds a Vite configuration at the project root. */
async function findViteConfig(root: string) {
  const names = [
    "vite.config.ts",
    "vite.config.js",
    "vite.config.mts",
    "vite.config.mjs"
  ];

  for (const name of names) {
    const file = join(root, name);

    try {
      if (!(await stat(file)).isFile()) continue;

      const source = await readFile(file, "utf8");

      if (
        source.includes("velodom/vite-plugin")
        && /\bvelodom\s*\(/.test(source)
      ) {
        return file;
      }
    } catch {
      // Continue through supported Vite config names.
    }
  }

  return null;
}

/** Resolves a supported explanation file inside the project root. */
async function resolveExplanationFile(root: string, requested: string) {
  const file = resolve(root, requested);
  const relativePath = relative(root, file);

  if (relativePath.startsWith("..") || relativePath === "") return null;

  try {
    const info = await stat(file);

    if (info.isFile() && (file.endsWith(".html") || file.endsWith(".vd"))) {
      return file;
    }
    if (info.isDirectory()) {
      const html = join(file, "index.html");
      if ((await stat(html)).isFile()) return html;
    }
  } catch {
    return null;
  }

  return null;
}

/** Explains one actual template through compiler diagnostics and metadata. */
async function explainTemplateFile(
  root: string,
  file: string
): Promise<CliExplanation> {
  const source = await readFile(file, "utf8");
  const template = file.endsWith(".vd")
    ? source.match(/<template\b[^>]*>([\s\S]*?)<\/template>/i)?.[1] || ""
    : source;
  const subject = relative(root, file).replaceAll("\\", "/");
  const result = compileTemplate(template, {
    filename: subject,
    mode: "development"
  });

  return {
    details: [
      `Runtime features: ${result.manifest.features.join(", ") || "none"}`,
      `Directives and interpolations: ${result.metadata.length}`,
      `Compiler diagnostics: ${result.diagnostics.length}`,
      ...result.metadata.slice(0, 20).map(metadata => (
        `${metadata.name}: ${metadata.expression || "structural marker"}`
      ))
    ],
    diagnostics: result.diagnostics,
    subject,
    summary: "This explanation is generated offline from VeloDom's real compiler metadata."
  };
}

/** Returns a small offline explanation for one canonical framework topic. */
function explainFrameworkTopic(subject: string): CliExplanation | null {
  const topic = subject.toLowerCase();
  const topics: Record<string, {
    details: string[];
    summary: string;
  }> = {
    state: {
      summary: "VeloDom uses shallow local reactive state and updates subscribed directives directly.",
      details: [
        "Export a small state object for defaults.",
        "Put methods, async work, and cleanup in init({ state, ctx }).",
        "Use shared state only for genuine cross-page data."
      ]
    },
    routing: {
      summary: "Folders create routes; config can override paths, guards, metadata, and SEO.",
      details: [
        "Use vd-nav with app-relative paths.",
        "Dynamic folders use [param].",
        "Same-route hashes scroll without remounting."
      ]
    },
    requests: {
      summary: "Application-owned API routes are connected to HTML through declarative request directives.",
      details: [
        "Use vd-request and vd-params for the route and input.",
        "Use vd-target and vd-auto-state for result/loading/error state.",
        "Authentication and authorization policy remain application/server owned."
      ]
    },
    components: {
      summary: "Components are ordinary folders or optional .vd files discovered by convention.",
      details: [
        "Use <vd-component name=\"path/name\">.",
        "Use vd-prop-* for literal strings and vd-props for expressions.",
        "Prefer explicit expose members for parent access."
      ]
    },
    compiler: {
      summary: "The compiler validates preferred vd-* syntax and emits normalized HTML plus a runtime feature manifest.",
      details: [
        "Development builds can retain source metadata.",
        "Production builds omit development metadata by default.",
        "Only directive feature modules requested by a template are loaded."
      ]
    },
    lab: {
      summary: "VeloDom Lab is an experimental, local, opt-in development inspector layered on Vite.",
      details: [
        "Run vd lab to enable it for the existing dev command.",
        "It records a bounded event history and redacts unsafe values.",
        "Normal production builds do not inject the Lab UI or metadata endpoint."
      ]
    }
  };
  const entry = topics[topic];

  return entry ? {
    ...entry,
    subject: topic
  } : null;
}

/** Prints the doctor. */
async function printDoctor(context: CliContext, json: boolean) {
  const issues = await runDoctor(context.cwd);
  const hasErrors = issues.some(issue => issue.level === "error");

  if (json) {
    context.stdout(JSON.stringify({
      ok: !hasErrors,
      issues
    }, null, 2));
    return hasErrors ? 1 : 0;
  }

  context.stdout("VeloDom doctor");
  context.stdout("==============");

  if (!issues.length) {
    context.stdout("No project issues found.");
    return 0;
  }

  issues.forEach(issue => {
    const location = issue.location
      ? `:${issue.location.line}:${issue.location.column}`
      : "";
    context.stdout(
      `  - ${issue.level.toUpperCase()} ${issue.code} ${issue.file}${location}: ${issue.message}`
    );
    if (issue.suggestion) context.stdout(`    Suggestion: ${issue.suggestion}`);
  });

  return hasErrors ? 1 : 0;
}

/** Prints one transparent, non-destructive project verification composition. */
async function printCheck(context: CliContext, json: boolean) {
  const report = await runProjectCheck(context.cwd);

  if (json) {
    context.stdout(JSON.stringify(report, null, 2));
    return report.ok ? 0 : 1;
  }

  context.stdout("VeloDom check");
  context.stdout("=============");
  report.steps.forEach(step => {
    const marker = step.status === "passed"
      ? "✓"
      : step.status === "failed"
        ? "✗"
        : "–";

    context.stdout(`  ${marker} ${step.id}: ${step.summary}`);
    step.diagnostics.forEach(code => context.stdout(`    ${code}`));
  });
  if (report.issues.length) {
    context.stdout("Diagnostics:");
    report.issues.forEach(issue => {
      const location = issue.location
        ? `:${issue.location.line}:${issue.location.column}`
        : "";

      context.stdout(
        `  - ${issue.level.toUpperCase()} ${issue.code} ${issue.file}${location}: ${issue.message}`
      );
    });
  }

  return report.ok ? 0 : 1;
}

/** Previews or explicitly applies the safe template-migration allowlist. */
async function printFix(context: CliContext, flags: Set<string>) {
  const index = await createProjectSourceIndex(context.cwd);
  const plan = createProjectFixPlan(index);
  const edits = plan.flatMap(file => file.edits);
  const write = flags.has("write");
  const report = {
    editCount: edits.length,
    edits,
    fileCount: plan.length,
    mode: write ? "write" : "preview"
  };

  if (flags.has("json")) {
    if (write) await applyProjectFixPlan(context.cwd, plan);
    context.stdout(JSON.stringify(report, null, 2));
    return 0;
  }

  context.stdout(write ? "VeloDom safe fixes" : "VeloDom safe-fix preview");
  context.stdout("========================");
  if (!edits.length) {
    context.stdout("No reviewed syntax-preserving fixes are available.");
    return 0;
  }

  edits.forEach(edit => {
    context.stdout(
      `  - ${edit.file}:${edit.line}:${edit.column} ${edit.before} -> ${edit.after}`
    );
  });
  if (write) {
    await applyProjectFixPlan(context.cwd, plan);
    context.stdout(`Applied ${edits.length} edit(s) in ${plan.length} file(s).`);
  } else {
    context.stdout("Preview only. Re-run with --write to apply these reviewed aliases.");
  }

  return 0;
}

/** Composes existing static checks without building or mutating the project. */
async function runProjectCheck(root: string) {
  const inspection = await inspectProject(root);
  const doctorIssues = await runDoctor(root, inspection);
  const buildIssues = await findBuildSanityIssues(root);
  const componentProps = await discoverComponentProps(root, inspection);
  const declarations = createApplicationDeclarations(inspection, componentProps);
  const typeGenerationValid = (
    declarations.includes('declare module "velodom/app"')
    && declarations.endsWith("export {};\n")
  );
  const typeIssues = typeGenerationValid
    ? []
    : [normalizeDoctorIssue({
        category: "tooling",
        code: "VD_PROJECT_TYPE_GENERATION",
        file: "src/velodom.generated.d.ts",
        level: "error",
        message: "Application declarations could not be generated deterministically."
      })];
  const issues = dedupeDiagnostics([
    ...doctorIssues,
    ...buildIssues,
    ...typeIssues
  ]);
  const groups: Array<{
    categories: ProjectDiagnosticCategory[];
    id: string;
    summary: string;
  }> = [
    {
      categories: ["compiler", "accessibility"],
      id: "compiler",
      summary: "template syntax and accessibility compiler diagnostics"
    },
    {
      categories: ["component", "request", "routing", "state"],
      id: "references",
      summary: "routes, components, requests, refs, handlers, and state"
    },
    {
      categories: ["security"],
      id: "security",
      summary: "static template security checks"
    },
    {
      categories: ["configuration", "tooling"],
      id: "build-sanity",
      summary: "package, Vite, page config, Lab, and generated types"
    },
    {
      categories: ["maintainability"],
      id: "maintainability",
      summary: "unused, unreachable, cyclic, and oversized source signals"
    }
  ];
  const steps: CheckStep[] = groups.map(group => {
    const matches = issues.filter(issue => group.categories.includes(issue.category));
    const failed = matches.some(issue => issue.level === "error");

    return {
      diagnostics: [...new Set(matches.map(issue => issue.code))].sort(),
      id: group.id,
      status: failed ? "failed" : "passed",
      summary: `${group.summary}; ${matches.length} finding(s)`
    };
  });

  steps.push({
    diagnostics: [],
    id: "browser",
    status: "not-run",
    summary: "not substituted; run the project's real browser test command separately"
  });

  return {
    ok: !issues.some(issue => issue.level === "error"),
    issues,
    steps
  };
}

/** Checks whether project build entry points are present and readable. */
async function findBuildSanityIssues(root: string): Promise<ProjectDiagnostic[]> {
  const issues: DoctorIssue[] = [];
  const packageSource = await readOptionalText(join(root, "package.json"));

  if (!packageSource) {
    issues.push({
      category: "configuration",
      code: "VD_PROJECT_BUILD_CONFIG",
      file: "package.json",
      level: "error",
      message: "package.json is required for reproducible project checks."
    });
  } else {
    try {
      const manifest = JSON.parse(packageSource) as {
        scripts?: Record<string, unknown>;
      };

      for (const script of ["dev", "build"]) {
        if (typeof manifest.scripts?.[script] === "string") continue;
        issues.push({
          category: "configuration",
          code: "VD_PROJECT_BUILD_CONFIG",
          file: "package.json",
          level: "warning",
          message: `The project has no ${script} script, so vd check cannot verify its build entry point.`
        });
      }
    } catch {
      issues.push({
        category: "configuration",
        code: "VD_PROJECT_BUILD_CONFIG",
        file: "package.json",
        level: "error",
        message: "package.json is invalid JSON."
      });
    }
  }

  if (!(await findViteConfig(root))) {
    issues.push({
      category: "configuration",
      code: "VD_PROJECT_BUILD_CONFIG",
      file: "vite.config",
      level: "error",
      message: "A Vite config using velodom/vite-plugin was not found."
    });
  }

  return issues.map(normalizeDoctorIssue);
}

/** Deduplicates diagnostics emitted by overlapping compiler and policy checks. */
function dedupeDiagnostics(issues: ProjectDiagnostic[]) {
  const seen = new Set<string>();

  return issues.filter(issue => {
    const key = `${issue.code}\0${issue.file}\0${issue.location?.line || 0}\0${issue.message}`;

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Prints the stats. */
async function printStats(context: CliContext, json: boolean) {
  const inspection = await inspectProject(context.cwd);
  const stats = {
    pages: inspection.pages.length,
    components: inspection.components.length,
    layouts: inspection.layouts.length,
    apiFiles: inspection.apis.length,
    cssFiles: inspection.css.length,
    compilerFeatures: inspection.compilerFeatures.length,
    eventBindings: inspection.events.length,
    exposeNames: inspection.exposes.length,
    middlewareFiles: inspection.middleware.length,
    refs: inspection.refs.length,
    requestRoutes: inspection.requestRoutes.length,
    seoCoverage: inspection.seo,
    seoConfigFiles: inspection.seoConfigs.length,
    stateKeys: inspection.state.length,
    testFiles: inspection.tests.length,
    directiveUsage: inspection.directiveUsage
  };

  if (json) {
    context.stdout(JSON.stringify(stats, null, 2));
    return;
  }

  context.stdout("VeloDom project stats");
  context.stdout("=====================");
  context.stdout(`Pages: ${stats.pages}`);
  context.stdout(`Components: ${stats.components}`);
  context.stdout(`Layouts: ${stats.layouts}`);
  context.stdout(`API files: ${stats.apiFiles}`);
  context.stdout(`CSS files: ${stats.cssFiles}`);
  context.stdout(`Request routes: ${stats.requestRoutes}`);
  context.stdout(`Middleware files: ${stats.middlewareFiles}`);
  context.stdout(`Compiler features: ${stats.compilerFeatures}`);
  context.stdout(`Refs: ${stats.refs}`);
  context.stdout(`Event bindings: ${stats.eventBindings}`);
  context.stdout(`State keys: ${stats.stateKeys}`);
  context.stdout(`Expose names: ${stats.exposeNames}`);
  context.stdout(`SEO coverage: ${stats.seoCoverage.pagesWithSeo}/${stats.seoCoverage.totalPages}`);
  context.stdout(`SEO config files: ${stats.seoConfigFiles}`);
  context.stdout(`Test files: ${stats.testFiles}`);
  context.stdout("Directive usage:");
  Object.entries(stats.directiveUsage)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([name, count]) => {
      context.stdout(`  - ${name}: ${count}`);
    });
}

/** Prints the routes. */
async function printRoutes(context: CliContext, json: boolean) {
  const inspection = await inspectProject(context.cwd);
  const routes = inspection.pages.map(page => ({
    name: page.name,
    path: page.route || toRoutePath(page.name),
    source: page.source,
    kind: page.kind
  }));

  if (json) {
    context.stdout(JSON.stringify(routes, null, 2));
    return;
  }

  context.stdout("VeloDom routes");
  context.stdout("==============");
  routes.forEach(route => {
    context.stdout(
      `  - ${route.path} (${route.name}, ${route.kind}) -> ${route.source}`
    );
  });
}

/** Prints the build report. */
async function printBuildReport(context: CliContext, json: boolean) {
  const report = await createBuildReport(context.cwd);

  if (json) {
    context.stdout(JSON.stringify(report, null, 2));
    return;
  }

  context.stdout("VeloDom build report");
  context.stdout("====================");
  context.stdout(`Pages: ${report.project.pages}`);
  context.stdout(`Components: ${report.project.components}`);
  context.stdout(`SEO coverage: ${report.project.seoCoverage.pagesWithSeo}/${report.project.seoCoverage.totalPages}`);
  context.stdout(`Compiler features: ${report.project.compilerFeatures.join(", ") || "none"}`);
  context.stdout(`Unused directives: ${report.project.unusedDirectives.join(", ") || "none"}`);
  context.stdout(`Optional runtime features not requested: ${report.project.unusedRuntimeFeatures.join(", ") || "none"}`);
  context.stdout(`Dist JS total: ${formatBytes(report.dist.jsTotalBytes)}`);
  context.stdout(`Dist CSS total: ${formatBytes(report.dist.cssTotalBytes)}`);
  context.stdout(`Rollup metadata: ${report.dist.metadata.available ? "available" : "not available"}`);
  printSizeGroup(context, "Largest pages", report.project.largestPages);
  printSizeGroup(context, "Largest components", report.project.largestComponents);
  printSizeGroup(context, "Largest JS chunks", report.dist.largestJsChunks);
  printSizeGroup(context, "Initial chunks", report.dist.attribution.initialChunks);
  printSizeGroup(context, "Route chunks", report.dist.attribution.routeChunks);
  printSizeGroup(context, "Shared chunks", report.dist.attribution.sharedChunks);
  printSizeGroup(context, "Component chunks", report.dist.attribution.componentChunks);
  printSizeGroup(context, "Lazy feature chunks", report.dist.attribution.lazyFeatureChunks);
  printDependencySignals(context, report.dist.repeatedHeavyDependencies);
  printList(context, "Suggestions", report.suggestions);
}

/** Writes the application declarations. */
async function writeApplicationDeclarations(
  context: CliContext,
  requestedOutput: string | undefined
) {
  const output = resolve(
    context.cwd,
    requestedOutput || "src/velodom.generated.d.ts"
  );
  const outputRelative = relative(context.cwd, output);

  if (outputRelative.startsWith("..") || outputRelative === "") {
    throw new Error("vd types output must be a file inside the project root.");
  }

  const inspection = await inspectProject(context.cwd);
  const componentProps = await discoverComponentProps(context.cwd, inspection);

  await mkdir(dirname(output), { recursive: true });
  await writeFile(
    output,
    createApplicationDeclarations(inspection, componentProps),
    "utf8"
  );
  context.stdout(`Generated ${outputRelative.replaceAll("\\", "/")}`);
}

/** Prints the graph. */
async function printGraph(context: CliContext, flags: Set<string>) {
  const graph = await createProjectGraph(context.cwd);

  if (flags.has("mermaid")) {
    context.stdout(toMermaidGraph(graph));
    return;
  }

  if (flags.has("json")) {
    context.stdout(JSON.stringify(graph, null, 2));
    return;
  }

  context.stdout("VeloDom project graph");
  context.stdout("=====================");
  context.stdout(`Nodes: ${graph.nodes.length}`);
  context.stdout(`Edges: ${graph.edges.length}`);
  graph.edges.forEach(edge => {
    context.stdout(`  - ${edge.from} --${edge.label}--> ${edge.to}`);
  });
}

/** Prints the health. */
async function printHealth(context: CliContext, parsed: ParsedArgs) {
  const health = await createHealthReport(
    context.cwd,
    parsed.options["min-score"]
  );
  const json = parsed.flags.has("json");

  if (json) {
    context.stdout(JSON.stringify(health, null, 2));
    return health.ok ? 0 : 1;
  }

  context.stdout("VeloDom health report");
  context.stdout("=====================");
  context.stdout(`Score: ${health.score}/100`);
  context.stdout(`Threshold: ${health.threshold ?? "not configured"}`);
  context.stdout(`Status: ${health.ok ? "ok" : "below threshold"}`);
  context.stdout("Signals:");
  health.signals.forEach(signal => {
    context.stdout(`  - ${signal}`);
  });
  context.stdout("Issues:");
  if (!health.issues.length) {
    context.stdout("  - none");
  }
  health.issues.forEach(issue => {
    context.stdout(`  - ${issue.level.toUpperCase()} ${issue.file}: ${issue.message}`);
  });

  return health.ok ? 0 : 1;
}

/** Runs the benchmark command. */
async function runBenchmarkCommand(context: CliContext) {
  const manifestSource = await readOptionalText(join(context.cwd, "package.json"));

  if (!manifestSource || !manifestSource.includes("\"benchmark:rendering\"")) {
    context.stderr(
      "vd benchmark requires a project package.json with a benchmark:rendering script."
    );
    return 1;
  }

  const command = process.platform === "win32" ? "npm.cmd" : "npm";

  return runChild(command, [
    "run",
    "benchmark:rendering"
  ], {
    cwd: context.cwd,
    stdio: "inherit"
  });
}

/** Prints the generated docs. */
async function printGeneratedDocs(context: CliContext, json: boolean) {
  const docs = await createDocumentationReport(context.cwd);

  if (json) {
    context.stdout(JSON.stringify(docs, null, 2));
    return;
  }

  context.stdout(toMarkdownDocs(docs));
}

/** Runs the doctor. */
async function runDoctor(
  root: string,
  existingInspection?: ProjectInspection
) {
  const inspection = existingInspection || await inspectProject(root);
  const issues: DoctorIssue[] = [];
  const componentNames = new Set(
    inspection.components.map(component => component.name)
  );
  const requestRoutes = new Set(inspection.requestRoutes);
  const componentContracts = new Map(inspection.components.map(component => {
    const indexed = findIndexedTemplate(inspection, component.source);

    return [component.name, {
      exposes: new Set(findExposeNames(indexed?.script || "")),
      props: findExplicitComponentProps(indexed?.script || "")
    }] as const;
  }));
  await Promise.all(inspection.templates.map(async indexed => {
    const template = indexed.module;
    const analysisHtml = indexed.analysisHtml;
    const script = indexed.script;

    if (indexed.compileError) {
      issues.push({
        file: template.source,
        level: "error",
        message: indexed.compileError
      });
    } else {
      indexed.compileResult?.diagnostics.forEach(diagnostic => {
        const unknownDirective = diagnostic.code === "VD_COMPILER_UNKNOWN_DIRECTIVE"
          ? diagnostic.message.match(/"(vd-[^"]+)"/)?.[1]
          : undefined;
        const nearestDirective = unknownDirective
          ? suggestNearestName(unknownDirective.slice(3), PREFERRED_DIRECTIVES)
          : undefined;

        issues.push({
          category: diagnostic.code.startsWith("VD_A11Y_")
            ? "accessibility"
            : diagnostic.code.startsWith("VD_SECURITY_")
              ? "security"
              : "compiler",
          code: diagnostic.code,
          file: diagnostic.filename,
          level: diagnostic.severity,
          location: diagnostic.location,
          message: diagnostic.message,
          suggestion: nearestDirective
            ? `Did you mean "vd-${nearestDirective}"?`
            : undefined
        });
      });
    }

    findComponentReferences(analysisHtml).forEach(component => {
      if (!componentNames.has(component)) {
        const nearest = suggestNearestName(component, componentNames);

        issues.push({
          category: "component",
          code: "VD_PROJECT_COMPONENT_MISSING",
          file: template.source,
          level: "error",
          location: locateSourceToken(indexed.html, component),
          message: `Component "${component}" was referenced but not discovered.`,
          suggestion: nearest
            ? `Did you mean "${nearest}"?`
            : "Create the component or correct its src/components-relative name."
        });
      }
    });

    findRequestReferences(analysisHtml).forEach(request => {
      if (!requestRoutes.has(request)) {
        const nearest = suggestNearestName(request, requestRoutes);

        issues.push({
          category: "request",
          code: "VD_PROJECT_REQUEST_MISSING",
          file: template.source,
          level: "error",
          location: locateSourceToken(indexed.html, request),
          message: `Request "${request}" was referenced but not registered in src/api/routes.`,
          suggestion: nearest
            ? `Did you mean "${nearest}"?`
            : "Register the route or correct the vd-request name."
        });
      }
    });

    findMissingRefUsages(analysisHtml).forEach(ref => {
      if (!findRefReferences(analysisHtml).includes(ref)) {
        issues.push({
          category: "component",
          code: "VD_PROJECT_REF_MISSING",
          file: template.source,
          level: "warning",
          location: locateSourceToken(indexed.html, `$refs.${ref}`)
            || locateSourceToken(indexed.html, ref),
          message: `Ref "${ref}" is used in an expression but no matching vd-ref was found in this template.`
        });
      }
    });

    findEventBindings(analysisHtml).forEach(binding => {
      if (!binding.handler) return;
      if (hasScriptSymbol(script, binding.handler)) return;

      issues.push({
        category: "component",
        code: "VD_PROJECT_HANDLER_MISSING",
        file: template.source,
        level: "warning",
        location: locateSourceToken(indexed.html, binding.handler),
        message: `Event handler "${binding.handler}" used by "${binding.event}" was not found in the paired script.`
      });
    });

    findDuplicateValues(findStateDeclarationReferences(analysisHtml)).forEach(name => {
      issues.push({
        category: "state",
        code: "VD_PROJECT_STATE_DUPLICATE",
        file: template.source,
        level: "warning",
        location: locateSourceToken(indexed.html, name),
        message: `State key "${name}" is declared more than once in the same template scope.`
      });
    });

    findUnsafeDirectiveExpressions(analysisHtml).forEach(expression => {
      issues.push({
        category: "security",
        code: "VD_PROJECT_UNSAFE_EXPRESSION",
        file: template.source,
        level: "warning",
        location: locateSourceToken(indexed.html, expression.split("=").slice(1).join("=")),
        message: `Directive expression "${expression}" uses unsafe dynamic evaluation.`
      });
    });

    findNavigationTargets(analysisHtml).forEach(target => {
      if (isAppRelativePath(String(target.value))) return;

      issues.push({
        category: "routing",
        code: "VD_PROJECT_NAV_TARGET",
        file: template.source,
        level: "error",
        location: locateSourceToken(indexed.html, target.value),
        message: `vd-nav target "${target.value}" is not an app-relative path.`,
        suggestion: target.value.startsWith("#")
          ? `Use the current route plus the hash, for example "/page${target.value}".`
          : "Use /path for app navigation, or remove vd-nav from external links."
      });
    });

    findRequestTargets(analysisHtml).forEach(target => {
      const protectedKey = findProtectedStatePathKey(target);
      const valid = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(target);
      const runtimeScopeTarget = /^\$(?:refs|route)(?:\.|$)/.test(target);

      if (valid && !protectedKey && !runtimeScopeTarget) return;
      issues.push({
        category: "request",
        code: "VD_PROJECT_REQUEST_TARGET",
        file: template.source,
        level: "error",
        location: locateSourceToken(indexed.html, target),
        message: protectedKey
          ? `Request target "${target}" reaches protected state key "${protectedKey}".`
          : `Request target "${target}" is not a writable state path.`
      });
    });

    const componentUsages = findComponentUsages(analysisHtml);

    componentUsages.forEach(usage => {
      const contract = componentContracts.get(usage.component);

      if (!contract?.props || usage.dynamicProps) return;
      const provided = new Set(usage.props);
      contract.props.required.forEach(name => {
        if (provided.has(name)) return;
        issues.push({
          category: "component",
          code: "VD_PROJECT_COMPONENT_PROP",
          file: template.source,
          level: "error",
          location: locateSourceToken(indexed.html, usage.component),
          message: `Component "${usage.component}" requires prop "${name}".`
        });
      });
      provided.forEach(name => {
        if (contract.props?.all.has(name)) return;
        const nearest = suggestNearestName(name, contract.props?.all || []);

        issues.push({
          category: "component",
          code: "VD_PROJECT_COMPONENT_PROP",
          file: template.source,
          level: "warning",
          location: locateSourceToken(indexed.html, `vd-prop-${name}`),
          message: `Component "${usage.component}" does not declare prop "${name}".`,
          suggestion: nearest ? `Did you mean "${nearest}"?` : undefined
        });
      });
    });

    findComponentRefMemberUsages(analysisHtml).forEach(refUsage => {
      const componentUsage = componentUsages.find(usage => usage.ref === refUsage.ref);
      const contract = componentUsage
        ? componentContracts.get(componentUsage.component)
        : undefined;

      if (!componentUsage || !contract || contract.exposes.has(refUsage.member)) return;
      issues.push({
        category: "component",
        code: "VD_PROJECT_COMPONENT_EXPOSE",
        file: template.source,
        level: "error",
        location: locateSourceToken(indexed.html, `$refs.${refUsage.ref}.${refUsage.member}`),
        message: `Component ref "${refUsage.ref}" calls "${refUsage.member}", but "${componentUsage.component}" does not expose it.`,
        suggestion: suggestNearestName(refUsage.member, contract.exposes)
          ? `Did you mean "${suggestNearestName(refUsage.member, contract.exposes)}"?`
          : "Expose the member from the child component or correct the call."
      });
    });

    findStaticallyUnusedState(indexed.script, analysisHtml).forEach(name => {
      issues.push({
        category: "state",
        code: "VD_PROJECT_STATE_UNUSED",
        file: template.source,
        level: "warning",
        message: `Exported shallow state key "${name}" has no statically visible consumer.`
      });
    });
  }));

  await Promise.all(inspection.pages.map(async page => {
    const configIssues = await validatePageConfigText(root, page);

    issues.push(...configIssues);
  }));

  issues.push(...await findUnusedProjectWarnings(root, inspection));
  issues.push(...findComponentCycleWarnings(inspection));
  issues.push(...await findLargeModuleWarnings(root, inspection.templates.map(
    template => template.module
  )));
  issues.push(...await findLabSetupIssues(root));

  return issues.map(normalizeDoctorIssue).sort((left, right) => (
    `${left.level}:${left.file}:${left.message}`
      .localeCompare(`${right.level}:${right.file}:${right.message}`)
  ));
}

/** Completes legacy/static issue records with stable diagnostic metadata. */
function normalizeDoctorIssue(issue: DoctorIssue): ProjectDiagnostic {
  const inferred = inferDoctorDiagnostic(issue);
  const code = issue.code || inferred.code;
  const explanation = explainDiagnostic(code);

  return {
    category: issue.category || explanation?.category || inferred.category,
    code,
    file: issue.file,
    level: issue.level,
    location: issue.location,
    message: issue.message,
    suggestion: issue.suggestion || explanation?.details[0]
  };
}

/** Assigns stable fallback identities to established doctor checks. */
function inferDoctorDiagnostic(issue: DoctorIssue): {
  category: ProjectDiagnosticCategory;
  code: string;
} {
  if (/\bLab\b|\blab script\b|Vite config/.test(issue.message)) {
    return { category: "tooling", code: "VD_PROJECT_LAB_CONFIG" };
  }
  if (/Circular component/.test(issue.message)) {
    return { category: "component", code: "VD_PROJECT_COMPONENT_CYCLE" };
  }
  if (/config|path|layout|prerender|SEO/i.test(issue.message)) {
    return { category: "configuration", code: "VD_PROJECT_PAGE_CONFIG" };
  }
  if (/javascript:|target="_blank"|noopener/i.test(issue.message)) {
    return { category: "security", code: "VD_PROJECT_SECURITY_LINK" };
  }

  return {
    category: "maintainability",
    code: "VD_PROJECT_MAINTAINABILITY"
  };
}

/** Diagnoses only projects that explicitly expose a VeloDom Lab script. */
async function findLabSetupIssues(root: string): Promise<DoctorIssue[]> {
  const source = await readOptionalText(join(root, "package.json"));

  if (!source) return [];

  let manifest: {
    scripts?: Record<string, string>;
  };

  try {
    manifest = JSON.parse(source);
  } catch {
    return [{
      file: "package.json",
      level: "error",
      message: "package.json is invalid JSON, so VeloDom Lab setup cannot be verified."
    }];
  }

  const labScript = String(manifest.scripts?.lab || "").trim();

  if (!labScript) return [];

  const issues: DoctorIssue[] = [];

  if (!/\bvd\s+lab\b/.test(labScript)) {
    issues.push({
      file: "package.json",
      level: "warning",
      message: "The lab script should call `vd lab` so development-only setup remains consistent."
    });
  }

  if (!String(manifest.scripts?.dev || "").trim()) {
    issues.push({
      file: "package.json",
      level: "error",
      message: "The Lab command requires a dev script that starts Vite."
    });
  }

  if (!(await findViteConfig(root))) {
    issues.push({
      file: "vite.config",
      level: "error",
      message: "The Lab command requires a Vite config using velodom/vite-plugin."
    });
  }

  return issues;
}

/** Inspects the project. */
async function inspectProject(root: string): Promise<ProjectInspection> {
  const sourceIndex = await createProjectSourceIndex(root);
  const requestRoutes = await discoverRequestRoutes(root, sourceIndex.apis);
  const middleware = discoverMiddlewareFiles(sourceIndex.apis);
  const compilerFeatures = new Set<string>();
  const directiveUsage: Record<string, number> = {};
  const refs: ProjectInspection["refs"] = [];
  const events: ProjectInspection["events"] = [];
  const state: ProjectInspection["state"] = [];
  const exposes: ProjectInspection["exposes"] = [];

  sourceIndex.templates.forEach(indexed => {
    indexed.compileResult?.manifest.features.forEach(feature => {
      compilerFeatures.add(feature);
    });
    indexed.compileResult?.metadata.forEach(directive => {
      const name = directive.originalName || directive.name;

      if (!/^(?:data-)?vd-[\w:-]+$/.test(name)) return;
      directiveUsage[name] = (directiveUsage[name] || 0) + 1;
    });
    findRefReferences(indexed.analysisHtml).forEach(name => {
      refs.push({ name, owner: indexed.module.name, source: indexed.module.source });
    });
    findEventBindings(indexed.analysisHtml).forEach(binding => {
      events.push({ ...binding, owner: indexed.module.name, source: indexed.module.source });
    });
    findStateAssignments(indexed.script).forEach(name => {
      state.push({ name, owner: indexed.module.name, source: indexed.module.source });
    });
    findExposeNames(indexed.script).forEach(name => {
      exposes.push({ name, owner: indexed.module.name, source: indexed.module.source });
    });
  });
  const seoConfigs = sourceIndex.templates
    .filter(template => template.kind === "page" && /\bseo\s*:/.test(template.configSource))
    .map(template => template.configFile || template.module.source)
    .sort();

  const inspection: ProjectInspection = {
    ...sourceIndex,
    compilerFeatures: [...compilerFeatures].sort(),
    directiveUsage,
    events: events.sort(compareInspectionItem),
    exposes: exposes.sort(compareInspectionItem),
    middleware,
    refs: refs.sort(compareInspectionItem),
    requestRoutes,
    seo: {
      pagesWithSeo: seoConfigs.length,
      totalPages: sourceIndex.pages.length
    },
    seoConfigs,
    state: state.sort(compareInspectionItem)
  };

  // Source bodies and compiler ASTs are internal caches, not CLI report data.
  Object.defineProperties(inspection, {
    plugins: { enumerable: false },
    templates: { enumerable: false }
  });

  return inspection;
}

/** Creates the build report. */
async function createBuildReport(root: string) {
  const inspection = await inspectProject(root);
  const usedFeatures = new Set(inspection.compilerFeatures);
  const unusedRuntimeFeatures = VD_DIRECTIVE_RUNTIME_FEATURES.filter(feature => (
    !usedFeatures.has(feature)
  ));
  const jsAssets = await readAssetSizes(root, ".js");
  const cssAssets = await readAssetSizes(root, ".css");
  const unusedDirectives = findUnusedDirectives(inspection.directiveUsage);
  const buildMetadata = await readVeloDomBuildMetadata(root);
  const attribution = createBuildAttribution(buildMetadata);
  const repeatedHeavyDependencies = findRepeatedHeavyDependencies(buildMetadata);
  const largestPages = await readModuleSizes(root, inspection.pages);
  const largestComponents = await readModuleSizes(root, inspection.components);
  const largestJsChunks = topSizes(jsAssets);

  return {
    generatedAt: new Date().toISOString(),
    project: {
      pages: inspection.pages.length,
      components: inspection.components.length,
      layouts: inspection.layouts.length,
      requestRoutes: inspection.requestRoutes.length,
      compilerFeatures: inspection.compilerFeatures,
      unusedDirectives,
      unusedRuntimeFeatures,
      seoCoverage: inspection.seo,
      largestPages,
      largestComponents
    },
    dist: {
      jsTotalBytes: sumSizeReports(jsAssets),
      cssTotalBytes: sumSizeReports(cssAssets),
      largestJsChunks,
      largestRouteChunks: attribution.routeChunks,
      largestCssChunks: topSizes(cssAssets),
      metadata: {
        available: buildMetadata !== null,
        source: buildMetadata ? "dist/velodom-build-meta.json" : null,
        version: buildMetadata?.version || null
      },
      attribution,
      repeatedHeavyDependencies
    },
    suggestions: createBuildSuggestions({
      hasBuildMetadata: buildMetadata !== null,
      largestComponents,
      largestJsChunks,
      largestPages
    })
  };
}

/** Creates the health report. */
async function createHealthReport(
  root: string,
  rawThreshold: string | undefined
) {
  const [
    doctorIssues,
    buildReport,
    securityIssues
  ] = await Promise.all([
    runDoctor(root),
    createBuildReport(root),
    runSecurityScan(root)
  ]);
  const issues = [
    ...doctorIssues,
    ...securityIssues
  ];
  const threshold = await resolveHealthThreshold(root, rawThreshold);
  const errorCount = issues.filter(issue => issue.level === "error").length;
  const warningCount = issues.filter(issue => issue.level === "warning").length;
  const seoMissing = Math.max(
    0,
    buildReport.project.seoCoverage.totalPages
      - buildReport.project.seoCoverage.pagesWithSeo
  );
  const score = Math.max(
    0,
    100
      - (errorCount * 12)
      - (warningCount * 3)
      - (seoMissing * 4)
  );

  return {
    ok: threshold === null || score >= threshold,
    score,
    threshold,
    signals: [
      `${errorCount} error(s)`,
      `${warningCount} warning(s)`,
      `${buildReport.project.seoCoverage.pagesWithSeo}/${buildReport.project.seoCoverage.totalPages} page(s) with SEO config`,
      `${formatBytes(buildReport.dist.jsTotalBytes)} generated JavaScript`,
      `${buildReport.project.unusedRuntimeFeatures.length} optional runtime feature(s) not requested by templates`
    ],
    issues,
    build: buildReport
  };
}

/** Creates the documentation report. */
async function createDocumentationReport(root: string) {
  const inspection = await inspectProject(root);
  const pageDetails = inspection.pages.map(page => {
    const indexed = findIndexedTemplate(inspection, page.source);
    const source = indexed?.analysisHtml || "";
    const script = indexed?.script || "";

    return {
      name: page.name,
      path: page.route || toRoutePath(page.name),
      source: page.source,
      components: findComponentReferences(source),
      requests: findRequestReferences(source),
      refs: findRefReferences(source),
      events: findEventReferences(source),
      state: findStateAssignments(script),
      exposes: findExposeNames(script),
      hasSeo: /\bseo\s*:/.test(indexed?.configSource || "")
    };
  });
  const componentDetails = inspection.components.map(component => {
      const indexed = findIndexedTemplate(inspection, component.source);
      const source = indexed?.analysisHtml || "";
      const script = indexed?.script || "";

      return {
        name: component.name,
        source: component.source,
        components: findComponentReferences(source),
        refs: findRefReferences(source),
        events: findEventReferences(source),
        state: findStateAssignments(script),
        exposes: findExposeNames(script),
        slots: findSlotReferences(source)
      };
    });

  return {
    routes: pageDetails,
    components: componentDetails,
    requests: inspection.requestRoutes.map(route => ({
      name: route,
      source: "src/api/routes.js"
    })),
    middleware: inspection.middleware,
    plugins: inspection.plugins,
    seo: {
      pagesWithSeo: pageDetails.filter(page => page.hasSeo).length,
      totalPages: pageDetails.length
    }
  };
}

/** Creates the project graph. */
async function createProjectGraph(root: string): Promise<ProjectGraph> {
  const inspection = await inspectProject(root);
  const nodes = new Map<string, ProjectGraph["nodes"][number]>();
  const edges: ProjectGraph["edges"] = [];
  const templates = [
    ...inspection.pages.map(page => ({
      ...page,
      ownerType: "page"
    })),
    ...inspection.components.map(component => ({
      ...component,
      ownerType: "component"
    })),
    ...inspection.layouts.map(layout => ({
      ...layout,
      ownerType: "layout"
    }))
  ];

  inspection.pages.forEach(page => {
    addGraphNode(nodes, `page:${page.name}`, page.name, "page");
    addGraphNode(nodes, `route:${page.route}`, page.route || page.name, "route");
    edges.push({
      from: `page:${page.name}`,
      label: "route",
      to: `route:${page.route}`
    });
  });

  inspection.components.forEach(component => {
    addGraphNode(nodes, `component:${component.name}`, component.name, "component");
  });
  inspection.layouts.forEach(layout => {
    addGraphNode(nodes, `layout:${layout.name}`, layout.name, "layout");
  });
  inspection.requestRoutes.forEach(route => {
    addGraphNode(nodes, `request:${route}`, route, "request");
  });
  inspection.middleware.forEach(file => {
    addGraphNode(nodes, `middleware:${file}`, file, "middleware");
  });

  templates.forEach(template => {
    const ownerId = `${template.ownerType}:${template.name}`;
    const indexed = findIndexedTemplate(inspection, template.source);
    const source = indexed?.analysisHtml || "";
    const script = indexed?.script || "";

    findComponentReferences(source).forEach(component => {
      addGraphNode(nodes, `component:${component}`, component, "component");
      edges.push({
        from: ownerId,
        label: "uses component",
        to: `component:${component}`
      });
    });

    findRequestReferences(source).forEach(request => {
      addGraphNode(nodes, `request:${request}`, request, "request");
      edges.push({
        from: ownerId,
        label: "requests",
        to: `request:${request}`
      });
    });

    findRefReferences(source).forEach(ref => {
      addGraphNode(nodes, `ref:${template.name}:${ref}`, ref, "ref");
      edges.push({
        from: ownerId,
        label: "declares ref",
        to: `ref:${template.name}:${ref}`
      });
    });

    findEventBindings(source).forEach(binding => {
      const eventId = `event:${template.name}:${binding.event}:${binding.expression}`;

      addGraphNode(nodes, eventId, `${binding.event}: ${binding.expression}`, "event");
      edges.push({
        from: ownerId,
        label: "handles event",
        to: eventId
      });

      if (!binding.handler) return;

      addGraphNode(
        nodes,
        `state:${template.name}:${binding.handler}`,
        binding.handler,
        "state"
      );
      edges.push({
        from: eventId,
        label: "calls",
        to: `state:${template.name}:${binding.handler}`
      });
    });

    findStateAssignments(script).forEach(state => {
      addGraphNode(nodes, `state:${template.name}:${state}`, state, "state");
      edges.push({
        from: ownerId,
        label: "owns state",
        to: `state:${template.name}:${state}`
      });
    });

    findExposeNames(script).forEach(name => {
      addGraphNode(nodes, `expose:${template.name}:${name}`, name, "expose");
      edges.push({
        from: ownerId,
        label: "exposes",
        to: `expose:${template.name}:${name}`
      });
    });
  });

  const middlewareEdges = await discoverRequestMiddlewareEdges(root);

  middlewareEdges.forEach(edge => {
    addGraphNode(nodes, `request:${edge.route}`, edge.route, "request");
    addGraphNode(nodes, `middleware:${edge.middleware}`, edge.middleware, "middleware");
    edges.push({
      from: `request:${edge.route}`,
      label: "middleware",
      to: `middleware:${edge.middleware}`
    });
  });

  return {
    edges: dedupeGraphEdges(edges),
    nodes: [...nodes.values()].sort((left, right) => (
      left.id.localeCompare(right.id)
    ))
  };
}

/** Reads the module sizes. */
async function readModuleSizes(
  root: string,
  modules: DiscoveredModule[]
) {
  const sizes = await Promise.all(modules.map(async module => ({
    bytes: await readFileSize(join(root, module.source)),
    name: module.name,
    source: module.source
  })));

  return topSizes(sizes);
}

/** Reads the asset sizes. */
async function readAssetSizes(root: string, extension: string) {
  const files = await discoverFiles(root, "dist/assets", [extension]);
  const sizes = await Promise.all(files.map(async file => ({
    bytes: await readFileSize(join(root, file)),
    name: file.split("/").at(-1) || file,
    source: file
  })));

  return sizes.sort((left, right) => right.bytes - left.bytes);
}

/** Reads the file size. */
async function readFileSize(file: string) {
  try {
    return (await stat(file)).size;
  } catch {
    return 0;
  }
}

/** Performs the internal `sumSizeReports()` operation. */
function sumSizeReports(files: FileSizeReport[]) {
  return files.reduce((total, file) => total + file.bytes, 0);
}

/** Performs the internal `topSizes()` operation. */
function topSizes(files: FileSizeReport[], count = 5) {
  return [...files]
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, count);
}

/** Finds the unused directives. */
function findUnusedDirectives(usage: Record<string, number>) {
  const used = new Set(
    Object.keys(usage).map(normalizeDirectiveAttribute)
  );

  return PREFERRED_DIRECTIVES.filter(directive => {
    if (directive.endsWith("-")) {
      return ![...used].some(name => name.startsWith(directive));
    }

    return !used.has(directive);
  });
}

/** Attributes Rollup chunks to application concepts using recorded modules. */
function createBuildAttribution(metadata: VeloDomBuildMetadata | null) {
  if (!metadata) {
    return {
      componentChunks: [],
      initialChunks: [],
      lazyFeatureChunks: [],
      routeChunks: [],
      sharedChunks: []
    };
  }

  const initialNames = findInitialChunkNames(metadata.chunks);
  const importCounts = countChunkImporters(metadata.chunks);
  const matchesModule = (
    chunk: VeloDomBuildChunkMetadata,
    pattern: RegExp
  ) => chunk.modules.some(module => pattern.test(module.id));
  const select = (predicate: (chunk: VeloDomBuildChunkMetadata) => boolean) => (
    topSizes(metadata.chunks.filter(predicate).map(toBuildChunkSize))
  );

  return {
    initialChunks: select(chunk => initialNames.has(chunk.fileName)),
    routeChunks: select(chunk => matchesModule(chunk, /(?:^|\/)src\/pages\//)),
    componentChunks: select(chunk => (
      matchesModule(chunk, /(?:^|\/)src\/components\//)
    )),
    lazyFeatureChunks: select(chunk => (
      matchesModule(chunk, /(?:^|\/)(?:src|lib)\/directives\/features\//)
    )),
    sharedChunks: select(chunk => (importCounts.get(chunk.fileName) || 0) > 1)
  };
}

/** Finds entry chunks and every statically imported chunk needed initially. */
function findInitialChunkNames(chunks: VeloDomBuildChunkMetadata[]) {
  const byName = new Map(chunks.map(chunk => [chunk.fileName, chunk]));
  const initial = new Set<string>();
  const visit = (name: string) => {
    if (initial.has(name)) return;
    initial.add(name);
    byName.get(name)?.imports.forEach(visit);
  };

  chunks.filter(chunk => chunk.isEntry).forEach(chunk => visit(chunk.fileName));

  return initial;
}

/** Counts static and dynamic chunk importers without guessing from emitted code. */
function countChunkImporters(chunks: VeloDomBuildChunkMetadata[]) {
  const importers = new Map<string, Set<string>>();

  chunks.forEach(chunk => {
    [...chunk.imports, ...chunk.dynamicImports].forEach(imported => {
      const owners = importers.get(imported) || new Set<string>();
      owners.add(chunk.fileName);
      importers.set(imported, owners);
    });
  });

  return new Map(
    [...importers].map(([name, owners]) => [name, owners.size])
  );
}

/** Measures duplicated dependency bytes from Rollup module contributions. */
function findRepeatedHeavyDependencies(metadata: VeloDomBuildMetadata | null) {
  if (!metadata) return [];

  const dependencies = new Map<string, Map<string, number>>();

  metadata.chunks.forEach(chunk => {
    chunk.modules.forEach(module => {
      const name = readDependencyName(module.id);

      if (!name || module.renderedBytes <= 0) return;

      const chunks = dependencies.get(name) || new Map<string, number>();
      chunks.set(
        chunk.fileName,
        (chunks.get(chunk.fileName) || 0) + module.renderedBytes
      );
      dependencies.set(name, chunks);
    });
  });

  return [...dependencies.entries()].map(([name, chunks]) => {
    const chunkBytes = [...chunks.values()];
    const totalChunkBytes = chunkBytes.reduce((total, bytes) => total + bytes, 0);
    const duplicatedBytes = totalChunkBytes - Math.max(...chunkBytes);

    return {
      chunks: [...chunks.keys()].sort(),
      duplicatedBytes,
      measurement: "rollup-rendered-module-bytes" as const,
      name,
      totalChunkBytes
    };
  }).filter(record => (
    record.chunks.length > 1 && record.duplicatedBytes > 10_000
  )).sort((left, right) => right.duplicatedBytes - left.duplicatedBytes)
    .slice(0, 10);
}

/** Converts one metadata chunk into the common CLI size shape. */
function toBuildChunkSize(chunk: VeloDomBuildChunkMetadata): FileSizeReport {
  return {
    bytes: chunk.bytes,
    name: chunk.fileName.split("/").at(-1) || chunk.fileName,
    source: `dist/${chunk.fileName}`
  };
}

/** Reads a package name from one normalized node_modules module ID. */
function readDependencyName(id: string) {
  const marker = "node_modules/";
  const index = id.lastIndexOf(marker);

  if (index < 0) return "";

  return normalizeDependencyName(id.slice(index + marker.length));
}

/** Creates the build suggestions. */
function createBuildSuggestions(input: {
  hasBuildMetadata: boolean;
  largestComponents: FileSizeReport[];
  largestJsChunks: FileSizeReport[];
  largestPages: FileSizeReport[];
}) {
  const suggestions: string[] = [];
  const largePage = input.largestPages.find(page => page.bytes > 30_000);
  const largeComponent = input.largestComponents.find(component => (
    component.bytes > 20_000
  ));
  const largeChunk = input.largestJsChunks.find(chunk => chunk.bytes > 120_000);

  if (!input.hasBuildMetadata) {
    suggestions.push(
      "Run a production build with velodom/vite-plugin before requesting chunk attribution."
    );
  }

  if (largePage) {
    suggestions.push(
      `Consider route-level prefetch or splitting "${largePage.name}" because its source is ${formatBytes(largePage.bytes)}.`
    );
  }

  if (largeComponent) {
    suggestions.push(
      `Consider component splitting for "${largeComponent.name}" because its source is ${formatBytes(largeComponent.bytes)}.`
    );
  }

  if (largeChunk) {
    suggestions.push(
      `Review production chunk "${largeChunk.name}" (${formatBytes(largeChunk.bytes)}) for lazy routes or heavy dependencies.`
    );
  }

  return suggestions;
}

/** Normalizes the directive attribute. */
function normalizeDirectiveAttribute(attribute: string) {
  return attribute
    .replace(/^data-vd-/, "")
    .replace(/^vd-/, "");
}

/** Normalizes the dependency name. */
function normalizeDependencyName(name: string) {
  const clean = name.replaceAll("\\", "/").replace(/^\.pnpm\//, "");

  if (!clean || clean.startsWith(".")) return "";
  if (clean.startsWith("@")) {
    return clean.split("/").slice(0, 2).join("/");
  }

  return clean.split("/")[0];
}

/** Escapes a value for safe use inside a regular expression. */
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Discovers the request routes. */
async function discoverRequestRoutes(root: string, apiFiles: string[]) {
  const routeFiles = [
    "src/api/routes.js",
    "src/api/routes.ts"
  ];
  const routes = new Set<string>();

  if (!routeFiles.some(file => apiFiles.includes(file))) {
    apiFiles.forEach(file => {
      const name = toFileConventionName(file, "src/api/");

      if (
        name
        && !file.startsWith("src/api/middleware/")
      ) {
        routes.add(name);
      }
    });

    return [...routes].sort();
  }

  await Promise.all(routeFiles.map(async file => {
    const source = await readOptionalText(join(root, file));

    for (const match of source.matchAll(/["']([^"']+)["']\s*:/g)) {
      const route = match[1];

      if (route) routes.add(route);
    }
  }));

  return [...routes].sort();
}

/** Discovers the middleware files. */
function discoverMiddlewareFiles(apiFiles: string[]) {
  const registry = apiFiles.filter(file => (
    /^src\/api\/middleware\.(?:js|ts)$/.test(file)
  ));

  if (registry.length) return registry;

  return apiFiles.filter(file => (
    /^src\/api\/middleware\/.+\.(?:js|ts)$/.test(file)
  ));
}

/** Performs the internal `toFileConventionName()` operation. */
function toFileConventionName(file: string, prefix: string) {
  if (!file.startsWith(prefix) || !/\.(?:js|ts)$/.test(file)) {
    return undefined;
  }

  const segments = file
    .slice(prefix.length)
    .replace(/\.(?:js|ts)$/, "")
    .split("/")
    .filter(Boolean);

  return segments.length >= 2 ? segments.join(".") : undefined;
}

/** Discovers the component props. */
async function discoverComponentProps(
  _root: string,
  inspection: ProjectInspection
) {
  const props = new Map<string, ComponentPropFacts>();
  inspection.components.forEach(component => {
    const indexed = findIndexedTemplate(inspection, component.source);
    const contract = findExplicitComponentProps(indexed?.script || "");

    props.set(component.name, contract || {
      all: new Set(),
      required: new Set()
    });
  });

  inspection.templates.forEach(template => {
    findComponentUsages(template.analysisHtml).forEach(reference => {
      const facts = props.get(reference.component) || {
        all: new Set<string>(),
        required: new Set<string>()
      };

      reference.props.forEach(name => facts.all.add(name));
      props.set(reference.component, facts);
    });
  });

  return props;
}

/** Finds the component references. */
function findComponentReferences(source: string) {
  const names = new Set<string>();

  for (const match of source.matchAll(/<vd-component\b[^>]*\bname=["']([^"']+)["'][^>]*>/gi)) {
    names.add(normalizeModuleName(match[1] || ""));
  }

  for (const match of source.matchAll(/\b(?:data-)?vd-component=["']([^"']+)["']/gi)) {
    names.add(normalizeModuleName(match[1] || ""));
  }

  return [...names].filter(Boolean).sort();
}

/** Finds static navigation targets owned by elements that opt into vd-nav. */
function findNavigationTargets(source: string) {
  const targets: Array<{ value: string }> = [];

  for (const match of source.matchAll(/<[a-z][^>]*>/gi)) {
    const tag = match[0];

    if (!/\b(?:data-)?vd-nav(?:\s|=|>)/i.test(tag)) continue;
    const value = tag.match(/\bhref=["']([^"']+)["']/i)?.[1]?.trim();

    if (value) targets.push({ value });
  }

  return targets;
}

/** Finds statically writable targets on declarative request elements. */
function findRequestTargets(source: string) {
  const targets = new Set<string>();

  for (const match of source.matchAll(/<[a-z][^>]*>/gi)) {
    const tag = match[0];

    if (!/\b(?:data-)?vd-request=["']/i.test(tag)) continue;
    const target = tag.match(/\b(?:data-)?vd-target=["']([^"']+)["']/i)?.[1]?.trim();

    if (target) targets.add(target);
  }

  return [...targets].sort();
}

/** Finds component names, refs, and statically supplied prop keys. */
function findComponentUsages(source: string) {
  const usages: Array<{
    component: string;
    dynamicProps: boolean;
    props: string[];
    ref?: string;
  }> = [];

  for (const match of source.matchAll(/<(?:vd-component|[a-z][\w:-]*)\b([^>]*)>/gi)) {
    const attributes = match[1] || "";
    const component = attributes.match(/\bname=["']([^"']+)["']/i)?.[1]
      || attributes.match(/\b(?:data-)?vd-component=["']([^"']+)["']/i)?.[1];

    if (!component) continue;
    const props = new Set(
      [...attributes.matchAll(/\b(?:data-)?vd-prop-([\w-]+)=/gi)]
        .map(prop => prop[1] || "")
        .filter(Boolean)
    );
    const objectSource = attributes.match(/\b(?:data-)?vd-props=["']([^"']+)["']/i)?.[1]
      ?.trim();
    let dynamicProps = false;

    if (objectSource) {
      if (
        objectSource.startsWith("{")
        && objectSource.endsWith("}")
        && !objectSource.includes("...")
      ) {
        readTopLevelObjectKeys(objectSource, 0).forEach(name => props.add(name));
      } else {
        dynamicProps = true;
      }
    }

    usages.push({
      component: normalizeModuleName(component),
      dynamicProps,
      props: [...props].sort(),
      ref: attributes.match(/\b(?:data-)?vd-ref=["']([^"']+)["']/i)?.[1]?.trim()
    });
  }

  return usages;
}

/** Reads a simple explicit ComponentInitContext<Props> contract when present. */
function findExplicitComponentProps(source: string) {
  const typeName = source.match(/\bComponentInitContext\s*<\s*([A-Za-z_$][\w$]*)/)?.[1];

  if (!typeName) return null;
  const escaped = escapeRegExp(typeName);
  const body = source.match(new RegExp(
    `\\binterface\\s+${escaped}\\s*\\{([\\s\\S]*?)\\}`
  ))?.[1] || source.match(new RegExp(
    `\\btype\\s+${escaped}(?:\\s*=)?\\s*\\{([\\s\\S]*?)\\}`
  ))?.[1];

  if (!body) return null;
  const all = new Set<string>();
  const required = new Set<string>();

  for (const match of body.matchAll(/(?:^|[;\r\n])\s*([A-Za-z_$][\w$]*)(\?)?\s*:/g)) {
    const name = match[1];

    if (!name) continue;
    all.add(name);
    if (!match[2]) required.add(name);
  }

  return all.size ? { all, required } : null;
}

/** Finds member calls made through local component refs. */
function findComponentRefMemberUsages(source: string) {
  const usages = new Map<string, { member: string; ref: string }>();

  for (const match of source.matchAll(
    /\$refs\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\(/g
  )) {
    const ref = match[1];
    const member = match[2];

    if (ref && member) usages.set(`${ref}:${member}`, { member, ref });
  }

  return [...usages.values()].sort((left, right) => (
    `${left.ref}:${left.member}`.localeCompare(`${right.ref}:${right.member}`)
  ));
}

/** Finds exported state keys with no conservative static consumer signal. */
function findStaticallyUnusedState(script: string, template: string) {
  return findExportedStateKeys(script).filter(name => {
    const escaped = escapeRegExp(name);
    const templateUsesName = new RegExp(`\\b${escaped}\\b`).test(template);
    const scriptOccurrences = [...script.matchAll(new RegExp(`\\b${escaped}\\b`, "g"))]
      .length;

    return !templateUsesName && scriptOccurrences <= 1;
  });
}

/** Finds the request references. */
function findRequestReferences(source: string) {
  return [...source.matchAll(/\b(?:data-)?vd-request=["']([^"'{]+)["']/gi)]
    .map(match => match[1]?.trim() || "")
    .filter(Boolean)
    .sort();
}

/** Finds the directive expressions. */
function findDirectiveExpressions(source: string) {
  const expressions: Array<{
    directive: string;
    expression: string;
  }> = [];

  for (const match of source.matchAll(/\b((?:data-)?vd-[\w:-]+)=["']([^"']+)["']/gi)) {
    const directive = match[1];
    const expression = match[2]?.trim();

    if (!directive || !expression) continue;

    expressions.push({
      directive,
      expression
    });
  }

  return expressions;
}

/** Finds the unsafe directive expressions. */
function findUnsafeDirectiveExpressions(source: string) {
  return findDirectiveExpressions(source)
    .filter(item => /\b(?:eval|Function)\s*\(/.test(item.expression)
      || /\bnew\s+Function\s*\(/.test(item.expression))
    .map(item => `${item.directive}=${item.expression}`)
    .sort();
}

/** Finds the ref references. */
function findRefReferences(source: string) {
  return [...source.matchAll(/\b(?:data-)?vd-ref=["']([^"']+)["']/gi)]
    .map(match => match[1]?.trim() || "")
    .filter(Boolean)
    .sort();
}

/** Finds the missing ref usages. */
function findMissingRefUsages(source: string) {
  const refs = new Set<string>();

  for (const match of source.matchAll(/\$refs\.([A-Za-z_$][\w$]*)/g)) {
    const name = match[1];

    if (name) refs.add(name);
  }

  for (const match of source.matchAll(/\$refs\[['"]([^'"]+)['"]\]/g)) {
    const name = match[1]?.trim();

    if (name) refs.add(name);
  }

  return [...refs].filter(Boolean).sort();
}

/** Finds the event references. */
function findEventReferences(source: string) {
  return findEventBindings(source).map(binding => (
    `${binding.event} -> ${binding.expression}`
  ));
}

/** Finds the event bindings. */
function findEventBindings(source: string) {
  const events = new Map<string, {
    event: string;
    expression: string;
    handler?: string;
  }>();

  for (const match of source.matchAll(/\bvd-on:([\w:-]+)=["']([^"']+)["']/gi)) {
    const event = match[1];
    const expression = match[2]?.trim();

    if (!event || !expression) continue;

    events.set(`${event}:${expression}`, {
      event,
      expression,
      handler: findHandlerName(expression)
    });
  }

  for (const match of source.matchAll(/\bdata-vd-on-([\w:-]+)=["']([^"']+)["']/gi)) {
    const event = match[1];
    const expression = match[2]?.trim();

    if (!event || !expression) continue;

    events.set(`${event}:${expression}`, {
      event,
      expression,
      handler: findHandlerName(expression)
    });
  }

  return [...events.values()].sort((left, right) => (
    `${left.event}:${left.expression}`.localeCompare(`${right.event}:${right.expression}`)
  ));
}

/** Finds the slot references. */
function findSlotReferences(source: string) {
  const slots = new Set<string>();

  for (const match of source.matchAll(/\b(?:data-)?vd-get-child=["']([^"']*)["']/gi)) {
    slots.add(match[1]?.trim() || "default");
  }

  return [...slots].sort();
}

/** Finds the handler name. */
function findHandlerName(expression: string) {
  return expression.match(/^([A-Za-z_$][\w$]*)\s*(?:\(|$)/)?.[1];
}

/** Finds the state assignments. */
function findStateAssignments(source: string) {
  const names = new Set(findExportedStateKeys(source));

  for (const match of source.matchAll(/\bstate\s*\.\s*([A-Za-z_$][\w$]*)\s*=/g)) {
    const name = match[1];

    if (name) names.add(name);
  }

  return [...names].sort();
}

/** Finds the exported state keys. */
function findExportedStateKeys(source: string) {
  const declaration = /\bexport\s+const\s+state(?:\s*:[^=]+)?\s*=\s*\{/g
    .exec(source);

  if (!declaration) return [];

  const objectStart = source.indexOf("{", declaration.index);

  return readTopLevelObjectKeys(source, objectStart);
}

/**
 * Reads top-level object keys while skipping strings, comments, and nested
 * values. The CLI stays dependency-free and does not require TypeScript merely
 * to inspect ordinary application objects such as `state` and `expose`.
 */
function readTopLevelObjectKeys(source: string, objectStart: number) {
  const keys = new Set<string>();
  let braces = 1;
  let brackets = 0;
  let parentheses = 0;
  let segmentStart = objectStart + 1;
  let quote = "";

  for (let index = objectStart + 1; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (quote) {
      if (character === "\\") {
        index += 1;
      } else if (character === quote) {
        quote = "";
      }
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }

    if (character === "/" && next === "/") {
      index = source.indexOf("\n", index + 2);
      if (index === -1) break;
      continue;
    }

    if (character === "/" && next === "*") {
      const closing = source.indexOf("*/", index + 2);

      if (closing === -1) break;
      index = closing + 1;
      continue;
    }

    if (character === "{") braces += 1;
    if (character === "[") brackets += 1;
    if (character === "(") parentheses += 1;

    if (character === "}") {
      if (braces === 1) {
        addTopLevelObjectKey(keys, source.slice(segmentStart, index));
        break;
      }
      braces -= 1;
    }
    if (character === "]") brackets -= 1;
    if (character === ")") parentheses -= 1;

    if (
      character === ","
      && braces === 1
      && brackets === 0
      && parentheses === 0
    ) {
      addTopLevelObjectKey(keys, source.slice(segmentStart, index));
      segmentStart = index + 1;
    }
  }

  return [...keys].sort();
}

/** Adds the top level object key. */
function addTopLevelObjectKey(keys: Set<string>, segment: string) {
  const value = segment.replace(
    /^(?:\s|\/\/[^\r\n]*(?:\r?\n|$)|\/\*[\s\S]*?\*\/)*/,
    ""
  );

  if (!value || value.startsWith("...")) return;

  const quoted = value.match(/^(["'])([^"']+)\1\s*:/);
  const identifier = value.match(/^([A-Za-z_$][\w$]*)\s*(?=:|\(|$)/);
  const key = quoted?.[2] || identifier?.[1];

  if (key) keys.add(key);
}

/** Finds the state declaration references. */
function findStateDeclarationReferences(source: string) {
  return [...source.matchAll(/\b(?:data-)?vd-state=["']([^"']+)["']/gi)]
    .map(match => match[1]?.trim() || "")
    .filter(Boolean)
    .sort();
}

/** Finds the expose names. */
function findExposeNames(source: string) {
  const names = new Set<string>();
  const arraySource = source.match(/\bexpose\s*[:=]\s*\[([^\]]*)\]/)?.[1] || "";

  for (const match of arraySource.matchAll(/["']([^"']+)["']/g)) {
    const name = match[1]?.trim();

    if (name) names.add(name);
  }

  for (const match of source.matchAll(/\bexpose\s*\(\s*["']([^"']+)["']\s*\)/g)) {
    const name = match[1]?.trim();

    if (name) names.add(name);
  }

  const objectPattern = /\bexpose(?:\s*:\s*\{|(?:\s*:\s*[^=;\r\n]+)?\s*=\s*\{)/g;

  for (const match of source.matchAll(objectPattern)) {
    const objectStart = source.indexOf("{", match.index);

    readTopLevelObjectKeys(source, objectStart).forEach(name => names.add(name));
  }

  return [...names].filter(Boolean).sort();
}

/** Evaluates the `hasScriptSymbol()` condition for the supplied input. */
function hasScriptSymbol(source: string, name: string) {
  if (!source.trim()) return false;

  const escaped = escapeRegExp(name);
  const patterns = [
    new RegExp(`\\bstate\\s*\\.\\s*${escaped}\\s*=`),
    new RegExp(`\\bfunction\\s+${escaped}\\s*\\(`),
    new RegExp(`\\bexport\\s+(?:async\\s+)?function\\s+${escaped}\\s*\\(`),
    new RegExp(`\\b(?:const|let|var)\\s+${escaped}\\b`),
    new RegExp(`\\b${escaped}\\s*:\\s*(?:async\\s*)?(?:function|\\(|[A-Za-z_$][\\w$]*\\s*=>)`)
  ];

  return patterns.some(pattern => pattern.test(source));
}

/** Finds the duplicate values. */
function findDuplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  values.forEach(value => {
    if (seen.has(value)) {
      duplicates.add(value);
      return;
    }

    seen.add(value);
  });

  return [...duplicates].sort();
}

/** Performs the internal `toMarkdownDocs()` operation. */
function toMarkdownDocs(docs: Awaited<ReturnType<typeof createDocumentationReport>>) {
  const lines = [
    "# VeloDom Project Documentation",
    "",
    "## Routes",
    ""
  ];

  docs.routes.forEach(route => {
    lines.push(`- \`${route.path}\` — \`${route.name}\` (${route.source})`);
    pushNestedList(lines, "components", route.components);
    pushNestedList(lines, "requests", route.requests);
    pushNestedList(lines, "refs", route.refs);
    pushNestedList(lines, "events", route.events);
    pushNestedList(lines, "state", route.state);
    pushNestedList(lines, "exposes", route.exposes);
    lines.push(`  - seo: ${route.hasSeo ? "yes" : "no"}`);
  });

  lines.push("", "## Components", "");
  docs.components.forEach(component => {
    lines.push(`- \`${component.name}\` (${component.source})`);
    pushNestedList(lines, "child components", component.components);
    pushNestedList(lines, "slots", component.slots);
    pushNestedList(lines, "refs", component.refs);
    pushNestedList(lines, "events", component.events);
    pushNestedList(lines, "state", component.state);
    pushNestedList(lines, "exposes", component.exposes);
  });

  lines.push("", "## Requests", "");
  docs.requests.forEach(request => {
    lines.push(`- \`${request.name}\` (${request.source})`);
  });

  lines.push("", "## Middleware", "");
  docs.middleware.forEach(file => {
    lines.push(`- ${file}`);
  });

  lines.push("", "## Plugins", "");
  docs.plugins.forEach(file => {
    lines.push(`- ${file}`);
  });

  lines.push(
    "",
    "## SEO",
    "",
    `- pages with SEO config: ${docs.seo.pagesWithSeo}/${docs.seo.totalPages}`
  );

  return lines.join("\n");
}

/** Creates the application declarations. */
function createApplicationDeclarations(
  inspection: ProjectInspection,
  componentProps: Map<string, ComponentPropFacts>
) {
  const lines = [
    "/**",
    " * Generated by `vd types`. Do not edit this file directly.",
    " * Run `vd types` after changing page routes, component props, or API routes.",
    " */",
    "declare module \"velodom/app\" {",
    "  export interface VeloDomPageParams {"
  ];

  inspection.pages.forEach(page => {
    const params = getRouteParameterNames(page.route || toRoutePath(page.name));
    const shape = params.length
      ? `{ ${params.map(name => `${quoteTypeKey(name)}: string`).join("; ")} }`
      : "Record<string, never>";

    lines.push(`    ${quoteTypeKey(page.name)}: ${shape};`);
  });

  lines.push(
    "  }",
    "",
    "  export type VeloDomPageName = keyof VeloDomPageParams;",
    "  export type VeloDomPageParamsFor<TPage extends VeloDomPageName> = VeloDomPageParams[TPage];",
    "",
    "  export interface VeloDomPageConfigByName {"
  );
  inspection.pages.forEach(page => {
    lines.push(`    ${quoteTypeKey(page.name)}: import("velodom").PageConfig;`);
  });

  lines.push("  }", "", "  export interface VeloDomRequestRoutes {");
  inspection.requestRoutes.forEach(route => {
    lines.push(`    ${quoteTypeKey(route)}: unknown;`);
  });
  lines.push(
    "  }",
    "",
    "  export type VeloDomRequestRouteName = keyof VeloDomRequestRoutes;",
    "",
    "  export interface VeloDomComponentProps {"
  );
  [...componentProps.entries()].sort(([left], [right]) => (
    left.localeCompare(right)
  )).forEach(([name, props]) => {
    const shape = props.all.size
      ? `{ ${[...props.all].sort().map(prop => (
          `${quoteTypeKey(prop)}${props.required.has(prop) ? "" : "?"}: unknown`
        )).join("; ")} }`
      : "Record<string, never>";

    lines.push(`    ${quoteTypeKey(name)}: ${shape};`);
  });
  lines.push(
    "  }",
    "",
    "  export type VeloDomComponentName = keyof VeloDomComponentProps;",
    "  export type VeloDomComponentPropsFor<TComponent extends VeloDomComponentName> = VeloDomComponentProps[TComponent];",
    "}",
    "",
    "export {};",
    ""
  );

  return lines.join("\n");
}

/** Returns the route parameter names. */
function getRouteParameterNames(route: string) {
  const names = new Set<string>();

  for (const match of route.matchAll(/:([A-Za-z_$][\w$]*)/g)) {
    const name = match[1];

    if (name) names.add(name);
  }

  return [...names].sort();
}

/** Performs the internal `quoteTypeKey()` operation. */
function quoteTypeKey(value: string) {
  return JSON.stringify(value);
}

/** Performs the internal `pushNestedList()` operation. */
function pushNestedList(
  lines: string[],
  label: string,
  values: string[]
) {
  if (!values.length) return;

  lines.push(`  - ${label}: ${values.map(value => `\`${value}\``).join(", ")}`);
}

/** Compares the inspection item. */
function compareInspectionItem(
  left: {
    name?: string;
    owner: string;
    source: string;
  },
  right: {
    name?: string;
    owner: string;
    source: string;
  }
) {
  return `${left.owner}:${left.name || ""}:${left.source}`
    .localeCompare(`${right.owner}:${right.name || ""}:${right.source}`);
}

/** Discovers the request middleware edges. */
async function discoverRequestMiddlewareEdges(root: string) {
  const files = [
    "src/api/routes.js",
    "src/api/routes.ts"
  ];
  const edges: Array<{
    middleware: string;
    route: string;
  }> = [];

  await Promise.all(files.map(async file => {
    const source = await readOptionalText(join(root, file));
    const routePattern = /["']([^"']+)["']\s*:\s*\{([\s\S]*?)\}/g;

    for (const match of source.matchAll(routePattern)) {
      const route = match[1];
      const middlewareSource = match[2]?.match(/middleware\s*:\s*\[([^\]]*)\]/)?.[1] || "";

      if (!route) continue;

      for (const middleware of middlewareSource.matchAll(/["']([^"']+)["']/g)) {
        const middlewareName = middleware[1];

        if (!middlewareName) continue;

        edges.push({
          route,
          middleware: middlewareName
        });
      }
    }
  }));

  return edges;
}

/** Finds the unused project warnings. */
async function findUnusedProjectWarnings(
  root: string,
  inspection: ProjectInspection
) {
  const issues: DoctorIssue[] = [];
  const referencedComponents = new Set<string>();
  const referencedRequests = new Set<string>();
  const middlewareEdges = await discoverRequestMiddlewareEdges(root);
  const referencedMiddleware = new Set(
    middlewareEdges.map(edge => edge.middleware)
  );
  const declaredMiddleware = await discoverMiddlewareNames(root, inspection.middleware);
  inspection.templates.forEach(template => {
    findComponentReferences(template.analysisHtml).forEach(component => {
      referencedComponents.add(component);
    });
    findRequestReferences(template.analysisHtml).forEach(request => {
      referencedRequests.add(request);
    });
  });

  inspection.components.forEach(component => {
    if (referencedComponents.has(component.name)) return;

    issues.push({
      file: component.source,
      level: "warning",
      message: `Component "${component.name}" is not referenced by any discovered template.`
    });
  });

  inspection.requestRoutes.forEach(route => {
    if (referencedRequests.has(route)) return;

    issues.push({
      file: "src/api/routes.js",
      level: "warning",
      message: `Request route "${route}" is not referenced by any declarative template.`
    });
  });

  referencedMiddleware.forEach(name => {
    if (declaredMiddleware.has(name)) return;

    issues.push({
      file: "src/api/routes.js",
      level: "warning",
      message: `Middleware "${name}" is used by a request route but was not found in src/api/middleware.`
    });
  });

  declaredMiddleware.forEach(name => {
    if (referencedMiddleware.has(name)) return;

    issues.push({
      file: "src/api/middleware.js",
      level: "warning",
      message: `Middleware "${name}" is declared but not used by any request route.`
    });
  });

  (await discoverFiles(root, "src/showcase", [".html", ".vd", ".js", ".ts"]))
    .forEach(file => {
      issues.push({
        file,
        level: "warning",
        message: "Showcase file is outside the routed pages tree; verify that it is intentionally unreachable."
      });
    });

  return issues;
}

/** Discovers the middleware names. */
async function discoverMiddlewareNames(
  root: string,
  files: string[]
) {
  const names = new Set<string>();

  await Promise.all(files.map(async file => {
    const fileName = toFileConventionName(file, "src/api/middleware/");

    if (fileName) {
      names.add(fileName);
      return;
    }

    const source = await readOptionalText(join(root, file));
    const defaultObject = source.match(/export\s+default\s+\{([\s\S]*?)\}\s*;?/m)?.[1]
      || "";

    for (const match of defaultObject.matchAll(/(?:^|,)\s*([A-Za-z_$][\w$]*)\s*:/g)) {
      const name = match[1];

      if (name) names.add(name);
    }

    for (const match of defaultObject.matchAll(/(?:^|,)\s*["']([^"']+)["']\s*:/g)) {
      const name = match[1];

      if (name) names.add(name);
    }

    for (const match of source.matchAll(/\bexport\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = match[1];

      if (name) names.add(name);
    }

    for (const match of source.matchAll(/\bexport\s+const\s+([A-Za-z_$][\w$]*)\b/g)) {
      const name = match[1];

      if (name) names.add(name);
    }
  }));

  return names;
}

/** Finds the component cycle warnings. */
function findComponentCycleWarnings(
  inspection: ProjectInspection
) {
  const issues: DoctorIssue[] = [];
  const componentByName = new Map(
    inspection.components.map(component => [
      component.name,
      component
    ])
  );
  const graph = new Map<string, string[]>();

  inspection.components.forEach(component => {
    const indexed = findIndexedTemplate(inspection, component.source);
    const dependencies = findComponentReferences(indexed?.analysisHtml || "")
      .filter(name => componentByName.has(name));

    graph.set(component.name, dependencies);
  });

  findCycles(graph).forEach(cycle => {
    const firstName = cycle[0];
    const first = firstName ? componentByName.get(firstName) : undefined;

    issues.push({
      file: first?.source || "src/components",
      level: "warning",
      message: `Circular component dependency detected: ${cycle.join(" -> ")}.`
    });
  });

  return issues;
}

/** Finds the large module warnings. */
async function findLargeModuleWarnings(
  root: string,
  modules: DiscoveredModule[]
) {
  const issues: DoctorIssue[] = [];
  const warningSize = 30_000;

  await Promise.all(modules.map(async module => {
    const bytes = await readFileSize(join(root, module.source));

    if (bytes <= warningSize) return;

    issues.push({
      file: module.source,
      level: "warning",
      message: `Large template source (${formatBytes(bytes)}). Consider splitting components or simplifying the page template.`
    });
  }));

  return issues;
}

/** Finds the cycles. */
function findCycles(graph: Map<string, string[]>) {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  /** Visits the requested value. */
  function visit(node: string) {
    if (stack.has(node)) {
      const start = path.indexOf(node);
      const cycle = [
        ...path.slice(start),
        node
      ];

      cycles.push(cycle);
      return;
    }

    if (visited.has(node)) return;

    visited.add(node);
    stack.add(node);
    path.push(node);
    (graph.get(node) || []).forEach(visit);
    path.pop();
    stack.delete(node);
  }

  [...graph.keys()].forEach(visit);

  return dedupeCycles(cycles);
}

/** Deduplicates the cycles. */
function dedupeCycles(cycles: string[][]) {
  const seen = new Set<string>();

  return cycles.filter(cycle => {
    const key = [...cycle].sort().join("\0");

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

/** Adds the graph node. */
function addGraphNode(
  nodes: Map<string, ProjectGraph["nodes"][number]>,
  id: string,
  label: string | undefined,
  type: string
) {
  if (nodes.has(id)) return;

  nodes.set(id, {
    id,
    label: label || id,
    type
  });
}

/** Deduplicates the graph edges. */
function dedupeGraphEdges(edges: ProjectGraph["edges"]) {
  const seen = new Set<string>();

  return edges.filter(edge => {
    const key = `${edge.from}\0${edge.label}\0${edge.to}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  }).sort((left, right) => (
    `${left.from}:${left.label}:${left.to}`
      .localeCompare(`${right.from}:${right.label}:${right.to}`)
  ));
}

/** Performs the internal `toMermaidGraph()` operation. */
function toMermaidGraph(graph: ProjectGraph) {
  const lines = [
    "flowchart TD"
  ];

  graph.nodes.forEach(node => {
    lines.push(`  ${toMermaidId(node.id)}["${escapeMermaidLabel(node.label)}"]`);
  });
  graph.edges.forEach(edge => {
    lines.push(
      `  ${toMermaidId(edge.from)} -->|"${escapeMermaidLabel(edge.label)}"| ${toMermaidId(edge.to)}`
    );
  });

  return lines.join("\n");
}

/** Performs the internal `toMermaidId()` operation. */
function toMermaidId(value: string) {
  return value.replace(/[^A-Za-z0-9_]/g, "_");
}

/** Escapes the mermaid label. */
function escapeMermaidLabel(value: string) {
  return value.replaceAll("\"", "&quot;");
}

/** Runs the child. */
function runChild(
  command: string,
  args: string[],
  options: SpawnOptions
) {
  return new Promise<number>(resolvePromise => {
    const child = spawn(command, args, {
      ...options,
      shell: false
    });

    child.on("error", () => resolvePromise(1));
    child.on("exit", code => resolvePromise(code ?? 1));
  });
}

/** Runs the security scan. */
async function runSecurityScan(root: string) {
  const inspection = await inspectProject(root);
  const issues: DoctorIssue[] = [];
  inspection.templates.forEach(indexed => {
    const template = indexed.module;
    const source = indexed.analysisHtml;

    if (/href\s*=\s*["']javascript:/i.test(source)) {
      issues.push({
        file: template.source,
        level: "error",
        message: "Avoid javascript: links in templates."
      });
    }

    for (const match of source.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)) {
      if (!/\brel=["'][^"']*\bnoopener\b/i.test(match[0])) {
        issues.push({
          file: template.source,
          level: "warning",
          message: "Links with target=\"_blank\" should include rel=\"noopener\"."
        });
      }
    }
  });

  return issues.map(normalizeDoctorIssue);
}

/** Resolves the health threshold. */
async function resolveHealthThreshold(
  root: string,
  rawThreshold: string | undefined
) {
  if (rawThreshold !== undefined) {
    return normalizeHealthThreshold(rawThreshold, "--min-score");
  }

  const source = await readOptionalText(join(root, ".velodom-health.json"));

  if (!source) return null;

  try {
    const config = JSON.parse(source) as {
      minScore?: unknown;
    };

    return config.minScore === undefined
      ? null
      : normalizeHealthThreshold(config.minScore, ".velodom-health.json:minScore");
  } catch {
    throw new Error("Invalid .velodom-health.json file.");
  }
}

/** Normalizes the health threshold. */
function normalizeHealthThreshold(value: unknown, label: string) {
  const score = Number(value);

  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error(`${label} must be a number between 0 and 100.`);
  }

  return score;
}

/** Validates the page config text. */
async function validatePageConfigText(
  root: string,
  page: DiscoveredModule
) {
  const issues: DoctorIssue[] = [];
  const configFile = page.source.endsWith(".vd")
    ? page.source
    : await findConfigFile(root, dirname(page.source));

  if (!configFile) return issues;

  const source = await readOptionalText(join(root, configFile));

  if (!source) return issues;

  if (!/export\s+default\s+/.test(source)) {
    issues.push({
      file: configFile,
      level: "error",
      message: "Page config should export a default object."
    });
  }

  const route = readStaticPath(source);

  if (route && !route.startsWith("/")) {
    issues.push({
      file: configFile,
      level: "error",
      message: "Page config path should start with '/'."
    });
  }

  return issues;
}

/** Finds the config file. */
async function findConfigFile(root: string, folder: string) {
  return (await readPageConfigSource(root, folder))?.file
    || pageConfigPaths(folder)[0]
    || null;
}

/** Parses the args. */
function parseArgs(args: string[]): ParsedArgs {
  const flags = new Set<string>();
  const options: Record<string, string> = {};
  const values: string[] = [];
  const valueOptions = new Set([
    "demo",
    "min-score",
    "out",
    "package-manager",
    "template",
    "root"
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg) continue;

    if (!arg.startsWith("--")) {
      values.push(arg);
      continue;
    }

    const name = arg.slice(2);

    if (valueOptions.has(name)) {
      const value = args[index + 1];

      if (!value || value.startsWith("--")) {
        throw new Error(`--${name} requires a value.`);
      }

      options[name] = value;
      index += 1;
      continue;
    }

    flags.add(name);
  }

  return {
    flags,
    options,
    values
  };
}

/** Reads the cli version. */
async function readCliVersion() {
  const manifest = JSON.parse(await readFile(
    new URL("../package.json", import.meta.url),
    "utf8"
  )) as { version?: string };

  return manifest.version || "unknown";
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  process.exitCode = await runVeloDomCli(process.argv.slice(2));
}
