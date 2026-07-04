import {
  VD,
  VD_INTERNAL,
  VD_PROTECTED_STATE_KEYS,
  VD_REQUEST
} from "../constants.js";
import { reportUserActionError } from "../errors/error-reporter.js";
import {
  createAuthRuntime,
  getDefaultAuthSessionUrl,
  normalizeRequestAuthConfig,
  resolveRequestSession
} from "./auth.js";
import {
  executeRequestMiddleware,
  resolveRequestMiddleware
} from "./middleware-engine.js";

const activeRequests = new WeakMap();
const activeTargetRequests = new WeakMap();
let apiRoutes = Object.create(null);
let appRequestMiddleware = Object.create(null);
let authRuntime = createAuthRuntime();

export function configureRequestRuntime({
  routes = {},
  middleware = {},
  auth = {}
} = {}) {
  if (!isPlainObject(routes)) {
    throw new TypeError("VeloDom routes must be a plain object");
  }

  if (!isPlainObject(middleware)) {
    throw new TypeError("VeloDom middleware must be a plain object");
  }

  apiRoutes = Object.assign(Object.create(null), routes);
  appRequestMiddleware = Object.assign(Object.create(null), middleware);
  authRuntime = createAuthRuntime(auth);
}

export function applyRequests(root, state, cleanups, context, helpers) {
  const {
    findAll,
    isInsideForTemplate,
    evaluate,
    writeValue
  } = helpers;

  findAll(root, VD.REQUEST)
    .forEach(el => {

      if (isInsideForTemplate(el)) return;

      const isForm = el.tagName === "FORM";
      const eventName = isForm ? "submit" : "click";

      const handler = async (event) => {
        event.preventDefault();

        await runRequestDirective(
          el,
          state,
          context,
          event,
          evaluate,
          writeValue
        );
      };

      el.addEventListener(eventName, handler);
      cleanups.push(() => {
        el.removeEventListener(eventName, handler);
        cancelElementRequest(el);
      });

    });
}

