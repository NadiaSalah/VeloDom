/**
 * ----------------------------------------
 * Module: Vite Resource Adapter
 * ----------------------------------------
 *
 * Discovers application-owned pages, components, scripts, styles, configs,
 * and compiler manifests without leaking Vite APIs into the core runtime.
 * ----------------------------------------
 */

import {
  indexFolderFiles,
  indexFolderVariants,
  mapLoaderExports,
  rebaseFiles
} from "./resource-map.ts";
import type {
  RuntimeFeatureManifest
} from "../compiler/types.ts";
import type { ResourceAdapter } from "../types.ts";

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
const pageStyleFiles = import.meta.glob(
  "/src/pages/**/*.css",
  {
    query: "?inline",
    import: "default"
  }
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
const componentModuleFiles = import.meta.glob([
  "/src/components/**/script.ts",
  "/src/components/**/script.js",
  "/src/components/**/component.js"
]);
const componentStyleFiles = import.meta.glob(
  "/src/components/**/*.css",
  {
    query: "?inline",
    import: "default"
  }
);

/**
 * Creates the lazy resource adapter consumed by the generic VeloDom runtime.
 */
export function createViteAdapter(): ResourceAdapter {
  return {
    pages: {
      html: indexFolderFiles(
        pageHtmlFiles,
        "/src/pages/",
        "/index.html"
      ),
      modules: indexFolderVariants(
        pageModuleFiles,
        "/src/pages/",
        [
          "/script.ts",
          "/script.js",
          "/page.js"
        ]
      ),
      configs: indexFolderVariants(
        pageConfigFiles,
        "/src/pages/",
        [
          "/config.js",
          "/page.config.js"
        ]
      ),
      manifests: indexFolderFiles(
        pageManifestFiles,
        "/src/pages/",
        "/index.html"
      ),
      styles: rebaseFiles(pageStyleFiles, "/src/pages/")
    },
    components: {
      html: indexFolderFiles(
        componentHtmlFiles,
        "/src/components/",
        "/index.html"
      ),
      modules: indexFolderVariants(
        componentModuleFiles,
        "/src/components/",
        [
          "/script.ts",
          "/script.js",
          "/component.js"
        ]
      ),
      manifests: indexFolderFiles(
        componentManifestFiles,
        "/src/components/",
        "/index.html"
      ),
      styles: rebaseFiles(componentStyleFiles, "/src/components/")
    }
  };
}
