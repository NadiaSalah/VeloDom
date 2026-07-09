/**
 * ----------------------------------------
 * Module: Optional Shared State
 * ----------------------------------------
 *
 * Creates application-owned shared state handles that become visible to the
 * app only when their plugin is explicitly installed.
 * ----------------------------------------
 */

import {
  VD_SHARED_STATE
} from "./constants.ts";
import { createState } from "./reactive.ts";
import { isPlainObject } from "./shared/object.ts";
import type {
  SharedState,
  SharedStateHandle,
  SharedStatePluginOptions,
  StateRecord,
  VeloDomApp
} from "./types.ts";

/**
 * Creates an optional shared state handle and its plugin registration.
 *
 * Architecture note: shared state is application-owned and opt-in. Creating a
 * handle does not mutate the app; the plugin must be registered explicitly.
 */
export function createSharedState<
  TState extends StateRecord = StateRecord
>(
  initialState: TState = {} as TState,
  options: SharedStatePluginOptions = {}
): SharedStateHandle<TState> {
  if (!isPlainObject(initialState)) {
    throw new TypeError("VeloDom shared state requires a plain object");
  }

  const name = normalizeSharedStateName(options.name);
  const state = createState(initialState) as unknown as SharedState<TState>;

  return Object.freeze({
    state,
    plugin: {
      setup({
        app
      }) {
        const registry = getOrCreateSharedRegistry(app);
        const existing = registry[name];

        if (existing && existing !== state) {
          throw new Error(`VeloDom shared state "${name}" is already registered`);
        }

        registry[name] = state;

        return () => {
          if (app.shared?.[name] === state) {
            Reflect.deleteProperty(app.shared, name);
          }

          if (app.shared && Object.keys(app.shared).length === 0) {
            Reflect.deleteProperty(app, VD_SHARED_STATE.APP_PROPERTY);
          }
        };
      }
    }
  });
}

function normalizeSharedStateName(name: unknown) {
  const normalized = String(name || VD_SHARED_STATE.DEFAULT_NAME).trim();

  if (!normalized) {
    throw new TypeError("VeloDom shared state name cannot be empty");
  }

  return normalized;
}

function getOrCreateSharedRegistry(app: VeloDomApp) {
  if (!app.shared) {
    Object.defineProperty(app, VD_SHARED_STATE.APP_PROPERTY, {
      configurable: true,
      enumerable: true,
      value: Object.create(null)
    });
  }

  return app.shared as Record<string, SharedState>;
}
