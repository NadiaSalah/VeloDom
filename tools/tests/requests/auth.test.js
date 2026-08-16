import assert from "node:assert/strict";
import test from "node:test";
import {
  createAuthRuntime,
  createLocalStorageAuthProvider,
  createServerSessionAuthProvider,
  normalizeRequestAuthConfig,
  resolveRequestSession
} from "../../../packages/velodom/src/requests/auth.ts";

test("server auth respects an explicit authenticated false value", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      authenticated: false,
      token: "stale-token",
      user: {
        roles: ["admin"]
      }
    })
  });

  try {
    const runtime = createAuthRuntime({
      providers: {
        server: createServerSessionAuthProvider()
      }
    });
    const session = await resolveRequestSession(
      normalizeRequestAuthConfig(true, runtime),
      {
        runtime
      }
    );

    assert.equal(session.authenticated, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("auth config rejects invalid fetch credentials", () => {
  assert.throws(
    () => createServerSessionAuthProvider({
      credentials: "invalid"
    }),
    /Invalid auth credentials/
  );
});

test("demo auth reads token and roles from localStorage", async () => {
  const originalWindow = globalThis.window;

  globalThis.window = {
    localStorage: {
      getItem() {
        return JSON.stringify({
          token: "demo-token",
          roles: ["editor"]
        });
      }
    }
  };

  try {
    const runtime = createAuthRuntime({
      providers: {
        demo: createLocalStorageAuthProvider()
      }
    });
    const session = await resolveRequestSession(
      normalizeRequestAuthConfig("demo", runtime),
      {
        runtime
      }
    );

    assert.equal(session.authenticated, true);
    assert.equal(session.token, "demo-token");
    assert.deepEqual(session.roles, ["editor"]);
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }
});

test("auth network errors keep the auth stage", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    throw new Error("offline");
  };

  try {
    const runtime = createAuthRuntime();

    await assert.rejects(
      resolveRequestSession(
        normalizeRequestAuthConfig(true, runtime),
        {
          runtime
        }
      ),
      error => error.__vdStage === "auth" && error.message === "offline"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("custom auth providers receive request context", async () => {
  let received;
  const runtime = createAuthRuntime({
    defaultProvider: "custom",
    providers: {
      custom(context) {
        received = context;

        return {
          authenticated: true,
          roles: ["editor"]
        };
      }
    }
  });
  const state = {};
  const session = await resolveRequestSession(
    normalizeRequestAuthConfig(true, runtime),
    {
      runtime,
      routeName: "posts.create",
      state
    }
  );

  assert.equal(received.routeName, "posts.create");
  assert.equal(received.state, state);
  assert.equal(session.authenticated, true);
  assert.deepEqual(session.roles, ["editor"]);
});