async function runRequestDirective(el, state, context, event, evaluate, writeValue) {
  const routeName = (el.getAttribute(VD.REQUEST) || "").trim();

  if (!routeName) {
    reportRequestDirectiveProblem(state, el, routeName, "Missing request route name", {
      title: "Missing Request Route",
      directive: VD.REQUEST,
      line: 48,
      hint: "Set data-vd-request to a valid route such as posts.getOne."
    });
    return;
  }

  if (!hasApiRoute(routeName)) {
    reportRequestDirectiveProblem(state, el, routeName, `Unknown API route "${routeName}"`, {
      title: "Unknown API Route",
      directive: VD.REQUEST,
      expression: routeName,
      line: 58,
      hint: `Use one of: ${listApiRoutes().join(", ")}`
    });
    return;
  }

  const requestConfig = getRequestConfig(el, state, context, event, evaluate, routeName);

  if (requestConfig === VD_INTERNAL.REQUEST_ABORT) {
    return;
  }

  const targetAttr = getRequestConfigText(el, requestConfig, "target", VD.TARGET);
  const pathAttr = getRequestConfigText(el, requestConfig, "path", VD.PATH);
  const stateAttr = getRequestConfigText(el, requestConfig, "state", VD.STATE);
  const loadingAttr = getRequestConfigText(el, requestConfig, "loading", VD.LOADING);
  const errorAttr = getRequestConfigText(el, requestConfig, "error", VD.ERROR);
  const requestStateEnabled = hasRequestStateAutomation(el, requestConfig);
  const paramsInput = getRequestParamsInput(el, requestConfig);
  const params = getRequestParams(
    el,
    state,
    context,
    paramsInput,
    event,
    evaluate
  );

  if (params === VD_INTERNAL.REQUEST_ABORT) {
    reportRequestDirectiveProblem(state, el, routeName, "data-vd-params must return an object", {
      title: "Invalid Request Params",
      directive: VD.PARAMS,
      expression: typeof paramsInput === "string"
        ? paramsInput
        : el.getAttribute(VD.REQUEST_CONFIG) || routeName,
      line: 85,
      hint: "Use object syntax. Example: { id: 1 }"
    });
    return;
  }

  const meta = {
    el,
    routeName,
    ownerState: state
  };
  const targetBinding = resolveRequestBinding(
    targetAttr,
    pathAttr,
    stateAttr,
    state,
    context,
    VD.TARGET,
    {
      ...meta,
      directive: VD.TARGET
    }
  );
  if (!targetBinding) return;
  if (!validateRequestBindingAccess(targetBinding, state, context, {
    ...meta,
    directive: VD.TARGET
  })) return;

  const autoLoadingBinding = !loadingAttr && requestStateEnabled
    ? createAutoStatusBinding(targetBinding, "loading")
    : null;
  const autoErrorBinding = !errorAttr && requestStateEnabled
    ? createAutoStatusBinding(targetBinding, "error")
    : null;

  const loadingBinding = autoLoadingBinding || resolveRequestBinding(
    targetAttr,
    pathAttr,
    loadingAttr,
    state,
    context,
    VD.LOADING,
    {
      ...meta,
      directive: VD.LOADING
    }
  );
  if (!loadingBinding) return;
  if (!validateRequestBindingAccess(loadingBinding, state, context, {
    ...meta,
    directive: VD.LOADING
  })) return;

  const errorBinding = autoErrorBinding || resolveRequestBinding(
    targetAttr,
    pathAttr,
    errorAttr,
    state,
    context,
    VD.ERROR,
    {
      ...meta,
      directive: VD.ERROR
    }
  );
  if (!errorBinding) return;
  if (!validateRequestBindingAccess(errorBinding, state, context, {
    ...meta,
    directive: VD.ERROR
  })) return;

  const activeRequest = beginRequest(el, targetBinding, routeName);

  if (errorBinding.path) {
    writeValue(errorBinding.path, errorBinding.state, "");
  }

  if (loadingBinding.path) {
    writeValue(loadingBinding.path, loadingBinding.state, true);
  }

  try {
    const routeConfig = resolveRouteConfig(routeName, state, el);

    if (!routeConfig) {
      return;
    }

    const session = await authorizeRouteRequest(
      routeConfig,
      {
        signal: activeRequest.controller.signal,
        state,
        el
      }
    );
    const requestContext = {
      routeName,
      el,
      state,
      session,
      signal: activeRequest.controller.signal
    };
    const execution = await executeRequestMiddleware({
      middleware: routeConfig.middleware,
      params,
      context: requestContext,
      handler: finalParams => callApiRoute(
        routeConfig,
        finalParams,
        requestContext
      )
    });
    const finalParams = execution.params;
    const result = execution.result;

    if (!isLatestRequest(el, activeRequest)) {
      return;
    }

    if (targetBinding.path) {
      writeValue(targetBinding.path, targetBinding.state, result);
    }

    state.emit?.(VD_REQUEST.EVENTS.SUCCESS, {
      route: routeName,
      params: finalParams,
      result,
      element: el
    });
  } catch (err) {
    if (!isLatestRequest(el, activeRequest) || err?.name === "AbortError") {
      return;
    }

    const message = err?.message || "Request failed";

    if (errorBinding.path) {
      writeValue(errorBinding.path, errorBinding.state, message);
    }

    const reported = reportUserActionError(err, {
      title: getRequestErrorTitle(err),
      directive: VD.REQUEST,
      expression: routeName,
      file: "src/core/requests/request-router.js",
      line: 177,
      el,
      hint: err?.__vdHint || "Verify the route config, auth mode, application middleware, and request params."
    });

    state.emit?.(VD_REQUEST.EVENTS.ERROR, {
      route: routeName,
      error: err,
      message: reported.message,
      stage: err?.__vdStage || VD_REQUEST.STAGES.REQUEST,
      element: el
    });
  } finally {
    if (isLatestRequest(el, activeRequest) && loadingBinding.path) {
      writeValue(loadingBinding.path, loadingBinding.state, false);
    }

    finishRequest(el, activeRequest);
  }
}

