/**
 * ----------------------------------------
 * Module: Opt-in Production Diagnostics Recipe
 * ----------------------------------------
 *
 * Composes public request hooks and error-boundary context into a small,
 * redacted application-owned sink. Importing this module starts no collector.
 * ----------------------------------------
 */

/** Creates optional, sampled reports without exposing request or user payloads. */
export function createProductionDiagnostics({
  sink,
  sampleRate = 1,
  random = Math.random,
  now = () => performance.now()
} = {}) {
  if (typeof sink !== "function") throw new TypeError("A diagnostics sink is required");
  if (!Number.isFinite(sampleRate) || sampleRate < 0 || sampleRate > 1) {
    throw new RangeError("sampleRate must be between 0 and 1");
  }
  if (typeof random !== "function" || typeof now !== "function") {
    throw new TypeError("Diagnostics clock and sampler must be functions");
  }

  const active = new Map();
  let nextId = 1;
  let disposed = false;
  const sampled = () => {
    try {
      const value = random();
      return Number.isFinite(value) && value >= 0 && value < sampleRate;
    } catch {
      return false;
    }
  };
  const clock = () => {
    try {
      const value = now();
      return Number.isFinite(value) ? value : Date.now();
    } catch {
      return Date.now();
    }
  };

  const emit = report => {
    if (disposed) return;
    try {
      Promise.resolve(sink(Object.freeze(report))).catch(() => {});
    } catch {
      // Telemetry must never interrupt a request or error recovery.
    }
  };

  return {
    requestHooks: {
      beforeRequest(payload) {
        if (disposed || !payload.signal || !sampled()) return;
        const signal = payload.signal;
        const abort = () => active.delete(signal);
        signal.addEventListener("abort", abort, { once: true });
        active.set(signal, {
          id: `diag-${nextId++}`,
          route: safeName(payload.routeName),
          startedAt: clock(),
          abort
        });
        if (signal.aborted) abort();
      },
      afterRequest(payload) {
        const signal = payload.signal;
        const pending = active.get(signal);
        if (!pending) return;
        active.delete(signal);
        signal.removeEventListener("abort", pending.abort);
        if (signal.aborted) return;
        emit({
          kind: "request",
          id: pending.id,
          route: pending.route,
          ok: payload.ok === true,
          stage: safeName(payload.stage),
          durationMs: Math.max(0, Math.round(clock() - pending.startedAt))
        });
      }
    },
    /** Records an already-reported boundary failure; the caller owns fallback UI. */
    recordBoundary(context) {
      if (disposed || !sampled()) return;
      emit({
        kind: "boundary",
        id: `diag-${nextId++}`,
        code: safeCode(context.diagnostic?.code),
        group: safeName(context.diagnostic?.group),
        page: safeName(context.page),
        phase: safeName(context.phase)
      });
    },
    /** Releases abort listeners and prevents further reports on app teardown. */
    destroy() {
      if (disposed) return;
      disposed = true;
      for (const [signal, pending] of active) {
        signal.removeEventListener("abort", pending.abort);
      }
      active.clear();
    }
  };
}

// Only static logical route/stage names survive; never forward raw paths,
// messages, params, form bodies, sessions, stacks or backend response data.
function safeName(value) {
  const text = String(value ?? "");
  const withoutRouteParameters = text.replaceAll("[", "").replaceAll("]", "");
  return text.length <= 80 && /^[A-Za-z0-9_./-]+$/.test(withoutRouteParameters)
    ? text
    : "unknown";
}

function safeCode(value) {
  return /^VD_[A-Z0-9_]{1,60}$/.test(String(value ?? ""))
    ? value
    : "VD_UNKNOWN";
}
