import assert from "node:assert/strict";
import test from "node:test";
import {
  defineRequestMiddleware,
  VD_MIDDLEWARE
} from "../../packages/velodom/src/requests/index.ts";
import {
  executeRequestMiddleware,
  resolveRequestMiddleware
} from "../../packages/velodom/src/requests/middleware-engine.ts";

test("middleware resolution only accepts own registry keys", () => {
  const resolved = resolveRequestMiddleware(["toString"], {
    custom: {}
  });

  assert.match(resolved.error, /unknown middleware/);
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
