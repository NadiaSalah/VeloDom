/**
 * ----------------------------------------
 * Module: Declarative Request Runtime
 * ----------------------------------------
 *
 * Binds request directives to application route handlers, auth providers,
 * middleware, state destinations, status fields, events, and cancellation.
 * ----------------------------------------
 */

import {
  VD,
  VD_INTERNAL,
  VD_REQUEST
} from "../constants.ts";
import { reportUserActionError } from "../errors/error-reporter.ts";
import { isPlainObject } from "../shared/object.ts";
import {
  createAuthRuntime,
  getDefaultAuthSessionUrl,
  normalizeRequestAuthConfig,
  resolveRequestSession
} from "./auth.ts";
import {
  executeRequestMiddleware,
  resolveRequestMiddleware
} from "./middleware-engine.ts";
import {
  createAutoStatusBinding,
  resolveRequestBinding,
  validateRequestBindingAccess
} from "./request-bindings.ts";
import type {
  ErrorReportOptions
} from "../errors/error-reporter.ts";
import type {
  RequestContext,
  RequestHookOptions
} from "../types.ts";
import type {
  DirectiveCleanup,
  DirectiveRoot,
  DirectiveRuntimeContext,
  DirectiveState
} from "../directives/runtime.ts";

interface RequestProblemOptions extends ErrorReportOptions {
  stage?: string;
  code?: string;
}

interface RequestRuntimeOptions {
  routes?: unknown;
  middleware?: unknown;
  auth?: unknown;
  hooks?: unknown;
}

interface RequestRetryRuntimeOptions {
  delayMs: number;
  retries: number;
}

interface RequestDirectiveState extends DirectiveState {
  emit?: (eventName: string, payload: unknown) => unknown;
}

interface RequestDirectiveHelpers {
  findAll(root: DirectiveRoot, name: string): Element[];
  isInsideForTemplate(el: Element): boolean;
  evaluate(
    expression: string,
    state: RequestDirectiveState,
    event?: Event | null,
    el?: Element | null,
    props?: Record<string, unknown>,
    meta?: {
      directive?: string;
    }
  ): unknown;
  writeValue(
    path: unknown,
    state: RequestDirectiveState,
    value: unknown
  ): void;
}

const activeRequests = new WeakMap();
const activeTargetRequests = new WeakMap();
const pendingRequestTimers = new WeakMap();
const requestThrottleWindows = new WeakMap();
let apiRoutes = Object.create(null);
let appRequestMiddleware = Object.create(null);
let requestHooks: RequestHookOptions = {};
let authRuntime = createAuthRuntime();

/** Replaces the application-owned request routes, middleware, and auth config. */
export function configureRequestRuntime({
  routes = {},
  middleware = {},
  auth = {},
  hooks = {}
}: RequestRuntimeOptions = {}) {
  if (!isPlainObject(routes)) {
    throw new TypeError("VeloDom routes must be a plain object");
  }

  if (!isPlainObject(middleware)) {
    throw new TypeError("VeloDom middleware must be a plain object");
  }

  apiRoutes = Object.assign(Object.create(null), routes);
  appRequestMiddleware = Object.assign(Object.create(null), middleware);
  requestHooks = normalizeRequestHooks(hooks);
  authRuntime = createAuthRuntime(auth);
}

/** Attaches request click/submit listeners beneath a directive root. */
export function applyRequests(
  root: DirectiveRoot,
  state: RequestDirectiveState,
  cleanups: DirectiveCleanup[],
  context: DirectiveRuntimeContext,
  helpers: RequestDirectiveHelpers
) {
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

      const handler = (event) => {
        event.preventDefault();

        scheduleRequestDirective(
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
        cancelPendingRequest(el);
        clearRequestThrottle(el);
        cancelElementRequest(el);
      });

    });
}

