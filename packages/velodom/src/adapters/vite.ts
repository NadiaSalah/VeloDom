/**
 * ----------------------------------------
 * Module: Vite Resource Adapter
 * ----------------------------------------
 *
 * Discovers application-owned pages, components, scripts, styles, configs,
 * optional .vd single-file modules, and compiler manifests without leaking
 * Vite APIs into the core runtime.
 * ----------------------------------------
 */

import {
  indexFolderFiles,
  indexFolderVariants,
  indexSingleFiles,
  mapFileApiRoutes,
  mapFileMiddleware,
  mapLoaderExports,
  rebaseFiles,
  rebaseSingleFileStyles,
  resolveConventionExport
} from "./resource-map.ts";
import type {
  RuntimeFeatureManifest
} from "../compiler/types.ts";
import { createApp } from "../velodom.ts";
import type {
  RequestMiddleware,
  RequestRouteRegistry,
  ResourceAdapter,
  VeloDomApp,
  VeloDomAppOptions
} from "../types.ts";
import {
  VD_ADAPTER,
  VD_DEVTOOLS,
  VD_RESOURCE_ADAPTER
} from "../constants.ts";
import {
  VELODOM_LAB_CONFIG_NAME
} from "../devtools/protocol.ts";

/** Beginner-friendly Vite options; resource discovery is supplied by VeloDom. */
export type ViteAppOptions = Omit<VeloDomAppOptions, "adapter">;

const applicationRouteFiles = import.meta.glob(
  [
    "/src/api/routes.js",
    "/src/api/routes.ts"
  ],
  {
    eager: true,
    import: "default"
  }
);
const applicationFileRouteFiles = import.meta.glob(
  [
    "/src/api/*/**/*.js",
    "/src/api/*/**/*.ts",
    "!/src/api/routes.js",
    "!/src/api/routes.ts",
    "!/src/api/middleware.js",
    "!/src/api/middleware.ts",
    "!/src/api/middleware/**"
  ],
  {
    eager: true,
    import: "default"
  }
);
const applicationMiddlewareFiles = import.meta.glob(
  [
    "/src/api/middleware.js",
    "/src/api/middleware.ts"
  ],
  {
    eager: true,
    import: "default"
  }
);
const applicationFileMiddlewareFiles = import.meta.glob(
  [
    "/src/api/middleware/*/**/*.js",
    "/src/api/middleware/*/**/*.ts"
  ],
  {
    eager: true,
    import: "default"
  }
);

const pageTemplateFiles = import.meta.glob(
  "/src/pages/**/index.html",
  {
    query: "?raw"
  }
);
const pageHtmlFiles = mapLoaderExports<string>(
  pageTemplateFiles,
  "default"
);
const pageManifestFiles = mapLoaderExports<
  RuntimeFeatureManifest | undefined
>(
  pageTemplateFiles,
  "__vdManifest"
);
const pageSingleFileModuleLoaders = import.meta.glob(
  "/src/pages/**/*.vd"
);
const pageSingleFileHtmlFiles = mapLoaderExports<string>(
  pageSingleFileModuleLoaders,
  "default"
);
const pageSingleFileManifestFiles = mapLoaderExports<
  RuntimeFeatureManifest | undefined
>(
  pageSingleFileModuleLoaders,
  "__vdManifest"
);

const pageModuleFiles = import.meta.glob([
  "/src/pages/**/script.ts",
  "/src/pages/**/script.js",
  "/src/pages/**/page.js"
]);
const pageDataFiles = import.meta.glob([
  "/src/pages/**/data.ts",
  "/src/pages/**/data.js"
]);
const pageConfigFiles = import.meta.glob(
  [
    "/src/pages/**/config.ts",
    "/src/pages/**/config.js",
    "/src/pages/**/page.config.ts",
    "/src/pages/**/page.config.js"
  ],
  {
    eager: true,
    import: "default"
  }
);
// Route discovery needs config before navigation, but templates, scripts,
// styles, and manifests must stay in their lazy page chunk. The Vite plugin
// extracts only the config block for this eager build-time metadata request.
const pageSingleFileConfigs = import.meta.glob(
  "/src/pages/**/*.vd",
  {
    eager: true,
    import: "__vdConfig",
    query: "?vd-config"
  }
);
const pageStyleFiles = import.meta.glob(
  "/src/pages/**/*.css",
  {
    query: "?inline",
    import: "default"
  }
);
const pageSingleFileStyles = mapLoaderExports<string>(
  pageSingleFileModuleLoaders,
  "__vdStyle"
);

