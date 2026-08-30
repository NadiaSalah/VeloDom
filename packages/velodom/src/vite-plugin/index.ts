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
  ResolvedConfig,
  ViteDevServer
} from "vite";
import { compileTemplate } from "../compiler/index.ts";
import {
  generateStaticSeoPages
} from "./seo-renderer.ts";
import {
  analyzeHtmlShell
} from "./html-shell-diagnostics.ts";
import {
  analyzeRtlCss
} from "./rtl-css-diagnostics.ts";
import {
  createSingleFileConfigModule,
  createSingleFileScriptModule,
  createSingleFileStyleModule,
  createSingleFileRuntimeModule,
  parseVeloDomSingleFile,
  stripBuildOnlySeoEntries
} from "./single-file.ts";
import {
  createIncrementalCompilerCache
} from "./compiler-cache.ts";
import {
  VD_DEVTOOLS,
  VD_SINGLE_FILE
} from "../constants.ts";
import { inspectLocalization } from "../localization.ts";
import type { LocalizationOptions } from "../localization.ts";
import type {
  CompilerMode,
  CompilerOptions,
  TemplateCompileResult
} from "../compiler/types.ts";
import type {
  DevtoolsCompilerRecord
} from "../devtools/protocol.ts";
import {
  VELODOM_DEVTOOLS_PROTOCOL_VERSION,
  VELODOM_LAB_CONFIG_NAME,
  VELODOM_LAB_METADATA_PATH
} from "../devtools/protocol.ts";
import type {
  SeoEntriesHook,
  SeoStaticRenderHook
} from "../types.ts";

/** Configuration for VeloDom's Vite template compiler integration. */
export interface VeloDomVitePluginOptions {
  compiler?: Omit<CompilerOptions, "filename" | "mode">;
  emitManifest?: boolean;
  emitMetadata?: boolean | "development";
  lab?: boolean | VeloDomLabBuildOptions;
  localization?: false | VeloDomLocalizationBuildOptions;
  seo?: false | VeloDomSeoBuildOptions;
}

/** Optional, development-only VeloDom Lab integration. */
export interface VeloDomLabBuildOptions {
  enabled?: boolean;
  metadataPath?: string;
}

