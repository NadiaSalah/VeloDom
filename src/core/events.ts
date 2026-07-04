import { reportUserActionError } from "./errors/error-reporter.ts";

export function createPageEventHub() {
  const listeners = new Map();

  const on = (eventName, handler) => {
    if (!eventName || typeof handler !== "function") {
      reportUserActionError("Event listeners require an event name and function handler", {
        title: "Invalid Event Listener",
        file: "src/core/events.ts",
        line: 6,
        level: "warn",
        hint: "Use state.on(\"event:name\", handlerFn)."
      });

      return () => {};
    }

    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set());
    }

    const bucket = listeners.get(eventName);

    bucket.add(handler);

    return () => {
      bucket.delete(handler);

      if (bucket.size === 0) {
        listeners.delete(eventName);
      }
    };
  };

  const off = (eventName, handler) => {
    const bucket = listeners.get(eventName);

    if (!bucket) return;

    if (!handler) {
      listeners.delete(eventName);
      return;
    }

    bucket.delete(handler);

    if (bucket.size === 0) {
      listeners.delete(eventName);
    }
  };

  const once = (eventName, handler) => {
    if (typeof handler !== "function") {
      return () => {};
    }

    const unsubscribe = on(eventName, (payload) => {
      unsubscribe();
      handler(payload);
    });

    return unsubscribe;
  };

  const emit = (eventName, payload) => {
    if (!eventName) {
      reportUserActionError("Missing event name in emit()", {
        title: "Invalid Event Emit",
        file: "src/core/events.ts",
        line: 45,
        level: "warn",
        hint: "Pass an event name like emit(\"nav:opened\", payload)."
      });
      return;
    }

    const bucket = listeners.get(eventName);

    if (!bucket?.size) return;

    [...bucket].forEach(handler => {
      try {
        handler(payload);
      } catch (err) {
        reportUserActionError(err, {
          title: "Event Bus Listener Error",
          file: "src/core/events.ts",
          line: 57,
          hint: `Check the listener registered for "${eventName}".`
        });
      }
    });
  };

  const clear = () => {
    listeners.clear();
  };

  return {
    clear,
    on,
    off,
    once,
    emit
  };
}
