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
  stat
} from "node:fs/promises";
import {
  dirname,
  join,
  resolve
} from "node:path";
import { pathToFileURL } from "node:url";
import { VD_DIRECTIVE_RUNTIME_FEATURES } from "./constants.ts";
import { compileTemplate } from "./compiler/index.ts";
import { PREFERRED_DIRECTIVES } from "./shared/directives.ts";
import {
  discoverFiles,
  discoverModules,
  normalizeModuleName,
  pageConfigPaths,
  readOptionalText,
  readPageConfigSource,
  readStaticPath,
  toRoutePath
} from "./cli/analyzer.ts";
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

interface CliOptions {
  cwd?: string;
  stderr?: (message: string) => void;
  stdout?: (message: string) => void;
}

interface ProjectInspection {
  apis: string[];
  compilerFeatures: string[];
  components: DiscoveredModule[];
  css: string[];
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
  layouts: DiscoveredModule[];
  middleware: string[];
  pages: DiscoveredModule[];
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
  tests: string[];
}

interface DoctorIssue {
  file: string;
  level: "error" | "warning";
  message: string;
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
  vd inspect [--json] [--root <dir>]
  vd doctor [--json] [--root <dir>]
  vd stats [--json] [--root <dir>]
  vd routes [--json] [--root <dir>]
  vd graph [--json] [--mermaid] [--root <dir>]
  vd health [--json] [--min-score <0-100>] [--root <dir>]
  vd benchmark [--root <dir>]
  vd build-report [--json] [--root <dir>]
  vd docs [--json] [--root <dir>]
  vd create page <name> [--ts] [--single-file] [--root <dir>]
  vd create component <name> [--ts] [--single-file] [--root <dir>]
  vd create api <name> [--root <dir>]
  vd create demo <name> [--root <dir>]
  vd create middleware [--root <dir>]
  vd create plugin <name> [--root <dir>]
  create-velodom <project-name>

Examples:
  vd inspect
  vd stats --json
  vd create page blog/posts/[id] --ts
  vd create component shared/post-card --single-file
`;

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
    switch (command) {
      case undefined:
      case "help":
      case "--help":
      case "-h":
        context.stdout(HELP.trimEnd());
        return 0;
      case "inspect":
        await printInspection(context, parsed.flags.has("json"));
        return 0;
      case "doctor":
        return printDoctor(context, parsed.flags.has("json"));
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
      case "create":
        await createResource(context, values, parsed.flags);
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

async function printInspection(context: CliContext, json: boolean) {
  const inspection = await inspectProject(context.cwd);

  if (json) {
    context.stdout(JSON.stringify(inspection, null, 2));
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
    context.stdout(
      `  - ${issue.level.toUpperCase()} ${issue.file}: ${issue.message}`
    );
  });

  return hasErrors ? 1 : 0;
}

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
  context.stdout(`Unused runtime features: ${report.project.unusedRuntimeFeatures.join(", ") || "none"}`);
  context.stdout(`Dist JS total: ${formatBytes(report.dist.jsTotalBytes)}`);
  context.stdout(`Dist CSS total: ${formatBytes(report.dist.cssTotalBytes)}`);
  printSizeGroup(context, "Largest pages", report.project.largestPages);
  printSizeGroup(context, "Largest components", report.project.largestComponents);
  printSizeGroup(context, "Largest JS chunks", report.dist.largestJsChunks);
  printSizeGroup(context, "Largest route chunks", report.dist.largestRouteChunks);
  printDependencySignals(context, report.dist.repeatedHeavyDependencies);
  printList(context, "Suggestions", report.suggestions);
}

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

async function printGeneratedDocs(context: CliContext, json: boolean) {
  const docs = await createDocumentationReport(context.cwd);

  if (json) {
    context.stdout(JSON.stringify(docs, null, 2));
    return;
  }

  context.stdout(toMarkdownDocs(docs));
}

async function runDoctor(root: string) {
  const inspection = await inspectProject(root);
  const issues: DoctorIssue[] = [];
  const componentNames = new Set(
    inspection.components.map(component => component.name)
  );
  const requestRoutes = new Set(inspection.requestRoutes);
  const templates = [
    ...inspection.pages,
    ...inspection.components,
    ...inspection.layouts
  ];

  await Promise.all(templates.map(async template => {
    const source = await readOptionalText(join(root, template.source));
    const html = template.source.endsWith(".vd")
      ? source.match(/<template\b[^>]*>([\s\S]*?)<\/template>/i)?.[1] || ""
      : source;
    const script = await readModuleScript(root, template.source);

    try {
      const result = compileTemplate(html, {
        filename: template.source,
        mode: "development"
      });

      result.diagnostics.forEach(diagnostic => {
        issues.push({
          file: diagnostic.filename,
          level: diagnostic.severity,
          message: diagnostic.message
        });
      });
    } catch (error) {
      issues.push({
        file: template.source,
        level: "error",
        message: error instanceof Error ? error.message : String(error)
      });
    }

    findComponentReferences(html).forEach(component => {
      if (!componentNames.has(component)) {
        issues.push({
          file: template.source,
          level: "error",
          message: `Component "${component}" was referenced but not discovered.`
        });
      }
    });

    findRequestReferences(html).forEach(request => {
      if (!requestRoutes.has(request)) {
        issues.push({
          file: template.source,
          level: "error",
          message: `Request "${request}" was referenced but not registered in src/api/routes.`
        });
      }
    });

    findMissingRefUsages(html).forEach(ref => {
      if (!findRefReferences(html).includes(ref)) {
        issues.push({
          file: template.source,
          level: "warning",
          message: `Ref "${ref}" is used in an expression but no matching vd-ref was found in this template.`
        });
      }
    });

    findEventBindings(html).forEach(binding => {
      if (!binding.handler) return;
      if (hasScriptSymbol(script, binding.handler)) return;

      issues.push({
        file: template.source,
        level: "warning",
        message: `Event handler "${binding.handler}" used by "${binding.event}" was not found in the paired script.`
      });
    });

    findDuplicateValues(findStateDeclarationReferences(html)).forEach(name => {
      issues.push({
        file: template.source,
        level: "warning",
        message: `State key "${name}" is declared more than once in the same template scope.`
      });
    });

    findUnsafeDirectiveExpressions(html).forEach(expression => {
      issues.push({
        file: template.source,
        level: "warning",
        message: `Directive expression "${expression}" uses unsafe dynamic evaluation.`
      });
    });
  }));

  await Promise.all(inspection.pages.map(async page => {
    const configIssues = await validatePageConfigText(root, page);

    issues.push(...configIssues);
  }));

  issues.push(...await findUnusedProjectWarnings(root, inspection));
  issues.push(...await findComponentCycleWarnings(root, inspection));
  issues.push(...await findLargeModuleWarnings(root, templates));

  return issues.sort((left, right) => (
    `${left.level}:${left.file}:${left.message}`
      .localeCompare(`${right.level}:${right.file}:${right.message}`)
  ));
}

async function inspectProject(root: string): Promise<ProjectInspection> {
  const pages = await discoverModules(root, "src/pages", true);
  const components = await discoverModules(root, "src/components", false);
  const layouts = await discoverModules(root, "src/layouts", false);
  const apis = await discoverFiles(root, "src/api", [".js", ".ts"]);
  const requestRoutes = await discoverRequestRoutes(root);
  const middleware = apis.filter(file => (
    /(^|\/)middleware\.(?:js|ts)$/.test(file)
  ));
  const templates = [
    ...pages,
    ...components,
    ...layouts
  ];
  const templateSources = templates.map(module => module.source);

  return {
    apis,
    compilerFeatures: await discoverCompilerFeatures(root, templateSources),
    components,
    css: await discoverFiles(root, "src", [".css"]),
    directiveUsage: await countDirectives(root, templateSources),
    events: await discoverTemplateEvents(root, templates),
    exposes: await discoverTemplateExposes(root, templates),
    layouts,
    middleware,
    pages,
    refs: await discoverTemplateRefs(root, templates),
    requestRoutes,
    seo: await discoverSeoCoverage(root, pages),
    seoConfigs: await discoverSeoConfigFiles(root, pages),
    state: await discoverTemplateState(root, templates),
    tests: await discoverFiles(root, "test", [".js", ".ts"])
  };
}

async function createBuildReport(root: string) {
  const inspection = await inspectProject(root);
  const usedFeatures = new Set(inspection.compilerFeatures);
  const unusedRuntimeFeatures = VD_DIRECTIVE_RUNTIME_FEATURES.filter(feature => (
    !usedFeatures.has(feature)
  ));
  const jsAssets = await readAssetSizes(root, ".js");
  const cssAssets = await readAssetSizes(root, ".css");
  const unusedDirectives = findUnusedDirectives(inspection.directiveUsage);
  const repeatedHeavyDependencies = await findRepeatedHeavyDependencySignals(
    root,
    jsAssets
  );
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
      largestRouteChunks: largestJsChunks,
      largestCssChunks: topSizes(cssAssets),
      repeatedHeavyDependencies
    },
    suggestions: createBuildSuggestions({
      largestComponents,
      largestJsChunks,
      largestPages,
      unusedDirectives,
      unusedRuntimeFeatures
    })
  };
}

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
      `${buildReport.project.unusedRuntimeFeatures.length} unused runtime feature module(s)`
    ],
    issues,
    build: buildReport
  };
}

async function createDocumentationReport(root: string) {
  const inspection = await inspectProject(root);
  const plugins = await discoverFiles(root, "src/plugins", [".js", ".ts"]);
  const pageDetails = await Promise.all(inspection.pages.map(async page => {
    const source = await readTemplateSource(root, page.source);
    const script = await readModuleScript(root, page.source);
    const configSource = page.source.endsWith(".vd")
      ? await readOptionalText(join(root, page.source))
      : (await readPageConfigSource(
        root,
        dirname(page.source)
      ))?.source || "";

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
      hasSeo: /\bseo\s*:/.test(configSource)
    };
  }));
  const componentDetails = await Promise.all(inspection.components.map(
    async component => {
      const source = await readTemplateSource(root, component.source);
      const script = await readModuleScript(root, component.source);

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
    }
  ));

  return {
    routes: pageDetails,
    components: componentDetails,
    requests: inspection.requestRoutes.map(route => ({
      name: route,
      source: "src/api/routes.js"
    })),
    middleware: inspection.middleware,
    plugins,
    seo: {
      pagesWithSeo: pageDetails.filter(page => page.hasSeo).length,
      totalPages: pageDetails.length
    }
  };
}

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

  await Promise.all(templates.map(async template => {
    const ownerId = `${template.ownerType}:${template.name}`;
    const source = await readTemplateSource(root, template.source);
    const script = await readModuleScript(root, template.source);

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
  }));

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

async function readAssetSizes(root: string, extension: string) {
  const files = await discoverFiles(root, "dist/assets", [extension]);
  const sizes = await Promise.all(files.map(async file => ({
    bytes: await readFileSize(join(root, file)),
    name: file.split("/").at(-1) || file,
    source: file
  })));

  return sizes.sort((left, right) => right.bytes - left.bytes);
}

async function readFileSize(file: string) {
  try {
    return (await stat(file)).size;
  } catch {
    return 0;
  }
}

function sumSizeReports(files: FileSizeReport[]) {
  return files.reduce((total, file) => total + file.bytes, 0);
}

function topSizes(files: FileSizeReport[], count = 5) {
  return [...files]
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, count);
}

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

async function findRepeatedHeavyDependencySignals(
  root: string,
  assets: FileSizeReport[]
) {
  const dependencies = new Map<string, {
    chunks: Set<string>;
    totalChunkBytes: number;
  }>();

  await Promise.all(assets.map(async asset => {
    const source = await readOptionalText(join(root, asset.source));
    const names = new Set<string>();

    for (const match of source.matchAll(/node_modules[\\/](?:\.pnpm[\\/])?(@?[^\\/@\s"']+(?:[\\/][^\\/\s"']+)?)?/g)) {
      const name = normalizeDependencyName(match[1] || "");

      if (name) names.add(name);
    }

    for (const match of source.matchAll(/\bfrom\s+["'](@?[^."'/][^"']*)["']/g)) {
      const name = normalizeDependencyName(match[1]);

      if (name) names.add(name);
    }

    names.forEach(name => {
      const record = dependencies.get(name) || {
        chunks: new Set<string>(),
        totalChunkBytes: 0
      };

      record.chunks.add(asset.source);
      record.totalChunkBytes += asset.bytes;
      dependencies.set(name, record);
    });
  }));

  return [...dependencies.entries()]
    .filter(([, record]) => record.chunks.size > 1 && record.totalChunkBytes > 10_000)
    .map(([name, record]) => ({
      chunks: [...record.chunks].sort(),
      name,
      totalChunkBytes: record.totalChunkBytes
    }))
    .sort((left, right) => right.totalChunkBytes - left.totalChunkBytes)
    .slice(0, 10);
}

function createBuildSuggestions(input: {
  largestComponents: FileSizeReport[];
  largestJsChunks: FileSizeReport[];
  largestPages: FileSizeReport[];
  unusedDirectives: string[];
  unusedRuntimeFeatures: string[];
}) {
  const suggestions: string[] = [];
  const largePage = input.largestPages.find(page => page.bytes > 30_000);
  const largeComponent = input.largestComponents.find(component => (
    component.bytes > 20_000
  ));
  const largeChunk = input.largestJsChunks.find(chunk => chunk.bytes > 120_000);

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

  if (input.unusedDirectives.length) {
    suggestions.push(
      "Unused directive families were not found in templates; keep optional examples/docs separate from runtime-critical pages."
    );
  }

  if (input.unusedRuntimeFeatures.length) {
    suggestions.push(
      "Unused runtime feature modules were detected from the compiler manifest; verify tree-shaking before publishing."
    );
  }

  return suggestions;
}

function normalizeDirectiveAttribute(attribute: string) {
  return attribute
    .replace(/^data-vd-/, "")
    .replace(/^vd-/, "");
}

function normalizeDependencyName(name: string) {
  const clean = name.replaceAll("\\", "/").replace(/^\.pnpm\//, "");

  if (!clean || clean.startsWith(".")) return "";
  if (clean.startsWith("@")) {
    return clean.split("/").slice(0, 2).join("/");
  }

  return clean.split("/")[0];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function countDirectives(
  root: string,
  files: string[]
) {
  const usage: Record<string, number> = {};

  await Promise.all(files.map(async file => {
    const source = await readOptionalText(join(root, file));

    for (const match of source.matchAll(/\b(?:data-)?vd-[\w:-]+/g)) {
      usage[match[0]] = (usage[match[0]] || 0) + 1;
    }
  }));

  return usage;
}

async function discoverTemplateRefs(
  root: string,
  modules: DiscoveredModule[]
) {
  const refs: ProjectInspection["refs"] = [];

  await Promise.all(modules.map(async module => {
    const source = await readTemplateSource(root, module.source);

    findRefReferences(source).forEach(name => {
      refs.push({
        name,
        owner: module.name,
        source: module.source
      });
    });
  }));

  return refs.sort(compareInspectionItem);
}

async function discoverTemplateEvents(
  root: string,
  modules: DiscoveredModule[]
) {
  const events: ProjectInspection["events"] = [];

  await Promise.all(modules.map(async module => {
    const source = await readTemplateSource(root, module.source);

    findEventBindings(source).forEach(binding => {
      events.push({
        ...binding,
        owner: module.name,
        source: module.source
      });
    });
  }));

  return events.sort(compareInspectionItem);
}

async function discoverTemplateState(
  root: string,
  modules: DiscoveredModule[]
) {
  const state: ProjectInspection["state"] = [];

  await Promise.all(modules.map(async module => {
    const source = await readModuleScript(root, module.source);

    findStateAssignments(source).forEach(name => {
      state.push({
        name,
        owner: module.name,
        source: module.source
      });
    });
  }));

  return state.sort(compareInspectionItem);
}

async function discoverTemplateExposes(
  root: string,
  modules: DiscoveredModule[]
) {
  const exposes: ProjectInspection["exposes"] = [];

  await Promise.all(modules.map(async module => {
    const source = await readModuleScript(root, module.source);

    findExposeNames(source).forEach(name => {
      exposes.push({
        name,
        owner: module.name,
        source: module.source
      });
    });
  }));

  return exposes.sort(compareInspectionItem);
}

async function discoverSeoConfigFiles(
  root: string,
  pages: DiscoveredModule[]
) {
  const files: string[] = [];

  await Promise.all(pages.map(async page => {
    if (page.source.endsWith(".vd")) {
      const source = await readOptionalText(join(root, page.source));

      if (/<config\b[^>]*>[\s\S]*?\bseo\s*:/i.test(source)) {
        files.push(page.source);
      }

      return;
    }

    const folder = dirname(page.source);
    const candidates = pageConfigPaths(folder);

    await Promise.all(candidates.map(async file => {
      const source = await readOptionalText(join(root, file));

      if (/\bseo\s*:/.test(source)) files.push(file);
    }));
  }));

  return files.sort();
}

async function discoverCompilerFeatures(
  root: string,
  files: string[]
) {
  const features = new Set<string>();

  await Promise.all(files.map(async file => {
    const source = await readOptionalText(join(root, file));
    const template = file.endsWith(".vd")
      ? source.match(/<template\b[^>]*>([\s\S]*?)<\/template>/i)?.[1] || ""
      : source;

    try {
      compileTemplate(template, {
        filename: file,
        mode: "production"
      }).manifest.features.forEach(feature => features.add(feature));
    } catch {
      // Inspection stays non-blocking; vd doctor can own hard diagnostics.
    }
  }));

  return [...features].sort();
}

async function discoverRequestRoutes(root: string) {
  const routeFiles = [
    "src/api/routes.js",
    "src/api/routes.ts"
  ];
  const routes = new Set<string>();

  await Promise.all(routeFiles.map(async file => {
    const source = await readOptionalText(join(root, file));

    for (const match of source.matchAll(/["']([^"']+)["']\s*:/g)) {
      routes.add(match[1]);
    }
  }));

  return [...routes].sort();
}

async function discoverSeoCoverage(
  root: string,
  pages: DiscoveredModule[]
) {
  const results = await Promise.all(pages.map(async page => {
    const source = page.source.endsWith(".vd")
      ? await readOptionalText(join(root, page.source))
      : (await readPageConfigSource(
        root,
        dirname(page.source)
      ))?.source || "";

    return /\bseo\s*:/.test(source);
  }));

  return {
    pagesWithSeo: results.filter(Boolean).length,
    totalPages: pages.length
  };
}

function findComponentReferences(source: string) {
  const names = new Set<string>();

  for (const match of source.matchAll(/<vd-component\b[^>]*\bname=["']([^"']+)["'][^>]*>/gi)) {
    names.add(normalizeModuleName(match[1]));
  }

  for (const match of source.matchAll(/\b(?:data-)?vd-component=["']([^"']+)["']/gi)) {
    names.add(normalizeModuleName(match[1]));
  }

  return [...names].filter(Boolean).sort();
}

function findRequestReferences(source: string) {
  return [...source.matchAll(/\b(?:data-)?vd-request=["']([^"'{]+)["']/gi)]
    .map(match => match[1].trim())
    .filter(Boolean)
    .sort();
}

function findDirectiveExpressions(source: string) {
  const expressions: Array<{
    directive: string;
    expression: string;
  }> = [];

  for (const match of source.matchAll(/\b((?:data-)?vd-[\w:-]+)=["']([^"']+)["']/gi)) {
    expressions.push({
      directive: match[1],
      expression: match[2].trim()
    });
  }

  return expressions;
}

function findUnsafeDirectiveExpressions(source: string) {
  return findDirectiveExpressions(source)
    .filter(item => /\b(?:eval|Function)\s*\(/.test(item.expression)
      || /\bnew\s+Function\s*\(/.test(item.expression))
    .map(item => `${item.directive}=${item.expression}`)
    .sort();
}

function findRefReferences(source: string) {
  return [...source.matchAll(/\b(?:data-)?vd-ref=["']([^"']+)["']/gi)]
    .map(match => match[1].trim())
    .filter(Boolean)
    .sort();
}

function findMissingRefUsages(source: string) {
  const refs = new Set<string>();

  for (const match of source.matchAll(/\$refs\.([A-Za-z_$][\w$]*)/g)) {
    refs.add(match[1]);
  }

  for (const match of source.matchAll(/\$refs\[['"]([^'"]+)['"]\]/g)) {
    refs.add(match[1].trim());
  }

  return [...refs].filter(Boolean).sort();
}

function findEventReferences(source: string) {
  return findEventBindings(source).map(binding => (
    `${binding.event} -> ${binding.expression}`
  ));
}

function findEventBindings(source: string) {
  const events = new Map<string, {
    event: string;
    expression: string;
    handler?: string;
  }>();

  for (const match of source.matchAll(/\bvd-on:([\w:-]+)=["']([^"']+)["']/gi)) {
    const expression = match[2].trim();

    events.set(`${match[1]}:${expression}`, {
      event: match[1],
      expression,
      handler: findHandlerName(expression)
    });
  }

  for (const match of source.matchAll(/\bdata-vd-on-([\w:-]+)=["']([^"']+)["']/gi)) {
    const expression = match[2].trim();

    events.set(`${match[1]}:${expression}`, {
      event: match[1],
      expression,
      handler: findHandlerName(expression)
    });
  }

  return [...events.values()].sort((left, right) => (
    `${left.event}:${left.expression}`.localeCompare(`${right.event}:${right.expression}`)
  ));
}

function findSlotReferences(source: string) {
  const slots = new Set<string>();

  for (const match of source.matchAll(/\b(?:data-)?vd-get-child=["']([^"']*)["']/gi)) {
    slots.add(match[1].trim() || "default");
  }

  return [...slots].sort();
}

function findHandlerName(expression: string) {
  return expression.match(/^([A-Za-z_$][\w$]*)\s*(?:\(|$)/)?.[1];
}

function findStateAssignments(source: string) {
  const names: string[] = [];

  for (const match of source.matchAll(/\bstate\s*\.\s*([A-Za-z_$][\w$]*)\s*=/g)) {
    names.push(match[1]);
  }

  return names;
}

function findStateDeclarationReferences(source: string) {
  return [...source.matchAll(/\b(?:data-)?vd-state=["']([^"']+)["']/gi)]
    .map(match => match[1].trim())
    .filter(Boolean)
    .sort();
}

function findExposeNames(source: string) {
  const names = new Set<string>();
  const arraySource = source.match(/\bexpose\s*[:=]\s*\[([^\]]*)\]/)?.[1] || "";

  for (const match of arraySource.matchAll(/["']([^"']+)["']/g)) {
    names.add(match[1].trim());
  }

  for (const match of source.matchAll(/\bexpose\s*\(\s*["']([^"']+)["']\s*\)/g)) {
    names.add(match[1].trim());
  }

  return [...names].filter(Boolean).sort();
}

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

function pushNestedList(
  lines: string[],
  label: string,
  values: string[]
) {
  if (!values.length) return;

  lines.push(`  - ${label}: ${values.map(value => `\`${value}\``).join(", ")}`);
}

async function readTemplateSource(root: string, file: string) {
  const source = await readOptionalText(join(root, file));

  return file.endsWith(".vd")
    ? source.match(/<template\b[^>]*>([\s\S]*?)<\/template>/i)?.[1] || ""
    : source;
}

async function readModuleScript(root: string, file: string) {
  if (file.endsWith(".vd")) {
    const source = await readOptionalText(join(root, file));

    return source.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)?.[1] || "";
  }

  const folder = dirname(file);

  return await readOptionalText(join(root, folder, "script.ts"))
    || await readOptionalText(join(root, folder, "script.js"))
    || await readOptionalText(join(root, folder, "page.ts"))
    || await readOptionalText(join(root, folder, "page.js"))
    || await readOptionalText(join(root, folder, "component.ts"))
    || await readOptionalText(join(root, folder, "component.js"));
}

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
      const middlewareSource = match[2].match(/middleware\s*:\s*\[([^\]]*)\]/)?.[1] || "";

      for (const middleware of middlewareSource.matchAll(/["']([^"']+)["']/g)) {
        edges.push({
          route: match[1],
          middleware: middleware[1]
        });
      }
    }
  }));

  return edges;
}

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
  const templates = [
    ...inspection.pages,
    ...inspection.components,
    ...inspection.layouts
  ];

  await Promise.all(templates.map(async template => {
    const source = await readTemplateSource(root, template.source);

    findComponentReferences(source).forEach(component => {
      referencedComponents.add(component);
    });
    findRequestReferences(source).forEach(request => {
      referencedRequests.add(request);
    });
  }));

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

async function discoverMiddlewareNames(
  root: string,
  files: string[]
) {
  const names = new Set<string>();

  await Promise.all(files.map(async file => {
    const source = await readOptionalText(join(root, file));
    const defaultObject = source.match(/export\s+default\s+\{([\s\S]*?)\}\s*;?/m)?.[1]
      || "";

    for (const match of defaultObject.matchAll(/(?:^|,)\s*([A-Za-z_$][\w$]*)\s*:/g)) {
      names.add(match[1]);
    }

    for (const match of defaultObject.matchAll(/(?:^|,)\s*["']([^"']+)["']\s*:/g)) {
      names.add(match[1]);
    }

    for (const match of source.matchAll(/\bexport\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
      names.add(match[1]);
    }

    for (const match of source.matchAll(/\bexport\s+const\s+([A-Za-z_$][\w$]*)\b/g)) {
      names.add(match[1]);
    }
  }));

  return names;
}

async function findComponentCycleWarnings(
  root: string,
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

  await Promise.all(inspection.components.map(async component => {
    const source = await readTemplateSource(root, component.source);
    const dependencies = findComponentReferences(source)
      .filter(name => componentByName.has(name));

    graph.set(component.name, dependencies);
  }));

  findCycles(graph).forEach(cycle => {
    const first = componentByName.get(cycle[0]);

    issues.push({
      file: first?.source || "src/components",
      level: "warning",
      message: `Circular component dependency detected: ${cycle.join(" -> ")}.`
    });
  });

  return issues;
}

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

function findCycles(graph: Map<string, string[]>) {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

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

function dedupeCycles(cycles: string[][]) {
  const seen = new Set<string>();

  return cycles.filter(cycle => {
    const key = [...cycle].sort().join("\0");

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

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

function toMermaidId(value: string) {
  return value.replace(/[^A-Za-z0-9_]/g, "_");
}

function escapeMermaidLabel(value: string) {
  return value.replaceAll("\"", "&quot;");
}

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

async function runSecurityScan(root: string) {
  const inspection = await inspectProject(root);
  const issues: DoctorIssue[] = [];
  const templates = [
    ...inspection.pages,
    ...inspection.components,
    ...inspection.layouts
  ];

  await Promise.all(templates.map(async template => {
    const source = await readTemplateSource(root, template.source);

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
  }));

  return issues;
}

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

function normalizeHealthThreshold(value: unknown, label: string) {
  const score = Number(value);

  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error(`${label} must be a number between 0 and 100.`);
  }

  return score;
}

async function validatePageConfigText(
  root: string,
  page: DiscoveredModule
) {
  const issues: DoctorIssue[] = [];
  const configFile = page.source.endsWith(".vd")
    ? page.source
    : await findConfigFile(root, dirname(page.source));
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

async function findConfigFile(root: string, folder: string) {
  return (await readPageConfigSource(root, folder))?.file
    || pageConfigPaths(folder)[0];
}

function parseArgs(args: string[]): ParsedArgs {
  const flags = new Set<string>();
  const options: Record<string, string> = {};
  const values: string[] = [];
  const valueOptions = new Set([
    "min-score",
    "root"
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

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

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  process.exitCode = await runVeloDomCli(process.argv.slice(2));
}
