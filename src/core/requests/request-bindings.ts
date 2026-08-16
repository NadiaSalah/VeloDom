/**
 * ----------------------------------------
 * Module: Request State Bindings
 * ----------------------------------------
 *
 * Resolves local and cross-page request destinations, derives automatic status
 * paths, and enforces protected-state and external-write policies.
 * ----------------------------------------
 */

import {
  VD,
  VD_REQUEST
} from "../constants.ts";
import {
  findProtectedStatePathKey,
  normalizeFolderPath
} from "../shared/path.ts";

type RequestBindingState = Record<string, unknown> & {
  __vdPageName?: string;
  $allowExternalWrite?: string[];
};

interface RequestBindingContext {
  page?: string;
  getPageState?: (pageName: string) => RequestBindingState;
  hasPage?: (pageName: string) => boolean;
}

interface RequestBindingProblemOptions {
  title?: string;
  directive?: string;
  expression?: unknown;
  hint?: string;
}

interface RequestBindingMeta {
  directive?: string;
  ownerState?: RequestBindingState;
  el?: Element;
  routeName?: string;
  report?: (
    state: RequestBindingState | undefined,
    el: Element | undefined,
    routeName: string | undefined,
    error: unknown,
    options: RequestBindingProblemOptions
  ) => null;
}

interface RequestBinding {
  state: RequestBindingState | null;
  path: string;
  pageName: string;
}

/** Resolves one declarative request binding to state, path, and page owner. */
export function resolveRequestBinding(
  targetAttr: unknown,
  pathAttr: unknown,
  valueAttr: unknown,
  currentState: RequestBindingState,
  context: RequestBindingContext,
  directive: string,
  meta: RequestBindingMeta = {}
): RequestBinding | null {
  const rawTarget = String(targetAttr || "").trim();
  const rawPath = String(pathAttr || "").trim();
  const rawValue = String(valueAttr || "").trim();

  if (rawPath && !normalizeFolderPath(rawPath)) {
    return report(meta, `Invalid page path "${rawPath}"`, {
      title: "Invalid Request Page Path",
      directive: VD.PATH,
      expression: rawPath,
      hint: "Use a clean folder path like posts or admin/posts without '..'."
    });
  }

  if (rawPath && !rawTarget) {
    return report(meta, "vd-path requires vd-target", {
      title: "Incomplete Request Target",
      directive: VD.PATH,
      expression: rawPath,
      hint: "Add vd-target with the page name."
    });
  }

  if (rawPath && rawTarget.includes(".")) {
    return report(meta, "Do not combine vd-path with dot notation target", {
      title: "Conflicting Request Target Syntax",
      directive: VD.TARGET,
      expression: rawTarget,
      hint: "Use either vd-target=\"home.posts\" or vd-path=\"posts\" with vd-target=\"create-post\"."
    });
  }

  const pageName = resolveRequestPageName(
    rawTarget,
    rawPath,
    rawValue,
    directive
  );

  if (!rawValue && directive !== VD.TARGET) {
    return {
      state: pageName
        ? getTargetPageState(pageName, currentState, context)
        : currentState,
      path: "",
      pageName: pageName || context.page || currentState.__vdPageName || ""
    };
  }

  if (directive === VD.TARGET && !rawTarget) {
    if (!rawValue) {
      return report(meta, "Request result target is missing", {
        title: "Missing Request Target",
        directive: VD.TARGET,
        hint: "Set vd-target to a state path or page name."
      });
    }

    return {
      state: currentState,
      path: rawValue,
      pageName: context.page || currentState.__vdPageName || ""
    };
  }

  if (directive === VD.TARGET && !rawValue && rawTarget) {
    if (pageName) {
      return report(meta, "Cross-page request target requires vd-state", {
        title: "Missing Cross-page State Name",
        directive: VD.STATE,
        expression: rawTarget,
        hint: "Example: vd-target=\"home\" vd-state=\"posts\"."
      });
    }

    if (rawTarget.includes(".")) {
      return resolveAbsoluteBinding(rawTarget, currentState, context, meta);
    }

    return {
      state: currentState,
      path: rawTarget,
      pageName: context.page || currentState.__vdPageName || ""
    };
  }

  if (pageName && context.hasPage && !context.hasPage(pageName)) {
    return report(meta, `Target page "${pageName}" does not exist`, {
      title: "Unknown Request Target Page",
      directive: rawPath ? VD.PATH : VD.TARGET,
      expression: pageName,
      hint: "Register the target page through the configured resource adapter."
    });
  }

  if (pageName && rawValue.includes(".")) {
    return report(
      meta,
      "Do not combine cross-page target with dot notation state path",
      {
        title: "Conflicting Request State Syntax",
        directive,
        expression: rawValue,
        hint: "Use vd-state=\"result\" for cross-page targets, or a full dot path like home.result."
      }
    );
  }

  if (pageName && !rawValue.includes(".")) {
    return {
      state: getTargetPageState(pageName, currentState, context),
      path: rawValue,
      pageName
    };
  }

  if (rawValue.includes(".")) {
    return resolveAbsoluteBinding(rawValue, currentState, context, meta);
  }

  return {
    state: currentState,
    path: rawValue,
    pageName: context.page || currentState.__vdPageName || ""
  };
}

