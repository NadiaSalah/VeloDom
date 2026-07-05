/**
 * ----------------------------------------
 * Module: Lifecycle Scope
 * ----------------------------------------
 *
 * Owns cleanup callbacks and an AbortSignal for one page or component, then
 * disposes resources once in reverse registration order.
 * ----------------------------------------
 */

import type {
  LifecycleContext,
  MaybePromise
} from "./types.ts";

/** Creates an abortable lifecycle context around an application context. */
export function createLifecycleScope<
  TContext extends object = Record<string, never>
>(
  baseContext: TContext = {} as TContext
) {
  const controller = new AbortController();
  const callbacks: Array<() => MaybePromise<void>> = [];
  let disposed = false;

  const context: TContext & LifecycleContext = {
    ...baseContext,
    signal: controller.signal,
    onCleanup(callback: () => MaybePromise<void>) {
      if (typeof callback !== "function") {
        throw new TypeError("onCleanup() requires a function");
      }

      if (disposed) {
        callback();
        return () => {};
      }

      callbacks.push(callback);

      return () => {
        const index = callbacks.indexOf(callback);

        if (index !== -1) {
          callbacks.splice(index, 1);
        }
      };
    }
  } as TContext & LifecycleContext;

  return {
    context,
    get disposed() {
      return disposed;
    },
    async dispose() {
      if (disposed) return;

      disposed = true;
      controller.abort();

      const errors = [];

      for (const callback of callbacks.splice(0).reverse()) {
        try {
          await callback();
        } catch (error) {
          errors.push(error);
        }
      }

      if (errors.length === 1) {
        throw errors[0];
      }

      if (errors.length > 1) {
        throw new AggregateError(
          errors,
          "Multiple VeloDom lifecycle cleanup callbacks failed"
        );
      }
    }
  };
}
