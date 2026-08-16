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
import {
  createResponsiveImageAttributes,
  type AssetImageInspection
} from "velodom/assets";
import type { DevtoolsInspectorOptions } from "velodom/devtools";

const _testingTypeSmoke: TestMountResult | null = null;
const _pageConfig = definePageConfig({ path: "/" });
const _request = defineRequestRoute({ handler: () => ({ ok: true }) });
const _plugin = definePlugin({ setup() {} });
const _adapter = defineResourceAdapter({
  pages: { html: { home: async () => "<main></main>" } }
});
const _imageAttributes = createResponsiveImageAttributes({
  src: "/cover-640.webp",
  width: 640,
  height: 360
});
const _imageInspection: AssetImageInspection | null = null;
const _devtoolsOptions: DevtoolsInspectorOptions = {};
const app: VeloDomApp = createApp({
  adapter: createViteAdapter()
});

void _testingTypeSmoke;
void _pageConfig;
void _request;
void _plugin;
void _adapter;
void _imageAttributes;
void _imageInspection;
void _devtoolsOptions;
void app.mount();
