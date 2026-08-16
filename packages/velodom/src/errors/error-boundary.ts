/**
 * ----------------------------------------
 * Module: Recoverable Error Boundary
 * ----------------------------------------
 *
 * Runs application-owned fallback hooks for recoverable runtime failures and
 * renders safe fallback content without replacing the whole document.
 * ----------------------------------------
 */

import { VD_ERROR_BOUNDARY } from "../constants.ts";
import { reportUserActionError } from "./error-reporter.ts";
import type {
  ErrorBoundaryContext,
  ErrorBoundaryFallback,
  ErrorBoundaryHook
} from "../types.ts";

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
  retry?: () => unknown | Promise<unknown>;
  navigate?: (path: string) => unknown | Promise<unknown>;
}

/**
 * Reports an error, invokes the optional application boundary, and renders the
 * returned fallback when the hook accepts recovery.
 */
export async function renderRecoverableErrorBoundary(
  error: unknown,
  options: RecoverableErrorBoundaryOptions
) {
  const reported = reportUserActionError(error, {
    title: options.title,
    file: options.file,
    line: options.line,
    column: options.column,
    hint: options.hint
  });

  if (typeof options.hook !== "function") {
    return false;
  }

  const context: ErrorBoundaryContext = {
    error,
    title: options.title,
    message: reported.message,
    location: reported.location,
    phase: options.phase,
    target: options.target,
    page: options.page,
    component: options.component,
    retry: options.retry || (() => undefined),
    navigate: options.navigate || (() => undefined)
  };

  try {
    const fallback = await options.hook(context);

    if (fallback === false) {
      return false;
    }

    renderFallback(options.target, fallback);
    return true;
  } catch (boundaryError) {
    reportUserActionError(boundaryError, {
      title: "Error Boundary Crash",
      file: "velodom/errors/error-boundary.ts",
      line: 53,
      hint: "Check the application errorBoundary hook passed to createApp()."
    });

    return false;
  }
}

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
