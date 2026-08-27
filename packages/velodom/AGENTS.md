# VeloDom package contributor guidance

This directory is the self-contained source of the published `velodom` npm
package. Framework behavior lives under `src/`; shared starter files live under
`templates/default`, while Minimal, Blog, and Empty layers live under
`templates/starters`.

Read [AI_CONTEXT.md](AI_CONTEXT.md),
[docs/SYNTAX_REFERENCE.md](docs/SYNTAX_REFERENCE.md), and
[docs/FEATURE_INVENTORY.md](docs/FEATURE_INVENTORY.md) before changing public
behavior or examples.

Rules:

- Keep Core framework-agnostic and application behavior outside `src`.
- Preserve HTML-first, compiler-first, folder-first, runtime-light design.
- JavaScript and TypeScript must both remain optional authoring choices.
- Do not add private source imports to the starter or consumer documentation.
- Keep starter differences in `templates/starters`; language and optional
  tooling belong in composable `src/scaffolder` feature installers.
- Consumer docs belong in `docs`; repository audits and release history belong
  in the root `docs` directory and are not published.
- Update package tests, docs, types, and the root changelog when public behavior
  changes.

Verify with the workspace package checks and `npm pack --dry-run` before
publishing.
