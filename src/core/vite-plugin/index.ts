/**
 * ----------------------------------------
 * Module: Vite Compiler Plugin
 * ----------------------------------------
 *
 * Compiles raw page and component HTML during Vite loading and exposes
 * development metadata plus production runtime feature manifests.
 * ----------------------------------------
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  Plugin,
  ResolvedConfig
} from "vite";
import { compileTemplate } from "../compiler/index.ts";
import {
  generateStaticSeoPages
} from "./seo-renderer.ts";
import type {
  CompilerMode,
  CompilerOptions
} from "../compiler/types.ts";
import type {
  SeoEntriesHook
} from "../types.ts";

/** Configuration for VeloDom's Vite template compiler integration. */
export interface VeloDomVitePluginOptions {
  compiler?: Omit<CompilerOptions, "filename" | "mode">;
  emitManifest?: boolean;
  emitMetadata?: boolean | "development";
  seo?: false | VeloDomSeoBuildOptions;
}

/** Controls static SEO output produced after a successful Vite build. */
export interface VeloDomSeoBuildOptions {
  siteUrl?: string;
  generateSitemap?: boolean;
  generateRobots?: boolean;
  entries?: SeoEntriesHook;
}

/** Options used by the pure template-module generator. */
export interface TemplateModuleOptions extends VeloDomVitePluginOptions {
  filename?: string;
  mode?: CompilerMode;
}

/** Creates the Vite plugin that compiles VeloDom raw HTML modules. */
export function velodom(options: VeloDomVitePluginOptions = {}): Plugin {
  let mode: CompilerMode = "development";
  let resolvedConfig: ResolvedConfig | undefined;
  let shouldGenerateSeo = false;

  return {
    name: "velodom",
    enforce: "pre",

    configResolved(config) {
      resolvedConfig = config;
      shouldGenerateSeo = (
        config.command === "build"
        && !config.build.ssr
        && !config.build.lib
      );
      mode = config.mode === "production"
        ? "production"
        : "development";
    },

    transform(code, id) {
      if (!isPageConfigFile(id)) return null;

      return {
        code: stripBuildOnlySeoEntries(code),
        map: null
      };
    },

    async load(id) {
      const queryIndex = id.indexOf("?");

      if (queryIndex === -1) return null;

      const filename = id.slice(0, queryIndex);
      const query = new URLSearchParams(id.slice(queryIndex + 1));

      if (!filename.endsWith(".html") || !query.has("raw")) {
        return null;
      }

      const source = await readFile(filename, "utf8");
      const module = createTemplateModule(source, {
        ...options,
        filename,
        mode
      });
      const result = module.result;
      const errors = result.diagnostics.filter(diagnostic => (
        diagnostic.severity === "error"
      ));

      if (errors.length) {
        const diagnostic = errors[0];

        this.error({
          id: filename,
          message: `[${diagnostic.code}] ${diagnostic.message}`,
          pos: diagnostic.offset
        });
      }

      return {
        code: module.code,
        map: null
      };
    },

    async closeBundle() {
      if (
        options.seo === false
        || !shouldGenerateSeo
        || !resolvedConfig
      ) {
        return;
      }

      const seo = options.seo || {};

      await generateStaticSeoPages({
        root: resolvedConfig.root,
        outDir: resolve(
          resolvedConfig.root,
          resolvedConfig.build.outDir
        ),
        siteUrl: seo.siteUrl,
        generateSitemap: seo.generateSitemap,
        generateRobots: seo.generateRobots,
        entries: seo.entries
      });
    }
  };
}

/** Generates one JavaScript template module without depending on Vite hooks. */
export function createTemplateModule(
  source: string,
  options: TemplateModuleOptions = {}
) {
  const mode = options.mode || "development";
  const result = compileTemplate(source, {
    ...(options.compiler || {}),
    filename: options.filename,
    mode
  });
  const lines = [
    `export default ${JSON.stringify(result.html)};`
  ];
  const emitMetadata = shouldEmitMetadata(
    options.emitMetadata,
    mode
  );

  if (emitMetadata) {
    lines.push(
      `export const __vdMetadata = ${JSON.stringify(result.metadata)};`
    );
  }

  if (options.emitManifest !== false) {
    lines.push(
      `export const __vdManifest = ${JSON.stringify(result.manifest)};`
    );
  }

  return {
    code: lines.join("\n"),
    result
  };
}

function shouldEmitMetadata(
  setting: VeloDomVitePluginOptions["emitMetadata"],
  mode: CompilerMode
) {
  if (setting === true) return true;
  if (setting === false) return false;

  return mode === "development";
}

function isPageConfigFile(filename: string) {
  return /\/src\/pages\/.*\/(?:page\.)?config\.js$/.test(
    filename.replace(/\\/g, "/")
  );
}

// Build-time SEO hooks may fetch CMS/API data. Remove them from page config
// modules imported by the browser adapter while preserving normal runtime
// config such as path, metadata, guards, and route SEO metadata.
function stripBuildOnlySeoEntries(source: string) {
  const ranges: Array<{
    start: number;
    end: number;
  }> = [];
  const propertyPattern = /(?<![\w$])(?:entries|["']entries["'])\s*:/g;
  let match: RegExpExecArray | null;

  while ((match = propertyPattern.exec(source))) {
    const propertyStart = match.index;
    const previous = previousMeaningfulCharacter(source, propertyStart);

    if (previous !== "{" && previous !== ",") continue;

    const colonIndex = propertyStart + match[0].lastIndexOf(":");
    const valueEnd = findPropertyValueEnd(source, colonIndex + 1);

    if (valueEnd === -1) continue;

    const delimiter = source[valueEnd];
    const start = previous === ","
      ? previousMeaningfulCharacterIndex(source, propertyStart)
      : propertyStart;
    const end = delimiter === ","
      ? valueEnd + 1
      : valueEnd;

    ranges.push({
      start,
      end
    });
  }

  return removeSourceRanges(source, ranges);
}

function previousMeaningfulCharacter(source: string, index: number) {
  const previousIndex = previousMeaningfulCharacterIndex(source, index);

  return previousIndex === -1 ? "" : source[previousIndex];
}

function previousMeaningfulCharacterIndex(source: string, index: number) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (!/\s/.test(source[i])) return i;
  }

  return -1;
}

function findPropertyValueEnd(source: string, start: number) {
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let i = start; i < source.length; i += 1) {
    const char = source[i];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = "";
      }

      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
      continue;
    }

    if (char === ")" || char === "]") {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (char === "}") {
      if (depth === 0) return i;

      depth -= 1;
      continue;
    }

    if (char === "," && depth === 0) {
      return i;
    }
  }

  return -1;
}

function removeSourceRanges(
  source: string,
  ranges: Array<{
    start: number;
    end: number;
  }>
) {
  if (!ranges.length) return source;

  let cursor = 0;
  const chunks: string[] = [];

  for (const range of ranges.sort((a, b) => a.start - b.start)) {
    chunks.push(source.slice(cursor, range.start));
    cursor = Math.max(cursor, range.end);
  }

  chunks.push(source.slice(cursor));

  return chunks.join("");
}
