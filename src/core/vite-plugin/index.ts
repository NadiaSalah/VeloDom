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
import {
  createSingleFileConfigModule,
  createSingleFileScriptModule,
  createSingleFileStyleModule,
  createSingleFileRuntimeModule,
  parseVeloDomSingleFile,
  stripBuildOnlySeoEntries
} from "./single-file.ts";
import { VD_SINGLE_FILE } from "../constants.ts";
import type {
  CompilerMode,
  CompilerOptions
} from "../compiler/types.ts";
import type {
  SeoEntriesHook,
  SeoStaticRenderHook
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
  renderPage?: SeoStaticRenderHook;
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
      if (isSingleFileModule(id)) {
        const descriptor = parseVeloDomSingleFile(code, id);
        const module = createTemplateModule(descriptor.template, {
          ...options,
          filename: `${id}<template>`,
          mode
        });
        const result = module.result;
        const errors = result.diagnostics.filter(diagnostic => (
          diagnostic.severity === "error"
        ));

        if (errors.length) {
          const diagnostic = errors[0];

          this.error({
            id,
            message: `[${diagnostic.code}] ${diagnostic.message}`,
            pos: diagnostic.offset
          });
        }

        return {
          code: createSingleFileRuntimeModule(descriptor, module.code),
          map: null
        };
      }

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

      if (filename.endsWith(VD_SINGLE_FILE.EXTENSION)) {
        const source = await readFile(filename, "utf8");
        const descriptor = parseVeloDomSingleFile(source, filename);

        if (query.has(VD_SINGLE_FILE.QUERIES.TEMPLATE)) {
          const module = createTemplateModule(descriptor.template, {
            ...options,
            filename: `${filename}<template>`,
            mode
          });

          return {
            code: module.code,
            map: null
          };
        }

        if (query.has(VD_SINGLE_FILE.QUERIES.SCRIPT)) {
          return {
            code: createSingleFileScriptModule(descriptor),
            map: null
          };
        }

        if (query.has(VD_SINGLE_FILE.QUERIES.STYLE)) {
          return {
            code: createSingleFileStyleModule(descriptor),
            map: null
          };
        }

        if (query.has(VD_SINGLE_FILE.QUERIES.CONFIG)) {
          return {
            code: createSingleFileConfigModule(descriptor),
            map: null
          };
        }
      }

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
        entries: seo.entries,
        renderPage: seo.renderPage
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

function isSingleFileModule(filename: string) {
  return filename
    .split("?", 1)[0]
    .endsWith(VD_SINGLE_FILE.EXTENSION);
}
