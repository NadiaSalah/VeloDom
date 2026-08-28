# VeloDom Project

This project uses VeloDom. Before generating or changing VeloDom-specific
code, read:

- `node_modules/velodom/AI_CONTEXT.md`
- `node_modules/velodom/docs/SYNTAX_REFERENCE.md`
- `node_modules/velodom/docs/FEATURE_INVENTORY.md`
- `node_modules/velodom/docs/AI_GUIDE.md`

Rules:

- Use public VeloDom package exports only.
- Prefer canonical `vd-*` syntax and ordinary HTML.
- Do not assume React, Vue, Svelte, or Alpine syntax.
- Do not invent directives or treat roadmap items as implemented.
- Keep application behavior in this project; never edit `node_modules`.
- If `package.json` has a `lab` script, use it only for local read-only
  inspection; the application must continue to run and build without Lab.
