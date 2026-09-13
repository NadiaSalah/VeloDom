/**
 * ----------------------------------------
 * Module: Project Diagnostic Catalog
 * ----------------------------------------
 *
 * Defines stable, offline diagnostic identities shared by VeloDom CLI checks
 * and `vd explain`. The catalog contains remediation guidance only; project
 * policy and source analysis remain in their owning build-time modules.
 * ----------------------------------------
 */

import type { SourceLocation } from "../compiler/types.ts";

/** Stable diagnostic categories used by project tooling. */
export type ProjectDiagnosticCategory =
  | "accessibility"
  | "compiler"
  | "component"
  | "configuration"
  | "maintainability"
  | "request"
  | "routing"
  | "security"
  | "state"
  | "tooling";

/** Structured problem returned by static project commands. */
export interface ProjectDiagnostic {
  category: ProjectDiagnosticCategory;
  code: string;
  file: string;
  level: "error" | "warning";
  location?: SourceLocation;
  message: string;
  suggestion?: string;
}

/** Human-readable explanation for one stable diagnostic ID. */
export interface DiagnosticExplanation {
  category: ProjectDiagnosticCategory;
  code: string;
  details: string[];
  summary: string;
}

interface DiagnosticCatalogEntry {
  category: ProjectDiagnosticCategory;
  details: string[];
  summary: string;
}

const DIAGNOSTIC_CATALOG: Record<string, DiagnosticCatalogEntry> = {
  VD_PROJECT_COMPONENT_MISSING: {
    category: "component",
    summary: "A template references a component that project discovery cannot find.",
    details: [
      "Check the component name and nested path for a typo.",
      "Create either src/components/<name>/index.html or src/components/<name>.vd.",
      "Keep component names relative to src/components and use forward slashes."
    ]
  },
  VD_PROJECT_REQUEST_MISSING: {
    category: "request",
    summary: "A declarative request names an API route that is not registered.",
    details: [
      "Check vd-request against the explicit routes registry or file-route convention.",
      "Nested src/api files become dot-separated route names.",
      "Do not move application request policy into framework Core."
    ]
  },
  VD_PROJECT_REF_MISSING: {
    category: "component",
    summary: "An expression reads a DOM ref that the same template does not declare.",
    details: [
      "Add a matching vd-ref or correct the $refs member name.",
      "Refs are local to their page or component ownership scope."
    ]
  },
  VD_PROJECT_HANDLER_MISSING: {
    category: "component",
    summary: "An event directive calls a handler not found in the paired script.",
    details: [
      "Export the shallow handler in state, define it in init, or correct the directive expression.",
      "Keep complex behavior in the paired application script rather than inline HTML."
    ]
  },
  VD_PROJECT_STATE_DUPLICATE: {
    category: "state",
    summary: "One template declares the same local state key more than once.",
    details: [
      "Use one vd-state owner for each name in a template scope.",
      "Prefer the page or component state export for shared local defaults."
    ]
  },
  VD_PROJECT_UNSAFE_EXPRESSION: {
    category: "security",
    summary: "A directive expression attempts dynamic code evaluation.",
    details: [
      "Remove eval, Function, or new Function usage.",
      "Use VeloDom's compiler-validated expression subset and named application handlers."
    ]
  },
  VD_PROJECT_COMPONENT_CYCLE: {
    category: "component",
    summary: "Components form a circular static dependency.",
    details: [
      "Extract the shared child or break the recursive ownership chain.",
      "VeloDom does not add a runtime cycle resolver."
    ]
  },
  VD_PROJECT_PAGE_CONFIG: {
    category: "configuration",
    summary: "A page config contains a statically invalid VeloDom option.",
    details: [
      "Review path, layout, guard, prerender, data, and SEO values in config.js or config.ts.",
      "Use app-relative paths and application-owned functions."
    ]
  },
  VD_PROJECT_SECURITY_LINK: {
    category: "security",
    summary: "A template link has a statically unsafe navigation policy.",
    details: [
      "Never use javascript: URLs.",
      "Add rel=\"noopener\" to links that open a new browsing context."
    ]
  },
  VD_PROJECT_LAB_CONFIG: {
    category: "tooling",
    summary: "The optional VeloDom Lab setup is incomplete or inconsistent.",
    details: [
      "Keep the dev script as the Vite command and expose Lab through vd lab.",
      "Lab remains opt-in, local, and excluded from production output."
    ]
  },
  VD_PROJECT_MAINTAINABILITY: {
    category: "maintainability",
    summary: "Static project analysis found a maintainability signal to review.",
    details: [
      "Confirm the resource is reachable and intentionally used.",
      "Split unusually large templates only when it improves feature ownership."
    ]
  }
};

/** Returns deterministic documentation for a project or compiler diagnostic. */
export function explainDiagnostic(
  requestedCode: string
): DiagnosticExplanation | null {
  const code = requestedCode.trim().toUpperCase();
  const entry = DIAGNOSTIC_CATALOG[code];

  if (entry) return { code, ...entry };
  if (
    code.startsWith("VD_COMPILER_")
    || code.startsWith("VD_A11Y_")
    || code.startsWith("VD_SECURITY_")
  ) {
    const category = code.startsWith("VD_A11Y_")
      ? "accessibility"
      : code.startsWith("VD_SECURITY_")
        ? "security"
        : "compiler";

    return {
      category,
      code,
      summary: `The VeloDom compiler reported a source-backed ${category} finding.`,
      details: [
        "Run vd explain <template-file> to see the exact compiler message and location.",
        "Prefer documented vd-* directives and compiler-safe expressions.",
        "Compiler diagnostics are deterministic and require no network or AI provider."
      ]
    };
  }

  return null;
}

/** Finds a one-based source location for the first matching token. */
export function locateSourceToken(
  source: string,
  token: string
): SourceLocation | undefined {
  const offset = source.indexOf(token);

  if (offset < 0) return undefined;

  const lines = source.slice(0, offset).split("\n");

  return {
    line: lines.length,
    column: (lines.at(-1) || "").length + 1
  };
}

/** Returns the nearest known name when a conservative typo match exists. */
export function suggestNearestName(
  value: string,
  candidates: Iterable<string>
): string | undefined {
  let closest: { distance: number; value: string } | undefined;

  for (const candidate of candidates) {
    const distance = editDistance(value.toLowerCase(), candidate.toLowerCase());

    if (!closest || distance < closest.distance) closest = { distance, value: candidate };
  }

  const limit = Math.max(1, Math.floor(value.length / 3));

  return closest && closest.distance <= limit ? closest.value : undefined;
}

/** Computes bounded Levenshtein distance for small project identifiers. */
function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = (previous[rightIndex - 1] ?? 0)
        + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        substitution
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length] ?? 0;
}
