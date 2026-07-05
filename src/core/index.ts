export {
  createApp
} from "./velodom.ts";

export type {
  AuthOptions,
  AuthProvider,
  AuthProviderContext,
  AuthSessionPayload,
  ComponentScriptContext,
  LifecycleContext,
  NavigationGuard,
  PageConfig,
  PageScriptContext,
  PluginContext,
  RequestContext,
  RequestMiddleware,
  RequestRoute,
  RequestRouteRegistry,
  ResourceAdapter,
  ResourceGroup,
  RouteHandler,
  RouteLocation,
  RouterOptions,
  StateRecord,
  UnknownRecord,
  VeloDomApp,
  VeloDomAppOptions,
  VeloDomPlugin
} from "./types.ts";

export {
  createPluginManager
} from "./plugins.ts";

export {
  ApiError,
  createAuthRuntime,
  createLocalStorageAuthProvider,
  createServerSessionAuthProvider,
  defineRequestMiddleware,
  normalizeAuthSession,
  requestJson,
  VD_AUTH,
  VD_MIDDLEWARE,
  VD_REQUEST
} from "./requests/index.ts";

export type {
  ApiErrorOptions,
  JsonRequestOptions
} from "./requests/index.ts";
