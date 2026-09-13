/**
 * ----------------------------------------
 * Module: Build-Time Project Index
 * ----------------------------------------
 *
 * Discovers application-owned resources once and keeps their source,
 * companion script, page config, and compiler metadata in one immutable
 * build-time snapshot. CLI consumers can add their own policy checks without
 * rereading or recompiling the same templates.
 *
 * This module is intentionally CLI-only: it must never become browser runtime
 * weight or a public application API.
 * ----------------------------------------
 */

import { dirname, join } from "node:path";
import { compileTemplate } from "../compiler/index.ts";
import type { TemplateCompileResult } from "../compiler/types.ts";
import {
  discoverFiles,
  discoverModules,
  readOptionalText,
  readPageConfigSource
} from "./analyzer.ts";
import type { DiscoveredModule } from "./types.ts";

/** Resource ownership used by build-time tooling and relationship reports. */
export type ProjectTemplateKind = "page" | "component" | "layout";

/** One source-backed template and the compiler facts derived from it. */
export interface IndexedProjectTemplate {
  analysisHtml: string;
  compileResult?: TemplateCompileResult;
  compileError?: string;
  configFile?: string;
  configSource: string;
  html: string;
  kind: ProjectTemplateKind;
  module: DiscoveredModule;
  rawSource: string;
  script: string;
}

/** One complete, build-time snapshot of a VeloDom application. */
export interface ProjectSourceIndex {
  apis: string[];
  components: DiscoveredModule[];
  css: string[];
  layouts: DiscoveredModule[];
  pages: DiscoveredModule[];
  plugins: string[];
  templates: IndexedProjectTemplate[];
  tests: string[];
}

/**
 * Builds one deterministic application snapshot for all static tooling.
 *
 * @param root Absolute project root.
 * @returns Discovered resources with cached sources and compiler metadata.
 */
export async function createProjectSourceIndex(
  root: string
): Promise<ProjectSourceIndex> {
  const [
    pages,
    components,
    layouts,
    apis,
    css,
    plugins,
    tests
  ] = await Promise.all([
    discoverModules(root, "src/pages", true),
    discoverModules(root, "src/components", false),
    discoverModules(root, "src/layouts", false),
    discoverFiles(root, "src/api", [".js", ".ts"]),
    discoverFiles(root, "src", [".css"]),
    discoverFiles(root, "src/plugins", [".js", ".ts"]),
    discoverFiles(root, "test", [".js", ".ts"])
  ]);
  const templates = await Promise.all([
    ...pages.map(module => ({ kind: "page" as const, module })),
    ...components.map(module => ({ kind: "component" as const, module })),
    ...layouts.map(module => ({ kind: "layout" as const, module }))
  ].map(({ kind, module }) => indexTemplate(root, kind, module)));

  return {
    apis,
    components,
    css,
    layouts,
    pages,
    plugins,
    templates,
    tests
  };
}

/** Returns an indexed template by its unique source path. */
export function findIndexedTemplate(
  index: ProjectSourceIndex,
  source: string
): IndexedProjectTemplate | undefined {
  return index.templates.find(template => template.module.source === source);
}

/** Loads and compiles one discovered template into the shared snapshot. */
async function indexTemplate(
  root: string,
  kind: ProjectTemplateKind,
  module: DiscoveredModule
): Promise<IndexedProjectTemplate> {
  const rawSource = await readOptionalText(join(root, module.source));
  const html = extractBlock(rawSource, module.source, "template");
  const script = module.source.endsWith(".vd")
    ? extractBlock(rawSource, module.source, "script")
    : await readCompanionScript(root, module.source);
  const config = kind === "page"
    ? await readPageConfig(root, module.source, rawSource)
    : undefined;
  let compileResult: TemplateCompileResult | undefined;
  let compileError: string | undefined;

  try {
    compileResult = compileTemplate(html, {
      filename: module.source,
      mode: "development"
    });
  } catch (error) {
    compileError = error instanceof Error ? error.message : String(error);
  }

  return {
    analysisHtml: maskPreservedTemplateContent(html),
    compileError,
    compileResult,
    configFile: config?.file,
    configSource: config?.source || "",
    html,
    kind,
    module,
    rawSource,
    script
  };
}

/** Reads page config from a `.vd` block or its folder-mode companion file. */
async function readPageConfig(
  root: string,
  source: string,
  rawSource: string
): Promise<{ file: string; source: string } | undefined> {
  if (source.endsWith(".vd")) {
    const configSource = extractBlock(rawSource, source, "config");

    return configSource ? { file: source, source: configSource } : undefined;
  }

  return await readPageConfigSource(root, dirname(source));
}

/** Reads the first supported script companion in convention priority order. */
async function readCompanionScript(root: string, source: string) {
  const folder = dirname(source);

  for (const filename of [
    "script.ts",
    "script.js",
    "page.ts",
    "page.js",
    "component.ts",
    "component.js"
  ]) {
    const content = await readOptionalText(join(root, folder, filename));

    if (content) return content;
  }

  return "";
}

/** Extracts one optional block from a single-file resource. */
function extractBlock(rawSource: string, source: string, tag: string) {
  if (!source.endsWith(".vd")) return tag === "template" ? rawSource : "";

  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");

  return rawSource.match(pattern)?.[1] || "";
}

/**
 * Masks literal descendants of `vd-pre` while retaining line breaks and the
 * container. This prevents documentation snippets from becoming false project
 * references while preserving useful compiler source locations.
 */
function maskPreservedTemplateContent(source: string) {
  return source.replace(
    /(<([a-z][\w:-]*)\b[^>]*\b(?:data-)?vd-pre\b[^>]*>)([\s\S]*?)(<\/\2\s*>)/gi,
    (_, opening: string, _tagName: string, content: string, closing: string) => (
      `${opening}${content.replace(/[^\r\n]/g, " ")}${closing}`
    )
  );
}
