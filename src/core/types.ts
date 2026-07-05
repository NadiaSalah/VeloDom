export type MaybePromise<T> = T | Promise<T>;
export type UnknownRecord = Record<string, unknown>;
export type StateRecord = UnknownRecord;
export type ResourceLoader<T = unknown> = () => MaybePromise<T>;

export interface ResourceGroup {
  html?: Record<string, ResourceLoader<string>>;
  modules?: Record<string, ResourceLoader<UnknownRecord>>;
  styles?: Record<string, ResourceLoader<string>>;
  configs?: Record<string, PageConfig>;
}

export interface ResourceAdapter {
  pages: ResourceGroup;
  components?: ResourceGroup;
}

export interface RouteLocation {
  matched: boolean;
  page: string;
  path: string;
  pattern: string;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  meta: UnknownRecord;
  beforeEnter?: NavigationGuard | null;
}

export interface NavigationGuardContext {
  to: RouteLocation;
  from: RouteLocation | null;
}

export type NavigationGuardResult = boolean | string | void;
export type NavigationGuard = (
  context: NavigationGuardContext
) => MaybePromise<NavigationGuardResult>;

export interface PageConfig {
  path?: string;
  meta?: UnknownRecord;
  beforeEnter?: NavigationGuard;
  allowExternalWrite?: string[];
}

export interface RouterOptions {
  beforeEach?: NavigationGuard | NavigationGuard[];
  notFoundPage?: string;
}

export interface AuthProviderContext {
  routeName: string;
  state: StateRecord | null;
  el: Element | null;
  signal?: AbortSignal;
  options: UnknownRecord;
}

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

export type AuthProvider = (
  context: AuthProviderContext
) => MaybePromise<AuthSessionPayload | null | false>;

export interface AuthOptions {
  defaultProvider?: string;
  providers?: Record<string, AuthProvider>;
}

export interface RequestContext {
  routeName?: string;
  signal?: AbortSignal;
  state?: StateRecord;
  el?: Element;
  auth?: AuthSessionPayload | null;
  [key: string]: unknown;
}

export type RouteHandler = (
  params: StateRecord,
  context: RequestContext
) => MaybePromise<unknown>;

export type RequestMiddleware = (
  params: StateRecord,
  context: RequestContext,
  next?: (params?: StateRecord) => Promise<unknown>
) => MaybePromise<unknown>;

export interface RequestRoute {
  handler: RouteHandler;
  auth?: boolean | string | UnknownRecord;
  roles?: string[];
  middleware?: Array<string | RequestMiddleware>;
}

export type RequestRouteRegistry = Record<
  string,
  RouteHandler | RequestRoute
>;

export interface PluginContext {
  app: VeloDomApp;
  navigate: VeloDomApp["navigate"];
}

export type PluginCleanup = (
  context: PluginContext
) => MaybePromise<void>;

export type PluginSetup = (
  context: PluginContext
) => MaybePromise<void | PluginCleanup>;

export type VeloDomPlugin = PluginSetup | {
  setup: PluginSetup;
  cleanup?: PluginCleanup;
};

export interface VeloDomAppOptions {
  adapter: ResourceAdapter;
  routes?: RequestRouteRegistry;
  middleware?: Record<string, RequestMiddleware>;
  auth?: AuthOptions;
  plugins?: VeloDomPlugin[];
  router?: RouterOptions;
}

export interface VeloDomApp {
  mount(): Promise<unknown>;
  destroy(): Promise<void>;
  navigate(path: string, pagePath?: string): Promise<unknown>;
}

export interface LifecycleContext {
  signal: AbortSignal;
  onCleanup(callback: () => MaybePromise<void>): () => void;
  [key: string]: unknown;
}

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

export interface ComponentScriptContext<
  TState extends StateRecord = StateRecord,
  TProps extends StateRecord = StateRecord
> extends Omit<PageScriptContext<TState>, "props"> {
  props: TProps;
}
