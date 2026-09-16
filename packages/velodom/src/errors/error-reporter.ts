/**
 * ----------------------------------------
 * Module: Structured Error Reporter
 * ----------------------------------------
 *
 * Normalizes runtime failures, resolves source locations, formats directive
 * context, selects console severity, and optionally renders a fatal screen.
 * ----------------------------------------
 */

import { VD_ERROR } from "../constants.ts";
import type {
  ErrorDiagnosticGroup,
  ErrorOwnershipFrame,
  ErrorSourceFrame,
  VeloDomErrorReport
} from "../types.ts";
import { renderFatalFrameworkError } from "./error-screen.ts";

/** Structured context attached to one runtime error report. */
export interface ErrorReportOptions {
  code?: string;
  title?: string;
  directive?: string;
  group?: ErrorDiagnosticGroup;
  hint?: string;
  expression?: unknown;
  el?: Element | null;
  file?: string;
  line?: number;
  column?: number;
  level?: "error" | "warn";
  fatal?: boolean;
  ownership?: readonly ErrorOwnershipFrame[];
}

interface VeloDomAnnotatedError extends Error {
  __vdFile?: string;
  __vdHint?: string;
  __vdSynthetic?: boolean;
}

interface ErrorSourceLocation {
  file: string;
  line: number;
  column: number;
}

type ErrorReportSubscriber = (report: VeloDomErrorReport) => void;

const subscribers = new Set<ErrorReportSubscriber>();

