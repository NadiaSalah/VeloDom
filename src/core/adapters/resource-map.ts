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
