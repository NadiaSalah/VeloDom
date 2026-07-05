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

export function rebaseFiles(files, prefix) {
  const rebased = Object.create(null);

  Object.entries(files).forEach(([filePath, value]) => {
    if (!filePath.startsWith(prefix)) return;

    rebased[filePath.slice(prefix.length)] = value;
  });

  return rebased;
}

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