/** Derives a Loading or Error path from a request result binding. */
export function createAutoStatusBinding(
  targetBinding: RequestBinding | null | undefined,
  kind: "loading" | "error"
): RequestBinding {
  if (!targetBinding?.path) {
    return {
      state: targetBinding?.state || null,
      path: "",
      pageName: targetBinding?.pageName || ""
    };
  }

  return {
    state: targetBinding.state,
    path: deriveRequestStatusPath(targetBinding.path, kind),
    pageName: targetBinding.pageName
  };
}

/** Validates protected keys and cross-page write allowlists. */
export function validateRequestBindingAccess(
  binding: RequestBinding | null | undefined,
  currentState: RequestBindingState,
  context: RequestBindingContext,
  meta: RequestBindingMeta = {}
): boolean | null {
  if (!binding?.path) return true;

  const protectedKey = findProtectedStatePathKey(binding.path);

  if (protectedKey) {
    const targetPage = binding.pageName || binding.state?.__vdPageName || "";

    return report(
      meta,
      `Writes to protected state key "${protectedKey}" are not allowed`,
      {
        title: "Protected Request State Path",
        directive: meta.directive || VD.TARGET,
        expression: targetPage
          ? `${targetPage}.${binding.path}`
          : binding.path,
        hint: "Use normal application state keys. Prototype and framework-owned keys cannot be targeted."
      }
    );
  }

  const targetPage = binding.pageName || binding.state?.__vdPageName || "";
  const currentPage = context.page || currentState.__vdPageName || "";

  if (!targetPage || targetPage === currentPage) return true;

  const topLevelKey = String(binding.path)
    .split(".")
    .filter(Boolean)[0];

  if (!topLevelKey) return true;

  const allowList = binding.state?.$allowExternalWrite;

  if (allowList === undefined) {
    return report(
      meta,
      `Page "${targetPage}" does not allow external state writes`,
      {
        title: "External Page Write Not Allowed",
        directive: meta.directive || VD.TARGET,
        expression: `${targetPage}.${binding.path}`,
        hint: `Allow it in ${targetPage}/config.js or config.ts with export default { allowExternalWrite: ["${topLevelKey}"] }.`
      }
    );
  }

  if (!Array.isArray(allowList)) {
    return report(
      meta,
      `Page "${targetPage}" has an invalid external write allowlist`,
      {
        title: "Invalid External Write Allowlist",
        directive: meta.directive || VD.TARGET,
        expression: `${targetPage}.allowExternalWrite`,
        hint: "Set allowExternalWrite in config.js or config.ts to an array of top-level state keys."
      }
    );
  }

  if (!allowList.includes(topLevelKey)) {
    return report(
      meta,
      `Page "${targetPage}" does not expose "${topLevelKey}" for external writes`,
      {
        title: "External Page State Blocked",
        directive: meta.directive || VD.TARGET,
        expression: `${targetPage}.${binding.path}`,
        hint: `Add "${topLevelKey}" to allowExternalWrite in ${targetPage}/config.js or config.ts.`
      }
    );
  }

  return true;
}

