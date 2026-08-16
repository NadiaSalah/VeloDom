/**
 * ----------------------------------------
 * Module: Core Documentation Audit
 * ----------------------------------------
 *
 * Verifies that every TypeScript module in packages/velodom/src starts with a module
 * header and that every exported declaration has an adjacent JSDoc block.
 * This keeps documentation standards enforceable during future refactors.
 * ----------------------------------------
 */

import {
  readdir,
  readFile
} from "node:fs/promises";
import { join } from "node:path";

const CORE_DIRECTORY = "packages/velodom/src";
const EXPORT_PATTERN = /^\s*export\s+(?:(?:default|declare|async)\s+)*(?:function|class|interface|type|const|let|var|\{)/;

const files = await collectTypeScriptFiles(CORE_DIRECTORY);
const violations = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  const lines = source.split(/\r?\n/);

  if (!source.startsWith("/**") || !readFirstComment(source).includes("Module:")) {
    violations.push(`${file}: missing documentation header`);
  }

  findAdjacentDuplicateJsDocs(source).forEach(offset => {
    violations.push(`${file}:${offset}: duplicate adjacent JSDoc block`);
  });

  lines.forEach((line, index) => {
    if (!EXPORT_PATTERN.test(line) || line.trim() === "export {};") {
      return;
    }

    const blockStart = findAdjacentJsDocStart(lines, index);

    if (blockStart === -1 || blockStart === 0) {
      violations.push(
        `${file}:${index + 1}: exported declaration requires its own JSDoc`
      );
    }
  });
}

if (violations.length) {
  console.error([
    "VeloDom core documentation check failed:",
    ...violations.map(violation => `- ${violation}`)
  ].join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `VeloDom core documentation check passed (${files.length} files).`
  );
}

async function collectTypeScriptFiles(directory) {
  const entries = await readdir(directory, {
    withFileTypes: true
  });
  const nested = await Promise.all(
    entries.map(entry => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectTypeScriptFiles(path);
      }

      return entry.isFile() && entry.name.endsWith(".ts")
        ? [path.replaceAll("\\", "/")]
        : [];
    })
  );

  return nested.flat().sort();
}

function readFirstComment(source) {
  const end = source.indexOf("*/");

  return end === -1
    ? ""
    : source.slice(0, end + 2);
}

function findAdjacentJsDocStart(lines, exportIndex) {
  let index = exportIndex - 1;

  while (index >= 0 && !lines[index].trim()) {
    index -= 1;
  }

  if (index < 0 || !lines[index].trim().endsWith("*/")) {
    return -1;
  }

  while (index >= 0) {
    if (lines[index].trim().startsWith("/**")) {
      return index;
    }

    if (lines[index].trim().startsWith("/*")) {
      return -1;
    }

    index -= 1;
  }

  return -1;
}

function findAdjacentDuplicateJsDocs(source) {
  const matches = [...source.matchAll(/\/\*\*[\s\S]*?\*\//g)];
  const duplicates = [];

  for (let index = 1; index < matches.length; index += 1) {
    const previous = matches[index - 1];
    const current = matches[index];
    const previousEnd = previous.index + previous[0].length;
    const between = source.slice(previousEnd, current.index);

    if (!between.trim() && previous[0].trim() === current[0].trim()) {
      duplicates.push(source.slice(0, current.index).split(/\r?\n/).length);
    }
  }

  return duplicates;
}
