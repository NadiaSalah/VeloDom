/**
 * ----------------------------------------
 * Module: Page Runtime Router
 * ----------------------------------------
 *
 * Coordinates browser navigation, route guards, lazy page resources, reactive
 * page persistence, directives, components, lifecycle, and cleanup.
 * ----------------------------------------
 */

import { disposeTree, mount } from "./mount.ts";
import { applyDirectives } from "./directives.ts";
import { getRefs } from "./refs.ts";
import { createState, mergeState } from "./reactive.ts";
import { applyScopedFolderStyles } from "./styles.ts";
import { createPageEventHub } from "./events.ts";
import type { PageEventHub } from "./events.ts";
import {
  VD,
  VD_COMPILER_FEATURES,
  VD_DIRECTION,
  VD_ERROR,
  VD_INTERNAL,
  VD_LAYOUT,
  VD_PAGE_DATA,
  VD_ROUTER
} from "./constants.ts";
import { reportUserActionError } from "./errors/error-reporter.ts";
import { renderRecoverableErrorBoundary } from "./errors/error-boundary.ts";
import {
  mergeModuleStateSeed,
  runModuleHook,
  runModuleInit
} from "./init-runner.ts";
import type { ModuleHookArguments } from "./init-runner.ts";
import { createLifecycleScope } from "./lifecycle.ts";
import {
  createRouteTable,
  resolveRouteLocation,
  runNavigationGuards
} from "./router.ts";
import { validateResourceAdapter } from "./resource-adapter.ts";
import { applyPageSeo } from "./seo.ts";
import {
  consumePageDataTransfer
} from "./page-data.ts";
import { createPageDataRuntime, type PageDataOwner } from "./page-data-runtime.ts";
import {
  DEVTOOLS_CONTEXT,
  getDevtoolsRuntimeSession
} from "./devtools/hook.ts";
import {
  isAppRelativePath,
  normalizeFolderPath
} from "./shared/path.ts";
import { getThrownString } from "./shared/thrown.ts";
import { assertRequestActive, awaitWithAbort } from "./shared/cancellation.ts";
import type {
  RuntimeFeatureManifest
} from "./compiler/types.ts";
import type {
  DevtoolsRuntimeSession
} from "./devtools/protocol.ts";
import type { ReactiveStateMethods } from "./reactive.ts";
import type {
  DirectionController,
  ErrorBoundaryHook,
  NavigationGuard,
  PageConfig,
  ResourceLoader,
  RouteLocation,
  RouterOptions,
  StateRecord,
  UnknownRecord
} from "./types.ts";

type PageState = StateRecord & ReactiveStateMethods;
type PageCleanup = () => unknown | Promise<unknown>;
type PageLifecycle = ReturnType<typeof createLifecycleScope<PageRuntimeContext>>;

interface PageRouterRuntime {
  availablePages: Set<string>;
  pageConfigs: Record<string, PageConfig>;
  pageStateRegistry: Record<string, PageState>;
}

interface PageRuntimeContext {
  [DEVTOOLS_CONTEXT]: DevtoolsRuntimeSession | null;
  page: string;
  route: RouteLocation;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  meta: UnknownRecord;
  direction: DirectionController | undefined;
  readonly components: UnknownRecord;
  getPageState(pageName: string): PageState;
  hasPage(pageName: string): boolean;
  navigate(path: string): unknown | Promise<unknown>;
  invalidatePageData(page?: string): void;
  refetchPageData(): Promise<unknown>;
  on: PageEventHub["on"];
  off: PageEventHub["off"];
  once: PageEventHub["once"];
  emit: PageEventHub["emit"];
}

interface PageRouter {
  invalidatePageData(page?: string): void;
  refetchPageData(): Promise<unknown>;
  destroy(): Promise<void>;
  init(): Promise<boolean | void>;
  navigate(
    path: string,
    pagePath?: string
  ): Promise<boolean | void> | undefined;
}

/**
 * Creates the browser page router from injected resource maps.
 *
 * Architecture note: folder discovery remains in adapters; this module only
 * consumes validated logical page names and lazy loaders.
 */
