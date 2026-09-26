/**
 * ----------------------------------------
 * Module: Request Cancellation
 * ----------------------------------------
 *
 * Keeps retry and middleware cancellation consistent without owning fetch,
 * session policy, or request state. Abortable waits release timers/listeners
 * on either outcome; an already-running handler still owns its signal use.
 * ----------------------------------------
 */

import { VD_INTERNAL } from "../constants.ts";
import { getThrownString } from "../shared/thrown.ts";

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
