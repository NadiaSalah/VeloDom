/**
 * ----------------------------------------
 * Module: Declaration Import Rewriter
 * ----------------------------------------
 *
 * Rewrites source-oriented .ts module specifiers in emitted declarations to
 * .js so TypeScript resolves the adjacent .d.ts files in a published package.
 * ----------------------------------------
 */

import {
  readFile,
  readdir,
  writeFile
} from "node:fs/promises";
import { join } from "node:path";

const files = await collectDeclarationFiles("types");
let rewritten = 0;

for (const file of files) {
  const source = await readFile(file, "utf8");
  const output = source.replace(
    /((?:from\s+|import\()\s*["'][^"']+)\.ts(["'])/g,
    "$1.js$2"
  );

  if (output === source) continue;

  await writeFile(file, output);
  rewritten += 1;
}

console.log(
  `Rewrote declaration imports in ${rewritten} of ${files.length} files.`
);

async function collectDeclarationFiles(directory) {
  const entries = await readdir(directory, {
    withFileTypes: true
  });
  const nested = await Promise.all(
    entries.map(entry => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectDeclarationFiles(path);
      }

      return entry.isFile() && entry.name.endsWith(".d.ts")
        ? [path]
        : [];
    })
  );

  return nested.flat();
}
