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
import {
  VD,
  VD_COMPILER_FEATURES,
  VD_INTERNAL,
  VD_LAYOUT,
  VD_ROUTER
} from "./constants.ts";
import { reportUserActionError } from "./errors/error-reporter.ts";
import { renderRecoverableErrorBoundary } from "./errors/error-boundary.ts";
import {
  runModuleHook,
  runModuleInit
} from "./init-runner.ts";
import { createLifecycleScope } from "./lifecycle.ts";
import {
  createRouteTable,
  resolveRouteLocation,
  runNavigationGuards
} from "./router.ts";
import { validateResourceAdapter } from "./resource-adapter.ts";
import { applyPageSeo } from "./seo.ts";
import { normalizeFolderPath } from "./shared/path.ts";
import type {
  RuntimeFeatureManifest
} from "./compiler/types.ts";
import type {
  ErrorBoundaryHook,
  RouterOptions,
  StateRecord
} from "./types.ts";

interface PageRouter {
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
  errorBoundary: ErrorBoundaryHook | null = null
): PageRouter {
  const resources = validateResourceAdapter(adapter);
  const pageResources = resources.pages;
  const componentResources = resources.components;
  const layoutResources = resources.layouts;
  const pageHtml = pageResources.html || Object.create(null);
  const pageModules = pageResources.modules || Object.create(null);
  const pageConfigs = pageResources.configs || Object.create(null);
  const pageStyles = pageResources.styles || Object.create(null);
  const pageManifests = pageResources.manifests || Object.create(null);
  const layoutHtml = layoutResources.html || Object.create(null);
  const layoutStyles = layoutResources.styles || Object.create(null);
  const layoutManifests = layoutResources.manifests || Object.create(null);
  const runtime = {
    availablePages: new Set(Object.keys(pageHtml)),
    pageConfigs,
    pageStateRegistry: Object.create(null)
  };
  const routeTable = createRouteTable(
    [...runtime.availablePages],
    pageConfigs
  );
  const globalGuards = normalizeGuards(options.beforeEach);
  const notFoundPage = String(options.notFoundPage || "404").trim();
  let activePageCleanup = null;
  let currentRoute = null;
  let initialized = false;
  let removeRouterListeners = null;
  const scrollPositions = new Map<string, ScrollPosition>();
  const prefetchedPages = new Set<string>();
  const prefetchPromises = new Map<string, Promise<void>>();

  async function load(
    path: string,
    pagePath = "",
    historyMode = "",
    redirectDepth = 0
  ): Promise<boolean | void> {
    const previousScrollKey = getCurrentScrollKey();
    const targetUrl = createRouterUrl(path);
    const route = pagePath
      ? createLegacyRoute(path, pagePath)
      : resolveRouteLocation(path, routeTable);
    const page = route.matched
      ? route.page
      : notFoundPage;

    const app = document.getElementById("app");

    try {
      if (
        canHandleSamePageHashNavigation(
          currentRoute,
          targetUrl,
          pagePath,
          historyMode
        )
      ) {
        saveScrollPosition(scrollPositions, previousScrollKey);
        applyHistoryMode(historyMode, path);
        currentRoute.hash = route.hash;
        restoreScrollPosition(currentRoute, scrollPositions, historyMode);
        moveFocusAfterNavigation(currentRoute, historyMode);
        return true;
      }

      if (route.matched) {
        const guards = [
          ...globalGuards,
          route.beforeEnter
        ];
        const guardResult = await runNavigationGuards(
          guards,
          route,
          currentRoute
        );

        if (guardResult.redirect) {
          if (redirectDepth >= 10) {
            throw new Error("Navigation guard redirect limit exceeded");
          }

          return load(
            guardResult.redirect,
            "",
            VD_ROUTER.HISTORY_REPLACE,
            redirectDepth + 1
          );
        }

        if (!guardResult.allowed) {
          return false;
        }
      }

      saveScrollPosition(scrollPositions, previousScrollKey);

      applyHistoryMode(historyMode, path);

      if (activePageCleanup) {
        await activePageCleanup();
        activePageCleanup = null;
      } else {
        await disposeTree(app);
      }

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
      ] = await Promise.all([
        loadHtml(),
        loadManifest?.() ?? null,
        loadLayoutHtml?.() ?? null,
        layoutName ? loadLayoutManifest?.() ?? null : undefined
      ]);
      const activeManifest = combineRuntimeManifests(
        manifest,
        layoutManifest
      );

      applyPageSeo(pageConfigs[page]?.seo, route.path);
      app.innerHTML = layoutName && layoutTemplate
        ? renderPageLayout(layoutTemplate, html, layoutName)
        : html;
      if (layoutName) {
        await applyScopedFolderStyles(
          app,
          layoutStyles,
          `${layoutName}/`
        );
      }
      await applyScopedFolderStyles(
        app,
        pageStyles,
        `${page}/`
      );

      const state = getOrCreatePageState(page, runtime);
      state.__vdPageName = page;
      state.components = {};
      const events = createPageEventHub();
      const lifecycle = createLifecycleScope(
        createPageContext(state, events, runtime, route)
      );
      const ctx = lifecycle.context;

      attachEventApiToState(state, events);

      const refs = getRefs(app);
      const loadModule = pageModules[page];
      let pageModule = null;
      const hookArgs = {
        el: app,
        props: {},
        refs,
        state,
        ctx
      };

      if (loadModule) {

        pageModule = await loadModule();
        const init = pageModule.init || pageModule.default;
        const result = await runModuleInit(init, hookArgs);

        mergeState(state, result);

      }

      const directivesCleanup = await applyDirectives(app, state, {
        el: app,
        props: {},
        page: ctx.page,
        getPageState: ctx.getPageState,
        hasPage: ctx.hasPage,
        features: activeManifest?.features
      });

      const componentsCleanup = shouldMountComponents(activeManifest)
          ? await mount(
            app,
            state,
            [],
            ctx,
            componentResources,
            errorBoundary
          )
        : null;

      activePageCleanup = onceAsync(async () => {
        await componentsCleanup?.();
        directivesCleanup?.();
        await runModuleHook(pageModule?.destroy, hookArgs);
        await lifecycle.dispose();
        events.clear();
      });

      await runModuleHook(pageModule?.mounted, hookArgs);
      currentRoute = route;
      restoreScrollPosition(route, scrollPositions, historyMode);
      moveFocusAfterNavigation(route, historyMode);

      return true;

    } catch (err) {
      if (err?.code !== VD_INTERNAL.PAGE_NOT_FOUND_CODE) {
        const recovered = typeof errorBoundary === "function"
          ? await renderRecoverableErrorBoundary(err, {
            title: "Navigation Crash",
            target: app,
            phase: "navigation",
            hook: errorBoundary,
            file: "src/core/page-router.ts",
            line: 28,
            page,
            hint: "Check page path, page module exports, and directive expressions used on the page.",
            retry: () => load(path, pagePath, VD_ROUTER.HISTORY_REPLACE),
            navigate: targetPath => load(
              targetPath,
              "",
              VD_ROUTER.HISTORY_PUSH
            )
          })
          : false;

        if (!recovered) {
          reportUserActionError(err, {
            title: "Navigation Crash",
            file: "src/core/page-router.ts",
            line: 28,
            hint: "Check page path, page module exports, and directive expressions used on the page.",
            fatal: true
          });
        }

        return;
      }

      const load404 = pageHtml[notFoundPage];

      if (load404) {
        applyPageSeo(
          pageConfigs[notFoundPage]?.seo,
          route.path
        );
        const html = await load404();
        const layoutName = resolvePageLayoutName(
          pageConfigs[notFoundPage],
          layoutHtml
        );
        const layoutTemplate = layoutName
          ? await layoutHtml[layoutName]?.()
          : null;

        app.innerHTML = layoutName && layoutTemplate
          ? renderPageLayout(layoutTemplate, html, layoutName)
          : html;
      } else {
        applyPageSeo(undefined, route.path);
        app.innerHTML = `<h1>Page "${page}" not found</h1>`;
      }

      currentRoute = {
        ...route,
        page: notFoundPage,
        matched: false
      };
      restoreScrollPosition(currentRoute, scrollPositions, historyMode);
      moveFocusAfterNavigation(currentRoute, historyMode);
      return false;
    }
  }

  function navigate(path: string, pagePath = "") {
    if (!path || typeof path !== "string") {
      reportUserActionError("Missing navigation path", {
        title: "Invalid Navigation Path",
        file: "src/core/page-router.ts",
        line: 95,
        hint: "Set a valid href on links with vd-nav."
      });

      return;
    }

    if (!path.startsWith("/")) {
      reportUserActionError(`Unsupported path "${path}"`, {
        title: "Unsupported Navigation Target",
        file: "src/core/page-router.ts",
        line: 95,
        hint: "Use app-relative paths such as /profile or /posts/create-post."
      });

      return;
    }


    return load(path, pagePath, VD_ROUTER.HISTORY_PUSH);
  }

  function init() {
    if (initialized) {
      return Promise.resolve();
    }

    initialized = true;
    setManualScrollRestoration();

    const onDocumentClick = (e) => {

      const link = e.target.closest(
        VD.selector(VD.NAV)
      );

      if (!link) return;

      e.preventDefault();

      navigate(
        link.getAttribute(VD_ROUTER.HREF_ATTRIBUTE),
        link.getAttribute(VD.PATH) || ""
      );

    };

    const onPopState = () => {
      saveScrollPosition(scrollPositions, getCurrentScrollKey());
      load(getCurrentLocationPath(), "", VD_ROUTER.HISTORY_POP);
    };

    const onPrefetchIntent = (e) => {
      const link = e.target.closest(VD_ROUTER.PREFETCH_SELECTOR);

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

  function prefetchRoute(path, pagePath = "") {
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

  function resolvePrefetchRoute(path, pagePath = "") {
    if (!path || typeof path !== "string" || !path.startsWith("/")) {
      return null;
    }

    return pagePath
      ? createLegacyRoute(path, pagePath)
      : resolveRouteLocation(path, routeTable);
  }

  async function destroy() {
    removeRouterListeners?.();
    removeRouterListeners = null;
    initialized = false;

    if (activePageCleanup) {
      await activePageCleanup();
      activePageCleanup = null;
    }
  }

  return {
    destroy,
    init,
    navigate
  };
}

function shouldMountComponents(manifest) {
  return !manifest || manifest.features.includes(
    VD_COMPILER_FEATURES.COMPONENTS
  );
}

function resolvePageLayoutName(config, layouts) {
  if (config?.layout === false) return "";

  const configured = normalizeFolderPath(config?.layout);

  if (configured) return configured;

  return layouts[VD_LAYOUT.DEFAULT]
    ? VD_LAYOUT.DEFAULT
    : "";
}

function renderPageLayout(
  layoutHtml: string,
  pageHtml: string,
  layoutName: string
) {
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
  placeholders[0].replaceWith(pageTemplate.content);
  return layoutTemplate.innerHTML;
}

function combineRuntimeManifests(
  pageManifest: RuntimeFeatureManifest | null | undefined,
  layoutManifest: RuntimeFeatureManifest | null | undefined
): RuntimeFeatureManifest | null | undefined {
  const manifests = [
    pageManifest,
    layoutManifest
  ].filter(manifest => manifest !== undefined);

  if (manifests.length === 0) return undefined;
  if (manifests.some(manifest => manifest === null)) return null;

  return {
    directives: uniqueManifestValues(manifests, "directives"),
    features: uniqueManifestValues(manifests, "features")
  };
}

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

function onceAsync(callback) {
  let promise = null;

  return () => {
    promise ??= Promise.resolve().then(callback);
    return promise;
  };
}

function getPage(path) {

  if (path === "/") {
    return "home";
  }

  const segments = path
    .split("/")
    .filter(Boolean);

  return segments.join("/") || "home";
}

function resolvePage(path, pagePath) {
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

function attachEventApiToState(state, events) {
  state.on = events.on;
  state.off = events.off;
  state.once = events.once;
  state.emit = events.emit;
}

function createPageContext(state, events, runtime, route) {
  return {
    page: state.__vdPageName || "",
    route,
    params: route.params || {},
    query: route.query || {},
    meta: route.meta || {},
    get components() {
      return state.components;
    },
    getPageState(pageName) {
      return getOrCreatePageState(pageName, runtime);
    },
    hasPage(pageName) {
      return hasRegisteredPage(pageName, runtime);
    },
    on: events.on,
    off: events.off,
    once: events.once,
    emit: events.emit
  };
}

function normalizeGuards(value) {
  if (value === undefined || value === null) return [];

  return (Array.isArray(value) ? value : [value])
    .filter(guard => typeof guard === "function");
}

function createLegacyRoute(path, pagePath) {
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

function setManualScrollRestoration() {
  if ("scrollRestoration" in history) {
    history.scrollRestoration = VD_ROUTER.HISTORY_MANUAL;
  }
}

function applyHistoryMode(historyMode: string, path: string) {
  if (historyMode === VD_ROUTER.HISTORY_PUSH) {
    history.pushState({}, "", path);
  } else if (historyMode === VD_ROUTER.HISTORY_REPLACE) {
    history.replaceState({}, "", path);
  }
}

function canHandleSamePageHashNavigation(
  route,
  targetUrl: URL,
  pagePath: string,
  historyMode: string
) {
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

function createRouterUrl(path: string) {
  return new URL(
    String(path || "/"),
    "http://velodom.local"
  );
}

function getCurrentLocationPath() {
  return `${location.pathname}${location.search}${location.hash}`;
}

function getCurrentScrollKey() {
  return `${location.pathname}${location.search}${location.hash}`;
}

function saveScrollPosition(
  positions: Map<string, ScrollPosition>,
  key: string
) {
  positions.set(key, {
    x: Number(window.scrollX || 0),
    y: Number(window.scrollY || 0)
  });
}

function restoreScrollPosition(
  route,
  positions: Map<string, ScrollPosition>,
  historyMode: string
) {
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

function scrollToHashTarget(hash: string) {
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

function moveFocusAfterNavigation(route, historyMode: string) {
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

function shouldMoveFocusAfterNavigation(route, historyMode: string) {
  return Boolean(
    route?.hash
    || historyMode === VD_ROUTER.HISTORY_PUSH
    || historyMode === VD_ROUTER.HISTORY_REPLACE
    || historyMode === VD_ROUTER.HISTORY_POP
  );
}

function findNavigationFocusTarget() {
  for (const selector of VD_ROUTER.FOCUS_TARGET_SELECTORS) {
    const target = document.querySelector(selector);

    if (target) return target;
  }

  return null;
}

function ensureProgrammaticFocusTarget(target: HTMLElement) {
  if (isProgrammaticallyFocusable(target)) return;

  target.setAttribute(
    VD_ROUTER.TABINDEX_ATTRIBUTE,
    VD_ROUTER.PROGRAMMATIC_TABINDEX
  );
  target.setAttribute(VD_ROUTER.MANAGED_FOCUS_ATTRIBUTE, "true");
}

function isProgrammaticallyFocusable(target: HTMLElement) {
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

function findHashTarget(hash: string) {
  const decoded = decodeHash(hash);

  return (
    document.getElementById(decoded)
    || [...document.getElementsByName(decoded)][0]
    || null
  );
}

function decodeHash(hash: string) {
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
}

function normalizeHash(hash) {
  return String(hash || "").replace(/^#/, "");
}

function normalizeLocationPathname(pathname: string) {
  const normalized = String(pathname || "/").replace(/\/{2,}/g, "/");

  return normalized === ""
    ? "/"
    : normalized;
}

function scrollToPosition(position: ScrollPosition) {
  if (typeof window.scrollTo === "function") {
    window.scrollTo(position.x, position.y);
  }
}

function getOrCreatePageState(pageName, runtime) {
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

function hasRegisteredPage(pageName, runtime) {
  const key = normalizeFolderPath(pageName) || "home";

  return runtime.availablePages.has(key);
}

function getPageExternalWriteAllowList(pageName, pageConfigs) {
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
