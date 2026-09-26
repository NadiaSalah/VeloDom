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
import { reportUserActionError } from "./errors/error-reporter.ts";

/** Creates an abortable lifecycle context around an application context. */
export function createLifecycleScope<
  TContext extends object = Record<string, never>
>(
  baseContext: TContext = {} as TContext,
  parentSignal?: AbortSignal
) {
  const controller = new AbortController();
  const callbacks: Array<() => MaybePromise<void>> = [];
  let disposed = false;
  const abort = () => controller.abort();
  parentSignal?.addEventListener("abort", abort, { once: true });
  if (parentSignal?.aborted) abort();

  const context: TContext & LifecycleContext = {
    ...baseContext,
    signal: controller.signal,
    onCleanup(callback: () => MaybePromise<void>) {
      if (typeof callback !== "function") {
        throw new TypeError("onCleanup() requires a function");
      }

      if (disposed) {
        // A hook may ignore abort and register after disposal. Release immediately
        // and observe asynchronous failure because no dispose caller owns it now.
        void Promise.resolve(callback()).catch(error => reportUserActionError(error, {
          title: "Late Lifecycle Cleanup Failed",
          file: "velodom/lifecycle.ts",
          hint: "Check ctx.signal before continuing an async hook after navigation."
        }));
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
    abort,
    get disposed() {
      return disposed;
    },
    async dispose() {
      if (disposed) return;

      disposed = true;
      controller.abort();
      parentSignal?.removeEventListener("abort", abort);

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
