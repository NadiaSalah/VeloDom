import {
  definePageConfig,
  definePlugin,
  defineRequestRoute,
  defineResourceAdapter,
  createRequestCache,
  type VeloDomApp,
  type PageDataLoader,
  type PageScriptContext,
  type ComponentScriptContext
} from "velodom";
import type {
  TestMountResult
} from "velodom/testing";
import {
  createViteApp,
  type ViteAppOptions
} from "velodom/vite";
import {
  createResponsiveImageAttributes,
  type AssetImageInspection
} from "velodom/assets";
import type { DevtoolsInspectorOptions } from "velodom/devtools";

const _testingTypeSmoke: TestMountResult | null = null;
const _pageConfig = definePageConfig({ path: "/" });
const _request = defineRequestRoute({ handler: () => ({ ok: true }) });
const _requestCache = createRequestCache({ ttlMs: 30_000, maxEntries: 40, scope: () => "public-catalog" });
const _pageData: PageDataLoader = async ({ signal, mode }) => {
  if (mode !== "client") return { title: "Build fallback" };
  const response = await fetch("/api/catalog", { signal });
  return response.json();
};
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
const _viteOptions: ViteAppOptions = {};
const app: VeloDomApp = createViteApp();
const _invalidate: (page?: string) => void = app.invalidatePageData;
const _refetch: () => Promise<unknown> = app.refetchPageData;
function _refreshFromContext({ ctx }: PageScriptContext | ComponentScriptContext): Promise<unknown> {
  ctx.invalidatePageData("home");
  return ctx.refetchPageData();
}

void _testingTypeSmoke;
void _pageConfig;
void _request;
void _pageData;
void _requestCache.clear("GET /catalog");
void _plugin;
void _adapter;
void _imageAttributes;
void _imageInspection;
void _devtoolsOptions;
void _viteOptions;
void _invalidate;
void _refetch;
void _refreshFromContext;
void app.mount();