function resolveRequestPageName(
  targetAttr: unknown,
  pathAttr: unknown,
  valueAttr: unknown,
  directive: string
) {
  const target = String(targetAttr || "").trim();
  const path = normalizeFolderPath(pathAttr);
  const hasStateName = Boolean(String(valueAttr || "").trim());

  if (path) {
    return target.includes("/")
      ? normalizeFolderPath(target)
      : joinRequestPagePath(path, target);
  }

  if (target.includes("/")) return normalizeFolderPath(target);

  if (directive !== VD.TARGET && target && !target.includes(".")) {
    return normalizeFolderPath(target);
  }

  if (
    directive === VD.TARGET
    && hasStateName
    && target
    && !target.includes(".")
  ) {
    return normalizeFolderPath(target);
  }

  return "";
}

function joinRequestPagePath(path: string, page: string) {
  const pageName = normalizeFolderPath(page);

  if (!path) return pageName;
  if (!pageName) return path;

  return `${path}/${pageName}`;
}

function resolveAbsoluteBinding(
  binding: string,
  currentState: RequestBindingState,
  context: RequestBindingContext,
  meta: RequestBindingMeta
): RequestBinding | null {
  const parts = String(binding || "")
    .trim()
    .split(".")
    .filter(Boolean);

  if (parts.length <= 1) {
    return {
      state: currentState,
      path: parts[0] || "",
      pageName: context.page || currentState.__vdPageName || ""
    };
  }

  if (Object.hasOwn(currentState, parts[0])) {
    return {
      state: currentState,
      path: parts.join("."),
      pageName: context.page || currentState.__vdPageName || ""
    };
  }

  const pageName = parts[0];

  if (context.hasPage && !context.hasPage(pageName)) {
    return report(meta, `Target page "${pageName}" does not exist`, {
      title: "Unknown Request Target Page",
      directive: meta.directive || VD.TARGET,
      expression: binding,
      hint: "Use an existing page name or valid nested page path."
    });
  }

  return {
    state: getTargetPageState(pageName, currentState, context),
    path: parts.slice(1).join("."),
    pageName
  };
}

function getTargetPageState(
  pageName: string,
  currentState: RequestBindingState,
  context: RequestBindingContext
) {
  const normalized = String(pageName || "").trim();

  if (!normalized || normalized === context.page) {
    return currentState;
  }

  return context.getPageState?.(normalized) || currentState;
}

function deriveRequestStatusPath(
  targetPath: string,
  kind: "loading" | "error"
) {
  const segments = String(targetPath || "")
    .split(".")
    .filter(Boolean);

  if (segments.length === 0) return "";

  const suffix = kind === "loading"
    ? VD_REQUEST.STATUS_SUFFIXES.LOADING
    : VD_REQUEST.STATUS_SUFFIXES.ERROR;
  const last = segments.pop();
  const resultSuffix = VD_REQUEST.STATUS_SUFFIXES.RESULT;
  const base = last.endsWith(resultSuffix)
    ? last.slice(0, -resultSuffix.length)
    : last;

  segments.push(`${base}${suffix}`);

  return segments.join(".");
}

function report(
  meta: RequestBindingMeta,
  error: unknown,
  options: RequestBindingProblemOptions
): null {
  if (typeof meta.report !== "function") {
    return null;
  }

  return meta.report(
    meta.ownerState,
    meta.el,
    meta.routeName,
    error,
    options
  );
}