export function createPageRouter(
  adapter: unknown = {},
  options: RouterOptions = {},
  errorBoundary: ErrorBoundaryHook | null = null,
  appContext: {
    direction?: DirectionController;
  } = {}
): PageRouter {
  const resources = validateResourceAdapter(adapter);
  const pageResources = resources.pages;
  const componentResources = resources.components;
  const layoutResources = resources.layouts;
  const pageHtml = pageResources.html || Object.create(null);
  const pageModules = pageResources.modules || Object.create(null);
  const pageConfigs = pageResources.configs || Object.create(null);
  const pageStyles = pageResources.styles || Object.create(null);
  const pageData = pageResources.data || Object.create(null);
  const pageManifests = pageResources.manifests || Object.create(null);
  const layoutHtml = layoutResources.html || Object.create(null);
  const layoutStyles = layoutResources.styles || Object.create(null);
  const layoutManifests = layoutResources.manifests || Object.create(null);
  const runtime: PageRouterRuntime = {
    availablePages: new Set(Object.keys(pageHtml)),
    pageConfigs,
    pageStateRegistry: Object.create(null)
  };
  const pageDataRuntime = createPageDataRuntime(pageData, runtime.availablePages);
  let activeDataOwner: PageDataOwner | null = null;
  const routeTable = createRouteTable(
    [...runtime.availablePages],
    pageConfigs
  );
  const globalGuards = normalizeGuards(options.beforeEach);
  const notFoundPage = String(options.notFoundPage || "404").trim();
  let activePageCleanup: PageCleanup | null = null;
  let activeLocationPath = "";
  let currentRoute: RouteLocation | null = null;
  let initialized = false;
  let latestNavigationId = 0;
  let latestGuardController: AbortController | null = null;
  let navigationController: AbortController | null = null;
  let removeRouterListeners: (() => void) | null = null;
  const scrollPositions = new Map<string, ScrollPosition>();
  const prefetchedPages = new Set<string>();
  const prefetchPromises = new Map<string, Promise<void>>();

  /** Prepares an activation and commits only while its navigation still owns it. */
  async function load(
    path: string,
    pagePath = "",
    historyMode = "",
    redirectDepth = 0,
    navigationId = ++latestNavigationId
  ): Promise<boolean | void> {
    const guardController = redirectDepth > 0 && latestGuardController
      ? latestGuardController : new AbortController();
    if (redirectDepth === 0) {
      latestGuardController?.abort();
      latestGuardController = guardController;
    }
    let navigation: AbortController | null = null;
    let lifecycle: PageLifecycle | null = null;
    let dataOwner: PageDataOwner | null = null;
    let localCleanup: PageCleanup | null = null;
    let retained = false;
    let historyCommitted = false;
    const cleanupFailures = new Set<unknown>();
    /** Observes cleanup failure without turning cancellation into a crash. */
    async function release(cleanup: PageCleanup | null, signal: AbortSignal) {
      try { await awaitWithAbort(cleanup?.(), signal); }
      catch (error) {
        if (signal.aborted || cleanupFailures.has(error)) return;
        cleanupFailures.add(error);
        reportUserActionError(error, {
          code: VD_ERROR.CODES.NAVIGATION_CRASH,
          group: "router", title: "Page Cleanup Failed",
          file: "velodom/page-router.ts",
          hint: "Check destroy() and ctx.onCleanup() callbacks. Other cleanup still runs."
        });
      }
    }
    /** Writes history once, including a failed accepted navigation's fallback. */
    function commitHistory() {
      if (historyCommitted) return;
      saveScrollPosition(scrollPositions, previousScrollKey);
      applyHistoryMode(historyMode, path);
      historyCommitted = true;
    }
    // Plugins are installed after router construction and before init(). Read
    // the session lazily so an opt-in devtools plugin can observe first mount.
    const devtools = getDevtoolsRuntimeSession(appContext);
    const navigationStartedAt = readPerformanceTime();
    const previousScrollKey = getCurrentScrollKey();
    const targetUrl = createRouterUrl(path);
    const route = pagePath
      ? createLegacyRoute(path, pagePath)
      : resolveRouteLocation(path, routeTable);
    const page = route.matched
      ? route.page
      : notFoundPage;

    const app = document.getElementById("app");
    let pageScopeCleanup: (() => void) | null = null;

    devtools?.emit("route:navigate:start", {
      from: currentRoute?.path || null,
      navigationId,
      path: route.path,
      requestedPath: path
    });

    try {
      if (!app) {
        throw new Error("VeloDom requires an #app mount element");
      }

      if (
        canHandleSamePageHashNavigation(
          currentRoute,
          targetUrl,
          pagePath,
          historyMode
        )
      ) {
        // Hash navigation cancels a pending replacement, never the visible page.
        navigationController?.abort();
        const previousUrl = window.location.href;

        saveScrollPosition(scrollPositions, previousScrollKey);
        applyHistoryMode(historyMode, path);
        currentRoute.hash = route.hash;
        devtools?.setRoute(currentRoute);
        activeLocationPath = getCurrentLocationPath();
        restoreScrollPosition(currentRoute, scrollPositions, historyMode);
        moveFocusAfterNavigation(currentRoute, historyMode);
        dispatchRouterHashChange(previousUrl);
        devtools?.emit("route:navigate:end", {
          durationMs: readPerformanceTime() - navigationStartedAt,
          hashOnly: true,
          navigationId,
          page: currentRoute.page,
          path: currentRoute.path
        });
        return true;
      }

      if (route.matched) {
        const guards = [
          ...globalGuards,
          route.beforeEnter
        ];
        const guardResult = await awaitWithAbort(runNavigationGuards(
          guards,
          route,
          currentRoute
        ), guardController.signal);

        // A slower async guard must never commit after a newer navigation.
        if (navigationId !== latestNavigationId) {
          return false;
        }

        if (guardResult.redirect) {
          if (redirectDepth >= 10) {
            throw new Error("Navigation guard redirect limit exceeded");
          }

          return load(
            guardResult.redirect,
            "",
            VD_ROUTER.HISTORY_REPLACE,
            redirectDepth + 1,
            navigationId
          );
        }

        if (!guardResult.allowed) {
          restoreBlockedPopStateLocation(historyMode, activeLocationPath);
          return false;
        }
      }

      assertRequestActive(guardController.signal);
      // A rejected newer guard must not invalidate an already accepted loader.
      navigationController?.abort();
      navigation = new AbortController();
      navigationController = navigation;
      const signal = navigation.signal;
      const state = getOrCreatePageState(page, runtime);
      const initialDataRevision = pageDataRuntime.revision(page);
      const events = createPageEventHub();
      lifecycle = createLifecycleScope(createPageContext(
        state, events, runtime, route,
        targetPath => load(targetPath, "", VD_ROUTER.HISTORY_PUSH), devtools,
        pageDataRuntime.invalidate,
        async () => {
          assertRequestActive(lifecycle?.context.signal);
          if (!dataOwner) throw new Error("Page data refresh requires a mounted page");
          return dataOwner.refetch();
        }
      ), signal);
      lifecycle.context.direction = appContext.direction;
      const ctx = lifecycle.context;
      let directionCleanup: (() => void) | null = null;
      let directivesCleanup: (() => unknown) | null = null;
      let componentsCleanup: PageCleanup | null = null;
      let ownedRoots: Element[] = [];
      let pageModule: UnknownRecord | null = null;
      let hookArgs: ModuleHookArguments | null = null;
      localCleanup = onceAsync(async () => {
        lifecycle?.abort();
        dataOwner?.dispose();
        if (activeDataOwner === dataOwner) activeDataOwner = null;
        const errors: unknown[] = [];
        const attempts: PageCleanup[] = [
          () => directionCleanup?.(),
          () => { pageScopeCleanup?.(); pageScopeCleanup = null; },
          () => events.clear(),
          () => directivesCleanup?.(),
          () => componentsCleanup?.(),
          ...ownedRoots.map(root => () => disposeTree(root)),
          async () => {
            // Preserve destroy-before-onCleanup even when destroy rejects.
            try { if (hookArgs) await runModuleHook(pageModule?.destroy, hookArgs); }
            finally { await lifecycle?.dispose(); }
          }
        ];
        // Start every release even when an application callback rejects or hangs.
        await Promise.all(attempts.map(async cleanup => {
          try { await cleanup(); } catch (error) { errors.push(error); }
        }));
        if (errors.length === 1) throw errors[0];
        if (errors.length > 1) throw new AggregateError(errors, "Multiple VeloDom page cleanups failed");
      });

      const loadHtml = pageHtml[page];

      if (!loadHtml) {
        const error = new Error(`Page "${page}" not found`);

        error.code = VD_INTERNAL.PAGE_NOT_FOUND_CODE;
        throw error;
      }

      const layoutName = resolvePageLayoutName(pageConfigs[page], layoutHtml);
      const loadLayoutHtml = layoutName
        ? layoutHtml[layoutName]
        : null;

      if (layoutName && !loadLayoutHtml) {
        throw new Error(
          `Layout "${layoutName}" configured for page "${page}" was not found`
        );
      }

      const loadManifest = pageManifests[page];
      const loadLayoutManifest = layoutName
        ? layoutManifests[layoutName]
        : null;
      const [
        html,
        manifest,
        layoutTemplate,
        layoutManifest
      ] = await awaitWithAbort(Promise.all([
        loadHtml(),
        loadManifest?.() ?? null,
        loadLayoutHtml?.() ?? null,
        layoutName ? loadLayoutManifest?.() ?? null : undefined
      ]), signal);
      assertRequestActive(signal);
      const activeManifest = combineRuntimeManifests(
        manifest,
        layoutManifest
      );
      const initialPageData = consumePageDataTransfer(
        document,
        page,
        route
      );
      const data = initialPageData.found
        ? initialPageData.data
        : await pageDataRuntime.load({
          page, route, params: route.params, query: route.query,
          meta: route.meta, signal
        });
      const loadModule = pageModules[page];
      pageModule = loadModule ? await awaitWithAbort(loadModule(), signal) : null;
      assertRequestActive(signal);
      // An explicit successful-write invalidation can race initial preparation.
      // Retry the accepted location; never commit a detached pre-write value.
      if (initialDataRevision !== pageDataRuntime.revision(page)) return load(path, pagePath, historyMode);

      const previousCleanup = activePageCleanup;
      activePageCleanup = null;
      if (previousCleanup) await awaitWithAbort(previousCleanup(), signal);
      else await awaitWithAbort(disposeTree(app), signal);
      assertRequestActive(signal);
      if (initialDataRevision !== pageDataRuntime.revision(page)) return load(path, pagePath, historyMode);
      commitHistory();

      applyPageSeo(pageConfigs[page]?.seo, route.path);
      app.innerHTML = layoutName && layoutTemplate
        ? renderPageLayout(layoutTemplate, html, layoutName)
        : html;
      ownedRoots = [...app.children];
      activePageCleanup = localCleanup;
      if (layoutName) {
        await applyScopedFolderStyles(
          app,
          layoutStyles,
          `${layoutName}/`, signal
        );
      }
      await applyScopedFolderStyles(
        app,
        pageStyles,
        `${page}/`, signal
      );

      assertRequestActive(signal);
      if (initialDataRevision !== pageDataRuntime.revision(page)) return load(path, pagePath, historyMode);
      state.__vdPageName = page;
      state.components = {};
      pageScopeCleanup = devtools?.registerScope({
        kind: "page",
        name: page,
        root: app,
        source: `src/pages/${page}`,
        state
      }) || null;
      state[VD_PAGE_DATA.STATE_KEY] = data;
      dataOwner = pageDataRuntime.createOwner({
        page, route, params: route.params, query: route.query,
        meta: route.meta, signal: ctx.signal
      }, value => {
        if (activeDataOwner === dataOwner) state[VD_PAGE_DATA.STATE_KEY] = value;
      });
      activeDataOwner = dataOwner;
      directionCleanup = attachDirectionToPageState(
        state,
        appContext.direction
      );
      attachEventApiToState(state, events);

      const refs = getRefs(app);
      hookArgs = {
        el: app,
        props: {},
        refs,
        state,
        data,
        ctx
      };

      if (pageModule) {
        mergeModuleStateSeed(state, pageModule, "page");
        const init = pageModule.init || pageModule.default;
        const result = await awaitWithAbort(runModuleInit(init, hookArgs), ctx.signal);
        assertRequestActive(signal);

        mergeState(state, result);

      }

      directivesCleanup = await applyDirectives(app, state, {
        signal: ctx.signal,
        el: app,
        props: {},
        page: ctx.page,
        getPageState: ctx.getPageState,
        hasPage: ctx.hasPage,
        navigate: ctx.navigate,
        features: activeManifest?.features,
        mountComponents: (root, scopedState) => mount(
          root,
          scopedState,
          [],
          ctx,
          componentResources,
          errorBoundary
        )
      });

      assertRequestActive(signal);
      componentsCleanup = shouldMountComponents(activeManifest)
          ? await mount(
            app,
            state,
            [],
            ctx,
            componentResources,
            errorBoundary
          )
        : null;

      assertRequestActive(signal);
      await awaitWithAbort(runModuleHook(pageModule?.mounted, hookArgs), ctx.signal);
      assertRequestActive(signal);
      currentRoute = route;
      devtools?.setRoute(route);
      activeLocationPath = getCurrentLocationPath();
      restoreScrollPosition(route, scrollPositions, historyMode);
      moveFocusAfterNavigation(route, historyMode);
      devtools?.emit("route:navigate:end", {
        durationMs: readPerformanceTime() - navigationStartedAt,
        hashOnly: false,
        navigationId,
        page: route.page,
        path: route.path
      });

      retained = true;
      if (navigationController === navigation) navigationController = null;
      return true;

    } catch (err) {
      const signal = navigation?.signal || guardController.signal;
      if (signal.aborted) return false;
      // Preparation can fail before replacement. Release the visible owner too;
      // never discover owners by querying the reusable #app after an await.
      const previousCleanup = activePageCleanup;
      activePageCleanup = null;
      await release(previousCleanup, signal);
      if (previousCleanup !== localCleanup) await release(localCleanup, signal);
      if (signal.aborted) return false;
      devtools?.emit("route:navigate:error", {
        message: err instanceof Error ? err.message : String(err),
        navigationId,
        page,
        path: route.path
      });

      if (!app) {
        reportUserActionError(err, {
          code: VD_ERROR.CODES.NAVIGATION_CRASH,
          group: "router",
          title: "Missing Application Root",
          file: "velodom/page-router.ts",
          line: 144,
          hint: "Add one element with id=\"app\" to the HTML shell.",
          ownership: [{ kind: "application", name: "#app" }]
        });
        return;
      }

      commitHistory();
      currentRoute = null;
      activeLocationPath = getCurrentLocationPath();
      try {
        if (getThrownString(err, "code") !== VD_INTERNAL.PAGE_NOT_FOUND_CODE) {
          const recovered = typeof errorBoundary === "function"
            ? await renderRecoverableErrorBoundary(err, {
              code: VD_ERROR.CODES.NAVIGATION_CRASH,
              group: "router",
              title: "Navigation Crash",
              target: app,
              phase: "navigation",
              hook: errorBoundary,
              file: "velodom/page-router.ts",
              line: 28,
              page,
              ownership: [
                { kind: "application", name: "#app" },
                { kind: "page", name: page }
              ],
              hint: "Check page path, page module exports, and directive expressions used on the page.",
              retry: () => load(path, pagePath, VD_ROUTER.HISTORY_REPLACE),
              navigate: targetPath => load(targetPath, "", VD_ROUTER.HISTORY_PUSH),
              signal
            })
            : false;

          if (signal.aborted) return false;
          if (!recovered) {
            reportUserActionError(err, {
              code: VD_ERROR.CODES.NAVIGATION_CRASH,
              group: "router",
              title: "Navigation Crash",
              file: "velodom/page-router.ts",
              line: 28,
              hint: "Check page path, page module exports, and directive expressions used on the page.",
              ownership: [
                { kind: "application", name: "#app" },
                { kind: "page", name: page }
              ],
              fatal: true
            });
          }
          return;
        }
        const load404 = pageHtml[notFoundPage];
        if (load404) {
          const html = await awaitWithAbort(load404(), signal);
          const layoutName = resolvePageLayoutName(pageConfigs[notFoundPage], layoutHtml);
          const layoutTemplate = layoutName
            ? await awaitWithAbort(layoutHtml[layoutName]?.(), signal)
            : null;

          assertRequestActive(signal);
          applyPageSeo(pageConfigs[notFoundPage]?.seo, route.path);
          app.innerHTML = layoutName && layoutTemplate
            ? renderPageLayout(layoutTemplate, html, layoutName)
            : html;
        } else {
          applyPageSeo(undefined, route.path);
          app.innerHTML = `<h1>Page "${page}" not found</h1>`;
        }
        currentRoute = { ...route, page: notFoundPage, matched: false };
        devtools?.setRoute(currentRoute);
        activeLocationPath = getCurrentLocationPath();
        restoreScrollPosition(currentRoute, scrollPositions, historyMode);
        moveFocusAfterNavigation(currentRoute, historyMode);
        return false;
      } catch (recoveryError) {
        if (signal.aborted) return false;
        reportUserActionError(recoveryError, {
          code: VD_ERROR.CODES.NAVIGATION_CRASH,
          group: "router", title: "Navigation Recovery Failed",
          file: "velodom/page-router.ts",
          hint: "Check the error boundary and not-found page resources.", fatal: true
        });
        return false;
      }
    } finally {
      if (!retained) await release(localCleanup, navigation?.signal || guardController.signal);
      if (!retained && activePageCleanup === localCleanup) activePageCleanup = null;
      if (navigationController === navigation) navigationController = null;
    }
  }

  /** Navigates to the requested application path. */
  function navigate(path: string | null, pagePath = "") {
    if (!path || typeof path !== "string") {
      reportUserActionError("Missing navigation path", {
        code: VD_ERROR.CODES.NAVIGATION_PATH,
        group: "router",
        title: "Invalid Navigation Path",
        file: "velodom/page-router.ts",
        line: 95,
        hint: "Set a valid href on links with vd-nav.",
        ownership: [{ kind: "application", name: "router" }]
      });

      return undefined;
    }

    if (!isAppRelativePath(path)) {
      reportUserActionError(`Unsupported path "${path}"`, {
        code: VD_ERROR.CODES.NAVIGATION_PATH,
        group: "router",
        title: "Unsupported Navigation Target",
        file: "velodom/page-router.ts",
        line: 95,
        hint: "Use app-relative paths such as /profile or /posts/create-post.",
        ownership: [{ kind: "application", name: "router" }]
      });

      return undefined;
    }


    return load(path, pagePath, VD_ROUTER.HISTORY_PUSH);
  }

  /** Initializes this module instance. */
  function init(): Promise<boolean | void> {
    if (initialized) {
      return Promise.resolve();
    }

    initialized = true;
    setManualScrollRestoration();

    const onDocumentClick = (e: MouseEvent) => {

      const link = getClosestEventElement(e,
        VD.selector(VD.NAV)
      );

      if (!link) return;

      e.preventDefault();

      navigate(
        link.getAttribute(VD_ROUTER.HREF_ATTRIBUTE),
        link.getAttribute(VD.PATH) || ""
      );

    };

    const onPopState = (): void => {
      saveScrollPosition(scrollPositions, getCurrentScrollKey());
      load(getCurrentLocationPath(), "", VD_ROUTER.HISTORY_POP);
    };

    const onPrefetchIntent = (e: Event) => {
      const link = getClosestEventElement(e, VD_ROUTER.PREFETCH_SELECTOR);

      if (!link) return;

      prefetchRoute(
        link.getAttribute(VD_ROUTER.HREF_ATTRIBUTE),
        link.getAttribute(VD.PATH) || ""
      );
    };

    document.addEventListener("click", onDocumentClick);
    window.addEventListener(VD_ROUTER.POPSTATE_EVENT, onPopState);
    for (const eventName of VD_ROUTER.PREFETCH_EVENTS) {
      document.addEventListener(eventName, onPrefetchIntent, {
        passive: true
      });
    }
    removeRouterListeners = () => {
      document.removeEventListener("click", onDocumentClick);
      window.removeEventListener(VD_ROUTER.POPSTATE_EVENT, onPopState);
      for (const eventName of VD_ROUTER.PREFETCH_EVENTS) {
        document.removeEventListener(eventName, onPrefetchIntent);
      }
    };

    return load(getCurrentLocationPath());
  }

  /** Prefetches the route. */
  function prefetchRoute(path: string | null, pagePath = ""): void {
    const route = resolvePrefetchRoute(path, pagePath);

    if (!route?.matched || route.page === currentRoute?.page) return;
    if (prefetchedPages.has(route.page) || prefetchPromises.has(route.page)) {
      return;
    }

    const loadHtml = pageHtml[route.page];

    if (!loadHtml) return;

    const layoutName = resolvePageLayoutName(
      pageConfigs[route.page],
      layoutHtml
    );
    const promise = Promise.all([
      loadHtml(),
      pageManifests[route.page]?.() ?? null,
      pageModules[route.page]?.() ?? null,
      layoutName ? layoutHtml[layoutName]?.() ?? null : null,
      layoutName ? layoutManifests[layoutName]?.() ?? null : null
    ])
      .then(() => {
        prefetchedPages.add(route.page);
      })
      .catch(() => {
        prefetchPromises.delete(route.page);
      });

    prefetchPromises.set(route.page, promise);
  }

  /** Resolves the prefetch route. */
  function resolvePrefetchRoute(
    path: string | null,
    pagePath = ""
  ): RouteLocation | null {
    if (!path || typeof path !== "string" || !path.startsWith("/")) {
      return null;
    }

    return pagePath
      ? createLegacyRoute(path, pagePath)
      : resolveRouteLocation(path, routeTable);
  }

  /** Releases resources owned by this module instance. */
  async function destroy(): Promise<void> {
    latestNavigationId++;
    latestGuardController?.abort();
    navigationController?.abort();
    pageDataRuntime.dispose();
    activeDataOwner = null;
    removeRouterListeners?.();
    removeRouterListeners = null;
    initialized = false;

    const cleanup = activePageCleanup;
    activePageCleanup = null;
    currentRoute = null;
    activeLocationPath = "";
    await cleanup?.();
  }

  return {
    invalidatePageData: pageDataRuntime.invalidate,
    async refetchPageData() {
      if (!activeDataOwner) throw new Error("Page data refresh requires a mounted page");
      return activeDataOwner.refetch();
    },
    destroy,
    init,
    navigate
  };
}