function scheduleRequestDirective(el, state, context, event, evaluate, writeValue) {
  const routeName = (el.getAttribute(VD.REQUEST) || "").trim();

  if (!routeName || !hasApiRoute(routeName)) {
    void runRequestDirective(
      el,
      state,
      context,
      event,
      evaluate,
      writeValue
    );
    return;
  }

  const requestConfig = getRequestConfig(
    el,
    state,
    context,
    event,
    evaluate,
    routeName
  );

  if (requestConfig === VD_INTERNAL.REQUEST_ABORT) {
    return;
  }

  const throttleMs = getRequestThrottleMs(
    el,
    requestConfig,
    state,
    context,
    event,
    evaluate,
    routeName
  );

  if (throttleMs === VD_INTERNAL.REQUEST_ABORT) {
    return;
  }

  const debounceMs = getRequestDebounceMs(
    el,
    requestConfig,
    state,
    context,
    event,
    evaluate,
    routeName
  );

  if (debounceMs === VD_INTERNAL.REQUEST_ABORT) {
    return;
  }

  const delayMs = Number(debounceMs);
  const requestTask = () => {
    if (!consumeRequestThrottle(el, Number(throttleMs))) return;

    void runRequestDirective(
      el,
      state,
      context,
      event,
      evaluate,
      writeValue
    );
  };

  cancelPendingRequest(el);

  if (delayMs <= 0) {
    requestTask();
    return;
  }

  const pending = {
    timer: setTimeout(() => {
      if (pendingRequestTimers.get(el) !== pending) return;

      pendingRequestTimers.delete(el);
      requestTask();
    }, delayMs)
  };

  pendingRequestTimers.set(el, pending);
}

