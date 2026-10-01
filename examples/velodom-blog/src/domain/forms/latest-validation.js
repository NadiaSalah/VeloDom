/**
 * ----------------------------------------
 * Module: Latest Async Field Validation
 * ----------------------------------------
 *
 * Application-owned cancellation for a teaching form. A response from an old
 * value cannot decide the validity of a newer value, even if I/O ignores abort.
 * ----------------------------------------
 */

/** Coordinates one optional async field check with its mounted page. */
export function createLatestValidation(check, parentSignal) {
  let active = null;

  return {
    /** Returns only a current result; stale/aborted checks report current:false. */
    async validate(value) {
      active?.abort();
      const controller = new AbortController();
      active = controller;
      const abort = () => controller.abort();
      parentSignal?.addEventListener("abort", abort, { once: true });
      if (parentSignal?.aborted) controller.abort();
      try {
        if (controller.signal.aborted) return { current: false };
        const result = await check(value, controller.signal);
        return {
          current: active === controller && !controller.signal.aborted,
          value: result
        };
      } catch (error) {
        if (controller.signal.aborted) return { current: false };
        throw error;
      } finally {
        parentSignal?.removeEventListener("abort", abort);
        if (active === controller) active = null;
      }
    },
    /** Releases the current check on page cleanup or a deliberate reset. */
    cancel() {
      active?.abort();
      active = null;
    }
  };
}