/** Evaluates the `shouldMountComponents()` condition for the supplied input. */
function shouldMountComponents(
  manifest: RuntimeFeatureManifest | null | undefined
): boolean {
  return !manifest || manifest.features.includes(
    VD_COMPILER_FEATURES.COMPONENTS
  );
}

/** Resolves the page layout name. */
function resolvePageLayoutName(
  config: PageConfig | undefined,
  layouts: Record<string, ResourceLoader<string>>
): string {
  if (config?.layout === false) return "";

  const configured = normalizeFolderPath(config?.layout);

  if (configured) return configured;

  return layouts[VD_LAYOUT.DEFAULT]
    ? VD_LAYOUT.DEFAULT
    : "";
}

/** Renders the page layout. */
function renderPageLayout(
  layoutHtml: string,
  pageHtml: string,
  layoutName: string
): string {
  const layoutTemplate = document.createElement("template");

  layoutTemplate.innerHTML = layoutHtml;

  const placeholders = layoutTemplate.content.querySelectorAll(
    VD_LAYOUT.PAGE_TAG_SELECTOR
  );

  if (placeholders.length !== 1) {
    throw new Error(
      `Layout "${layoutName}" must contain exactly one <vd-page></vd-page> placeholder`
    );
  }

  const pageTemplate = document.createElement("template");

  pageTemplate.innerHTML = pageHtml;
  placeholders.item(0)?.replaceWith(pageTemplate.content);
  return layoutTemplate.innerHTML;
}

