import {
  indexFolderFiles,
  indexFolderVariants,
  rebaseFiles
} from "./resource-map.js";

const pageHtmlFiles = import.meta.glob(
  "../pages/**/index.html",
  {
    query: "?raw",
    import: "default"
  }
);

const pageModuleFiles = import.meta.glob([
  "../pages/**/script.ts",
  "../pages/**/script.js",
  "../pages/**/page.js"
]);
const pageConfigFiles = import.meta.glob(
  [
    "../pages/**/config.js",
    "../pages/**/page.config.js"
  ],
  {
    eager: true,
    import: "default"
  }
);
const pageStyleFiles = import.meta.glob(
  "../pages/**/*.css",
  {
    query: "?inline",
    import: "default"
  }
);

const componentHtmlFiles = import.meta.glob(
  "../components/**/index.html",
  {
    query: "?raw",
    import: "default"
  }
);
const componentModuleFiles = import.meta.glob([
  "../components/**/script.ts",
  "../components/**/script.js",
  "../components/**/component.js"
]);
const componentStyleFiles = import.meta.glob(
  "../components/**/*.css",
  {
    query: "?inline",
    import: "default"
  }
);

export function createViteAdapter() {
  return {
    pages: {
      html: indexFolderFiles(
        pageHtmlFiles,
        "../pages/",
        "/index.html"
      ),
      modules: indexFolderVariants(
        pageModuleFiles,
        "../pages/",
        [
          "/script.ts",
          "/script.js",
          "/page.js"
        ]
      ),
      configs: indexFolderVariants(
        pageConfigFiles,
        "../pages/",
        [
          "/config.js",
          "/page.config.js"
        ]
      ),
      styles: rebaseFiles(pageStyleFiles, "../pages/")
    },
    components: {
      html: indexFolderFiles(
        componentHtmlFiles,
        "../components/",
        "/index.html"
      ),
      modules: indexFolderVariants(
        componentModuleFiles,
        "../components/",
        [
          "/script.ts",
          "/script.js",
          "/component.js"
        ]
      ),
      styles: rebaseFiles(componentStyleFiles, "../components/")
    }
  };
}
