/**
 * ----------------------------------------
 * Module: Resource Map Utilities
 * ----------------------------------------
 *
 * Indexes build-tool resource loaders by page/component folder or optional
 * single-file modules while preserving lazy loading and filename precedence.
 * ----------------------------------------
 */

import { VD_SINGLE_FILE } from "../constants.ts";

/** Indexes one canonical file per folder. */
export function indexFolderFiles(files, prefix, suffix) {
  const indexed = Object.create(null);

  Object.entries(files).forEach(([filePath, value]) => {
    if (!filePath.startsWith(prefix) || !filePath.endsWith(suffix)) {
      return;
    }

    const name = filePath
      .slice(prefix.length, -suffix.length)
      .replace(/^\/+|\/+$/g, "");

    if (name) {
      indexed[name] = value;
    }
  });

  return indexed;
}

/** Indexes optional .vd single-file modules by their logical route name. */
export function indexSingleFiles(
  files,
  prefix,
  suffix = VD_SINGLE_FILE.EXTENSION
) {
  const indexed = Object.create(null);

  Object.entries(files).forEach(([filePath, value]) => {
    if (!filePath.startsWith(prefix) || !filePath.endsWith(suffix)) {
      return;
    }

    const name = filePath
      .slice(prefix.length, -suffix.length)
      .replace(/^\/+|\/+$/g, "");

    if (name) {
      indexed[name] = value;
    }
  });

  return indexed;
}

/** Creates lazy readers for named exports from discovered modules. */
export function mapLoaderExports<T = unknown>(
  files: Record<string, () => Promise<unknown>>,
  exportName: string
): Record<string, () => Promise<T>> {
  return Object.fromEntries(
    Object.entries(files).map(([filePath, load]) => [
      filePath,
      async () => {
        const module = await load();

        return (module && typeof module === "object"
          ? (module as Record<string, unknown>)[exportName]
          : undefined) as T;
      }
    ])
  );
}

/** Extracts named exports from eager build-tool module records. */
export function mapEagerExports<T = unknown>(
  files: Record<string, unknown>,
  exportName: string
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(files).map(([filePath, module]) => [
      filePath,
      (module && typeof module === "object"
        ? (module as Record<string, unknown>)[exportName]
        : undefined) as T
    ])
  );
}

/** Wraps eager build-tool modules in async loaders for runtime consistency. */
export function mapEagerModulesToLoaders(
  files: Record<string, unknown>
): Record<string, () => Promise<unknown>> {
  return Object.fromEntries(
    Object.entries(files).map(([filePath, module]) => [
      filePath,
      async () => module
    ])
  );
}

/** Removes an adapter-specific path prefix from resource keys. */
export function rebaseFiles(files, prefix) {
  const rebased = Object.create(null);

  Object.entries(files).forEach(([filePath, value]) => {
    if (!filePath.startsWith(prefix)) return;

    rebased[filePath.slice(prefix.length)] = value;
  });

  return rebased;
}

/** Rebases .vd style blocks so existing folder-scoped style loading can apply. */
export function rebaseSingleFileStyles(
  files,
  prefix,
  suffix = VD_SINGLE_FILE.EXTENSION
) {
  const rebased = Object.create(null);

  Object.entries(files).forEach(([filePath, value]) => {
    if (!filePath.startsWith(prefix) || !filePath.endsWith(suffix)) {
      return;
    }

    const name = filePath
      .slice(prefix.length, -suffix.length)
      .replace(/^\/+|\/+$/g, "");

    if (name) {
      rebased[`${name}/${VD_SINGLE_FILE.STYLE_FILENAME}`] = value;
    }
  });

  return rebased;
}

/** Selects the highest-priority filename variant for each folder. */
export function indexFolderVariants(files, prefix, suffixes) {
  const indexed = Object.create(null);
  const priorities = new Map(
    suffixes.map((suffix, index) => [suffix, index])
  );
  const selectedPriorities = Object.create(null);

  Object.entries(files).forEach(([filePath, value]) => {
    if (!filePath.startsWith(prefix)) return;

    const suffix = suffixes.find(candidate => filePath.endsWith(candidate));

    if (!suffix) return;

    const name = filePath
      .slice(prefix.length, -suffix.length)
      .replace(/^\/+|\/+$/g, "");
    const priority = priorities.get(suffix);

    if (
      !name
      || (
        selectedPriorities[name] !== undefined
        && selectedPriorities[name] <= priority
      )
    ) {
      return;
    }

    indexed[name] = value;
    selectedPriorities[name] = priority;
  });

  return indexed;
}

/**
 * Resolves one optional convention file and rejects ambiguous or malformed
 * application registries before the runtime starts.
 */
export function resolveConventionExport<T>(
  modules: Record<string, unknown>,
  label: string
): T | undefined {
  const entries = Object.entries(modules);

  if (!entries.length) return undefined;

  if (entries.length > 1) {
    const files = entries.map(([file]) => file).join(", ");

    throw new Error(
      `[VeloDom] Found multiple ${label} files: ${files}. Keep either the JavaScript or TypeScript file.`
    );
  }

  const [file, value] = entries[0];

  if (!value || typeof value !== "object") {
    throw new TypeError(
      `[VeloDom] ${file} must default-export a ${label} object.`
    );
  }

  return value as T;
}

/**
 * Converts nested user-owned API handler files into dot-separated route names.
 *
 * Only nested files participate so root `src/api/*.js` modules can remain
 * ordinary reusable HTTP helpers. For example, `posts/get.js` becomes
 * `posts.get` while `posts.js` stays an unregistered helper module.
 */
export function mapFileApiRoutes<T>(
  files: Record<string, unknown>,
  prefix: string
): Record<string, T> {
  return mapNestedFileHandlers(files, prefix, "API route", 2);
}

/**
 * Converts nested middleware files into dot-separated middleware names.
 *
 * For example, `middleware/auth.js` becomes `auth`; deeper folders remain
 * visible in the name so `middleware/security/auth.js` becomes
 * `security.auth`.
 */
export function mapFileMiddleware<T>(
  files: Record<string, unknown>,
  prefix: string
): Record<string, T> {
  return mapNestedFileHandlers(files, prefix, "middleware", 1);
}

function mapNestedFileHandlers<T>(
  files: Record<string, unknown>,
  prefix: string,
  label: string,
  minimumSegments: number
): Record<string, T> {
  const routes: Record<string, T> = {};
  const sources = new Map<string, string>();

  Object.entries(files)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([filePath, handler]) => {
      if (!filePath.startsWith(prefix) || !/\.(?:js|ts)$/.test(filePath)) {
        return;
      }

      const segments = filePath
        .slice(prefix.length)
        .replace(/\.(?:js|ts)$/, "")
        .split("/")
        .filter(Boolean);

      if (segments.length < minimumSegments) {
        return;
      }

      const name = segments.join(".");
      const existing = sources.get(name);

      if (existing) {
        throw new Error(
          `[VeloDom] Multiple file ${label}s resolve to "${name}": ${existing}, ${filePath}. Keep one handler file per ${label}.`
        );
      }

      if (typeof handler !== "function") {
        throw new TypeError(
          `[VeloDom] File ${label} "${name}" in ${filePath} must default-export a handler function.`
        );
      }

      routes[name] = handler as T;
      sources.set(name, filePath);
    });

  return routes;
}
