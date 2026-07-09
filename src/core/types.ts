/**
 * ----------------------------------------
 * Module: Public Framework Contracts
 * ----------------------------------------
 *
 * Defines the stable TypeScript surface available to JavaScript-optional
 * application pages, components, requests, auth providers, and plugins.
 * ----------------------------------------
 */

import type {
  RuntimeFeatureManifest
} from "./compiler/types.ts";

/** A value that may be returned directly or through a Promise. */
export type MaybePromise<T> = T | Promise<T>;
/** Extensible record whose unmodelled values require safe narrowing. */
export type UnknownRecord = Record<string, unknown>;
/** Generic application state record used by public runtime contracts. */
export type StateRecord = UnknownRecord;
/** Lazy resource loader used by build adapters. */
export type ResourceLoader<T = unknown> = () => MaybePromise<T>;

/** Lazy resources associated with pages or components. */
export interface ResourceGroup {
  html?: Record<string, ResourceLoader<string>>;
  modules?: Record<string, ResourceLoader<UnknownRecord>>;
  styles?: Record<string, ResourceLoader<string>>;
  configs?: Record<string, PageConfig>;
  manifests?: Record<
    string,
    ResourceLoader<RuntimeFeatureManifest | undefined>
  >;
}

/** Build-tool-independent page and component resources. */
export interface ResourceAdapter {
  pages: ResourceGroup;
  components?: ResourceGroup;
}

/** Fully resolved route information supplied to pages and guards. */
export interface RouteLocation {
  matched: boolean;
  page: string;
  path: string;
  pattern: string;
  hash: string;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  meta: UnknownRecord;
  beforeEnter?: NavigationGuard | null;
}

/** Destination and previous route supplied to a navigation guard. */
export interface NavigationGuardContext {
  to: RouteLocation;
  from: RouteLocation | null;
}

/** Values a navigation guard may return. */
export type NavigationGuardResult = boolean | string | void;
/** Function that allows, blocks, or redirects navigation. */
export type NavigationGuard = (
  context: NavigationGuardContext
) => MaybePromise<NavigationGuardResult>;

/** Plain-text content rendered into the initial static SEO document. */
export interface SeoSummary {
  heading: string;
  text: string;
}

/** Open Graph metadata used by link previews and supported crawlers. */
export interface SeoOpenGraph {
  title?: string;
  description?: string;
  type?: string;
  url?: string;
  image?: string;
  imageAlt?: string;
}

/** Twitter/X card metadata for shared links. */
export interface SeoTwitterCard {
  card?: "summary" | "summary_large_image";
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
}

/** Shared metadata fields accepted by page and dynamic-entry SEO records. */
export interface SeoMetadata {
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  keywords?: string[];
  lang?: string;
  openGraph?: SeoOpenGraph;
  twitter?: SeoTwitterCard;
  jsonLd?: UnknownRecord | UnknownRecord[];
  summary?: SeoSummary;
}

/** Concrete dynamic route rendered from a parameterized page folder. */
export interface SeoRouteEntry extends SeoMetadata {
  path: string;
}

/** SEO declaration stored in a page's existing config.js file. */
export interface SeoConfig extends SeoMetadata {
  entries?: SeoRouteEntry[];
}

/** Optional route metadata and cross-page write policy for one page. */
export interface PageConfig {
  path?: string;
  meta?: UnknownRecord;
  beforeEnter?: NavigationGuard;
  allowExternalWrite?: string[];
  seo?: SeoConfig;
}

/** Browser router options accepted by createApp. */
export interface RouterOptions {
  beforeEach?: NavigationGuard | NavigationGuard[];
  notFoundPage?: string;
}

/** Renderable value accepted from an application error-boundary hook. */
export type ErrorBoundaryFallback =
  | string
  | Node
  | DocumentFragment
  | null
  | undefined
  | false;

/** Context supplied when VeloDom offers an application recoverable fallback. */
export interface ErrorBoundaryContext {
  error: unknown;
  title: string;
  message: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  phase: "navigation" | "component" | "runtime";
  target: HTMLElement;
  page?: string;
  component?: string;
  retry(): MaybePromise<unknown>;
  navigate(path: string): MaybePromise<unknown>;
}