function getRequestParams(el, state, context, paramsInput, event, evaluate) {
  const form = getRequestForm(el);
  const formParams = form
    ? readFormValues(form)
    : {};

  if (!paramsInput) {
    return formParams;
  }

  const evaluated = typeof paramsInput === "string"
    ? evaluate(paramsInput, state, event, el, context.props, {
      directive: VD.PARAMS
    })
    : paramsInput;

  if (!evaluated || typeof evaluated !== "object" || Array.isArray(evaluated)) {
    return VD_INTERNAL.REQUEST_ABORT;
  }

  return {
    ...formParams,
    ...evaluated
  };
}

function getRequestConfig(el, state, context, event, evaluate, routeName) {
  const expression = (el.getAttribute(VD.REQUEST_CONFIG) || "").trim();

  if (!expression) {
    return {};
  }

  const evaluated = evaluate(expression, state, event, el, context.props, {
    directive: VD.REQUEST_CONFIG
  });

  if (!isPlainObject(evaluated)) {
    reportRequestDirectiveProblem(state, el, routeName, "data-vd-request-config must return an object", {
      title: "Invalid Request Config",
      directive: VD.REQUEST_CONFIG,
      expression,
      line: 137,
      hint: "Use object syntax. Example: { params: { id: 1 }, target: 'home', state: 'posts' }"
    });

    return VD_INTERNAL.REQUEST_ABORT;
  }

  if (evaluated.params !== undefined && !isPlainObject(evaluated.params)) {
    reportRequestDirectiveProblem(state, el, routeName, "request config params must be an object", {
      title: "Invalid Request Config Params",
      directive: VD.REQUEST_CONFIG,
      expression,
      line: 149,
      hint: "Set params to an object. Example: { params: { id: 1 } }"
    });

    return VD_INTERNAL.REQUEST_ABORT;
  }

  const textKeys = ["target", "path", "state", "loading", "error"];

  for (const key of textKeys) {
    if (evaluated[key] !== undefined && typeof evaluated[key] !== "string") {
      reportRequestDirectiveProblem(state, el, routeName, `request config "${key}" must be a string`, {
        title: "Invalid Request Config Value",
        directive: VD.REQUEST_CONFIG,
        expression,
        hint: `Set ${key} to a string. Example: { ${key}: "result" }`
      });

      return VD_INTERNAL.REQUEST_ABORT;
    }
  }

  for (const key of ["autoState", "requestState"]) {
    if (evaluated[key] !== undefined && typeof evaluated[key] !== "boolean") {
      reportRequestDirectiveProblem(state, el, routeName, `request config "${key}" must be boolean`, {
        title: "Invalid Request Config Value",
        directive: VD.REQUEST_CONFIG,
        expression,
        hint: `Set ${key} to true or false.`
      });

      return VD_INTERNAL.REQUEST_ABORT;
    }
  }

  return evaluated;
}

function getRequestParamsInput(el, requestConfig) {
  if (el.hasAttribute(VD.PARAMS)) {
    return (el.getAttribute(VD.PARAMS) || "").trim();
  }

  return requestConfig?.params;
}

function hasRequestStateAutomation(el, requestConfig) {
  return el.hasAttribute(VD.REQUEST_STATE)
    || requestConfig?.autoState === true
    || requestConfig?.requestState === true;
}

