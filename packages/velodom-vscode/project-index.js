/**
 * ----------------------------------------
 * Module: VS Code Convention Index
 * ----------------------------------------
 *
 * Derives component names and static page routes from normal VeloDom file
 * paths. The editor extension owns this light index so it never imports
 * adapter internals or changes application runtime behavior.
 * ----------------------------------------
 */

/**
 * Indexes application-relative VeloDom page and component file paths.
 *
 * @param {string[]} paths Application-relative file paths.
 * @returns {{ componentFiles: Record<string, string>, componentNames: string[], routeFiles: Record<string, string>, routes: string[] }}
 */
function indexProjectPaths(paths) {
  const componentFiles = Object.create(null);
  const routeFiles = Object.create(null);

  for (const rawPath of paths) {
    const path = normalizePath(rawPath);
    const component = readConventionName(path, "src/components/");

    if (component) {
      componentFiles[component] ||= path;
      continue;
    }

    const page = readConventionName(path, "src/pages/");

    if (page) {
      routeFiles[createRoutePath(page)] ||= path;
    }
  }

  return {
    componentFiles,
    componentNames: Object.keys(componentFiles).sort(),
    routeFiles,
    routes: Object.keys(routeFiles).sort(compareRoutes)
  };
}

function readConventionName(path, root) {
  if (!path.startsWith(root)) return null;

  const relative = path.slice(root.length);

  if (relative.endsWith(".vd")) {
    return relative.slice(0, -3);
  }

  if (relative.endsWith("/index.html")) {
    return relative.slice(0, -"/index.html".length);
  }

  return null;
}

function createRoutePath(page) {
  if (page === "home") return "/";

  return `/${page}`.replace(/\[([^\]]+)\]/g, ":$1");
}

function compareRoutes(left, right) {
  return left === "/" ? -1 : right === "/" ? 1 : left.localeCompare(right);
}

function normalizePath(path) {
  return String(path || "").replaceAll("\\", "/").replace(/^\.\//, "");
}

module.exports = {
  indexProjectPaths
};
