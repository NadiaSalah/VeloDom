/**
 * ----------------------------------------
 * Module: VeloDom Single-File Modules
 * ----------------------------------------
 *
 * Parses optional .vd files into template, script, style, and config blocks so
 * the Vite adapter can expose them through the same runtime resource maps used
 * by folder-based pages and components.
 * ----------------------------------------
 */

import { VD_SINGLE_FILE } from "../constants.ts";

/** Parsed top-level blocks from one .vd page or component file. */
export interface VeloDomSingleFileDescriptor {
  template: string;
  script: string;
  style: string;
  config: string;
}

interface BlockMatch {
  name: string;
  content: string;
  start: number;
  end: number;
}

/** Parses a .vd source file into its supported top-level blocks. */
export function parseVeloDomSingleFile(
  source: string,
  filename = "anonymous.vd"
): VeloDomSingleFileDescriptor {
  const blocks = findSingleFileBlocks(source);
  const usedBlocks = new Set<string>();
  const descriptor: VeloDomSingleFileDescriptor = {
    template: "",
    script: "",
    style: "",
    config: ""
  };

  for (const block of blocks) {
    if (!isSupportedBlock(block.name)) {
      throw new Error(
        `Unsupported block <${block.name}> in ${filename}. ` +
        "Use <template>, <script>, <style>, and <config>."
      );
    }

    if (usedBlocks.has(block.name)) {
      throw new Error(
        `Duplicate <${block.name}> block in ${filename}.`
      );
    }

    usedBlocks.add(block.name);
    descriptor[block.name as keyof VeloDomSingleFileDescriptor] = block.content.trim();
  }

  if (!descriptor.template) {
    throw new Error(
      `Missing <template> block in ${filename}.`
    );
  }

  return descriptor;
}

/** Creates a virtual JavaScript module for a .vd script block. */
export function createSingleFileScriptModule(
  descriptor: VeloDomSingleFileDescriptor
) {
  return rewriteDefaultExport(
    descriptor.script || "export {};",
    "__vdScriptDefault"
  );
}

/** Creates a virtual JavaScript module for a .vd style block. */
export function createSingleFileStyleModule(
  descriptor: VeloDomSingleFileDescriptor
) {
  return `export const __vdStyle = ${JSON.stringify(descriptor.style)};`;
}

/** Creates a virtual JavaScript module for a .vd page config block. */
export function createSingleFileConfigModule(
  descriptor: VeloDomSingleFileDescriptor
) {
  return rewriteDefaultExport(
    stripBuildOnlySeoEntries(descriptor.config || "export default {};"),
    "__vdConfig"
  );
}

/** Combines compiled template output with script, style, and config exports. */
export function createSingleFileRuntimeModule(
  descriptor: VeloDomSingleFileDescriptor,
  templateModuleCode: string
) {
  return [
    templateModuleCode,
    createSingleFileScriptModule(descriptor),
    createSingleFileStyleModule(descriptor),
    createSingleFileConfigModule(descriptor)
  ].join("\n");
}

/** Removes build-only SEO entry hooks from browser-consumed config modules. */
export function stripBuildOnlySeoEntries(source: string) {
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

function findSingleFileBlocks(source: string) {
  const blocks: BlockMatch[] = [];
  const pattern = /<([A-Za-z][\w-]*)(?:\s[^>]*)?>/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source))) {
    const name = match[1].toLowerCase();
    const closePattern = new RegExp(`</${escapeRegExp(name)}>`, "i");
    closePattern.lastIndex = pattern.lastIndex;
    const remaining = source.slice(pattern.lastIndex);
    const closeMatch = closePattern.exec(remaining);

    if (!closeMatch) {
      throw new Error(`Missing closing </${name}> block.`);
    }

    const contentStart = pattern.lastIndex;
    const contentEnd = pattern.lastIndex + closeMatch.index;
    const closeEnd = contentEnd + closeMatch[0].length;

    blocks.push({
      name,
      content: source.slice(contentStart, contentEnd),
      start: match.index,
      end: closeEnd
    });

    pattern.lastIndex = closeEnd;
  }

  return blocks;
}

function isSupportedBlock(name: string) {
  return (Object.values(VD_SINGLE_FILE.TAGS) as string[]).includes(name);
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rewriteDefaultExport(source: string, exportName: string) {
  const defaultExportPattern = /\bexport\s+default\b/;

  if (!defaultExportPattern.test(source)) {
    return `${source}\nexport const ${exportName} = {};`;
  }

  return [
    source.replace(defaultExportPattern, `const ${exportName} =`),
    `export { ${exportName} };`
  ].join("\n");
}
