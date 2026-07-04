export function createPluginManager(plugins = [], getContext = () => ({})) {
  if (!Array.isArray(plugins)) {
    throw new TypeError("VeloDom plugins must be an array");
  }

  const records = plugins.map((plugin, index) => normalizePlugin(plugin, index));
  const cleanups = [];
  let installed = false;

  return {
    async setup() {
      if (installed) return;

      installed = true;

      for (const record of records) {
        const result = await record.setup(getContext());
        const cleanup = typeof result === "function"
          ? result
          : record.cleanup;

        if (typeof cleanup === "function") {
          cleanups.push(cleanup);
        }
      }
    },

    async destroy() {
      if (!installed) return;

      installed = false;

      for (const cleanup of cleanups.splice(0).reverse()) {
        await cleanup(getContext());
      }
    }
  };
}

function normalizePlugin(plugin, index) {
  if (typeof plugin === "function") {
    return {
      setup: plugin,
      cleanup: null
    };
  }

  if (
    plugin
    && typeof plugin === "object"
    && typeof plugin.setup === "function"
  ) {
    return {
      setup: plugin.setup.bind(plugin),
      cleanup: typeof plugin.cleanup === "function"
        ? plugin.cleanup.bind(plugin)
        : null
    };
  }

  throw new TypeError(
    `Plugin at index ${index} must be a function or an object with setup()`
  );
}
