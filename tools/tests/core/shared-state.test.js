import assert from "node:assert/strict";
import test from "node:test";
import { createPluginManager } from "../../../packages/velodom/src/plugins.ts";
import { createSharedState } from "../../../packages/velodom/src/shared-state.ts";

test("shared state installs only when its plugin is registered", async () => {
  const app = {};
  const shared = createSharedState({
    theme: "light"
  }, {
    name: "ui"
  });
  const manager = createPluginManager([
    shared.plugin
  ], () => ({
    app,
    navigate: async () => {}
  }));

  assert.equal(app.shared, undefined);

  await manager.setup();

  assert.equal(app.shared.ui, shared.state);

  shared.state.theme = "dark";
  assert.equal(app.shared.ui.theme, "dark");

  await manager.destroy();

  assert.equal(app.shared, undefined);
});

test("shared state remains reactive for subscribers", () => {
  const shared = createSharedState({
    count: 0
  });
  let notifications = 0;
  const unsubscribe = shared.state._subscribe(() => {
    notifications += 1;
  });

  shared.state.count = 1;
  unsubscribe();
  shared.state.count = 2;

  assert.equal(notifications, 1);
});

test("shared state rejects duplicate app registration names", async () => {
  const app = {};
  const first = createSharedState({}, {
    name: "session"
  });
  const second = createSharedState({}, {
    name: "session"
  });
  const manager = createPluginManager([
    first.plugin,
    second.plugin
  ], () => ({
    app,
    navigate: async () => {}
  }));

  await assert.rejects(
    () => manager.setup(),
    /already registered/
  );
});