/** Application hook that may render a fallback instead of a fatal screen. */
export type ErrorBoundaryHook = (
  context: ErrorBoundaryContext
) => MaybePromise<ErrorBoundaryFallback>;

/** Runtime values supplied to an authentication provider. */
export interface AuthProviderContext {
  routeName: string;
  state: StateRecord | null;
  el: Element | null;
  signal?: AbortSignal;
  options: UnknownRecord;
}

/** Flexible payload returned by application authentication providers. */
export interface AuthSessionPayload {
  authenticated?: boolean;
  loggedIn?: boolean;
  token?: string;
  roles?: string[];
  user?: {
    roles?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Application-defined request authentication provider. */
export type AuthProvider = (
  context: AuthProviderContext
) => MaybePromise<AuthSessionPayload | null | false>;

/** Authentication registry accepted by createApp. */
export interface AuthOptions {
  defaultProvider?: string;
  providers?: Record<string, AuthProvider>;
}

/** Runtime values supplied to request handlers and middleware. */
export interface RequestContext {
  routeName?: string;
  signal?: AbortSignal;
  state?: StateRecord;
  el?: Element;
  auth?: AuthSessionPayload | null;
  [key: string]: unknown;
}

/** Application request route handler. */
export type RouteHandler = (
  params: StateRecord,
  context: RequestContext
) => MaybePromise<unknown>;

/** Transform or advanced pipeline request middleware. */
export type RequestMiddleware = (
  params: StateRecord,
  context: RequestContext,
  next?: (params?: StateRecord) => Promise<unknown>
) => MaybePromise<unknown>;

/** Declarative request route with optional auth, roles, and middleware. */
export interface RequestRoute {
  handler: RouteHandler;
  auth?: boolean | string | UnknownRecord;
  roles?: string[];
  middleware?: Array<string | RequestMiddleware>;
}

/** Named application request route registry. */
export type RequestRouteRegistry = Record<
  string,
  RouteHandler | RequestRoute
>;

/** Values supplied while setting up or cleaning up a plugin. */
export interface PluginContext {
  app: VeloDomApp;
  navigate: VeloDomApp["navigate"];
}

/** Optional cleanup returned or declared by a plugin. */
export type PluginCleanup = (
  context: PluginContext
) => MaybePromise<void>;

/** Plugin setup function. */
export type PluginSetup = (
  context: PluginContext
) => MaybePromise<void | PluginCleanup>;

/** Function-style or object-style application plugin. */
export type VeloDomPlugin = PluginSetup | {
  setup: PluginSetup;
  cleanup?: PluginCleanup;
};

/** Options for the optional native-form validation plugin. */
export interface ValidationPluginOptions {
  selector?: string;
  reportValidity?: boolean;
  markInvalidFields?: boolean;
}

/** Complete public application configuration. */
export interface VeloDomAppOptions {
  adapter: ResourceAdapter;
  routes?: RequestRouteRegistry;
  middleware?: Record<string, RequestMiddleware>;
  auth?: AuthOptions;
  plugins?: VeloDomPlugin[];
  router?: RouterOptions;
  errorBoundary?: ErrorBoundaryHook;
}

/** Mounted VeloDom application control surface. */
export interface VeloDomApp {
  mount(): Promise<unknown>;
  destroy(): Promise<void>;
  navigate(path: string, pagePath?: string): Promise<unknown>;
}

/** Abortable cleanup scope shared by pages and components. */
export interface LifecycleContext {
  signal: AbortSignal;
  onCleanup(callback: () => MaybePromise<void>): () => void;
  [key: string]: unknown;
}

/** Context supplied to page init, mounted, and destroy hooks. */
export interface PageScriptContext<
  TState extends StateRecord = StateRecord
> {
  el: HTMLElement;
  props: StateRecord;
  refs: Record<string, HTMLElement | HTMLElement[]>;
  state: TState;
  ctx: LifecycleContext & {
    page: string;
    route: RouteLocation;
    params: Record<string, string>;
    query: Record<string, string | string[]>;
    meta: UnknownRecord;
  };
}

/** Context supplied to component hooks with strongly typed props. */
export interface ComponentScriptContext<
  TState extends StateRecord = StateRecord,
  TProps extends StateRecord = StateRecord
> extends Omit<PageScriptContext<TState>, "props"> {
  props: TProps;
}
