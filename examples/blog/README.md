# VeloDom documentation blog

This directory is an application-owned showcase built with the public VeloDom
package. It is deliberately a real consumer: the framework lives in
`packages/velodom`, while branding, content, Tailwind classes, routes, and
request policy remain here.

## What the example demonstrates

| Route | Purpose |
| --- | --- |
| `/` | Landing page and learning path |
| `/features` | Guided lessons for the framework capabilities |
| `/reference` | Source-verified public package catalog |
| `/single-file` | Optional `.vd` authoring example |
| `/blog/posts/:id` | Dynamic route and content detail |
| `/404` | Route-not-found and recovery behavior |

The feature and reference pages use literal `<pre><code>` windows guarded by
`vd-pre`, live directive examples, active hash-aware sidebars, and semantic
HTML. They are teaching material, not additional Core APIs.

## Application conventions

```text
src/
  pages/       # route folders and page policies
  components/  # reusable application UI
  layouts/     # shared shells
  api/         # application request handlers and middleware
  assets/      # logo and static visual assets
  utils/       # application-only navigation/content helpers
```

Both JavaScript and TypeScript page/config files are supported by VeloDom; the
showcase intentionally includes both forms to prove parity. Tailwind CSS and
daisyUI are visual choices of this example and are not framework requirements.

## Run and verify

From the repository root:

```bash
npm run dev
npm run build
vd doctor --root examples/blog
vd health --root examples/blog
```

When adding a lesson, update the page/lesson map, keep the example source
literal-safe with `vd-pre`, and add or update browser coverage for direct route
and hash navigation. Keep framework behavior changes in `packages/velodom` and
document public contract changes in `docs/README.md`.
