/**
 * ----------------------------------------
 * Module: Async Work Cancellation
 * ----------------------------------------
 *
 * Coordinates abortable waits and shared read subscriptions without owning
 * transport, session policy, route state or application fetching. Original
 * work is always observed even when a caller stops awaiting its result.
 * ----------------------------------------
 */

import { VD_INTERNAL } from "../constants.ts";
import { getThrownString } from "./thrown.ts";

/** Private coordination shared by explicitly coalesced request/page reads. */
export interface SharedAsyncRead<T = unknown> {
  controller: AbortController;
  consumers: number;
  promise: Promise<T>;
}

/**
 * Stops awaiting on abort while observing both outcomes of the original work.
 * Cancellation cannot undo application side effects that ignore their signal.
 */
export function awaitWithAbort<T>(
  work: T | PromiseLike<T>,
  signal?: AbortSignal | null,
  onAbort?: () => void,
  abortError: () => Error | DOMException = createRequestAbortError
): Promise<T> {
  const promise = Promise.resolve(work);
  if (!signal) return promise;
  return new Promise((resolve, reject) => {
    let settled = false;
    const release = () => {
      if (settled) return false;
      settled = true;
      signal.removeEventListener("abort", abort);
      return true;
    };
    const abort = () => {
      if (!release()) return;
      onAbort?.();
      reject(abortError());
    };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    promise.then(value => {
      if (release()) resolve(value);
    }, error => {
      if (release()) reject(error);
    });
  });
}

/** Releases each subscriber; only its final cancellation aborts shared work. */
export function joinSharedRead<T>(
  read: SharedAsyncRead<T>,
  signal: AbortSignal | null | undefined,
  detach: () => void,
  abortError: () => Error | DOMException = createRequestAbortError
): Promise<T> {
  let cancelled = false;
  read.consumers++;
  return awaitWithAbort(read.promise, signal, () => {
    cancelled = true;
    if (--read.consumers === 0) {
      detach();
      read.controller.abort();
    }
  }, abortError).finally(() => {
    if (!cancelled) read.consumers--;
  });
}

/** Keeps the existing declarative request cancellation error shape. */
export function createRequestAbortError(): Error {
  const error = new Error(VD_INTERNAL.REQUEST_ABORT_MESSAGE);
  error.name = VD_INTERNAL.ABORT_ERROR_NAME;
  return error;
}

/** Inspects cancellation without assuming the thrown value is an Error. */
export function isRequestAbortError(error: unknown): boolean {
  return getThrownString(error, "name") === VD_INTERNAL.ABORT_ERROR_NAME;
}

/** Prevents a cancelled request from starting another application operation. */
export function assertRequestActive(signal?: AbortSignal | null): void {
  if (signal?.aborted) throw createRequestAbortError();
}

/** Waits between retry attempts, releasing its timer/listener on cancellation. */
export function waitForRetryDelay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(createRequestAbortError());
  return new Promise((resolve, reject) => {
    let settled = false;
    const complete = (aborted: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (aborted) reject(createRequestAbortError());
      else resolve();
    };
    const abort = () => complete(true);
    const timer = setTimeout(() => complete(false), ms);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
}