/** Combines the runtime manifests. */
function combineRuntimeManifests(
  pageManifest: RuntimeFeatureManifest | null | undefined,
  layoutManifest: RuntimeFeatureManifest | null | undefined
): RuntimeFeatureManifest | null | undefined {
  const manifests = [
    pageManifest,
    layoutManifest
  ].filter(
    (manifest): manifest is RuntimeFeatureManifest | null => (
      manifest !== undefined
    )
  );

  if (manifests.length === 0) return undefined;
  if (manifests.some(manifest => manifest === null)) return null;

  return {
    directives: uniqueManifestValues(
      manifests as RuntimeFeatureManifest[],
      "directives"
    ),
    features: uniqueManifestValues(
      manifests as RuntimeFeatureManifest[],
      "features"
    )
  };
}

/** Performs the internal `uniqueManifestValues()` operation. */
function uniqueManifestValues(
  manifests: RuntimeFeatureManifest[],
  key: keyof RuntimeFeatureManifest
): string[] {
  return [
    ...new Set(
      manifests.flatMap(manifest => manifest?.[key] || [])
    )
  ].sort();
}

/** Performs the internal `onceAsync()` operation. */
function onceAsync(
  callback: () => unknown | Promise<unknown>
): () => Promise<unknown> {
  let promise: Promise<unknown> | null = null;

  return () => {
    promise ??= Promise.resolve().then(callback);
    return promise;
  };
}

