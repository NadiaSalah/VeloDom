/**
 * ----------------------------------------
 * Module: Resource Map Utilities
 * ----------------------------------------
 *
 * Indexes build-tool resource loaders by page or component folder while
 * preserving lazy loading and preferred filename precedence.
 * ----------------------------------------
 */

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

/** Removes an adapter-specific path prefix from resource keys. */
export function rebaseFiles(files, prefix) {
  const rebased = Object.create(null);

  Object.entries(files).forEach(([filePath, value]) => {
    if (!filePath.startsWith(prefix)) return;

    rebased[filePath.slice(prefix.length)] = value;
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
