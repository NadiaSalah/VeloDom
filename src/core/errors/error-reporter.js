import { renderFatalFrameworkError } from "./error-screen.js";

export function reportUserActionError(error, options = {}) {
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

function normalizeError(error) {
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

function resolveLocation(stack, options, preferFallback = false) {
  const fallback = {
    file: options.file || "src/core/unknown.js",
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
    if (parsed.file === "src/core/errors/error-reporter.js" && options.file) continue;

    return parsed;
  }

  return fallback;
}

function parseStackLine(stackLine) {
  const normalized = stackLine.replace(/\\/g, "/");
  const srcMatch = normalized.match(/(src\/[^:\s)]+\.js)(?:\?[^:\s)]*)?:(\d+):(\d+)/);

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

function getElementSnippet(el) {
  if (!el?.outerHTML) return "";

  return el.outerHTML
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
