import {
  createApp,
  definePageConfig,
  definePlugin,
  defineRequestRoute,
  defineResourceAdapter,
  type VeloDomApp
} from "velodom";
import type {
  TestMountResult
} from "velodom/testing";
import { createViteAdapter } from "velodom/vite";

const _testingTypeSmoke: TestMountResult | null = null;
const _pageConfig = definePageConfig({ path: "/" });
const _request = defineRequestRoute({ handler: () => ({ ok: true }) });
const _plugin = definePlugin({ setup() {} });
const _adapter = defineResourceAdapter({
  pages: { html: { home: async () => "<main></main>" } }
});
const app: VeloDomApp = createApp({
  adapter: createViteAdapter()
});

void _testingTypeSmoke;
void _pageConfig;
void _request;
void _plugin;
void _adapter;
void app.mount();
