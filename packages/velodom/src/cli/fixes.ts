/**
 * ----------------------------------------
 * Module: Safe Syntax Fix Planner
 * ----------------------------------------
 *
 * Plans and optionally applies a narrow allowlist of syntax-preserving VeloDom
 * template migrations. It never edits JavaScript business logic, deletes
 * files, or rewrites an unexpected on-disk revision.
 * ----------------------------------------
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isPreferredDirective } from "../shared/directives.ts";
import type { ProjectSourceIndex } from "./project-index.ts";

/** One human-reviewable source replacement reported by `vd fix`. */
export interface ProjectFixEdit {
  after: string;
  before: string;
  column: number;
  file: string;
  line: number;
}

/** One file-level safe-fix plan with guarded source ownership. */
export interface ProjectFileFix {
  edits: ProjectFixEdit[];
  file: string;
  original: string;
  updated: string;
}

/** Creates a deterministic safe-fix preview from the shared Project Index. */
export function createProjectFixPlan(index: ProjectSourceIndex): ProjectFileFix[] {
  return index.templates.flatMap(template => {
    const transformed = transformTemplateSyntax(
      template.html,
      template.module.source
    );

    if (!transformed.edits.length) return [];

    const updated = template.module.source.endsWith(".vd")
      ? replaceSingleFileTemplate(template.rawSource, template.html, transformed.source)
      : transformed.source;

    return [{
      edits: transformed.edits,
      file: template.module.source,
      original: template.rawSource,
      updated
    }];
  });
}

/** Applies a reviewed plan only when every source still matches its snapshot. */
export async function applyProjectFixPlan(
  root: string,
  plan: ProjectFileFix[]
): Promise<void> {
  for (const file of plan) {
    const target = join(root, file.file);
    const current = await readFile(target, "utf8");

    if (current !== file.original) {
      throw new Error(
        `Refusing to update ${file.file} because it changed after the fix preview was created.`
      );
    }
  }

  await Promise.all(plan.map(file => (
    writeFile(join(root, file.file), file.updated, "utf8")
  )));
}

/** Applies only reviewed alias migrations to one template body. */
function transformTemplateSyntax(source: string, file: string) {
  const edits: ProjectFixEdit[] = [];
  let updated = replacePattern(
    source,
    /\b(?:data-)?vd-request-state\b/g,
    () => "vd-auto-state",
    file,
    edits
  );

  updated = replacePattern(
    updated,
    /\bdata-vd-on-([A-Za-z][\w:-]*)((?:\.[\w:-]+)*)/g,
    match => `vd-on:${match[1]}${match[2] || ""}`,
    file,
    edits
  );
  updated = replacePattern(
    updated,
    /\bdata-vd-([\w:-]+)((?:\.[\w:-]+)*)/g,
    match => {
      const name = match[1] || "";

      return isPreferredDirective(name)
        ? `vd-${name}${match[2] || ""}`
        : match[0];
    },
    file,
    edits
  );

  return { edits, source: updated };
}

/** Runs one replacement rule while retaining reviewable source positions. */
function replacePattern(
  source: string,
  pattern: RegExp,
  replacement: (match: RegExpExecArray) => string,
  file: string,
  edits: ProjectFixEdit[]
) {
  let output = "";
  let cursor = 0;

  for (const match of source.matchAll(pattern)) {
    const offset = match.index;
    const before = match[0];
    const after = replacement(match);

    output += source.slice(cursor, offset) + after;
    cursor = offset + before.length;
    if (after !== before) {
      const lines = source.slice(0, offset).split("\n");

      edits.push({
        after,
        before,
        column: (lines.at(-1) || "").length + 1,
        file,
        line: lines.length
      });
    }
  }

  return output + source.slice(cursor);
}

/** Replaces only the actual template block inside one `.vd` source file. */
function replaceSingleFileTemplate(
  rawSource: string,
  originalTemplate: string,
  updatedTemplate: string
) {
  const opening = /<template\b[^>]*>/i.exec(rawSource);

  if (!opening) return rawSource;
  const start = opening.index + opening[0].length;
  const end = rawSource.indexOf("</template>", start);

  if (end < start || rawSource.slice(start, end) !== originalTemplate) {
    return rawSource;
  }

  return rawSource.slice(0, start) + updatedTemplate + rawSource.slice(end);
}
