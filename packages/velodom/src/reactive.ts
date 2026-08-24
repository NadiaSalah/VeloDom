/**
 * ----------------------------------------
 * Module: Reactive State
 * ----------------------------------------
 *
 * Creates shallow reactive state, inherited child scopes, subscriber cleanup,
 * and guarded component expose merging without business-specific behavior.
 * ----------------------------------------
 */

import { VD_PROTECTED_STATE_KEYS } from "./constants.ts";
import { isPlainObject } from "./shared/object.ts";
import type {
  ComputedValue,
  WatchOptions
} from "./types.ts";

/** Internal subscriber methods attached non-enumerably to reactive state. */
export interface ReactiveStateMethods {
  _subscribe(callback: () => void): () => void;
  _notify(): void;
  _dispose?(): void;
}

/** Combines application state with its reactive subscriber methods. */
export type ReactiveState<T extends object> = T & ReactiveStateMethods;

/** Wraps an object in VeloDom's shallow reactive proxy. */
export function reactive<T extends object>(
  obj: T
): ReactiveState<T> {

  const listeners = new Set<() => void>();

  const proxy = new Proxy(obj, {

    set(target, key, value) {

      Reflect.set(target, key, value);

      listeners.forEach(fn => fn());

      return true;
    }

  });

  Object.defineProperties(proxy, {
    _subscribe: {
      value(fn) {
        listeners.add(fn);

        return () => {
          listeners.delete(fn);
        };
      }
    },

    _notify: {
      value() {
        listeners.forEach(fn => fn());
      }
    }
  });

  return proxy as ReactiveState<T>;
}

/** Creates independent reactive state from defaults. */
export function createState<T extends object = Record<string, unknown>>(
  defaults: T = {} as T
) {
  return reactive({ ...defaults });
}

/**
 * Creates a small read-only value that recomputes when its state source emits.
 *
 * This intentionally subscribes to the supplied shallow state rather than
 * adding global dependency tracking or a second template language.
 */
export function computed<TState extends object, TValue>(
  state: ReactiveState<TState>,
  getter: (state: TState) => TValue
): ComputedValue<TValue> {
  if (typeof getter !== "function") {
    throw new TypeError("VeloDom computed requires a getter function");
  }

  let value = getter(state);
  let disposed = false;
  const unsubscribe = state._subscribe(() => {
    value = getter(state);
  });

  return Object.freeze({
    get value() {
      return value;
    },
    dispose() {
      if (disposed) return;

      disposed = true;
      unsubscribe();
    }
  });
}

/**
 * Runs a callback when a selected value changes and returns a stop function.
 */
export function watch<TState extends object, TValue>(
  state: ReactiveState<TState>,
  selector: (state: TState) => TValue,
  callback: (value: TValue, previous: TValue | undefined) => void,
  options: WatchOptions = {}
) {
  if (typeof selector !== "function" || typeof callback !== "function") {
    throw new TypeError("VeloDom watch requires selector and callback functions");
  }

  let previous = selector(state);

  if (options.immediate) {
    callback(previous, undefined);
  }

  return state._subscribe(() => {
    const next = selector(state);

    if (Object.is(next, previous)) return;

    const previousValue = previous;

    previous = next;
    callback(next, previousValue);
  });
}

/**
 * Runs an effect now and after state updates, cleaning prior work when needed.
 */
export function effect<TState extends object>(
  state: ReactiveState<TState>,
  callback: (state: TState) => void | (() => void)
) {
  if (typeof callback !== "function") {
    throw new TypeError("VeloDom effect requires a callback function");
  }

  let cleanup: (() => void) | undefined;

  const run = () => {
    cleanup?.();
    cleanup = callback(state) || undefined;
  };
  const unsubscribe = state._subscribe(run);

  run();

  return () => {
    unsubscribe();
    cleanup?.();
    cleanup = undefined;
  };
}

/** Creates local reactive state that inherits reads from a parent scope. */
export function createChildState<
  TParent extends object,
  TDefaults extends object = Record<string, unknown>
>(
  parent: ReactiveState<TParent> | null,
  defaults: TDefaults = {} as TDefaults
): ReactiveState<TParent & TDefaults> {
  const listeners = new Set<() => void>();
  const target = { ...defaults };

  const notify = () => {
    listeners.forEach(fn => fn());
  };

  const unsubscribeParent = parent?._subscribe?.(notify);

  const proxy = new Proxy(target, {
    get(target, key) {
      if (key in target) {
        return Reflect.get(target, key);
      }

      return parent
        ? Reflect.get(parent, key)
        : undefined;
    },

    set(target, key, value) {
      Reflect.set(target, key, value);
      notify();

      return true;
    },

    has(target, key) {
      return key in target || Boolean(parent && key in parent);
    }
  });

  Object.defineProperties(proxy, {
    _subscribe: {
      value(fn) {
        listeners.add(fn);

        return () => {
          listeners.delete(fn);
        };
      }
    },

    _notify: {
      value: notify
    },

    _dispose: {
      value() {
        unsubscribeParent?.();
        listeners.clear();
      }
    }
  });

  return proxy as ReactiveState<TParent & TDefaults>;
}

/** Merges a module initialization result into existing reactive state. */
export function mergeState(state, result) {
  const next = result?.state ?? result;

  if (!next || typeof next !== "object" || next === state) {
    return state;
  }

  Object.assign(state, next);

  return state;
}

/** Adds validated component expose members to local component state. */
export function mergeExposedMembers(
  state: Record<string, unknown>,
  expose: unknown
) {
  if (expose === undefined || expose === null) {
    return state;
  }

  if (!isPlainObject(expose)) {
    throw new TypeError("Component expose must be a plain object");
  }

  Object.entries(expose).forEach(([name, value]) => {
    if (VD_PROTECTED_STATE_KEYS.includes(name)) {
      throw new TypeError(
        `Component expose member "${name}" conflicts with protected state`
      );
    }

    state[name] = typeof value === "function"
      ? (...args: unknown[]) => Reflect.apply(value, state, args)
      : value;
  });

  return state;
}
