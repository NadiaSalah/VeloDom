import { readFile } from "node:fs/promises";
import type { Plugin } from "vite";
import { compileTemplate } from "../compiler/index.ts";
import type {
  CompilerMode,
  CompilerOptions
} from "../compiler/types.ts";

export interface VeloDomVitePluginOptions {
  compiler?: Omit<CompilerOptions, "filename" | "mode">;
  emitManifest?: boolean;
  emitMetadata?: boolean | "development";
}

export interface TemplateModuleOptions extends VeloDomVitePluginOptions {
  filename?: string;
  mode?: CompilerMode;
}

export function velodom(options: VeloDomVitePluginOptions = {}): Plugin {
  let mode: CompilerMode = "development";

  return {
    name: "velodom",
    enforce: "pre",

    configResolved(config) {
      mode = config.mode === "production"
        ? "production"
        : "development";
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
    }
  };
}

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