async function runRequestDirective(el, state, context, event, evaluate, writeValue) {
  const routeName = (el.getAttribute(VD.REQUEST) || "").trim();

  if (!routeName) {
    reportRequestDirectiveProblem(state, el, routeName, "Missing request route name", {
      title: "Missing Request Route",
      directive: VD.REQUEST,
      line: 48,
      hint: "Set vd-request to a valid route such as posts.getOne."
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
  const retryOptions = getRequestRetryOptions(requestConfig);
  let authRedirectTarget = "";
  let afterPayload = null;
  const params = getRequestParams(
    el,
    state,
    context,
    paramsInput,
    event,
    evaluate
  );

  if (params === VD_INTERNAL.REQUEST_ABORT) {
    reportRequestDirectiveProblem(state, el, routeName, "vd-params must return an object", {
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
    ownerState: state,
    report: reportRequestDirectiveProblem
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
  const statusTargetAttr = targetBinding.state === state
    ? ""
    : targetAttr;
  const statusPathAttr = targetBinding.state === state
    ? ""
    : pathAttr;

  const loadingBinding = autoLoadingBinding || resolveRequestBinding(
    statusTargetAttr,
    statusPathAttr,
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
    statusTargetAttr,
    statusPathAttr,
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

    authRedirectTarget = getAuthRedirectTarget(
      requestConfig,
      routeConfig
    );
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
      signal: activeRequest.controller.signal,
      navigate: context.navigate || undefined
    };
    const beforePayload = createRequestLifecyclePayload(
      routeName,
      params,
      state,
      el,
      session,
      activeRequest.controller.signal
    );

    afterPayload = beforePayload;

    const beforeAllowed = runBeforeRequestHook(beforePayload);
    const requestAllowed = beforeAllowed instanceof Promise
      ? await beforeAllowed
      : beforeAllowed;

    if (!requestAllowed) {
      await runAfterRequestHook({
        ...beforePayload,
        ok: false,
        stage: VD_REQUEST.STAGES.REQUEST
      });
      return;
    }

    const execution = await executeRequestWithRetry({
      routeConfig,
      params,
      requestContext,
      retryOptions
    });
    const finalParams = execution.params;
    const result = execution.result;
    const successPayload = {
      ...beforePayload,
      params: finalParams,
      result,
      ok: true,
      stage: VD_REQUEST.STAGES.REQUEST
    };

    if (!isLatestRequest(el, activeRequest)) {
      return;
    }

    if (targetBinding.path) {
      writeValue(targetBinding.path, targetBinding.state, result);
    }

    await runRequestSuccessCallback(requestConfig, successPayload);

    state.emit?.(VD_REQUEST.EVENTS.SUCCESS, {
      route: routeName,
      params: finalParams,
      result,
      element: el
    });
    await runAfterRequestHook(successPayload);
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
      file: "src/core/requests/request-router.ts",
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

    if (shouldRedirectAuthFailure(err, authRedirectTarget, context)) {
      await context.navigate?.(authRedirectTarget);
    }

    await runAfterRequestHook({
      ...afterPayload,
      route: routeName,
      routeName,
      params,
      state,
      element: el,
      signal: activeRequest.controller.signal,
      error: err,
      ok: false,
      stage: err?.__vdStage || VD_REQUEST.STAGES.REQUEST
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
    reportRequestDirectiveProblem(state, el, routeName, "vd-request-config must return an object", {
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

  const textKeys = [
    "target",
    "path",
    "state",
    "loading",
    "error",
    ...VD_REQUEST.AUTH_REDIRECT_KEYS
  ];

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

  for (const key of VD_REQUEST.AUTH_REDIRECT_KEYS) {
    if (
      evaluated[key] !== undefined
      && normalizeAuthRedirectPath(evaluated[key]) === null
    ) {
      reportRequestDirectiveProblem(state, el, routeName, `request config "${key}" must be an application path`, {
        title: "Invalid Request Auth Redirect",
        directive: VD.REQUEST_CONFIG,
        expression,
        hint: `Set ${key} to an application path such as "/login".`
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

  if (
    evaluated.onSuccess !== undefined
    && typeof evaluated.onSuccess !== "function"
  ) {
    reportRequestDirectiveProblem(state, el, routeName, "request config \"onSuccess\" must be a function", {
      title: "Invalid Request Success Callback",
      directive: VD.REQUEST_CONFIG,
      expression,
      hint: "Set onSuccess to a page or component function. Example: { onSuccess: handleSaved }"
    });

    return VD_INTERNAL.REQUEST_ABORT;
  }

  for (const key of [
    ...VD_REQUEST.DEBOUNCE_KEYS,
    ...VD_REQUEST.THROTTLE_KEYS
  ]) {
    if (
      evaluated[key] !== undefined
      && !isValidRequestDelay(evaluated[key])
    ) {
      reportRequestDirectiveProblem(state, el, routeName, `request config "${key}" must be a non-negative number`, {
        title: "Invalid Request Config Value",
        directive: VD.REQUEST_CONFIG,
        expression,
        hint: `Set ${key} to a non-negative number of milliseconds. Example: { ${key}: 300 }`
      });

      return VD_INTERNAL.REQUEST_ABORT;
    }
  }

  for (const key of VD_REQUEST.RETRY_KEYS) {
    if (
      evaluated[key] !== undefined
      && !isValidRequestRetryCount(evaluated[key])
    ) {
      reportRequestDirectiveProblem(state, el, routeName, `request config "${key}" must be a non-negative integer or boolean`, {
        title: "Invalid Request Config Value",
        directive: VD.REQUEST_CONFIG,
        expression,
        hint: `Set ${key} to true, false, or a non-negative retry count. Example: { ${key}: 2 }`
      });

      return VD_INTERNAL.REQUEST_ABORT;
    }
  }

  for (const key of VD_REQUEST.RETRY_DELAY_KEYS) {
    if (
      evaluated[key] !== undefined
      && !isValidRequestDelay(evaluated[key])
    ) {
      reportRequestDirectiveProblem(state, el, routeName, `request config "${key}" must be a non-negative number`, {
        title: "Invalid Request Config Value",
        directive: VD.REQUEST_CONFIG,
        expression,
        hint: `Set ${key} to a non-negative number of milliseconds. Example: { ${key}: 100 }`
      });

      return VD_INTERNAL.REQUEST_ABORT;
    }
  }

  return evaluated;
}

function normalizeRequestHooks(value) {
  if (value === undefined || value === null) return {};

  if (!isPlainObject(value)) {
    throw new TypeError("VeloDom request hooks must be a plain object");
  }

  for (const key of ["beforeRequest", "afterRequest"]) {
    if (value[key] !== undefined && typeof value[key] !== "function") {
      throw new TypeError(`VeloDom request hook "${key}" must be a function`);
    }
  }

  const hooks: RequestHookOptions = {};

  if (typeof value.beforeRequest === "function") {
    hooks.beforeRequest = value.beforeRequest as RequestHookOptions["beforeRequest"];
  }

  if (typeof value.afterRequest === "function") {
    hooks.afterRequest = value.afterRequest as RequestHookOptions["afterRequest"];
  }

  return hooks;
}

function createRequestLifecyclePayload(
  routeName,
  params,
  state,
  el,
  session,
  signal
) {
  return {
    route: routeName,
    routeName,
    params,
    state,
    element: el,
    session,
    signal
  };
}

function runBeforeRequestHook(payload) {
  if (typeof requestHooks.beforeRequest !== "function") return true;

  const result = requestHooks.beforeRequest(payload);

  if (result instanceof Promise) {
    return result.then(value => value !== false);
  }

  return result !== false;
}

async function runAfterRequestHook(payload) {
  if (typeof requestHooks.afterRequest !== "function") return;

  await requestHooks.afterRequest(payload);
}

async function runRequestSuccessCallback(requestConfig, payload) {
  if (typeof requestConfig?.onSuccess !== "function") return;

  await requestConfig.onSuccess(payload);
}

async function executeRequestWithRetry({
  routeConfig,
  params,
  requestContext,
  retryOptions
}) {
  let failures = 0;

  for (;;) {
    try {
      return await executeRequestMiddleware({
        middleware: routeConfig.middleware,
        params,
        context: requestContext,
        handler: finalParams => callApiRoute(
          routeConfig,
          finalParams,
          requestContext
        )
      });
    } catch (error) {
      if (
        failures >= retryOptions.retries
        || requestContext.signal?.aborted
        || error?.name === "AbortError"
      ) {
        throw error;
      }

      failures += 1;

      if (retryOptions.delayMs > 0) {
        await waitForRetryDelay(retryOptions.delayMs, requestContext.signal);
      }
    }
  }
}

function getRequestRetryOptions(
  requestConfig
): RequestRetryRuntimeOptions {
  const retryKey = VD_REQUEST.RETRY_KEYS.find(name => (
    requestConfig?.[name] !== undefined
  ));
  const delayKey = VD_REQUEST.RETRY_DELAY_KEYS.find(name => (
    requestConfig?.[name] !== undefined
  ));

  return {
    retries: retryKey
      ? normalizeRequestRetryCount(requestConfig[retryKey])
      : 0,
    delayMs: delayKey
      ? Number(requestConfig[delayKey])
      : 0
  };
}

function getAuthRedirectTarget(requestConfig, routeConfig) {
  const requestKey = VD_REQUEST.AUTH_REDIRECT_KEYS.find(name => (
    requestConfig?.[name] !== undefined
  ));

  if (requestKey) {
    return normalizeAuthRedirectPath(requestConfig[requestKey]) || "";
  }

  return routeConfig.authRedirect || "";
}

function normalizeAuthRedirectPath(value) {
  if (value === undefined || value === null || value === "") return "";

  const path = String(value).trim();

  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return null;
  }

  return path;
}

function shouldRedirectAuthFailure(err, target, context) {
  return (
    err?.__vdStage === VD_REQUEST.STAGES.AUTH
    && Boolean(target)
    && typeof context.navigate === "function"
  );
}

function getRequestThrottleMs(
  el,
  requestConfig,
  state,
  context,
  event,
  evaluate,
  routeName
) {
  if (el.hasAttribute(VD.THROTTLE)) {
    const expression = (el.getAttribute(VD.THROTTLE) || "").trim();
    const evaluated = expression
      ? evaluate(expression, state, event, el, context.props, {
        directive: VD.THROTTLE
      })
      : 0;

    return normalizeRequestDelay(evaluated, {
      state,
      el,
      routeName,
      directive: VD.THROTTLE,
      expression,
      message: "Request throttle must be a non-negative number",
      title: "Invalid Request Throttle",
      hint: "Set vd-throttle to a non-negative millisecond expression. Example: vd-throttle=\"1000\"."
    });
  }

  const key = VD_REQUEST.THROTTLE_KEYS.find(name => (
    requestConfig?.[name] !== undefined
  ));

  if (!key) return 0;

  return normalizeRequestDelay(requestConfig[key], {
    state,
    el,
    routeName,
    directive: VD.REQUEST_CONFIG,
    expression: el.getAttribute(VD.REQUEST_CONFIG) || routeName,
    message: "Request throttle must be a non-negative number",
    title: "Invalid Request Throttle",
    hint: `Set ${key} to a non-negative number of milliseconds. Example: { ${key}: 1000 }.`
  });
}

function getRequestDebounceMs(
  el,
  requestConfig,
  state,
  context,
  event,
  evaluate,
  routeName
) {
  if (el.hasAttribute(VD.DEBOUNCE)) {
    const expression = (el.getAttribute(VD.DEBOUNCE) || "").trim();
    const evaluated = expression
      ? evaluate(expression, state, event, el, context.props, {
        directive: VD.DEBOUNCE
      })
      : 0;

    return normalizeRequestDelay(evaluated, {
      state,
      el,
      routeName,
      directive: VD.DEBOUNCE,
      expression,
      message: "Request debounce must be a non-negative number",
      title: "Invalid Request Debounce",
      hint: "Set vd-debounce to a non-negative millisecond expression. Example: vd-debounce=\"300\"."
    });
  }

  const key = VD_REQUEST.DEBOUNCE_KEYS.find(name => (
    requestConfig?.[name] !== undefined
  ));

  if (!key) return 0;

  return normalizeRequestDelay(requestConfig[key], {
    state,
    el,
    routeName,
    directive: VD.REQUEST_CONFIG,
    expression: el.getAttribute(VD.REQUEST_CONFIG) || routeName,
    message: "Request debounce must be a non-negative number",
    title: "Invalid Request Debounce",
    hint: `Set ${key} to a non-negative number of milliseconds. Example: { ${key}: 300 }.`
  });
}

function normalizeRequestDelay(value, options) {
  if (isValidRequestDelay(value)) {
    return Number(value);
  }

  reportRequestDirectiveProblem(
    options.state,
    options.el,
    options.routeName,
    options.message || "Request delay must be a non-negative number",
    {
      title: options.title || "Invalid Request Delay",
      directive: options.directive,
      expression: options.expression,
      hint: options.hint
    }
  );

  return VD_INTERNAL.REQUEST_ABORT;
}

function isValidRequestDelay(value) {
  return (
    typeof value === "number"
    && Number.isFinite(value)
    && value >= 0
  );
}

function isValidRequestRetryCount(value) {
  return (
    typeof value === "boolean"
    || (
      Number.isInteger(value)
      && Number(value) >= 0
    )
  );
}

function normalizeRequestRetryCount(value) {
  if (value === true) return 1;
  if (value === false || value === undefined) return 0;

  return Number(value);
}

function waitForRetryDelay(ms, signal) {
  if (!signal) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  if (signal.aborted) {
    return Promise.reject(createRequestAbortError());
  }

  return new Promise((resolve, reject) => {
    function abort() {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(createRequestAbortError());
    }

    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve(undefined);
    }, ms);
    signal.addEventListener("abort", abort, {
      once: true
    });
  });
}

function createRequestAbortError() {
  const error = new Error("Request aborted");

  error.name = "AbortError";
  return error;
}

function getRequestParamsInput(el, requestConfig) {
  if (el.hasAttribute(VD.PARAMS)) {
    return (el.getAttribute(VD.PARAMS) || "").trim();
  }

  return requestConfig?.params;
}

function hasRequestStateAutomation(el, requestConfig) {
  return el.hasAttribute(VD.REQUEST_STATE)
    || el.hasAttribute(VD.AUTO_STATE)
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

function cancelPendingRequest(el) {
  const pending = pendingRequestTimers.get(el);

  if (!pending) return;

  clearTimeout(pending.timer);
  pendingRequestTimers.delete(el);
}

function consumeRequestThrottle(el, throttleMs) {
  if (throttleMs <= 0) return true;

  const now = Date.now();
  const lastRun = requestThrottleWindows.get(el) || 0;

  if (now - lastRun < throttleMs) {
    return false;
  }

  requestThrottleWindows.set(el, now);
  return true;
}

function clearRequestThrottle(el) {
  requestThrottleWindows.delete(el);
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
  const authRedirect = normalizeRouteAuthRedirect(raw, routeName, state, el);
  if (authRedirect === null) return null;

  return {
    name: routeName,
    handler: raw.handler,
    auth: roles.length > 0 && !auth.enabled
      ? normalizeRequestAuthConfig(true, authRuntime)
      : auth,
    authRedirect,
    roles,
    middleware
  };
}

function normalizeRouteAuthRedirect(raw, routeName, state, el) {
  const key = VD_REQUEST.AUTH_REDIRECT_KEYS.find(name => (
    raw[name] !== undefined
  ));

  if (!key) return "";

  const value = normalizeAuthRedirectPath(raw[key]);

  if (value !== null) return value;

  reportRequestDirectiveProblem(state, el, routeName, `Route "${routeName}" has an invalid auth redirect`, {
    title: "Invalid Route Auth Redirect",
    directive: VD.REQUEST,
    expression: routeName,
    line: 580,
    hint: `Set ${key} to an application path such as "/login".`
  });

  return null;
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

function reportRequestDirectiveProblem(
  state,
  el,
  routeName,
  error,
  options: RequestProblemOptions = {}
) {
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
    file: "src/core/requests/request-router.ts",
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

function hasApiRoute(name) {
  return Object.hasOwn(apiRoutes, name);
}

function listApiRoutes() {
  return Object.keys(apiRoutes || {});
}

function callApiRoute(
  routeConfig,
  params = {},
  context: RequestContext = {}
) {
  return routeConfig.handler(params, context);
}
