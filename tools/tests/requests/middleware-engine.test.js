import assert from "node:assert/strict";
import test from "node:test";
import {
  defineRequestMiddleware,
  VD_MIDDLEWARE
} from "../../../packages/velodom/src/requests/index.ts";
import {
  executeRequestMiddleware,
  resolveRequestMiddleware
} from "../../../packages/velodom/src/requests/middleware-engine.ts";

test("middleware resolution only accepts own registry keys", () => {
  const resolved = resolveRequestMiddleware(["toString"], {
    custom: {}
  });

  assert.match(resolved.error, /unknown middleware/);
});

test("cancelled middleware pipelines do not start handlers or additional middleware", async () => {
  const controller = new AbortController();
  let release;
  let calls = 0;
  const execution = executeRequestMiddleware({
    context: { signal: controller.signal },
    middleware: [
      params => new Promise(resolve => { release = () => resolve(params); }),
      () => { calls++; }
    ],
    handler: () => { calls++; }
  });

  controller.abort();
  release();
  await assert.rejects(execution, { name: "AbortError" });
  assert.equal(calls, 0);
});

test("already cancelled middleware execution never calls application code", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(executeRequestMiddleware({
    context: { signal: controller.signal },
    middleware: [() => { calls++; }],
    handler: () => { calls++; }
  }), { name: "AbortError" });
  assert.equal(calls, 0);
});

test("pipeline middleware preserves cancellation rather than wrapping it as failure", async () => {
  const abort = new Error("cancelled transport");
  abort.name = "AbortError";
  const pipeline = defineRequestMiddleware(async (_params, _context, next) => next(), {
    mode: VD_MIDDLEWARE.MODES.PIPELINE
  });

  await assert.rejects(executeRequestMiddleware({
    middleware: [pipeline],
    handler: () => { throw abort; }
  }), error => error === abort);
});

test("transform middleware updates params in order", async () => {
  const resolved = resolveRequestMiddleware([
    "trim",
    "removeEmpty"
  ], {
    custom: {
      trim(params) {
        return {
          ...params,
          title: params.title.trim()
        };
      },
      removeEmpty(params) {
        return Object.fromEntries(
          Object.entries(params).filter(([, value]) => value !== "")
        );
      }
    }
  });

  const execution = await executeRequestMiddleware({
    middleware: resolved.value,
    params: {
      title: "  Hello  ",
      empty: ""
    },
    handler: params => params
  });

  assert.deepEqual(execution.result, {
    title: "Hello"
  });
});

test("an ignored-abort middleware short circuit cannot return late success", async () => {
  let finish;
  const controller = new AbortController();
  const pipeline = defineRequestMiddleware(() => new Promise(resolve => {
    finish = resolve;
  }), { mode: VD_MIDDLEWARE.MODES.PIPELINE });
  const pending = executeRequestMiddleware({
    middleware: [pipeline], context: { signal: controller.signal },
    handler: () => assert.fail("short circuit must not call the handler")
  });
  controller.abort();
  finish({ stale: true });
  await assert.rejects(pending, { name: "AbortError" });
});

test("explicit pipeline mode works with a default next parameter", async () => {
  const pipeline = defineRequestMiddleware(
    async function pipeline(params, context, next = () => {}) {
      return next({
        ...params,
        ready: true
      });
    },
    {
      mode: VD_MIDDLEWARE.MODES.PIPELINE
    }
  );
  const resolved = resolveRequestMiddleware([pipeline]);
  const execution = await executeRequestMiddleware({
    middleware: resolved.value,
    params: {},
    handler: params => params
  });

  assert.deepEqual(execution.result, {
    ready: true
  });
});

test("pipeline waits for downstream work even when next is not awaited", async () => {
  const pipeline = defineRequestMiddleware(
    async function pipeline(params, context, next) {
      next(params);
      return {
        early: true
      };
    },
    {
      mode: VD_MIDDLEWARE.MODES.PIPELINE
    }
  );
  const resolved = resolveRequestMiddleware([pipeline]);

  await assert.rejects(
    executeRequestMiddleware({
      middleware: resolved.value,
      params: {},
      handler: async () => {
        throw new Error("downstream failed");
      }
    }),
    /downstream failed/
  );
});
