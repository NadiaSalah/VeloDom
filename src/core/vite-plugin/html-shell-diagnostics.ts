/**
 * ----------------------------------------
 * Module: HTML Shell Diagnostics
 * ----------------------------------------
 *
 * Checks the application HTML shell for low-cost multilingual and encoding
 * requirements that should be present before the client runtime loads.
 * ----------------------------------------
 */

import { VD_HTML_SHELL } from "../constants.ts";

/** One advisory warning emitted for the application HTML shell. */
export interface HtmlShellDiagnostic {
  code: string;
  filename: string;
  line: number;
  column: number;
  message: string;
}

/** Warns when the app shell does not declare UTF-8 early and explicitly. */
export function analyzeHtmlShell(
  source: string,
  filename = "index.html"
): HtmlShellDiagnostic[] {
  const charset = findCharset(source);

  if (charset?.value.toLowerCase() === VD_HTML_SHELL.UTF8_PATTERN) {
    return [];
  }

  return [
    {
      code: VD_HTML_SHELL.UTF8_CODE,
      filename,
      line: charset?.line || 1,
      column: charset?.column || 1,
      message: charset
        ? "Use UTF-8 in the application shell meta charset for multilingual content."
        : "Add <meta charset=\"UTF-8\"> to the application shell for multilingual content."
    }
  ];
}

function findCharset(source: string) {
  const pattern = /<meta\b[^>]*\bcharset\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi;
  const match = pattern.exec(source);

  if (!match) return null;

  const value = match[1] || match[2] || match[3] || "";
  const location = offsetToLocation(source, match.index);

  return {
    value: value.trim(),
    ...location
  };
}

function offsetToLocation(source: string, offset: number) {
  const before = source.slice(0, offset);
  const lines = before.split(/\r?\n/);

  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}
