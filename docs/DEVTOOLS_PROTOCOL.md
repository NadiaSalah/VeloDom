# VeloDom Development Inspection Protocol

Status: approved V2 design. V1 exposes `createDevtoolsPlugin()` as an opt-in
bridge only. Production applications receive no bridge unless they register
the plugin.

## Protocol Principles

- Development inspection is opt-in and removable during application cleanup.
- The bridge exposes read-only snapshots, not mutable internal runtime state.
- Transport is separate from Core: a browser extension, local panel, or test
  harness can consume the same bridge.
- Production bundles must tree-shake the plugin when unused.

## Initial Snapshot Shape

The stable initial snapshot is deliberately small:

```ts
type VeloDomDevtoolsSnapshot = {
  sharedStateNames: string[];
};
```

Future protocol versions may add route and request summaries only after they
are safe to expose and can be generated without retaining page DOM or secrets.
Any visual inspector remains an optional extension, never an in-app framework
panel.

The optional `velodom/devtools` subpath now provides a minimal standalone
inspector for the registered bridge. It must be imported explicitly and throws
when `createDevtoolsPlugin()` is absent, so it cannot install hidden globals.
