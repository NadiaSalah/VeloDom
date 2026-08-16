/**
 * ----------------------------------------
 * Module: Public Runtime Entry
 * ----------------------------------------
 *
 * Defines the supported package boundary for application authors and keeps
 * internal runtime modules outside the stable public API.
 * ----------------------------------------
 */

/** Public application factory. */
export {
  createApp
} from "./velodom.ts";

/** Optional inference helpers for JavaScript and TypeScript application code. */
export {
  definePageConfig,
  definePlugin,
  defineRequestRoute,
  defineResourceAdapter
} from "./authoring.ts";

/** Public adapter conformance assertion for adapter implementation tests. */
export {
  assertResourceAdapterConformance
} from "./resource-adapter.ts";

/** Public TypeScript contracts for pages, components, requests, and plugins. */
export type {
  AuthOptions,
  AuthProvider,
  AuthProviderContext,
  AuthSessionPayload,
  ComponentExpose,
  ComponentScriptContext,
  DevtoolsPluginOptions,
  DevtoolsBridge,
  DevtoolsSnapshot,
  DirectionController,
  DirectionLocaleDefinition,
  DirectionPluginOptions,
  DirectionValue,
  ErrorBoundaryContext,
  ErrorBoundaryFallback,
  ErrorBoundaryHook,
  LifecycleContext,
  NavigationGuard,
  PageConfig,
  PageScriptContext,
  PluginContext,
  RequestAfterHook,
  RequestBeforeHook,
  RequestCache,
  RequestCacheOptions,
  RequestContext,
  RequestHookOptions,
  RequestLifecyclePayload,
  RequestMiddleware,
  RequestRetryOptions,
  RequestRoute,
  RequestRouteRegistry,
  ResourceAdapter,
  ResourceAdapterCapability,
  ResourceAdapterVersion,
  ResourceGroup,
  RouteHandler,
  RouteLocation,
  RouterOptions,
  RtlFlipStyleOptions,
  SeoConfig,
  SeoEntriesContext,
  SeoEntriesHook,
  SeoMetadata,
  SeoOpenGraph,
  SeoRouteEntry,
  SeoSummary,
  SeoTwitterCard,
  SharedState,
  SharedStateHandle,
  SharedStateMethods,
  SharedStatePluginOptions,
  StateRecord,
  UnknownRecord,
  ValidationPluginOptions,
  VeloDomApp,
  VeloDomAppOptions,
  VeloDomPlugin
} from "./types.ts";

/** Optional locale and document-direction helper. */
export {
  createDirectionPlugin,
  createRtlFlipStyles
} from "./direction.ts";

/** Optional application-owned shared state helper. */
export {
  createSharedState
} from "./shared-state.ts";

/** Optional cache, retry, and devtools helpers. */
export {
  createDevtoolsPlugin,
  createRequestCache,
  withRequestRetry
} from "./request-tools.ts";

/** Optional browser-native form validation plugin. */
export {
  createValidationPlugin
} from "./validation.ts";

/** Advanced plugin manager utility. */
export {
  createPluginManager
} from "./plugins.ts";

/** Public request, auth, middleware, and request-constant utilities. */
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

/** Public HTTP request option and error contracts. */
export type {
  ApiErrorOptions,
  JsonRequestOptions
} from "./requests/index.ts";