/** Returns the page. */
function getPage(path: string): string {

  if (path === "/") {
    return "home";
  }

  const segments = path
    .split("/")
    .filter(Boolean);

  return segments.join("/") || "home";
}

/** Resolves the page. */
function resolvePage(path: string, pagePath: string): string {
  const custom = normalizeFolderPath(pagePath);
  const route = getPage(path);

  if (!custom) {
    return route;
  }

  if (route === "home") {
    return custom;
  }

  if (route === custom || route.startsWith(`${custom}/`)) {
    return route;
  }

  return `${custom}/${route}`;
}

/** Returns the closest matching element for a routed DOM event. */
function getClosestEventElement(
  event: Event,
  selector: string
): HTMLElement | null {
  return event.target instanceof Element
    ? event.target.closest<HTMLElement>(selector)
    : null;
}

/** Attaches the event API to page state. */
function attachEventApiToState(
  state: PageState,
  events: PageEventHub
): void {
  state.on = events.on;
  state.off = events.off;
  state.once = events.once;
  state.emit = events.emit;
}

/** Attaches the direction to page state. */
function attachDirectionToPageState(
  state: PageState,
  direction: DirectionController | undefined
): (() => void) | null {
  if (!direction) return null;

  state[VD_DIRECTION.STATE_KEY] = direction;

  const internal = direction as DirectionController & {
    _subscribe?: (callback: () => void) => () => void;
  };
  const subscriber = typeof internal._subscribe === "function"
      ? internal._subscribe
      : null;

  if (!subscriber) return null;

  return subscriber(() => {
    state._notify?.();
  });
}

