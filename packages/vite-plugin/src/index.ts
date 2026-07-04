import { readFile } from "node:fs/promises";
import type { Plugin } from "vite";
import { compileTemplate } from "../../compiler/src/index.ts";

export function velodom(): Plugin {
  let mode: "development" | "production" = "development";

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
      const result = compileTemplate(source, {
        filename,
        mode
      });
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
        code: [
          `export default ${JSON.stringify(result.html)};`,
          `export const __vdMetadata = ${JSON.stringify(result.metadata)};`
        ].join("\n"),
        map: null
      };
    }
  };
}
