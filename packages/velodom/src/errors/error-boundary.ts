/**
 * ----------------------------------------
 * Module: Recoverable Error Boundary
 * ----------------------------------------
 *
 * Runs application-owned fallback hooks for recoverable runtime failures and
 * renders safe fallback content without replacing the whole document.
 * ----------------------------------------
 */

import {
  VD_ERROR,
  VD_ERROR_BOUNDARY
} from "../constants.ts";
import {
  reportUserActionError,
  type ErrorReportOptions
} from "./error-reporter.ts";
import type {
  ErrorBoundaryContext,
  ErrorBoundaryFallback,
  ErrorBoundaryHook
} from "../types.ts";
import { awaitWithAbort } from "../shared/cancellation.ts";

/** Options required to run one recoverable error boundary attempt. */
export interface RecoverableErrorBoundaryOptions {
  title: string;
  target: HTMLElement;
  phase: ErrorBoundaryContext["phase"];
  hook?: ErrorBoundaryHook | null;
  hint?: string;
  file?: string;
  line?: number;
  column?: number;
  page?: string;
  component?: string;
  ownership?: ErrorReportOptions["ownership"];
  code?: string;
  group?: ErrorReportOptions["group"];
  retry?: () => unknown | Promise<unknown>;
  navigate?: (path: string) => unknown | Promise<unknown>;
  /** Private owner signal prevents a departed scope's fallback from rendering. */
  signal?: AbortSignal;
}

/**
 * Reports an error, invokes the optional application boundary, and renders the
 * returned fallback when the hook accepts recovery.
 */
export async function renderRecoverableErrorBoundary(
  error: unknown,
  options: RecoverableErrorBoundaryOptions
) {
  if (options.signal?.aborted) return false;
  const reported = reportUserActionError(error, {
    code: options.code,
    title: options.title,
    group: options.group,
    file: options.file,
    line: options.line,
    column: options.column,
    hint: options.hint,
    ownership: options.ownership
  });

  if (typeof options.hook !== "function") {
    return false;
  }

  const context: ErrorBoundaryContext = {
    error,
    diagnostic: reported,
    title: options.title,
    message: reported.formatted,
    location: reported.location,
    phase: options.phase,
    target: options.target,
    page: options.page,
    component: options.component,
    retry: options.retry || (() => undefined),
    navigate: options.navigate || (() => undefined)
  };

  try {
    const fallback = await awaitWithAbort(options.hook(context), options.signal);
    if (options.signal?.aborted) return false;

    if (fallback === false) {
      return false;
    }

    renderFallback(options.target, fallback);
    return true;
  } catch (boundaryError) {
    if (options.signal?.aborted) return false;
    reportUserActionError(boundaryError, {
      code: VD_ERROR.CODES.BOUNDARY_CRASH,
      group: "runtime",
      title: "Error Boundary Crash",
      file: "velodom/errors/error-boundary.ts",
      line: 53,
      hint: "Check the application errorBoundary hook passed to createApp()."
    });

    return false;
  }
}

/** Renders the fallback. */
function renderFallback(
  target: HTMLElement,
  fallback: ErrorBoundaryFallback
) {
  if (fallback === undefined || fallback === null) {
    return;
  }

  if (typeof fallback === "string") {
    const section = document.createElement("section");

    section.setAttribute(VD_ERROR_BOUNDARY.ATTRIBUTE, "");
    section.setAttribute("role", "alert");
    section.textContent = fallback;
    target.replaceChildren(section);
    return;
  }

  if (fallback instanceof Node) {
    target.replaceChildren(fallback);
  }
}
