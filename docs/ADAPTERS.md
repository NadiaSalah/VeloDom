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
  capabilities: ["resource-discovery", "page-config"],
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

Supported capabilities are `resource-discovery`, `page-config`, `layouts`, and
`compiler-manifests`. They describe what the adapter has verified; they do not
enable a server runtime or alter browser behavior.

## Compatibility Rules

- Adapters return lazy loaders for HTML, scripts, styles, and manifests.
- Page HTML is required; components and layouts remain optional.
- Resource discovery remains adapter-owned, never router-owned.
- An adapter must validate in its own test suite with
  `assertResourceAdapterConformance()`.
- New contract versions require an explicit architecture decision and a
  compatibility fixture before they are accepted.

This keeps future build integrations possible without making VeloDom depend on
multiple bundlers or changing folder-mode applications.
