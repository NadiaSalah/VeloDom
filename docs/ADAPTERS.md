# VeloDom Resource Adapters

VeloDom Core does not inspect application folders or depend on a specific build
tool. An adapter supplies lazy page, component, and optional layout resources
to the runtime. The built-in `createViteAdapter()` implements contract version
`1`.

## Adapter Contract

An adapter may declare its contract version and capabilities. The declarations
are optional for backwards compatibility, but new adapters should include them:

```ts
import {
  assertResourceAdapterConformance,
  defineResourceAdapter
} from "velodom";

const adapter = defineResourceAdapter({
  version: 1,
  capabilities: ["resource-discovery", "page-config", "page-data"],
  pages: {
    html: {
      home: async () => "<main>Home</main>"
    },
    modules: {},
    styles: {},
    configs: {}
  }
});

assertResourceAdapterConformance(adapter);
```

Supported capabilities are `resource-discovery`, `page-config`, `page-data`,
`layouts`, and `compiler-manifests`. They describe what the adapter has
verified; they do not enable a server runtime or alter browser behavior.

## Compatibility Rules

- Adapters return lazy loaders for HTML, scripts, page data, styles, and
  manifests.
- Page HTML is required; components and layouts remain optional.
- Resource discovery remains adapter-owned, never router-owned.
- An adapter must validate in its own test suite with
  `assertResourceAdapterConformance()`.
- A static adapter stops at resources and build output. Request-time rendering,
  sessions, cookies, and server actions belong to a future server adapter, not
  this contract.
- New contract versions require an explicit architecture decision and a
  compatibility fixture before they are accepted.

## Plugin Contract

Plugins are optional application integrations. A plugin is either a setup
function or an object with `setup()` and optional `cleanup()`; setup order is
preserved and cleanup runs in reverse order. Integration authors can verify a
plugin shape without mounting an app:

```ts
import { assertPluginConformance } from "velodom";

assertPluginConformance({
  setup({ app, navigate }) {
    // Install optional integration behavior.
  },
  cleanup() {
    // Release optional integration resources.
  }
});
```

This keeps future build integrations possible without making VeloDom depend on
multiple bundlers or changing folder-mode applications.
