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
  "../../pages/**/index.html",
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
  "../../pages/**/script.ts",
  "../../pages/**/script.js",
  "../../pages/**/page.js"
]);
const pageConfigFiles = import.meta.glob(
  [
    "../../pages/**/config.js",
    "../../pages/**/page.config.js"
  ],
  {
    eager: true,
    import: "default"
  }
);
const pageStyleFiles = import.meta.glob(
  "../../pages/**/*.css",
  {
    query: "?inline",
    import: "default"
  }
);

const componentTemplateFiles = import.meta.glob(
  "../../components/**/index.html",
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
  "../../components/**/script.ts",
  "../../components/**/script.js",
  "../../components/**/component.js"
]);
const componentStyleFiles = import.meta.glob(
  "../../components/**/*.css",
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
        "../../pages/",
        "/index.html"
      ),
      modules: indexFolderVariants(
        pageModuleFiles,
        "../../pages/",
        [
          "/script.ts",
          "/script.js",
          "/page.js"
        ]
      ),
      configs: indexFolderVariants(
        pageConfigFiles,
        "../../pages/",
        [
          "/config.js",
          "/page.config.js"
        ]
      ),
      manifests: indexFolderFiles(
        pageManifestFiles,
        "../../pages/",
        "/index.html"
      ),
      styles: rebaseFiles(pageStyleFiles, "../../pages/")
    },
    components: {
      html: indexFolderFiles(
        componentHtmlFiles,
        "../../components/",
        "/index.html"
      ),
      modules: indexFolderVariants(
        componentModuleFiles,
        "../../components/",
        [
          "/script.ts",
          "/script.js",
          "/component.js"
        ]
      ),
      manifests: indexFolderFiles(
        componentManifestFiles,
        "../../components/",
        "/index.html"
      ),
      styles: rebaseFiles(componentStyleFiles, "../../components/")
    }
  };
}