function getRequestConfigText(el, requestConfig, key, attributeName) {
  if (el.hasAttribute(attributeName)) {
    return (el.getAttribute(attributeName) || "").trim();
  }

  const value = requestConfig?.[key];

  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function readFormValues(form) {
  const formData = new FormData(form);
  const values = {};

  [...formData.entries()].forEach(([key, value]) => {
    if (key in values) {
      if (Array.isArray(values[key])) {
        values[key].push(value);
      } else {
        values[key] = [values[key], value];
      }

      return;
    }

    values[key] = value;
  });

  return values;
}

function getRequestForm(el) {
  if (el.tagName === "FORM") {
    return el;
  }

  if (el.form) {
    return el.form;
  }

  return el.closest("form");
}

function beginRequest(el, targetBinding, routeName) {
  const previousElementRequest = activeRequests.get(el);
  previousElementRequest?.controller.abort();

  const controller = new AbortController();
  const request = {
    controller,
    routeName,
    targetState: targetBinding.state,
    targetPath: targetBinding.path
  };

  activeRequests.set(el, request);

  if (request.targetState && request.targetPath) {
    const targetRequests = getTargetRequestMap(request.targetState);
    const previousTargetRequest = targetRequests.get(request.targetPath);

    if (previousTargetRequest && previousTargetRequest !== previousElementRequest) {
      previousTargetRequest.controller.abort();
    }

    targetRequests.set(request.targetPath, request);
  }

  return request;
}

function cancelElementRequest(el) {
  const request = activeRequests.get(el);

  if (!request) return;

  request.controller.abort();
  finishRequest(el, request);
}

function finishRequest(el, request) {
  if (activeRequests.get(el) === request) {
    activeRequests.delete(el);
  }

  if (!request.targetState || !request.targetPath) return;

  const targetRequests = activeTargetRequests.get(request.targetState);

  if (targetRequests?.get(request.targetPath) === request) {
    targetRequests.delete(request.targetPath);
  }
}

function isLatestRequest(el, request) {
  if (activeRequests.get(el) !== request) {
    return false;
  }

  if (!request.targetState || !request.targetPath) {
    return true;
  }

  return activeTargetRequests
    .get(request.targetState)
    ?.get(request.targetPath) === request;
}

function getTargetRequestMap(state) {
  let requests = activeTargetRequests.get(state);

  if (!requests) {
    requests = new Map();
    activeTargetRequests.set(state, requests);
  }

  return requests;
}

function resolveRequestBinding(targetAttr, pathAttr, valueAttr, currentState, context, directive, meta = {}) {
  const rawTarget = String(targetAttr || "").trim();
  const rawPath = String(pathAttr || "").trim();
  const rawValue = String(valueAttr || "").trim();

  if (rawPath && !sanitizeRequestPagePath(rawPath)) {
    return reportRequestDirectiveProblem(meta.ownerState, meta.el, meta.routeName, `Invalid page path "${rawPath}"`, {
      title: "Invalid Request Page Path",
      directive: VD.PATH,
      expression: rawPath,
      line: 277,
      hint: "Use a clean folder path like posts or admin/posts without '..'."
    });
  }

  if (rawPath && !rawTarget) {
    return reportRequestDirectiveProblem(meta.ownerState, meta.el, meta.routeName, "data-vd-path requires data-vd-target", {
      title: "Incomplete Request Target",
      directive: VD.PATH,
      expression: rawPath,
      line: 286,
      hint: "Add data-vd-target with the page name. Example: data-vd-path=\"posts\" data-vd-target=\"create-post\"."
    });
  }

  if (rawPath && rawTarget.includes(".")) {
    return reportRequestDirectiveProblem(meta.ownerState, meta.el, meta.routeName, "Do not combine data-vd-path with dot notation target", {
      title: "Conflicting Request Target Syntax",
      directive: VD.TARGET,
      expression: rawTarget,
      line: 295,
      hint: "Use either data-vd-target=\"home.posts\" or data-vd-path=\"posts\" + data-vd-target=\"create-post\"."
    });
  }

  const pageName = resolveRequestPageName(rawTarget, rawPath, rawValue, directive);

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
      return reportRequestDirectiveProblem(meta.ownerState, meta.el, meta.routeName, "Request result target is missing", {
        title: "Missing Request Target",
        directive: VD.TARGET,
        line: 320,
        hint: "Set data-vd-target to a state path or page name."
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
      return reportRequestDirectiveProblem(meta.ownerState, meta.el, meta.routeName, "Cross-page request target requires data-vd-state", {
        title: "Missing Cross-page State Name",
        directive: VD.STATE,
        expression: rawTarget,
        line: 333,
        hint: "Example: data-vd-target=\"home\" data-vd-state=\"posts\"."
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
    return reportRequestDirectiveProblem(meta.ownerState, meta.el, meta.routeName, `Target page "${pageName}" does not exist`, {
      title: "Unknown Request Target Page",
      directive: rawPath ? VD.PATH : VD.TARGET,
      expression: pageName,
      line: 355,
      hint: "Register the target page through the configured resource adapter."
    });
  }

  if (pageName && rawValue.includes(".")) {
    return reportRequestDirectiveProblem(meta.ownerState, meta.el, meta.routeName, "Do not combine cross-page target with dot notation state path", {
      title: "Conflicting Request State Syntax",
      directive,
      expression: rawValue,
      line: 365,
      hint: "Use data-vd-state=\"result\" for cross-page targets, or use a full dot path alone like home.result."
    });
  }

  if (pageName && !rawValue.includes(".")) {
    const pageState = getTargetPageState(pageName, currentState, context);

    return {
      state: pageState,
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

function resolveRequestPageName(targetAttr, pathAttr, valueAttr, directive) {
  const target = String(targetAttr || "").trim();
  const path = sanitizeRequestPagePath(pathAttr);
  const hasStateName = Boolean(String(valueAttr || "").trim());

  if (path) {
    return target.includes("/")
      ? sanitizeRequestPagePath(target)
      : joinRequestPagePath(path, target);
  }

  if (target.includes("/")) {
    return sanitizeRequestPagePath(target);
  }

  if (directive !== VD.TARGET && target && !target.includes(".")) {
    return sanitizeRequestPagePath(target);
  }

  if (directive === VD.TARGET && hasStateName && target && !target.includes(".")) {
    return sanitizeRequestPagePath(target);
  }

  return "";
}

function joinRequestPagePath(path, page) {
  const pageName = sanitizeRequestPagePath(page);

  if (!path) return pageName;
  if (!pageName) return path;

  return `${path}/${pageName}`;
}

function sanitizeRequestPagePath(path) {
  const value = String(path || "").trim();

  if (!value) return "";
  if (value.includes("..")) return "";

  return value
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
}

function resolveAbsoluteBinding(binding, currentState, context, meta = {}) {
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
    return reportRequestDirectiveProblem(meta.ownerState, meta.el, meta.routeName, `Target page "${pageName}" does not exist`, {
      title: "Unknown Request Target Page",
      directive: meta.directive || VD.TARGET,
      expression: binding,
      line: 479,
      hint: "Use an existing page name like home or a valid page path like posts/create-post."
    });
  }

  const pageState = getTargetPageState(pageName, currentState, context);

  return {
    state: pageState,
    path: parts.slice(1).join("."),
    pageName
  };
}

function getTargetPageState(pageName, currentState, context) {
  const normalized = String(pageName || "").trim();

  if (!normalized) {
    return currentState;
  }

  if (normalized === context.page) {
    return currentState;
  }

  return context.getPageState?.(normalized) || currentState;
}

function createAutoStatusBinding(targetBinding, kind) {
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

function deriveRequestStatusPath(targetPath, kind) {
  const segments = String(targetPath || "")
    .split(".")
    .filter(Boolean);

  if (segments.length === 0) {
    return "";
  }

  const suffix = kind === "loading"
    ? "Loading"
    : "Error";
  const last = segments.pop();
  const base = last.endsWith("Result")
    ? last.slice(0, -6)
    : last;

  segments.push(`${base}${suffix}`);

  return segments.join(".");
}

function validateRequestBindingAccess(binding, currentState, context, meta = {}) {
  if (!binding?.path) {
    return true;
  }

  const protectedKey = findProtectedStatePathKey(binding.path);

  if (protectedKey) {
    const targetPage = binding.pageName || binding.state?.__vdPageName || "";

    return reportRequestDirectiveProblem(meta.ownerState, meta.el, meta.routeName, `Writes to protected state key "${protectedKey}" are not allowed`, {
      title: "Protected Request State Path",
      directive: meta.directive || VD.TARGET,
      expression: targetPage
        ? `${targetPage}.${binding.path}`
        : binding.path,
      hint: "Use normal application state keys. Prototype and framework-owned keys cannot be targeted."
    });
  }

  const targetPage = binding.pageName || binding.state?.__vdPageName || "";
  const currentPage = context.page || currentState.__vdPageName || "";

  if (!targetPage || targetPage === currentPage) {
    return true;
  }

  const topLevelKey = String(binding.path)
    .split(".")
    .filter(Boolean)[0];

  if (!topLevelKey) {
    return true;
  }

  const allowList = binding.state?.$allowExternalWrite;

  if (allowList === undefined) {
    return reportRequestDirectiveProblem(meta.ownerState, meta.el, meta.routeName, `Page "${targetPage}" does not allow external state writes`, {
      title: "External Page Write Not Allowed",
      directive: meta.directive || VD.TARGET,
      expression: `${targetPage}.${binding.path}`,
      line: 581,
      hint: `Allow it in ${targetPage}/page.config.js with export default { allowExternalWrite: ["${topLevelKey}"] }.`
    });
  }

  if (!Array.isArray(allowList)) {
    return reportRequestDirectiveProblem(meta.ownerState, meta.el, meta.routeName, `Page "${targetPage}" has an invalid external write allowlist`, {
      title: "Invalid External Write Allowlist",
      directive: meta.directive || VD.TARGET,
      expression: `${targetPage}.allowExternalWrite`,
      line: 591,
      hint: "Set allowExternalWrite in page.config.js to an array of top-level state keys."
    });
  }

  if (!allowList.includes(topLevelKey)) {
    return reportRequestDirectiveProblem(meta.ownerState, meta.el, meta.routeName, `Page "${targetPage}" does not expose "${topLevelKey}" for external writes`, {
      title: "External Page State Blocked",
      directive: meta.directive || VD.TARGET,
      expression: `${targetPage}.${binding.path}`,
      line: 601,
      hint: `Add "${topLevelKey}" to allowExternalWrite in ${targetPage}/page.config.js.`
    });
  }

  return true;
}

function findProtectedStatePathKey(path) {
  return String(path || "")
    .split(/[.[\]]+/)
    .filter(Boolean)
    .find(key => key.startsWith("__vd") || VD_PROTECTED_STATE_KEYS.includes(key))
    || "";
}

function resolveRouteConfig(routeName, state, el) {
  const raw = apiRoutes?.[routeName];

  if (typeof raw === "function") {
    return {
      name: routeName,
      handler: raw,
      auth: normalizeRequestAuthConfig(false, authRuntime),
      roles: [],
      middleware: []
    };
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    reportRequestDirectiveProblem(state, el, routeName, `Route "${routeName}" has an invalid config`, {
      title: "Invalid Route Config",
      directive: VD.REQUEST,
      expression: routeName,
      line: 527,
      hint: "Route entries must be a function or an object like { handler, auth, roles, middleware }."
    });
    return null;
  }

  if (typeof raw.handler !== "function") {
    reportRequestDirectiveProblem(state, el, routeName, `Route "${routeName}" is missing a valid handler`, {
      title: "Missing Route Handler",
      directive: VD.REQUEST,
      expression: routeName,
      line: 538,
      hint: "Set handler to a function in the route registry passed to createApp()."
    });
    return null;
  }

  const auth = normalizeRouteAuth(raw.auth, routeName, state, el);
  if (!auth) return null;

  const roles = normalizeRouteRoles(raw.roles, routeName, state, el);
  if (!roles) return null;

  const middleware = normalizeRouteMiddleware(raw.middleware, routeName, state, el);
  if (!middleware) return null;

  return {
    name: routeName,
    handler: raw.handler,
    auth: roles.length > 0 && !auth.enabled
      ? normalizeRequestAuthConfig(true)
      : auth,
    roles,
    middleware
  };
}

function normalizeRouteAuth(value, routeName, state, el) {
  const auth = normalizeRequestAuthConfig(value, authRuntime);

  if (auth) {
    return auth;
  }

  reportRequestDirectiveProblem(state, el, routeName, `Route "${routeName}" has an invalid auth config`, {
    title: "Invalid Route Auth Config",
    directive: VD.REQUEST,
    expression: routeName,
    line: 580,
    hint: `Use auth: true for the default provider or a registered provider name. Default session URL: "${getDefaultAuthSessionUrl()}".`
  });

  return null;
}

function normalizeRouteRoles(value, routeName, state, el) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    reportRequestDirectiveProblem(state, el, routeName, `Route "${routeName}" roles must be an array`, {
      title: "Invalid Route Roles",
      directive: VD.REQUEST,
      expression: routeName,
      line: 598,
      hint: "Use roles: [\"admin\", \"editor\"]."
    });
    return null;
  }

  const roles = value
    .map(role => String(role || "").trim())
    .filter(Boolean);

  if (roles.length !== value.length) {
    reportRequestDirectiveProblem(state, el, routeName, `Route "${routeName}" contains an empty role name`, {
      title: "Invalid Route Roles",
      directive: VD.REQUEST,
      expression: routeName,
      line: 610,
      hint: "Each role must be a non-empty string."
    });
    return null;
  }

  return roles;
}

function normalizeRouteMiddleware(value, routeName, state, el) {
  if (value === undefined) {
    return [];
  }

  const resolved = resolveRequestMiddleware(value, {
    custom: appRequestMiddleware
  });

  if (resolved.value) {
    return resolved.value;
  }

  reportRequestDirectiveProblem(state, el, routeName, `Route "${routeName}" has invalid middleware`, {
    title: "Invalid Route Middleware",
    directive: VD.REQUEST,
    expression: routeName,
    line: 630,
    hint: resolved.available?.length
      ? `Use application middleware names like: ${resolved.available.join(", ")}.`
      : "Use middleware as an array of names or functions."
  });

  return null;
}

async function authorizeRouteRequest(routeConfig, context) {
  if (!routeConfig.auth.enabled) {
    return null;
  }

  const session = await resolveRequestSession(routeConfig.auth, {
    runtime: authRuntime,
    signal: context.signal,
    routeName: routeConfig.name,
    state: context.state,
    el: context.el
  });

  if (!session || session.authenticated === false) {
    throw createStageError(
      VD_REQUEST.STAGES.AUTH,
      "Authentication required",
      `Auth provider "${routeConfig.auth.provider}" did not return an authenticated session.`
    );
  }

  if (routeConfig.roles.length > 0) {
    const hasRole = routeConfig.roles.some(role => session.roles.includes(role));

    if (!hasRole) {
      throw createStageError(
        VD_REQUEST.STAGES.AUTH,
        `Access denied. Required roles: ${routeConfig.roles.join(", ")}`,
        `Update the roles returned by auth provider "${routeConfig.auth.provider}".`
      );
    }
  }

  return session;
}

function reportRequestDirectiveProblem(state, el, routeName, error, options = {}) {
  const problem = error instanceof Error
    ? error
    : new Error(String(error || "Invalid request configuration"));

  if (!(error instanceof Error)) {
    Error.captureStackTrace?.(problem, reportRequestDirectiveProblem);
  }

  const reported = reportUserActionError(problem, {
    title: options.title || "Invalid Request Configuration",
    directive: options.directive || VD.REQUEST,
    expression: options.expression || routeName,
    file: "src/core/requests/request-router.js",
    line: options.line || 48,
    el,
    hint: options.hint || "Check request route, target page, and state bindings."
  });

  state?.emit?.(VD_REQUEST.EVENTS.ERROR, {
    route: routeName,
    error: problem,
    message: reported.message,
    stage: options.stage || VD_REQUEST.STAGES.CONFIG,
    code: options.code || VD_REQUEST.CODES.INVALID_CONFIG,
    binding: options.directive || VD.REQUEST,
    element: el
  });

  return null;
}

function createStageError(stage, message, hint = "") {
  const error = new Error(message);

  error.__vdStage = stage;
  error.__vdHint = hint;

  return error;
}

function getRequestErrorTitle(error) {
  if (error?.__vdStage === VD_REQUEST.STAGES.AUTH) {
    return "Request Authorization Failed";
  }

  if (error?.__vdStage === VD_REQUEST.STAGES.MIDDLEWARE) {
    return "Request Middleware Failed";
  }

  return "API Request Failed";
}

function isPlainObject(value) {
  if (!value || Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function hasApiRoute(name) {
  return Object.hasOwn(apiRoutes, name);
}

function listApiRoutes() {
  return Object.keys(apiRoutes || {});
}

function callApiRoute(routeConfig, params = {}, context = {}) {
  return routeConfig.handler(params, context);
}