/** Creates the page context. */
function createPageContext(
  state: PageState,
  events: PageEventHub,
  runtime: PageRouterRuntime,
  route: RouteLocation,
  navigate: (path: string) => unknown | Promise<unknown>,
  devtools: DevtoolsRuntimeSession | null,
  invalidatePageData: (page?: string) => void,
  refetchPageData: () => Promise<unknown>
): PageRuntimeContext {
  return {
    [DEVTOOLS_CONTEXT]: devtools,
    page: typeof state.__vdPageName === "string"
      ? state.__vdPageName
      : "",
    route,
    params: route.params || {},
    query: route.query || {},
    meta: route.meta || {},
    direction: state[VD_DIRECTION.STATE_KEY] as DirectionController | undefined,
    get components() {
      return state.components as UnknownRecord;
    },
    getPageState(pageName) {
      return getOrCreatePageState(pageName, runtime);
    },
    hasPage(pageName) {
      return hasRegisteredPage(pageName, runtime);
    },
    navigate,
    invalidatePageData,
    refetchPageData,
    on: events.on,
    off: events.off,
    once: events.once,
    emit: events.emit
  };
}

/** Reads the highest-resolution development timing source available. */
function readPerformanceTime(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

/** Normalizes the guards. */
function normalizeGuards(
  value: RouterOptions["beforeEach"]
): NavigationGuard[] {
  if (value === undefined || value === null) return [];

  const guards = Array.isArray(value) ? value : [value];

  if (guards.some(guard => typeof guard !== "function")) {
    throw new TypeError(
      "router.beforeEach must contain only functions"
    );
  }

  return guards as NavigationGuard[];
}

/** Creates the legacy route. */
function createLegacyRoute(path: string, pagePath: string): RouteLocation {
  const url = new URL(
    String(path || "/"),
    "http://velodom.local"
  );

  return {
    matched: true,
    page: resolvePage(url.pathname, pagePath),
    path: url.pathname,
    pattern: "",
    hash: normalizeHash(url.hash),
    params: {},
    query: {},
    meta: {},
    beforeEnter: null
  };
}

interface ScrollPosition {
  x: number;
  y: number;
}

/** Sets the manual scroll restoration. */
function setManualScrollRestoration(): void {
  if ("scrollRestoration" in history) {
    history.scrollRestoration = VD_ROUTER.HISTORY_MANUAL;
  }
}

/** Applies the history mode. */
function applyHistoryMode(historyMode: string, path: string) {
  if (historyMode === VD_ROUTER.HISTORY_PUSH) {
    history.pushState({}, "", path);
  } else if (historyMode === VD_ROUTER.HISTORY_REPLACE) {
    history.replaceState({}, "", path);
  }
}

/** Restores the blocked pop state location. */
function restoreBlockedPopStateLocation(
  historyMode: string,
  activeLocationPath: string
) {
  if (
    historyMode !== VD_ROUTER.HISTORY_POP
    || !activeLocationPath
    || getCurrentLocationPath() === activeLocationPath
  ) {
    return;
  }

  // A popstate has already changed the address bar. Reinsert the active URL so
  // the visible page and browser location remain one coherent route.
  history.pushState({}, "", activeLocationPath);
}

/**
 * Restores the observable browser behavior replaced by intercepted hash links.
 * `history.pushState()` does not emit `hashchange`, so route-aware components
 * would otherwise miss successful same-page navigation.
 */
function dispatchRouterHashChange(previousUrl: string): void {
  const currentUrl = window.location.href;

  if (previousUrl === currentUrl) return;

  const event = typeof window.HashChangeEvent === "function"
    ? new window.HashChangeEvent(VD_ROUTER.HASHCHANGE_EVENT, {
      oldURL: previousUrl,
      newURL: currentUrl
    })
    : createHashChangeFallback(previousUrl, currentUrl);

  window.dispatchEvent(event);
}

/** Creates the hash change fallback. */
function createHashChangeFallback(oldURL: string, newURL: string): Event {
  const event = new Event(VD_ROUTER.HASHCHANGE_EVENT);

  Object.defineProperties(event, {
    newURL: {
      enumerable: true,
      value: newURL
    },
    oldURL: {
      enumerable: true,
      value: oldURL
    }
  });

  return event;
}

/** Evaluates the `canHandleSamePageHashNavigation()` condition for the supplied input. */
function canHandleSamePageHashNavigation(
  route: RouteLocation | null,
  targetUrl: URL,
  pagePath: string,
  historyMode: string
): route is RouteLocation {
  return Boolean(
    route
    && !pagePath
    && historyMode !== VD_ROUTER.HISTORY_POP
    && targetUrl.hash
    && route.path === normalizeLocationPathname(targetUrl.pathname)
    && location.pathname === normalizeLocationPathname(targetUrl.pathname)
    && location.search === targetUrl.search
  );
}

/** Creates the router URL. */
function createRouterUrl(path: string): URL {
  return new URL(
    String(path || "/"),
    "http://velodom.local"
  );
}

/** Returns the current location path. */
function getCurrentLocationPath(): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

/** Returns the current scroll key. */
function getCurrentScrollKey(): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

/** Saves the scroll position. */
function saveScrollPosition(
  positions: Map<string, ScrollPosition>,
  key: string
): void {
  positions.set(key, {
    x: Number(window.scrollX || 0),
    y: Number(window.scrollY || 0)
  });
}

/** Restores the scroll position. */
function restoreScrollPosition(
  route: RouteLocation,
  positions: Map<string, ScrollPosition>,
  historyMode: string
): void {
  if (route.hash && scrollToHashTarget(route.hash)) {
    return;
  }

  const key = `${route.path}${location.search}${route.hash ? `#${route.hash}` : ""}`;
  const saved = historyMode === VD_ROUTER.HISTORY_POP
    ? positions.get(key)
    : null;

  scrollToPosition(saved || {
    x: VD_ROUTER.SCROLL_TOP,
    y: VD_ROUTER.SCROLL_TOP
  });
}

/** Scrolls the to hash target. */
function scrollToHashTarget(hash: string): boolean {
  const target = findHashTarget(hash);

  if (!target) return false;

  if (typeof target.scrollIntoView === "function") {
    target.scrollIntoView();
    return true;
  }

  scrollToPosition({
    x: VD_ROUTER.SCROLL_TOP,
    y: target.getBoundingClientRect().top + Number(window.scrollY || 0)
  });
  return true;
}

/** Moves the focus after navigation. */
function moveFocusAfterNavigation(
  route: RouteLocation,
  historyMode: string
): void {
  if (!shouldMoveFocusAfterNavigation(route, historyMode)) return;

  const target = route.hash
    ? findHashTarget(route.hash)
    : findNavigationFocusTarget();

  if (!target || !(target instanceof HTMLElement)) return;

  ensureProgrammaticFocusTarget(target);

  try {
    target.focus({
      preventScroll: true
    });
  } catch {
    target.focus();
  }
}

/** Evaluates the `shouldMoveFocusAfterNavigation()` condition for the supplied input. */
function shouldMoveFocusAfterNavigation(
  route: RouteLocation,
  historyMode: string
): boolean {
  return Boolean(
    route?.hash
    || historyMode === VD_ROUTER.HISTORY_PUSH
    || historyMode === VD_ROUTER.HISTORY_REPLACE
    || historyMode === VD_ROUTER.HISTORY_POP
  );
}

/** Finds the navigation focus target. */
function findNavigationFocusTarget(): Element | null {
  for (const selector of VD_ROUTER.FOCUS_TARGET_SELECTORS) {
    const target = document.querySelector(selector);

    if (target) return target;
  }

  return null;
}

/** Ensures the programmatic focus target. */
function ensureProgrammaticFocusTarget(target: HTMLElement): void {
  if (isProgrammaticallyFocusable(target)) return;

  target.setAttribute(
    VD_ROUTER.TABINDEX_ATTRIBUTE,
    VD_ROUTER.PROGRAMMATIC_TABINDEX
  );
  target.setAttribute(VD_ROUTER.MANAGED_FOCUS_ATTRIBUTE, "true");
}

/** Evaluates the `isProgrammaticallyFocusable()` condition for the supplied input. */
function isProgrammaticallyFocusable(target: HTMLElement): boolean {
  const tagName = target.tagName.toLowerCase();

  if (target.hasAttribute(VD_ROUTER.TABINDEX_ATTRIBUTE)) return true;
  if (
    target.getAttribute(VD_ROUTER.CONTENTEDITABLE_ATTRIBUTE)
    === VD_ROUTER.TRUE_VALUE
  ) {
    return true;
  }

  if (VD_ROUTER.FOCUSABLE_CONTROL_TAGS.includes(tagName)) {
    return !target.hasAttribute(VD_ROUTER.DISABLED_ATTRIBUTE);
  }

  if (VD_ROUTER.FOCUSABLE_LINK_TAGS.includes(tagName)) {
    return target.hasAttribute(VD_ROUTER.HREF_ATTRIBUTE);
  }

  return tagName === VD_ROUTER.SUMMARY_TAG;
}

/** Finds the hash target. */
function findHashTarget(hash: string): Element | null {
  const decoded = decodeHash(hash);

  return (
    document.getElementById(decoded)
    || [...document.getElementsByName(decoded)][0]
    || null
  );
}

/** Decodes the hash. */
function decodeHash(hash: string): string {
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
}

/** Normalizes the hash. */
function normalizeHash(hash: string): string {
  return String(hash || "").replace(/^#/, "");
}

/** Normalizes the location pathname. */
function normalizeLocationPathname(pathname: string): string {
  const normalized = String(pathname || "/").replace(/\/{2,}/g, "/");

  return normalized === ""
    ? "/"
    : normalized;
}

/** Scrolls the to position. */
function scrollToPosition(position: ScrollPosition): void {
  if (typeof window.scrollTo === "function") {
    window.scrollTo(position.x, position.y);
  }
}

/** Returns the or create page state. */
function getOrCreatePageState(
  pageName: string,
  runtime: PageRouterRuntime
): PageState {
  const key = normalizeFolderPath(pageName) || "home";

  if (!runtime.pageStateRegistry[key]) {
    const defaults: StateRecord = {
      __vdPageName: key,
      components: {}
    };
    const externalWrites = getPageExternalWriteAllowList(
      key,
      runtime.pageConfigs
    );

    if (externalWrites !== undefined) {
      defaults.$allowExternalWrite = externalWrites;
    }

    runtime.pageStateRegistry[key] = createState(defaults);
  }

  return runtime.pageStateRegistry[key];
}

/** Evaluates the `hasRegisteredPage()` condition for the supplied input. */
function hasRegisteredPage(
  pageName: string,
  runtime: PageRouterRuntime
): boolean {
  const key = normalizeFolderPath(pageName) || "home";

  return runtime.availablePages.has(key);
}

/** Returns the page external write allow list. */
function getPageExternalWriteAllowList(
  pageName: string,
  pageConfigs: Record<string, PageConfig>
): string[] | undefined {
  const config = pageConfigs[pageName];

  if (!config || config.allowExternalWrite === undefined) {
    return undefined;
  }

  if (!Array.isArray(config.allowExternalWrite)) {
    throw new TypeError(
      `Page "${pageName}" allowExternalWrite config must be an array`
    );
  }

  const normalized = config.allowExternalWrite
    .map(key => String(key || "").trim())
    .filter(Boolean);

  if (normalized.length !== config.allowExternalWrite.length) {
    throw new TypeError(
      `Page "${pageName}" allowExternalWrite contains an empty key`
    );
  }

  return [...new Set(normalized)];
}
