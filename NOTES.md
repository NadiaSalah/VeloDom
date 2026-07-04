# VeloDom Engineering Notes

## Architectural Decisions

- VeloDom is compiler-first, HTML-first, and folder-first.
- `src/core` and `packages` contain reusable framework machinery only.
- `src/pages`, `src/components`, and `src/api` are application-owned.
- Build-tool discovery belongs to adapters; the runtime accepts injected
  resource maps.
- Common users should configure requests declaratively. Custom middleware and
  explicit `next()` pipelines remain an advanced option.
- Authentication is provider-based. Frontend auth and role checks improve UX
  but never replace backend authorization.
- The public application import boundary is `src/core/index.js`; other core
  modules are internal until intentionally promoted.
- Backward compatibility is preserved while the preferred `vd-*` compiler
  syntax and folder conventions mature.

## Known Constraints

- Runtime template expressions still use the legacy evaluator. A safe
  expression parser/AST is the next major compiler-security task.
- The framework source is still JavaScript. TypeScript migration and generated
  declarations remain pending.
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
