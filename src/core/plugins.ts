import type {
  PluginContext,
  VeloDomPlugin
} from "./types.ts";

type PluginCallback<TContext> = (
  context: TContext
) => unknown | Promise<unknown>;

interface NormalizedPlugin<TContext> {
  setup: PluginCallback<TContext>;
  cleanup: PluginCallback<TContext> | null;
}

export function createPluginManager(
  plugins: VeloDomPlugin[] = [],
  getContext: () => PluginContext = () => ({} as PluginContext)
) {
  if (!Array.isArray(plugins)) {
    throw new TypeError("VeloDom plugins must be an array");
  }

  const records = plugins.map((plugin, index) => normalizePlugin(plugin, index));
  const cleanups: PluginCallback<PluginContext>[] = [];
  let installed = false;

  return {
    async setup() {
      if (installed) return;

      installed = true;

      for (const record of records) {
        const result = await record.setup(getContext());
        const cleanup = typeof result === "function"
          ? (context: PluginContext) => Reflect.apply(
            result,
            undefined,
            [context]
          )
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

function normalizePlugin(
  plugin: unknown,
  index: number
): NormalizedPlugin<PluginContext> {
  if (typeof plugin === "function") {
    return {
      setup: context => Reflect.apply(plugin, undefined, [context]),
      cleanup: null
    };
  }

  if (
    plugin
    && typeof plugin === "object"
    && "setup" in plugin
    && typeof plugin.setup === "function"
  ) {
    const setup = plugin.setup;
    const cleanup = "cleanup" in plugin
      && typeof plugin.cleanup === "function"
      ? plugin.cleanup
      : null;

    return {
      setup: context => Reflect.apply(setup, plugin, [context]),
      cleanup: cleanup
        ? context => Reflect.apply(cleanup, plugin, [context])
        : null
    };
  }

  throw new TypeError(
    `Plugin at index ${index} must be a function or an object with setup()`
  );
}