/** Optional build diagnostics for application-owned locale dictionaries. */
export interface VeloDomLocalizationBuildOptions extends LocalizationOptions {
  /** Treat missing default-dictionary keys as build errors. Defaults to true. */
  failOnMissing?: boolean;
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

interface ViteWarningContext {
  warn(warning: {
    id: string;
    message: string;
    loc: {
      line: number;
      column: number;
    };
  }): void;
}

/** Creates the Vite plugin that compiles VeloDom raw HTML modules. */
export function velodom(options: VeloDomVitePluginOptions = {}): Plugin {
  let mode: CompilerMode = "development";
  let resolvedConfig: ResolvedConfig | undefined;
  let developmentServer: ViteDevServer | undefined;
  let shouldGenerateSeo = false;
  const compilerRecords = new Map<string, DevtoolsCompilerRecord>();
  const compilerCache = createIncrementalCompilerCache<
    ReturnType<typeof createTemplateModule>
  >();
  const labEnabled = isLabEnabled(options.lab);
  const labMetadataPath = normalizeLabMetadataPath(options.lab);
  const recordLabCompilerResult = (
    result: TemplateCompileResult,
    filename: string
  ) => {
    const file = recordCompilerResult(
      compilerRecords,
      result,
      filename,
      resolvedConfig?.root
    );

    if (labEnabled && mode !== "production") {
      developmentServer?.ws?.send({
        type: "custom",
        event: "velodom:lab:compiler-update",
        data: { file }
      });
    }
  };
  const compileTemplateModule = (
    source: string,
    sourceFile: string,
    moduleOptions: TemplateModuleOptions
  ) => compilerCache.getOrCompile({
    source,
    sourceFile,
    options: moduleOptions
  }, () => createTemplateModule(source, moduleOptions));

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

    configureServer(server) {
      if (!labEnabled) return;

      developmentServer = server;

      installLabMetadataEndpoint(
        server,
        labMetadataPath,
        compilerRecords
      );
    },

    handleHotUpdate(context) {
      compilerCache.invalidate(context.file);
    },

    buildStart() {
      if (!options.localization) return;

      const diagnostics = inspectLocalization(options.localization);

      for (const diagnostic of diagnostics) {
        const message = `[VD_I18N] ${diagnostic.message}`;

        if (
          diagnostic.severity === "error"
          && options.localization.failOnMissing !== false
        ) {
          this.error(message);
        } else {
          this.warn(message);
        }
      }
    },

    transformIndexHtml(html, context) {
      warnHtmlShellDiagnostics(
        this,
        html,
        context.filename || "index.html"
      );

      if (!labEnabled || mode === "production") return html;

      return createLabHtmlTags(labMetadataPath);
    },

    transform(code, id) {
      // Query modules are already reduced to one generated block by load().
      // Parsing that generated JavaScript as a complete .vd file would both
      // duplicate work and incorrectly require another <template> block.
      if (isSingleFileBlockRequest(id)) return null;

      if (isSingleFileModule(id)) {
        const descriptor = parseVeloDomSingleFile(code, id);

        warnRtlCssDiagnostics(
          this,
          descriptor.style,
          `${id}<style>`
        );
        const module = compileTemplateModule(descriptor.template, id, {
          ...options,
          filename: `${id}<template>`,
          mode
        });
        const result = module.result;
        recordLabCompilerResult(result, id);
        const errors = result.diagnostics.filter(diagnostic => (
          diagnostic.severity === "error"
        ));

        if (errors.length) {
          const diagnostic = errors[0];

          this.error({
            id,
            message: `[${diagnostic.code}] ${diagnostic.message}`,
            pos: descriptor.templateOffset + diagnostic.offset
          });
        }

        return {
          code: createSingleFileRuntimeModule(descriptor, module.code),
          map: null
        };
      }

      if (isVeloDomStyleFile(id)) {
        warnRtlCssDiagnostics(this, code, id);
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
          const module = compileTemplateModule(
            descriptor.template,
            filename,
            {
              ...options,
              filename: `${filename}<template>`,
              mode
            }
          );

          recordLabCompilerResult(
            module.result,
            `${filename}<template>`
          );

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
      const module = compileTemplateModule(source, filename, {
        ...options,
        filename,
        mode
      });
      const result = module.result;
      recordLabCompilerResult(result, filename);
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

    async writeBundle() {
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

/** Returns whether Lab was enabled explicitly or by the `vd lab` process. */
function isLabEnabled(setting: VeloDomVitePluginOptions["lab"]) {
  if (setting === false) return false;
  if (setting === true) return true;
  if (setting && setting.enabled !== false) return true;

  return typeof process !== "undefined"
    && process.env.VELODOM_LAB === "1";
}

/** Normalizes the local metadata endpoint while rejecting ambiguous paths. */
function normalizeLabMetadataPath(
  setting: VeloDomVitePluginOptions["lab"]
) {
  const requested = typeof setting === "object"
    ? setting.metadataPath
    : undefined;
  const path = String(requested || VELODOM_LAB_METADATA_PATH).trim();

  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) {
    throw new TypeError(
      "VeloDom Lab metadataPath must be an absolute local path without '..'"
    );
  }

  return path;
}

/** Installs the read-only, local Vite metadata endpoint. */
function installLabMetadataEndpoint(
  server: ViteDevServer,
  path: string,
  records: Map<string, DevtoolsCompilerRecord>
) {
  server.middlewares.use((request, response, next) => {
    const requestPath = String(request.url || "").split("?", 1)[0];

    if (requestPath !== path) {
      next();
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.statusCode = 405;
      response.setHeader("allow", "GET, HEAD");
      response.end();
      return;
    }

    const payload = JSON.stringify({
      protocolVersion: VELODOM_DEVTOOLS_PROTOCOL_VERSION,
      records: [...records.values()].sort((left, right) => (
        left.file.localeCompare(right.file)
      ))
    });

    response.statusCode = 200;
    response.setHeader("cache-control", "no-store");
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(request.method === "HEAD" ? undefined : payload);
  });
}

/** Creates the two small development-only HTML bootstrap tags. */
function createLabHtmlTags(metadataPath: string) {
  const config = JSON.stringify({
    globalName: VD_DEVTOOLS.GLOBAL_NAME,
    metadataUrl: metadataPath
  }).replaceAll("<", "\\u003c");

  return [
    {
      tag: "script",
      children: `globalThis.${VELODOM_LAB_CONFIG_NAME}=${config};`,
      injectTo: "head-prepend" as const
    },
    {
      tag: "script",
      attrs: { type: "module" },
      children: [
        `import { mountVeloDomLab } from "/@id/velodom/devtools";`,
        `mountVeloDomLab(globalThis.${VELODOM_LAB_CONFIG_NAME});`
      ].join("\n"),
      injectTo: "body" as const
    }
  ];
}

/** Records compact compiler facts without retaining template source text. */
function recordCompilerResult(
  records: Map<string, DevtoolsCompilerRecord>,
  result: TemplateCompileResult,
  filename: string,
  root = ""
) {
  const file = normalizeCompilerRecordPath(filename, root);

  records.set(file, {
    diagnostics: result.diagnostics.map(diagnostic => ({
      code: diagnostic.code,
      column: diagnostic.location.column,
      line: diagnostic.location.line,
      message: diagnostic.message,
      severity: diagnostic.severity
    })),
    directives: result.metadata.map(metadata => ({
      argument: metadata.argument,
      column: metadata.location?.column,
      expression: metadata.expression,
      line: metadata.location?.line,
      name: metadata.name,
      type: metadata.type
    })),
    features: [...result.manifest.features],
    file
  });

  return file;
}

/** Removes private machine paths from compiler records. */
function normalizeCompilerRecordPath(filename: string, root: string) {
  const normalized = filename.replaceAll("\\", "/");
  const normalizedRoot = root.replaceAll("\\", "/").replace(/\/$/, "");

  if (normalizedRoot && normalized.startsWith(`${normalizedRoot}/`)) {
    return normalized.slice(normalizedRoot.length + 1);
  }

  const sourceIndex = normalized.lastIndexOf("/src/");

  return sourceIndex === -1
    ? normalized.replace(/^\/+/, "")
    : normalized.slice(sourceIndex + 1);
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

/** Evaluates the `shouldEmitMetadata()` condition for the supplied input. */
function shouldEmitMetadata(
  setting: VeloDomVitePluginOptions["emitMetadata"],
  mode: CompilerMode
) {
  if (setting === true) return true;
  if (setting === false) return false;

  return mode === "development";
}

/** Evaluates the `isPageConfigFile()` condition for the supplied input. */
function isPageConfigFile(filename: string) {
  return /\/src\/pages\/.*\/(?:page\.)?config\.[jt]s$/.test(
    filename.replace(/\\/g, "/")
  );
}

/** Evaluates the `isSingleFileModule()` condition for the supplied input. */
function isSingleFileModule(filename: string) {
  return filename
    .split("?", 1)[0]
    .endsWith(VD_SINGLE_FILE.EXTENSION);
}

/** Returns whether an id requests one virtual block from a `.vd` source. */
function isSingleFileBlockRequest(filename: string) {
  const queryIndex = filename.indexOf("?");

  if (queryIndex === -1) return false;

  const source = filename.slice(0, queryIndex);

  if (!source.endsWith(VD_SINGLE_FILE.EXTENSION)) return false;

  const query = new URLSearchParams(filename.slice(queryIndex + 1));

  return Object.values(VD_SINGLE_FILE.QUERIES).some(name => (
    query.has(name)
  ));
}

/** Evaluates the `isVeloDomStyleFile()` condition for the supplied input. */
function isVeloDomStyleFile(filename: string) {
  const normalized = filename
    .split("?", 1)[0]
    .replace(/\\/g, "/");

  return (
    normalized.endsWith(".css")
    && /\/src\/(?:pages|components|layouts)\//.test(normalized)
  );
}

/** Reports the RTL CSS diagnostics. */
function warnRtlCssDiagnostics(
  context: ViteWarningContext,
  source: string,
  filename: string
) {
  if (!source.trim()) return;

  analyzeRtlCss(source, filename).forEach(diagnostic => {
    context.warn({
      id: diagnostic.filename,
      message: `[${diagnostic.code}] ${diagnostic.message}`,
      loc: {
        line: diagnostic.line,
        column: diagnostic.column
      }
    });
  });
}

/** Reports the HTML shell diagnostics. */
function warnHtmlShellDiagnostics(
  context: ViteWarningContext,
  source: string,
  filename: string
) {
  analyzeHtmlShell(source, filename).forEach(diagnostic => {
    context.warn({
      id: diagnostic.filename,
      message: `[${diagnostic.code}] ${diagnostic.message}`,
      loc: {
        line: diagnostic.line,
        column: diagnostic.column
      }
    });
  });
}
