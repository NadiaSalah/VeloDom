# VeloDom package AI guidance

This file applies to work inside `packages/velodom`. The `src/` directory is
framework Core; `velodomProj/` is the explicitly packaged beginner template.
Read the package `README.md` and
the repository [AI context](../../docs/AI_CONTEXT.md) before changing code or
generating an example.

## Core boundary

- Keep compiler, parser, evaluator, adapters, runtime, and public contracts
  framework-agnostic.
- Keep branding, business data, Tailwind classes, page copy, and application
  policy out of framework `src/`. Only generic starter teaching content may
  live in the allowlisted `velodomProj/` template.
- Do not solve a consumer problem by importing `examples/blog` or by exposing
  an internal file as a new public subpath.
- Preserve VeloDom's HTML-first, compiler-first, folder-first,
  convention-over-configuration, runtime-light, and vanilla-friendly identity.

## Generating a VeloDom application

Use the public package entry points and visible conventions:

```bash
npx velodom@latest my-site
# Until the next patch is published:
npx --yes --package velodom create-velodom my-site
```

Application authors may choose JavaScript or TypeScript. Generate ordinary
HTML in `src/pages` and `src/components`, optional `.vd` files for compact
features, and route policy in `config.js` or `config.ts`. Use documented
`vd-*` directives only; never invent a directive because a similar framework
uses one. Keep API handlers and middleware under `src/api`.

## Quality gate

Before proposing a Core change, check the public exports, generated
declarations, package allowlist, CLI contract, and consumer tests. Update the
package README and the consolidated documentation whenever a public contract
changes. Prefer a small tested extension over a new runtime abstraction.
