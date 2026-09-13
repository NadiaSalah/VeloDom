/**
 * ----------------------------------------
 * Module: Page Event Hub
 * ----------------------------------------
 *
 * Provides page-scoped on/off/once/emit behavior with listener isolation,
 * cleanup, and structured reporting for invalid or failing handlers.
 * ----------------------------------------
 */

import { reportUserActionError } from "./errors/error-reporter.ts";

type PageEventHandler = (payload: unknown) => unknown;

/** Page-scoped event API attached to one active route. */
export interface PageEventHub {
  clear(): void;
  emit(eventName: string, payload?: unknown): void;
  off(eventName: string, handler?: PageEventHandler): void;
  on(eventName: string, handler: PageEventHandler): () => void;
  once(eventName: string, handler: PageEventHandler): () => void;
}

/** Creates an isolated event hub owned by one mounted page. */
export function createPageEventHub(): PageEventHub {
  const listeners = new Map<string, Set<PageEventHandler>>();

  const on = (eventName: string, handler: PageEventHandler) => {
    if (!eventName || typeof handler !== "function") {
      reportUserActionError("Event listeners require an event name and function handler", {
        title: "Invalid Event Listener",
        file: "velodom/events.ts",
        line: 6,
        level: "warn",
        hint: "Use state.on(\"event:name\", handlerFn)."
      });

      return () => {};
    }

    let bucket = listeners.get(eventName);

    if (!bucket) {
      bucket = new Set<PageEventHandler>();
      listeners.set(eventName, bucket);
    }

    bucket.add(handler);

    return () => {
      bucket.delete(handler);

      if (bucket.size === 0) {
        listeners.delete(eventName);
      }
    };
  };

  const off = (eventName: string, handler?: PageEventHandler) => {
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

  const once = (eventName: string, handler: PageEventHandler) => {
    if (typeof handler !== "function") {
      return () => {};
    }

    const unsubscribe = on(eventName, (payload: unknown) => {
      unsubscribe();
      handler(payload);
    });

    return unsubscribe;
  };

  const emit = (eventName: string, payload?: unknown) => {
    if (!eventName) {
      reportUserActionError("Missing event name in emit()", {
        title: "Invalid Event Emit",
        file: "velodom/events.ts",
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
          file: "velodom/events.ts",
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
