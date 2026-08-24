# VeloDom AI and contributor guidance

Read [docs/AI_CONTEXT.md](docs/AI_CONTEXT.md) before designing, generating, or
refactoring a VeloDom application. It is the compact, machine-oriented contract
for the framework; [docs/README.md](docs/README.md) remains the complete human
guide and source-verified API reference.

## Non-negotiable identity

- VeloDom is HTML-first, compiler-first, folder-first, convention-over-
  configuration, runtime-light, and vanilla friendly.
- Keep reusable framework behavior in `packages/velodom/src` and keep business
  behavior in the application (`src/pages`, `src/components`, `src/layouts`,
  `src/api`, and `src/assets`).
- Application authors may choose Vanilla JavaScript or TypeScript. Do not
  require JSX, TSX, a virtual DOM, or a global store.
- Prefer ordinary HTML plus small `vd-*` directives over framework-specific
  rendering abstractions.
- Do not invent undocumented directives, exports, file names, or runtime
  services. Use the public package entry points and the documented conventions.

## Before changing or generating code

1. Read `docs/AI_CONTEXT.md` and the relevant section of `docs/README.md`.
2. Inspect the existing application structure before adding files.
3. Keep new feature logic application-owned unless it is generic, reusable,
   and explicitly requested as a framework capability.
4. Add loading, error, empty, accessibility, and SEO behavior where relevant.
5. Run the documented checks and update README/TODO/CHANGELOG when the change
   changes the public contract.

## Scope boundary

The published package is `packages/velodom`. The documentation blog under
`examples/blog` is a real consumer and teaching example, not part of Core.
Never solve an application problem by coupling Core to the blog's data,
branding, Tailwind classes, or backend policy.
