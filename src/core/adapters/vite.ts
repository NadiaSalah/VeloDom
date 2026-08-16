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
  mapEagerExports,
  mapEagerModulesToLoaders,
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
import { VD_ADAPTER } from "../constants.ts";

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
const pageSingleFileModules = import.meta.glob(
  "/src/pages/**/*.vd",
  {
    eager: true
  }
);
const pageSingleFileModuleLoaders = mapEagerModulesToLoaders(
  pageSingleFileModules
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
const pageConfigFiles = import.meta.glob(
  [
    "/src/pages/**/config.js",
    "/src/pages/**/page.config.js"
  ],
  {
    eager: true,
    import: "default"
  }
);
const pageSingleFileConfigs = mapEagerExports(
  pageSingleFileModules,
  "__vdConfig"
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
      configs: {
        ...indexSingleFiles(pageSingleFileConfigs, "/src/pages/"),
        ...indexFolderVariants(
          pageConfigFiles,
          "/src/pages/",
          [
            "/config.js",
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
  return createApp({
    ...options,
    routes: options.routes ?? resolveConventionExport<RequestRouteRegistry>(
      applicationRouteFiles,
      "request route registry"
    ),
    middleware: options.middleware ?? resolveConventionExport<
      Record<string, RequestMiddleware>
    >(
      applicationMiddlewareFiles,
      "application middleware registry"
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

async function mountViteApp(
  options: ViteAppOptions
): Promise<VeloDomApp> {
  const app = createViteApp(options);

  await app.mount();
  return app;
}
