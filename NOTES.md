# VeloDom Engineering Notes

## Architectural Decisions

- VeloDom is compiler-first, HTML-first, and folder-first.
- `src/core` is the single home for reusable framework source, including the
  compiler, shared contracts, adapters, and Vite plugin.
- `src/pages`, `src/components`, and `src/api` are application-owned.
- Build-tool discovery belongs to adapters; the runtime accepts injected
  resource maps.
- Common users should configure requests declaratively. Custom middleware and
  explicit `next()` pipelines remain an advanced option.
- Authentication is provider-based. Frontend auth and role checks improve UX
  but never replace backend authorization.
- Framework source is TypeScript and passes TypeScript plus ESLint before
  production builds.
- Application source may use `script.js` or `script.ts` per folder with no API
  differences and no JSX/TSX.
- The public application import boundary is the `velodom` package export backed
  by `src/core/index.ts`; other core modules are internal until promoted.
- Build-specific framework features use explicit subpath exports:
  `velodom/vite`, `velodom/vite-plugin`, and `velodom/compiler`.
- Source type contracts live in `src/core/types.ts`. Generated declarations
  stay in the ignored root `types` build-output folder, while
  `node_modules/@types` remains npm-managed dependency data.
- Generic object validation, folder-path normalization, and protected-state
  path inspection live in `src/core/shared`; runtime modules should not create
  private copies of these helpers.
- Application examples use kebab-case folders, preferred `script`/`config`
  filenames, and compiler-facing `vd-*` syntax. Legacy names and
  `data-vd-*` remain framework compatibility inputs, not preferred examples.
- Large runtime entry modules coordinate features while focused modules own
  reusable behavior: `directives/expression.ts` handles expression state
  access, and `requests/request-bindings.ts` handles request destinations and
  cross-page policy.
- Template expressions are parsed under `src/core/expression` and evaluated
  from an AST. The grammar is intentionally expression-only; complex logic
  belongs in page/component scripts, not templates.
- The expression security model blocks host-global identifiers, prototype
  traversal, function constructors, timers, and `call`/`apply`/`bind`; computed
  member names are revalidated at runtime.
- Backward compatibility is preserved while the preferred `vd-*` compiler
  syntax and folder conventions mature.
- Inactive conditional branches suspend dependent directive evaluation.
  Subscriptions remain registered so bindings evaluate when the branch becomes
  active; this prevents false-branch null access without losing reactivity.
- Component `expose` is one explicit contract for both local template methods
  and parent ref APIs. Exposed members are merged into component state before
  directives mount, while protected framework state names are rejected.

## Known Constraints

- Assignments, declarations, arrow functions, nested template literals, and
  `new` are intentionally unsupported inside templates.
- Some internal migration boundaries intentionally use permissive types while
  public contracts are explicit; tighten these incrementally without changing
  the JavaScript API.
- Compiler optimization and tree-shaking extension points are not designed yet.
- Browser-level DOM tests for every directive and mount/unmount combination
  are still required.
- The showcase still needs reusable form and error-display components before
  every Phase H item can be marked complete.

## Handoff Guidance

1. Read `README.md`, then `todo.md`, before changing framework APIs.
2. Add framework behavior to `src/core` only when it is generic across sites.
3. Keep domain-specific examples in the blog application folders.
4. Add a regression test for every core bug.
5. Run `npm test` and `npm run build` before committing.
6. Update README, TODO, this file, and CHANGELOG when decisions or milestones
   change.
