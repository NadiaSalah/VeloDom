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

- V1.x: static analysis, scaffolding, inspection, package checks, build
  reports, test utilities, and release-confidence tooling.
- V2: graphing, richer health reports, large-project maintainability checks,
  and optional migration assistants.
- Future Research: AI providers, deep event/state relationship inference,
  advanced codemods, and runtime-affecting ideas that need security review.
- Rejected: mandatory AI, JSX/TSX authoring, compatibility runtimes for other
  frameworks, hidden global state, and browser runtime features that only solve
  development-time problems.

## Current Rule

DX analysis belongs outside the browser runtime by default. The compiler and
CLI may become smarter; the shipped application runtime should stay small.
