/**
 * ----------------------------------------
 * Module: Structured Error Reporter
 * ----------------------------------------
 *
 * Normalizes runtime failures, resolves source locations, formats directive
 * context, selects console severity, and optionally renders a fatal screen.
 * ----------------------------------------
 */

import { renderFatalFrameworkError } from "./error-screen.ts";

/** Structured context attached to one runtime error report. */
export interface ErrorReportOptions {
  title?: string;
  directive?: string;
  hint?: string;
  expression?: unknown;
  el?: Element | null;
  file?: string;
  line?: number;
  column?: number;
  level?: "error" | "warn";
  fatal?: boolean;
}

/** Formats and reports a runtime failure without hiding its original cause. */
export function reportUserActionError(
  error: unknown,
  options: ErrorReportOptions = {}
) {
  const normalized = normalizeError(error);
  const location = resolveLocation(normalized.stack, options, normalized.__vdSynthetic === true);
  const title = options.title || "Runtime Error";
  const directive = options.directive || "";
  const hint = options.hint || "";
  const element = getElementSnippet(options.el);
  const lines = [
    `[VeloDom] ${title}`,
    `Message: ${normalized.message}`,
    `Location: ${location.file}:${location.line}:${location.column}`
  ];

  if (directive) {
    lines.push(`Directive: ${directive}`);
  }

  if (options.expression) {
    lines.push(`Expression: ${String(options.expression)}`);
  }

  if (element) {
    lines.push(`Element: ${element}`);
  }

  if (hint) {
    lines.push(`Hint: ${hint}`);
  }

  const formatted = lines.join("\n");
  const isWarning = options.level === "warn";

  if (isWarning) {
    console.warn(formatted);
  } else {
    console.error(formatted);
  }

  if (options.fatal) {
    renderFatalFrameworkError(normalized, {
      title,
      details: formatted
    });
  }

  return {
    message: formatted,
    location
  };
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  const synthetic = new Error(
    typeof error === "string"
      ? error
      : safeStringify(error)
  );

  Object.defineProperty(synthetic, "__vdSynthetic", {
    value: true
  });

  return synthetic;
}

function resolveLocation(
  stack: string | undefined,
  options: ErrorReportOptions,
  preferFallback = false
) {
  const fallback = {
    file: options.file || "src/core/unknown.ts",
    line: options.line || 1,
    column: options.column || 1
  };

  if (preferFallback) {
    return fallback;
  }

  if (!stack) return fallback;

  const lines = String(stack)
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const parsed = parseStackLine(line);

    if (!parsed) continue;
    if (parsed.file === "src/core/errors/error-reporter.ts" && options.file) continue;

    return parsed;
  }

  return fallback;
}

function parseStackLine(stackLine: string) {
  const normalized = stackLine.replace(/\\/g, "/");
  const srcMatch = normalized.match(/(src\/[^:\s)]+\.[jt]s)(?:\?[^:\s)]*)?:(\d+):(\d+)/);

  if (srcMatch) {
    return {
      file: srcMatch[1],
      line: Number(srcMatch[2]),
      column: Number(srcMatch[3])
    };
  }

  const anonymousMatch = normalized.match(/<anonymous>:(\d+):(\d+)/);

  if (anonymousMatch) {
    return {
      file: "template-expression",
      line: Number(anonymousMatch[1]),
      column: Number(anonymousMatch[2])
    };
  }

  return null;
}

function getElementSnippet(el: Element | null | undefined) {
  if (!el?.outerHTML) return "";

  return el.outerHTML
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
