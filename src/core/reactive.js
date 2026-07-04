export function reactive(obj) {

  const listeners = new Set();

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

export function createState(defaults = {}) {
  return reactive({ ...defaults });
}

export function createChildState(parent, defaults = {}) {
  const listeners = new Set();
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
