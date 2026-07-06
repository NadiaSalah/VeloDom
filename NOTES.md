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
- Package exports target generated ESM in `lib` and declarations in `types`;
  raw framework TypeScript is a development input, not a published runtime.
- The npm package uses an explicit file allowlist. Application code, tests,
  assets, and workspace configuration are never package contents.
- Vite adapter globs are rooted at `/src` so discovery is relative to the
  consuming Vite project rather than the installed adapter file.
- The package stays private until name ownership, license, and public API names
  are explicitly confirmed. Local pack checks never authorize publication.
- Package-consumer verification must install the tarball into an isolated
  temporary project; resolving the workspace source would not validate npm
  exports or declaration paths.
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
- Browser-like runtime integration uses happy-dom only in tests. The helper
  lives under `test-support` so Node test discovery does not count it as an
  empty test file.
- Loop blocks own the cleanups created for each rendered clone and release them
  both before rerender and during parent teardown.
- Explicit request loading/error paths inherit the destination of the resolved
  result binding. A local result name must never be reinterpreted as a page.
- Compiler optimizers are synchronous and run after parse/validation. They may
  return only HTML, AST, metadata, or diagnostic patches; the compiler
  validates each result before the next optimizer runs.
- Every template compile result includes a conservative runtime feature
  manifest. Optimizers can add custom features, while changes to directive
  metadata automatically rebuild the built-in feature list.
- Production template modules omit development metadata unless explicitly
  requested. The Vite adapter consumes the named manifest export for
  page/component feature selection.
- Public extensible records use `unknown`, requiring TypeScript consumers to
  narrow unmodelled values instead of receiving unsafe implicit `any`.
- Every Core TypeScript file is protected by
  `@typescript-eslint/no-explicit-any`. Dynamic mount, directive, page, and
  request boundaries use focused context interfaces or `unknown` followed by
  runtime validation.
- Public package declarations and migrated orchestrator declarations must not
  expose inferred `any`; unvalidated JSON payloads intentionally return
  `unknown`.
- The public navigation signature is `navigate(path, pagePath?)`, matching the
  folder-routing compatibility argument already implemented by the runtime.
- Framework-owned TypeScript files require an English module header and
  adjacent JSDoc for each exported declaration. The dependency-free
  `scripts/check-core-docs.mjs` audit is part of the normal quality gate and
  rejects adjacent duplicate JSDoc blocks.
- Documentation comments should capture ownership, invariants, or architectural
  reasons; obvious line-by-line narration is intentionally avoided.
- Directive features are lazy modules selected by compiled manifests. The
  registry caches loaded modules, while loop clones reuse the already-loaded
  feature set synchronously.
- Missing manifests intentionally select every directive feature, preserving
  compatibility for custom resource adapters and direct runtime usage.

## Known Constraints

- Assignments, declarations, arrow functions, nested template literals, and
  `new` are intentionally unsupported inside templates.
- TypeScript `noImplicitAny` is not yet enabled globally; older internal helper
  parameters should be tightened incrementally without changing the JavaScript
  API.
- Adapter/user-file source maps still need broader build-tool integration
  coverage beyond runtime stack-location parsing.
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