const componentTemplateFiles = import.meta.glob(
  "/src/components/**/index.html",
  {
    query: "?raw"
  }
);
const componentHtmlFiles = mapLoaderExports<string>(
  componentTemplateFiles,
  "default"
);
const componentManifestFiles = mapLoaderExports<
  RuntimeFeatureManifest | undefined
>(
  componentTemplateFiles,
  "__vdManifest"
);
const componentSingleFileTemplateFiles = import.meta.glob(
  "/src/components/**/*.vd"
);
const componentSingleFileHtmlFiles = mapLoaderExports<string>(
  componentSingleFileTemplateFiles,
  "default"
);
const componentSingleFileManifestFiles = mapLoaderExports<
  RuntimeFeatureManifest | undefined
>(
  componentSingleFileTemplateFiles,
  "__vdManifest"
);
const componentModuleFiles = import.meta.glob([
  "/src/components/**/script.ts",
  "/src/components/**/script.js",
  "/src/components/**/component.js"
]);
const componentSingleFileModuleFiles = import.meta.glob(
  "/src/components/**/*.vd"
);
const componentStyleFiles = import.meta.glob(
  "/src/components/**/*.css",
  {
    query: "?inline",
    import: "default"
  }
);
const componentSingleFileStyleFiles = import.meta.glob(
  "/src/components/**/*.vd"
);
const componentSingleFileStyles = mapLoaderExports<string>(
  componentSingleFileStyleFiles,
  "__vdStyle"
);

const layoutTemplateFiles = import.meta.glob(
  "/src/layouts/**/index.html",
  {
    query: "?raw"
  }
);
const layoutHtmlFiles = mapLoaderExports<string>(
  layoutTemplateFiles,
  "default"
);
const layoutManifestFiles = mapLoaderExports<
  RuntimeFeatureManifest | undefined
>(
  layoutTemplateFiles,
  "__vdManifest"
);
const layoutSingleFileTemplateFiles = import.meta.glob(
  "/src/layouts/**/*.vd"
);
const layoutSingleFileHtmlFiles = mapLoaderExports<string>(
  layoutSingleFileTemplateFiles,
  "default"
);
const layoutSingleFileManifestFiles = mapLoaderExports<
  RuntimeFeatureManifest | undefined
>(
  layoutSingleFileTemplateFiles,
  "__vdManifest"
);
const layoutStyleFiles = import.meta.glob(
  "/src/layouts/**/*.css",
  {
    query: "?inline",
    import: "default"
  }
);
const layoutSingleFileStyleFiles = import.meta.glob(
  "/src/layouts/**/*.vd"
);
const layoutSingleFileStyles = mapLoaderExports<string>(
  layoutSingleFileStyleFiles,
  "__vdStyle"
);

/**
 * Creates the lazy resource adapter consumed by the generic VeloDom runtime.
 */
