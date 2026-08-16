# VeloDom DX Feature Rubric

VeloDom developer-experience work must strengthen the framework identity:
HTML-first, compiler-first, folder-first, convention over configuration,
runtime-lightweight, and vanilla-friendly.

## Acceptance Rubric

Before adding a DX feature, evaluate it with these questions:

1. Does it solve a real repeated developer problem?
2. Can it work locally without AI, cloud services, telemetry, or API keys?
3. Can it run at compile time, CLI time, or build time instead of browser
   runtime?
4. Does it preserve normal HTML authoring?
5. Does it reduce boilerplate without hiding project structure?
6. Can it stay optional when it is not needed by every project?
7. Does it avoid JSX, TSX, virtual-DOM concepts, mandatory global state, and
   framework imitation for its own sake?

## Target Decision

- Implemented in V1/V1.x: static analysis, scaffolding, inspection, package
  checks, build reports, test utilities, release-confidence tooling, project
  graphs, advisory health reports, generated documentation, and maintainability
  warnings that can be proven from local source.
- Next V1.x improvements: stricter browser CI, security regression corpora,
  source-map diagnostics, incremental type hardening, richer static content
  diagnostics, and optional i18n tooling that remains outside the mandatory
  runtime.
- V2: only work that requires a justified breaking public-contract change
  after real V1 adoption proves the need.
- Future Research: AI providers, optional migration assistants, advanced
  codemods, deeper event/state inference, and runtime-affecting ideas that need
  security review.
- Rejected: mandatory AI, JSX/TSX authoring, compatibility runtimes for other
  frameworks, hidden global state, and browser runtime features that only solve
  development-time problems.

## Current Rule

DX analysis belongs outside the browser runtime by default. The compiler and
CLI may become smarter; the shipped application runtime should stay small.
