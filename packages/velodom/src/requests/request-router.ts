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
  VD_ERROR,
  VD_INTERNAL,
  VD_REQUEST
} from "../constants.ts";
import { reportUserActionError } from "../errors/error-reporter.ts";
import { isPlainObject } from "../shared/object.ts";
import {
  getThrownString
} from "../shared/thrown.ts";
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
import {
  getDevtoolsSessionForState
} from "../devtools/hook.ts";
import type {
  ErrorReportOptions
} from "../errors/error-reporter.ts";
import type {
  RequestContext,
  RequestHookOptions,
  RequestLifecyclePayload,
  RouteHandler,
  StateRecord,
  UnknownRecord
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

type RequestEvaluate = RequestDirectiveHelpers["evaluate"];
type RequestWriteValue = RequestDirectiveHelpers["writeValue"];
type RequestConfig = UnknownRecord;
type RequestSession = Awaited<ReturnType<typeof resolveRequestSession>>;
type ResolvedRequestBinding = NonNullable<
  ReturnType<typeof resolveRequestBinding>
>;
type NormalizedAuthConfig = NonNullable<
  ReturnType<typeof normalizeRequestAuthConfig>
>;

interface NormalizedRouteConfig {
  name: string;
  handler: RouteHandler;
  auth: NormalizedAuthConfig;
  authRedirect: string;
  roles: string[];
  middleware: unknown[];
}

interface ActiveRequest {
  controller: AbortController;
  id: number;
  routeName: string;
  targetState: DirectiveState | null;
  targetPath: string;
}

interface PendingRequestTimer {
  timer: ReturnType<typeof setTimeout>;
}

interface RequestDelayProblemOptions extends RequestProblemOptions {
  state: RequestDirectiveState;
  el: Element;
  routeName: string;
  directive: string;
  expression: unknown;
  message: string;
  title: string;
  hint: string;
}

interface RequestAuthorizationContext {
  signal: AbortSignal;
  state: RequestDirectiveState;
  el: Element;
}

interface RequestExecutionOptions {
  routeConfig: NormalizedRouteConfig;
  params: StateRecord;
  requestContext: RequestContext;
  retryOptions: RequestRetryRuntimeOptions;
}

const activeRequests = new WeakMap<Element, ActiveRequest>();
const activeTargetRequests = new WeakMap<
  DirectiveState,
  Map<string, ActiveRequest>
>();
const pendingRequestTimers = new WeakMap<Element, PendingRequestTimer>();
const requestThrottleWindows = new WeakMap<Element, number>();
let apiRoutes: UnknownRecord = Object.create(null);
let appRequestMiddleware: UnknownRecord = Object.create(null);
let requestHooks: RequestHookOptions = {};
let authRuntime = createAuthRuntime();
let nextRequestId = 1;

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

      const handler = (event: Event) => {
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

/** Schedules the request directive. */
function scheduleRequestDirective(
  el: Element,
  state: RequestDirectiveState,
  context: DirectiveRuntimeContext,
  event: Event,
  evaluate: RequestEvaluate,
  writeValue: RequestWriteValue
): void {
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

  if (isRequestAbort(requestConfig)) {
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

  if (isRequestAbort(throttleMs)) {
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

  if (isRequestAbort(debounceMs)) {
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

/** Runs the request directive. */
async function runRequestDirective(
  el: Element,
  state: RequestDirectiveState,
  context: DirectiveRuntimeContext,
  event: Event,
  evaluate: RequestEvaluate,
  writeValue: RequestWriteValue
): Promise<void> {
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

  if (isRequestAbort(requestConfig)) {
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

  if (isRequestAbort(params)) {
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
  const devtools = getDevtoolsSessionForState(state);
  const devtoolsStartedAt = readPerformanceTime();
  let devtoolsStatus = "cancelled";

  devtools?.emit("request:start", {
    requestId: activeRequest.id,
    route: routeName,
    target: targetBinding.path || null
  });

  if (errorBinding.path && errorBinding.state) {
    writeValue(errorBinding.path, errorBinding.state, "");
  }

  if (loadingBinding.path && loadingBinding.state) {
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

    if (targetBinding.path && targetBinding.state) {
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
    devtoolsStatus = "success";
  } catch (err) {
    if (
      !isLatestRequest(el, activeRequest)
      || getThrownString(err, "name") === "AbortError"
    ) {
      devtoolsStatus = "aborted";
      return;
    }

    devtoolsStatus = "error";

    const message = getThrownString(err, "message", "Request failed");
    const stage = getThrownString(
      err,
      "__vdStage",
      VD_REQUEST.STAGES.REQUEST
    );

    if (errorBinding.path && errorBinding.state) {
      writeValue(errorBinding.path, errorBinding.state, message);
    }

    const reported = reportUserActionError(err, {
      code: VD_ERROR.CODES.REQUEST_FAILED,
      group: "request",
      title: getRequestErrorTitle(err),
      directive: VD.REQUEST,
      expression: routeName,
      file: "velodom/requests/request-router.ts",
      line: 177,
      el,
      hint: getThrownString(
        err,
        "__vdHint",
        "Verify the route config, auth mode, application middleware, and request params."
      ),
      ownership: [
        { kind: "request", name: routeName },
        ...(stage === VD_REQUEST.STAGES.AUTH
          ? [{ kind: "auth" as const, name: stage }]
          : stage === VD_REQUEST.STAGES.MIDDLEWARE
            ? [{ kind: "middleware" as const, name: stage }]
            : [])
      ]
    });

    devtools?.emit("request:error", {
      durationMs: readPerformanceTime() - devtoolsStartedAt,
      message,
      requestId: activeRequest.id,
      route: routeName,
      stage
    });

    state.emit?.(VD_REQUEST.EVENTS.ERROR, {
      route: routeName,
      error: err,
      message: reported.message,
      stage,
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
      stage
    });
  } finally {
    if (
      isLatestRequest(el, activeRequest)
      && loadingBinding.path
      && loadingBinding.state
    ) {
      writeValue(loadingBinding.path, loadingBinding.state, false);
    }

    finishRequest(el, activeRequest);
    devtools?.emit("request:end", {
      durationMs: readPerformanceTime() - devtoolsStartedAt,
      requestId: activeRequest.id,
      route: routeName,
      status: devtoolsStatus
    });
  }
}

/** Reads the highest-resolution request timing source available. */
function readPerformanceTime() {
  return globalThis.performance?.now?.() ?? Date.now();
}

/** Returns whether a request helper returned the shared abort sentinel. */
function isRequestAbort(value: unknown): value is symbol {
  return value === VD_INTERNAL.REQUEST_ABORT;
}

/** Returns the request params. */
function getRequestParams(
  el: Element,
  state: RequestDirectiveState,
  context: DirectiveRuntimeContext,
  paramsInput: unknown,
  event: Event,
  evaluate: RequestEvaluate
): StateRecord | symbol {
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

/** Returns the request config. */
function getRequestConfig(
  el: Element,
  state: RequestDirectiveState,
  context: DirectiveRuntimeContext,
  event: Event,
  evaluate: RequestEvaluate,
  routeName: string
): RequestConfig | symbol {
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

/** Normalizes the request hooks. */
function normalizeRequestHooks(value: unknown): RequestHookOptions {
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

/** Creates the request lifecycle payload. */
function createRequestLifecyclePayload(
  routeName: string,
  params: StateRecord,
  state: RequestDirectiveState,
  el: Element,
  session: RequestSession,
  signal: AbortSignal
): RequestLifecyclePayload {
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

/** Runs the before request hook. */
function runBeforeRequestHook(
  payload: RequestLifecyclePayload
): boolean | Promise<boolean> {
  if (typeof requestHooks.beforeRequest !== "function") return true;

  const result = requestHooks.beforeRequest(payload);

  if (result instanceof Promise) {
    return result.then(value => value !== false);
  }

  return result !== false;
}

/** Runs the after request hook. */
async function runAfterRequestHook(
  payload: RequestLifecyclePayload
): Promise<void> {
  if (typeof requestHooks.afterRequest !== "function") return;

  await requestHooks.afterRequest(payload);
}

/** Runs the request success callback. */
async function runRequestSuccessCallback(
  requestConfig: RequestConfig,
  payload: RequestLifecyclePayload
): Promise<void> {
  if (typeof requestConfig?.onSuccess !== "function") return;

  await requestConfig.onSuccess(payload);
}

/** Executes the request with retry. */
async function executeRequestWithRetry({
  routeConfig,
  params,
  requestContext,
  retryOptions
}: RequestExecutionOptions) {
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
        || getThrownString(error, "name") === "AbortError"
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

/** Returns the request retry options. */
function getRequestRetryOptions(
  requestConfig: RequestConfig
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

/** Returns the auth redirect target. */
function getAuthRedirectTarget(
  requestConfig: RequestConfig,
  routeConfig: NormalizedRouteConfig
): string {
  const requestKey = VD_REQUEST.AUTH_REDIRECT_KEYS.find(name => (
    requestConfig?.[name] !== undefined
  ));

  if (requestKey) {
    return normalizeAuthRedirectPath(requestConfig[requestKey]) || "";
  }

  return routeConfig.authRedirect || "";
}

/** Normalizes the auth redirect path. */
function normalizeAuthRedirectPath(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return "";

  const path = String(value).trim();

  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return null;
  }

  return path;
}

/** Evaluates the `shouldRedirectAuthFailure()` condition for the supplied input. */
function shouldRedirectAuthFailure(
  err: unknown,
  target: string,
  context: DirectiveRuntimeContext
): boolean {
  return (
    getThrownString(err, "__vdStage") === VD_REQUEST.STAGES.AUTH
    && Boolean(target)
    && typeof context.navigate === "function"
  );
}

/** Returns the request throttle ms. */
function getRequestThrottleMs(
  el: Element,
  requestConfig: RequestConfig,
  state: RequestDirectiveState,
  context: DirectiveRuntimeContext,
  event: Event,
  evaluate: RequestEvaluate,
  routeName: string
): number | symbol {
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

/** Returns the request debounce ms. */
function getRequestDebounceMs(
  el: Element,
  requestConfig: RequestConfig,
  state: RequestDirectiveState,
  context: DirectiveRuntimeContext,
  event: Event,
  evaluate: RequestEvaluate,
  routeName: string
): number | symbol {
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

/** Normalizes the request delay. */
function normalizeRequestDelay(
  value: unknown,
  options: RequestDelayProblemOptions
): number | symbol {
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

/** Evaluates the `isValidRequestDelay()` condition for the supplied input. */
function isValidRequestDelay(value: unknown): value is number {
  return (
    typeof value === "number"
    && Number.isFinite(value)
    && value >= 0
  );
}

/** Evaluates the `isValidRequestRetryCount()` condition for the supplied input. */
function isValidRequestRetryCount(value: unknown): boolean {
  return (
    typeof value === "boolean"
    || (
      Number.isInteger(value)
      && Number(value) >= 0
    )
  );
}

/** Normalizes the request retry count. */
function normalizeRequestRetryCount(value: unknown): number {
  if (value === true) return 1;
  if (value === false || value === undefined) return 0;

  return Number(value);
}

/** Waits for the for retry delay. */
function waitForRetryDelay(
  ms: number,
  signal?: AbortSignal
): Promise<void> {
  if (!signal) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  if (signal.aborted) {
    return Promise.reject(createRequestAbortError());
  }

  const abortSignal = signal;

  return new Promise((resolve, reject) => {
    /** Aborts the active operation. */
    function abort() {
      clearTimeout(timer);
      abortSignal.removeEventListener("abort", abort);
      reject(createRequestAbortError());
    }

    const timer = setTimeout(() => {
      abortSignal.removeEventListener("abort", abort);
      resolve(undefined);
    }, ms);
    abortSignal.addEventListener("abort", abort, {
      once: true
    });
  });
}

/** Creates the request abort error. */
function createRequestAbortError(): Error {
  const error = new Error("Request aborted");

  error.name = "AbortError";
  return error;
}

/** Returns the request params input. */
function getRequestParamsInput(
  el: Element,
  requestConfig: RequestConfig
): unknown {
  if (el.hasAttribute(VD.PARAMS)) {
    return (el.getAttribute(VD.PARAMS) || "").trim();
  }

  return requestConfig?.params;
}

/** Evaluates the `hasRequestStateAutomation()` condition for the supplied input. */
function hasRequestStateAutomation(
  el: Element,
  requestConfig: RequestConfig
): boolean {
  return el.hasAttribute(VD.REQUEST_STATE)
    || el.hasAttribute(VD.AUTO_STATE)
    || requestConfig?.autoState === true
    || requestConfig?.requestState === true;
}

/** Returns the request config text. */
function getRequestConfigText(
  el: Element,
  requestConfig: RequestConfig,
  key: string,
  attributeName: string
): string {
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

/** Reads the form values. */
function readFormValues(
  form: HTMLFormElement
): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const formData = new FormData(form);
  const values: Record<
    string,
    FormDataEntryValue | FormDataEntryValue[]
  > = {};

  [...formData.entries()].forEach(([key, value]) => {
    const existing = values[key];

    if (existing !== undefined) {
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        values[key] = [existing, value];
      }

      return;
    }

    values[key] = value;
  });

  return values;
}

/** Returns the request form. */
function getRequestForm(el: Element): HTMLFormElement | null {
  if (el.tagName === "FORM") {
    return el as HTMLFormElement;
  }

  if ("form" in el && el.form instanceof HTMLFormElement) {
    return el.form;
  }

  return el.closest("form");
}

/** Begins the request. */
function beginRequest(
  el: Element,
  targetBinding: ResolvedRequestBinding,
  routeName: string
): ActiveRequest {
  const previousElementRequest = activeRequests.get(el);
  previousElementRequest?.controller.abort();

  const controller = new AbortController();
  const request = {
    controller,
    id: nextRequestId,
    routeName,
    targetState: targetBinding.state,
    targetPath: targetBinding.path
  };
  nextRequestId += 1;

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

/** Cancels the element request. */
function cancelElementRequest(el: Element): void {
  const request = activeRequests.get(el);

  if (!request) return;

  request.controller.abort();
  finishRequest(el, request);
}

/** Cancels the pending request. */
function cancelPendingRequest(el: Element): void {
  const pending = pendingRequestTimers.get(el);

  if (!pending) return;

  clearTimeout(pending.timer);
  pendingRequestTimers.delete(el);
}

/** Consumes the request throttle. */
function consumeRequestThrottle(el: Element, throttleMs: number): boolean {
  if (throttleMs <= 0) return true;

  const now = Date.now();
  const lastRun = requestThrottleWindows.get(el) || 0;

  if (now - lastRun < throttleMs) {
    return false;
  }

  requestThrottleWindows.set(el, now);
  return true;
}

/** Clears the request throttle. */
function clearRequestThrottle(el: Element): void {
  requestThrottleWindows.delete(el);
}

/** Finishes the request. */
function finishRequest(el: Element, request: ActiveRequest): void {
  if (activeRequests.get(el) === request) {
    activeRequests.delete(el);
  }

  if (!request.targetState || !request.targetPath) return;

  const targetRequests = activeTargetRequests.get(request.targetState);

  if (targetRequests?.get(request.targetPath) === request) {
    targetRequests.delete(request.targetPath);
  }
}

/** Evaluates the `isLatestRequest()` condition for the supplied input. */
function isLatestRequest(el: Element, request: ActiveRequest): boolean {
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

/** Returns the target request map. */
function getTargetRequestMap(
  state: DirectiveState
): Map<string, ActiveRequest> {
  let requests = activeTargetRequests.get(state);

  if (!requests) {
    requests = new Map();
    activeTargetRequests.set(state, requests);
  }

  return requests;
}

/** Resolves the route config. */
function resolveRouteConfig(
  routeName: string,
  state: RequestDirectiveState,
  el: Element
): NormalizedRouteConfig | null {
  const raw = apiRoutes[routeName];

  if (typeof raw === "function") {
    const auth = normalizeRequestAuthConfig(false, authRuntime);

    if (!auth) return null;

    return {
      name: routeName,
      handler: raw as RouteHandler,
      auth,
      authRedirect: "",
      roles: [],
      middleware: []
    };
  }

  if (!isPlainObject(raw)) {
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

  const effectiveAuth = roles.length > 0 && !auth.enabled
    ? normalizeRequestAuthConfig(true, authRuntime)
    : auth;

  if (!effectiveAuth) return null;

  return {
    name: routeName,
    handler: raw.handler as RouteHandler,
    auth: effectiveAuth,
    authRedirect,
    roles,
    middleware
  };
}

/** Normalizes the route auth redirect. */
function normalizeRouteAuthRedirect(
  raw: UnknownRecord,
  routeName: string,
  state: RequestDirectiveState,
  el: Element
): string | null {
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

/** Normalizes the route auth. */
function normalizeRouteAuth(
  value: unknown,
  routeName: string,
  state: RequestDirectiveState,
  el: Element
): NormalizedAuthConfig | null {
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

/** Normalizes the route roles. */
function normalizeRouteRoles(
  value: unknown,
  routeName: string,
  state: RequestDirectiveState,
  el: Element
): string[] | null {
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

/** Normalizes the route middleware. */
function normalizeRouteMiddleware(
  value: unknown,
  routeName: string,
  state: RequestDirectiveState,
  el: Element
): unknown[] | null {
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

/** Authorizes the route request. */
async function authorizeRouteRequest(
  routeConfig: NormalizedRouteConfig,
  context: RequestAuthorizationContext
): Promise<RequestSession> {
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

/** Reports the request directive problem. */
function reportRequestDirectiveProblem(
  state: RequestDirectiveState | undefined,
  el: Element | undefined,
  routeName: string | undefined,
  error: unknown,
  options: RequestProblemOptions = {}
): null {
  const problem = error instanceof Error
    ? error
    : new Error(String(error || "Invalid request configuration"));

  if (!(error instanceof Error)) {
    Error.captureStackTrace?.(problem, reportRequestDirectiveProblem);
  }

  const reported = reportUserActionError(problem, {
    code: VD_ERROR.CODES.REQUEST_CONFIG,
    group: "request",
    title: options.title || "Invalid Request Configuration",
    directive: options.directive || VD.REQUEST,
    expression: options.expression || routeName,
    file: "velodom/requests/request-router.ts",
    line: options.line || 48,
    el,
    hint: options.hint || "Check request route, target page, and state bindings.",
    ownership: routeName
      ? [{ kind: "request", name: routeName }]
      : [{ kind: "application", name: "request-runtime" }]
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

/** Creates the stage error. */
function createStageError(
  stage: string,
  message: string,
  hint = ""
): Error {
  const error = new Error(message);

  error.__vdStage = stage;
  error.__vdHint = hint;

  return error;
}

/** Returns the request error title. */
function getRequestErrorTitle(error: unknown): string {
  const stage = getThrownString(error, "__vdStage");

  if (stage === VD_REQUEST.STAGES.AUTH) {
    return "Request Authorization Failed";
  }

  if (stage === VD_REQUEST.STAGES.MIDDLEWARE) {
    return "Request Middleware Failed";
  }

  return "API Request Failed";
}

/** Evaluates the `hasApiRoute()` condition for the supplied input. */
function hasApiRoute(name: string): boolean {
  return Object.hasOwn(apiRoutes, name);
}

/** Lists the registered API routes. */
function listApiRoutes(): string[] {
  return Object.keys(apiRoutes || {});
}

/** Calls the selected API route. */
function callApiRoute(
  routeConfig: NormalizedRouteConfig,
  params: StateRecord = {},
  context: RequestContext = {}
): ReturnType<RouteHandler> {
  return routeConfig.handler(params, context);
}
