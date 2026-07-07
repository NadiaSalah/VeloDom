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
  VD_INTERNAL
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
  const pageHtml = pageResources.html || Object.create(null);
  const pageModules = pageResources.modules || Object.create(null);
  const pageConfigs = pageResources.configs || Object.create(null);
  const pageStyles = pageResources.styles || Object.create(null);
  const pageManifests = pageResources.manifests || Object.create(null);
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

  async function load(
    path: string,
    pagePath = "",
    historyMode = "",
    redirectDepth = 0
  ): Promise<boolean | void> {
    const route = pagePath
      ? createLegacyRoute(path, pagePath)
      : resolveRouteLocation(path, routeTable);
    const page = route.matched
      ? route.page
      : notFoundPage;

    const app = document.getElementById("app");

    try {
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
            "replace",
            redirectDepth + 1
          );
        }

        if (!guardResult.allowed) {
          return false;
        }
      }

      if (historyMode === "push") {
        history.pushState({}, "", path);
      } else if (historyMode === "replace") {
        history.replaceState({}, "", path);
      }

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

      const loadManifest = pageManifests[page];
      const [html, manifest] = await Promise.all([
        loadHtml(),
        loadManifest?.() ?? null
      ]);

      applyPageSeo(pageConfigs[page]?.seo, route.path);
      app.innerHTML = html;
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
        features: manifest?.features
      });

      const componentsCleanup = shouldMountComponents(manifest)
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
            retry: () => load(path, pagePath, "replace"),
            navigate: targetPath => load(targetPath, "", "push")
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
        app.innerHTML = await load404();
      } else {
        applyPageSeo(undefined, route.path);
        app.innerHTML = `<h1>Page "${page}" not found</h1>`;
      }

      currentRoute = {
        ...route,
        page: notFoundPage,
        matched: false
      };
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


    return load(path, pagePath, "push");
  }

  function init() {
    if (initialized) {
      return Promise.resolve();
    }

    initialized = true;

    const onDocumentClick = (e) => {

      const link = e.target.closest(
        VD.selector(VD.NAV)
      );

      if (!link) return;

      e.preventDefault();

      navigate(
        link.getAttribute("href"),
        link.getAttribute(VD.PATH) || ""
      );

    };

    const onPopState = () => {
      load(`${location.pathname}${location.search}`);
    };

    document.addEventListener("click", onDocumentClick);
    window.addEventListener("popstate", onPopState);
    removeRouterListeners = () => {
      document.removeEventListener("click", onDocumentClick);
      window.removeEventListener("popstate", onPopState);
    };

    return load(`${location.pathname}${location.search}`);
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
  return {
    matched: true,
    page: resolvePage(path, pagePath),
    path,
    pattern: "",
    params: {},
    query: {},
    meta: {},
    beforeEnter: null
  };
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