export function createViteAdapter(): ResourceAdapter {
  return {
    version: VD_ADAPTER.VERSION,
    capabilities: [
      "resource-discovery",
      "page-config",
      "page-data",
      "layouts",
      "compiler-manifests"
    ],
    pages: {
      html: {
        ...indexSingleFiles(pageSingleFileHtmlFiles, "/src/pages/"),
        ...indexFolderFiles(
          pageHtmlFiles,
          "/src/pages/",
          "/index.html"
        )
      },
      modules: {
        ...indexSingleFiles(pageSingleFileModuleLoaders, "/src/pages/"),
        ...indexFolderVariants(
          pageModuleFiles,
          "/src/pages/",
          [
            "/script.ts",
            "/script.js",
            "/page.js"
          ]
        )
      },
      data: indexFolderVariants(
        pageDataFiles,
        "/src/pages/",
        VD_RESOURCE_ADAPTER.FILES.DATA_VARIANTS
      ),
      configs: {
        ...indexSingleFiles(pageSingleFileConfigs, "/src/pages/"),
        ...indexFolderVariants(
          pageConfigFiles,
          "/src/pages/",
          [
            "/config.ts",
            "/config.js",
            "/page.config.ts",
            "/page.config.js"
          ]
        )
      },
      manifests: {
        ...indexSingleFiles(pageSingleFileManifestFiles, "/src/pages/"),
        ...indexFolderFiles(
          pageManifestFiles,
          "/src/pages/",
          "/index.html"
        )
      },
      styles: {
        ...rebaseSingleFileStyles(pageSingleFileStyles, "/src/pages/"),
        ...rebaseFiles(pageStyleFiles, "/src/pages/")
      }
    },
    components: {
      html: {
        ...indexSingleFiles(componentSingleFileHtmlFiles, "/src/components/"),
        ...indexFolderFiles(
          componentHtmlFiles,
          "/src/components/",
          "/index.html"
        )
      },
      modules: {
        ...indexSingleFiles(componentSingleFileModuleFiles, "/src/components/"),
        ...indexFolderVariants(
          componentModuleFiles,
          "/src/components/",
          [
            "/script.ts",
            "/script.js",
            "/component.js"
          ]
        )
      },
      manifests: {
        ...indexSingleFiles(componentSingleFileManifestFiles, "/src/components/"),
        ...indexFolderFiles(
          componentManifestFiles,
          "/src/components/",
          "/index.html"
        )
      },
      styles: {
        ...rebaseSingleFileStyles(componentSingleFileStyles, "/src/components/"),
        ...rebaseFiles(componentStyleFiles, "/src/components/")
      }
    },
    layouts: {
      html: {
        ...indexSingleFiles(layoutSingleFileHtmlFiles, "/src/layouts/"),
        ...indexFolderFiles(
          layoutHtmlFiles,
          "/src/layouts/",
          "/index.html"
        )
      },
      manifests: {
        ...indexSingleFiles(layoutSingleFileManifestFiles, "/src/layouts/"),
        ...indexFolderFiles(
          layoutManifestFiles,
          "/src/layouts/",
          "/index.html"
        )
      },
      styles: {
        ...rebaseSingleFileStyles(layoutSingleFileStyles, "/src/layouts/"),
        ...rebaseFiles(layoutStyleFiles, "/src/layouts/")
      }
    }
  };
}

/**
 * Creates a Vite-backed application using folder conventions for resources,
 * request routes, and application middleware.
 *
 * Explicit options always take precedence over convention-discovered files.
 */
export function createViteApp(
  options: ViteAppOptions = {}
): VeloDomApp {
  const conventionRoutes = resolveConventionExport<RequestRouteRegistry>(
    applicationRouteFiles,
    "request route registry"
  );
  const conventionMiddleware = resolveConventionExport<
    Record<string, RequestMiddleware>
  >(
    applicationMiddlewareFiles,
    "application middleware registry"
  );

  return createApp({
    ...options,
    routes: options.routes
      ?? conventionRoutes
      ?? mapFileApiRoutes<RequestRouteRegistry[string]>(
        applicationFileRouteFiles,
        "/src/api/"
      ),
    middleware: options.middleware
      ?? conventionMiddleware
      ?? mapFileMiddleware<RequestMiddleware>(
        applicationFileMiddlewareFiles,
        "/src/api/middleware/"
      ),
    adapter: createViteAdapter()
  });
}

/**
 * Creates and mounts the conventional Vite application in `#app`.
 *
 * This is the recommended beginner entry point. Advanced applications can use
 * createViteApp() or the generic createApp() API when explicit composition is
 * preferable.
 */
export function mountVeloDom(
  options: ViteAppOptions = {}
): Promise<VeloDomApp> {
  return mountViteApp(options);
}

/** Mounts the vite app. */
async function mountViteApp(
  options: ViteAppOptions
): Promise<VeloDomApp> {
  const app = createViteApp(await addLabPluginWhenRequested(options));

  await app.mount();
  return app;
}

/** Adds the development bridge only when the Vite Lab bootstrap requested it. */
async function addLabPluginWhenRequested(
  options: ViteAppOptions
): Promise<ViteAppOptions> {
  // Vite statically replaces the direct DEV access. Optional chaining leaves
  // the expression untouched in browsers and would silently disable the Lab.
  if (!import.meta.env.DEV) return options;
  if (typeof window === "undefined") return options;

  const config = (
    window as unknown as Record<string, unknown>
  )[VELODOM_LAB_CONFIG_NAME];

  if (!config || typeof config !== "object") return options;

  const globalName = String(
    (config as Record<string, unknown>).globalName || VD_DEVTOOLS.GLOBAL_NAME
  );
  const {
    createDevtoolsPlugin
  } = await import("../request-tools.ts");

  return {
    ...options,
    plugins: [
      createDevtoolsPlugin({ globalName }),
      ...(options.plugins || [])
    ]
  };
}
