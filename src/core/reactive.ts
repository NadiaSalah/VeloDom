import { VD_PROTECTED_STATE_KEYS } from "./constants.ts";
import { isPlainObject } from "./shared/object.ts";

export function reactive(obj: any) {

  const listeners = new Set<() => void>();

  const proxy = new Proxy(obj, {

    set(target, key, value) {

      target[key] = value;

      listeners.forEach(fn => fn());

      return true;
    }

  });

  Object.defineProperties(proxy, {
    _subscribe: {
      value(fn) {
        listeners.add(fn);

        return () => listeners.delete(fn);
      }
    },

    _notify: {
      value() {
        listeners.forEach(fn => fn());
      }
    }
  });

  return proxy;
}

export function createState(defaults: any = {}) {
  return reactive({ ...defaults });
}

export function createChildState(parent: any, defaults: any = {}) {
  const listeners = new Set<() => void>();
  const target = { ...defaults };

  const notify = () => {
    listeners.forEach(fn => fn());
  };

  const unsubscribeParent = parent?._subscribe?.(notify);

  const proxy = new Proxy(target, {
    get(target, key) {
      if (key in target) {
        return target[key];
      }

      return parent?.[key];
    },

    set(target, key, value) {
      target[key] = value;
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

        return () => listeners.delete(fn);
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

  return proxy;
}

export function mergeState(state, result) {
  const next = result?.state ?? result;

  if (!next || typeof next !== "object" || next === state) {
    return state;
  }

  Object.assign(state, next);

  return state;
}

export function mergeExposedMembers(state, expose) {
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
      ? (...args) => value.apply(state, args)
      : value;
  });

  return state;
}
