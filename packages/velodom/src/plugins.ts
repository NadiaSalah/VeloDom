/**
 * ----------------------------------------
 * Module: Plugin Manager
 * ----------------------------------------
 *
 * Validates plugin contracts, installs plugins in registration order, and
 * destroys their cleanup hooks in reverse order.
 * ----------------------------------------
 */

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

/** Creates an idempotent manager for application plugin setup and cleanup. */
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

/**
 * Checks a plugin's public shape without installing it in an application.
 *
 * Plugin authors can call this from their own conformance fixtures to catch a
 * malformed setup/cleanup contract before publishing an optional integration.
 */
export function assertPluginConformance(plugin: VeloDomPlugin): void {
  normalizePlugin(plugin, 0);
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
