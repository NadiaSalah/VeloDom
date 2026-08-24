# VeloDom Future Research

This document records ideas that are useful but intentionally not implemented
as mandatory VeloDom runtime features.

## Optional AI-Native Tooling

AI must never be required to build, inspect, run, or deploy a VeloDom project.

If AI tooling is explored later, it should use an optional provider interface:

- OpenAI
- OpenRouter
- Ollama
- Gemini
- custom providers

Possible CLI commands can include:

- `vd ai review`
- `vd ai explain`
- `vd ai generate`
- `vd ai optimize`

These commands must live outside the browser runtime package path and should
read VeloDom project manifests, compiler diagnostics, route metadata, build
reports, and docs before generating suggestions.

Research-only template directives such as `vd-ai`, `vd-ai-prompt`, and
`vd-ai-target` should remain rejected until security, privacy, offline
behavior, prompt injection, and runtime cost are solved.

Before any AI integration is considered usable, VeloDom needs explicit privacy
controls for:

- which files may be sent
- which secrets are excluded
- prompt previews
- provider telemetry
- local-only provider mode
- generated-code review boundaries

## Migration Assistants

Migration tools are acceptable only when they produce normal VeloDom folders
and reviewable HTML-first files.

Promising research:

- HTML to VeloDom: add folder structure, `vd-*` directives, `script.js`, and
  `config.js` incrementally.
- React to VeloDom: convert simple presentational components to page/component
  folders when no complex hooks or context behavior is required.
- Vue to VeloDom: convert simple templates and options-style state into
  VeloDom HTML plus script files.

Rejected migration direction:

- runtime compatibility layers for React or Vue
- JSX/TSX support
- hidden component render functions
- automatic conversion that cannot produce readable reviewed output

## CMS and Deployment Adapters

CMS and hosting integrations must remain application- or adapter-owned. The
supported integration point is build-time data: an application can map a
vendor response through `loadExternalContentCollection()` or provide explicit
SEO/prerender entry hooks. VeloDom must never add a CMS credential store,
browser SDK, web-hook service, or provider-specific runtime package.

Promising external adapters may target:

- headless CMS export/API clients that return typed application records
- static-host deployment configuration generators
- build hooks that invalidate the host's own cache after a successful deploy

Each adapter must document its credential boundary, work with normal VeloDom
folders, and be independently versioned. It may be published separately only
after it proves that it adds no mandatory browser runtime code.

Rejected integration direction:

- a built-in CMS registry or provider marketplace
- framework-owned cloud deployment credentials
- automatic remote fetching during ordinary browser navigation
- making any hosting provider a required VeloDom deployment path
