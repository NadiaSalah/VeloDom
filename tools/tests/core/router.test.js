import assert from "node:assert/strict";
import test from "node:test";
import {
  createRouteTable,
  resolveRouteLocation,
  runNavigationGuards
} from "../../../packages/velodom/src/router.ts";

test("folder routes support nested dynamic params and query strings", () => {
  const table = createRouteTable([
    "home",
    "blog/posts/[id]"
  ]);
  const route = resolveRouteLocation(
    "/blog/posts/42?preview=true&tag=a&tag=b#comments",
    table
  );

  assert.equal(route.page, "blog/posts/[id]");
  assert.equal(route.hash, "comments");
  assert.deepEqual(route.params, {
    id: "42"
  });
  assert.deepEqual(route.query, {
    preview: "true",
    tag: ["a", "b"]
  });
});

test("static routes win over dynamic routes", () => {
  const table = createRouteTable([
    "blog/posts/[id]",
    "blog/posts/create"
  ]);
  const route = resolveRouteLocation("/blog/posts/create", table);

  assert.equal(route.page, "blog/posts/create");
});

test("page config can override paths and provide metadata", () => {
  const table = createRouteTable(["profile"], {
    profile: {
      path: "/account",
      meta: {
        auth: true
      }
    }
  });
  const route = resolveRouteLocation("/account", table);

  assert.equal(route.page, "profile");
  assert.deepEqual(route.meta, {
    auth: true
  });
});

test("navigation guards can block or redirect", async () => {
  const blocked = await runNavigationGuards([
    () => true,
    () => false
  ], {}, null);
  const redirected = await runNavigationGuards([
    () => "/login"
  ], {}, null);

  assert.deepEqual(blocked, {
    allowed: false,
    redirect: ""
  });
  assert.equal(redirected.redirect, "/login");
});

test("navigation guards run sequentially with destination and previous route", async () => {
  const calls = [];
  const to = {
    path: "/account"
  };
  const from = {
    path: "/"
  };
  const result = await runNavigationGuards([
    async context => {
      await Promise.resolve();
      calls.push([
        "global",
        context.to.path,
        context.from.path
      ]);
      return true;
    },
    context => {
      calls.push([
        "page",
        context.to.path,
        context.from.path
      ]);
    }
  ], to, from);

  assert.deepEqual(calls, [
    ["global", "/account", "/"],
    ["page", "/account", "/"]
  ]);
  assert.deepEqual(result, {
    allowed: true,
    redirect: ""
  });
});

test("navigation guards reject invalid and external redirect results", async () => {
  await assert.rejects(
    () => runNavigationGuards([() => "//external.test"], {}, null),
    /app-relative path/
  );
  await assert.rejects(
    () => runNavigationGuards([() => "login"], {}, null),
    /app-relative path/
  );
  await assert.rejects(
    () => runNavigationGuards([() => ({ allow: true })], {}, null),
    /must return true, false, undefined, or an app-relative path/
  );
});