/** Subscribes an explicitly mounted development tool to future reports. */
export function subscribeErrorReports(callback: ErrorReportSubscriber) {
  if (typeof callback !== "function") {
    throw new TypeError("VeloDom error report subscriber must be a function");
  }
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

/** Formats and reports a runtime failure without hiding its original cause. */
export function reportUserActionError(
  error: unknown,
  options: ErrorReportOptions = {}
): VeloDomErrorReport {
  const normalized = normalizeError(error);
  const reportOptions = {
    ...options,
    file: normalized.__vdFile || options.file,
    hint: normalized.__vdHint || options.hint
  };
  const code = normalizeDiagnosticCode(reportOptions.code);
  const group = reportOptions.group || inferDiagnosticGroup(code);
  const sourceStack = resolveSourceStack(
    normalized.stack,
    reportOptions,
    normalized.__vdSynthetic === true || Boolean(normalized.__vdFile)
  );
  const location = resolveLocation(sourceStack, reportOptions);
  const title = reportOptions.title || "Runtime Error";
  const directive = reportOptions.directive || "";
  const hint = reportOptions.hint || "";
  const element = getElementSnippet(reportOptions.el);
  const expression = reportOptions.expression === undefined
    ? ""
    : String(reportOptions.expression);
  const ownership = [...(reportOptions.ownership || [])];
  const lines = [
    `[VeloDom] ${title}`,
    `Diagnostic: ${code} (${group})`,
    `Message: ${normalized.message}`,
    `Location: ${location.file}:${location.line}:${location.column}`
  ];

  if (ownership.length) {
    lines.push(`Ownership: ${ownership.map(formatOwnershipFrame).join(" > ")}`);
  }
  if (sourceStack.length) {
    lines.push("Source stack:");
    sourceStack.forEach(frame => lines.push(`  at ${formatSourceFrame(frame)}`));
  }
  if (directive) lines.push(`Directive: ${directive}`);
  if (expression) lines.push(`Expression: ${expression}`);
  if (element) lines.push(`Element: ${element}`);
  if (hint) lines.push(`Hint: ${hint}`);

  const formatted = lines.join("\n");
  const isWarning = reportOptions.level === "warn";
  const report: VeloDomErrorReport = {
    code,
    ...(directive ? { directive } : {}),
    ...(element ? { element } : {}),
    ...(expression ? { expression } : {}),
    formatted,
    group,
    ...(hint ? { hint } : {}),
    location,
    message: formatted,
    ownership,
    rawMessage: normalized.message,
    severity: isWarning ? "warning" : "error",
    sourceStack,
    title
  };

  if (isWarning) console.warn(formatted);
  else console.error(formatted);

  notifySubscribers(report);

  if (reportOptions.fatal) {
    renderFatalFrameworkError(normalized, {
      title,
      details: formatted
    });
  }

  return report;
}

/** Normalizes the error. */
function normalizeError(error: unknown): VeloDomAnnotatedError {
  if (error instanceof Error) {
    return error as VeloDomAnnotatedError;
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

/** Resolves the best application location from normalized source frames. */
function resolveLocation(
  sourceStack: ErrorSourceFrame[],
  options: ErrorReportOptions
): ErrorSourceLocation {
  const frame = sourceStack.find(item => !item.internal) || sourceStack[0];

  return frame
    ? { file: frame.file, line: frame.line, column: frame.column }
    : fallbackLocation(options);
}

/** Extracts a bounded, deduplicated set of source frames from browser stacks. */
function resolveSourceStack(
  stack: string | undefined,
  options: ErrorReportOptions,
  preferFallback = false
): ErrorSourceFrame[] {
  const frames: ErrorSourceFrame[] = [];
  const fallback = fallbackLocation(options);

  if (preferFallback) {
    frames.push({ ...fallback, internal: isInternalSource(fallback.file) });
  }
  String(stack || "")
    .split("\n")
    .map(line => parseStackLine(line.trim()))
    .filter((frame): frame is ErrorSourceFrame => frame !== null)
    .forEach(frame => {
      const duplicate = frames.some(item => (
        item.file === frame.file
        && item.line === frame.line
        && item.column === frame.column
      ));

      if (!duplicate && frames.length < VD_ERROR.MAX_SOURCE_FRAMES) {
        frames.push(frame);
      }
    });

  return frames;
}

/** Parses one V8, Firefox, or WebKit source stack line. */
function parseStackLine(stackLine: string): ErrorSourceFrame | null {
  const normalized = stackLine.replace(/\\/g, "/");
  const match = normalized.match(
    /((?:[A-Za-z]:)?[^()\s]+?\.(?:[cm]?[jt]s|html|vd))(?:\?[^:\s)]*)?:(\d+):(\d+)/
  );

  if (!match?.[1] || !match[2] || !match[3]) {
    const anonymous = normalized.match(/<anonymous>:(\d+):(\d+)/);

    return anonymous?.[1] && anonymous[2]
      ? {
        file: "template-expression",
        line: Number(anonymous[1]),
        column: Number(anonymous[2]),
        internal: true
      }
      : null;
  }

  const file = normalizeSourceFile(match[1]);
  const functionName = readFunctionName(normalized, match[1]);

  return {
    file,
    line: Number(match[2]),
    column: Number(match[3]),
    ...(functionName ? { functionName } : {}),
    internal: isInternalSource(file)
  };
}

/** Normalizes URLs and workspace paths into portable source labels. */
function normalizeSourceFile(value: string) {
  const file = value
    .replace(/^(?:https?|file):\/\/[^/]*\//, "/")
    .replace(/^file:\/\//, "");
  const packageSource = file.indexOf("/packages/velodom/src/");

  if (packageSource >= 0) {
    return `velodom/${file.slice(packageSource + "/packages/velodom/src/".length)}`;
  }
  const applicationSource = file.indexOf("/src/");

  if (applicationSource >= 0) return file.slice(applicationSource + 1);
  return file.replace(/^.*\/node_modules\/velodom\/lib\//, "velodom/");
}

/** Reads an optional function label without retaining the whole stack line. */
function readFunctionName(stackLine: string, file: string) {
  const prefix = stackLine.slice(0, stackLine.indexOf(file)).trim();
  const value = prefix
    .replace(/^at\s+/, "")
    .replace(/[@(\s]+$/, "")
    .trim();

  return value && value !== "Error" ? value : "";
}

/** Returns the explicit fallback location supplied by the owning subsystem. */
function fallbackLocation(options: ErrorReportOptions): ErrorSourceLocation {
  return {
    file: options.file || "velodom/unknown.ts",
    line: options.line || 1,
    column: options.column || 1
  };
}

/** Infers a bounded subsystem when callers provide only a stable code. */
function inferDiagnosticGroup(code: string): ErrorDiagnosticGroup {
  if (/^VD_(?:COMPILER|A11Y|SECURITY)_/.test(code)) return "compiler";
  if (code.startsWith("VD_ROUTER_")) return "router";
  if (/^VD_(?:REQUEST|AUTH|MIDDLEWARE)_/.test(code)) return "request";
  if (code.startsWith("VD_COMPONENT_")) return "component";
  return VD_ERROR.DEFAULT_GROUP;
}

/** Keeps runtime error identities stable and machine-readable. */
function normalizeDiagnosticCode(value: string | undefined) {
  const code = String(value || "").trim().toUpperCase();

  return /^VD_[A-Z0-9_]+$/.test(code) ? code : VD_ERROR.DEFAULT_CODE;
}

/** Marks package frames so application frames remain first in diagnostics. */
function isInternalSource(file: string) {
  return file.startsWith("velodom/")
    || file.includes("/node_modules/velodom/")
    || file === "template-expression";
}

/** Formats one ownership level without exposing arbitrary object state. */
function formatOwnershipFrame(frame: ErrorOwnershipFrame) {
  return `${frame.kind}:${frame.name}${frame.file ? ` (${frame.file})` : ""}`;
}

/** Formats one source frame for the console report. */
function formatSourceFrame(frame: ErrorSourceFrame) {
  const location = `${frame.file}:${frame.line}:${frame.column}`;

  return frame.functionName ? `${frame.functionName} (${location})` : location;
}

/** Returns the element snippet. */
function getElementSnippet(el: Element | null | undefined) {
  if (!el?.outerHTML) return "";

  return el.outerHTML
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

/** Notifies optional tools while isolating their failures from the app. */
function notifySubscribers(report: VeloDomErrorReport) {
  subscribers.forEach(callback => {
    try {
      callback(report);
    } catch {
      // Diagnostics must never make the original application failure worse.
    }
  });
}

/** Performs the internal `safeStringify()` operation. */
function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
