# VeloDom Feature Maintenance Skill

## Purpose

Use this skill whenever a VeloDom feature is added, changed, fixed, refactored, cleaned up, deprecated, or extended.

This skill provides multiple operating modes so the same workflow can be reused without rewriting a large prompt every time.

The primary goals are:

- discover the real current behavior of a feature
- detect regressions
- preserve backward compatibility
- fix confirmed bugs safely
- refactor implementation without changing public behavior
- clean genuinely obsolete internal code
- verify tests
- update examples
- synchronize documentation

The current source code is the primary source of truth.

Secondary evidence includes:

- Git history
- tests
- examples
- README
- docs
- CHANGELOG
- TODO
- NOTES
- TypeScript declarations
- package exports
- CLI implementation
- Vite integration

---

# Invocation

The skill supports four modes:

```text
audit
fix
refactor
full
```

Examples:

```text
Run velodom-feature-maintenance for routing --audit
```

```text
Run velodom-feature-maintenance for router guards --fix
```

```text
Run velodom-feature-maintenance for components --refactor
```

```text
Run velodom-feature-maintenance for vd-css RTL support --full
```

If no mode is explicitly provided, default to:

```text
audit
```

---

# MODE OVERVIEW

## `--audit`

Use when you want to understand the current state of a feature without changing framework behavior.

Performs:

```text
Feature discovery
→ Public API discovery
→ Syntax discovery
→ Dependency analysis
→ Git regression analysis
→ Types review
→ Tests review
→ Examples review
→ Documentation drift review
→ Audit report
```

Does NOT intentionally modify framework behavior.

Documentation files may be updated only when explicitly requested or when the task clearly asks for documentation synchronization.

---

## `--fix`

Use when a feature is broken or behaving incorrectly.

Performs:

```text
Audit
→ Reproduce bug
→ Root-cause analysis
→ Regression test
→ Minimal safe fix
→ Dependency tests
→ Documentation sync
```

Do not perform unrelated refactoring.

Do not clean unrelated code.

---

## `--refactor`

Use when implementation works but needs cleanup or structural improvement.

Performs:

```text
Audit
→ Public behavior baseline
→ Dependency analysis
→ Safe refactor
→ Dead-code classification
→ Debug artifact cleanup
→ Regression verification
→ Documentation sync if behavior/documentation changed
```

Must preserve public behavior.

---

## `--full`

Use after a major feature change or when you want the complete maintenance workflow.

Performs:

```text
Audit
→ Regression archaeology
→ Bug detection
→ Confirmed bug fixes
→ Safe refactor
→ Safe old-code cleanup
→ Debug cleanup
→ Tests
→ Examples
→ Documentation sync
→ Final maintenance report
```

`--full` does NOT authorize breaking changes.

---

# Core Rule

> Never assume old code is useless merely because newer code exists.

Old code may provide:

- backward compatibility
- legacy syntax
- aliases
- compiler fallback behavior
- runtime fallback behavior
- browser compatibility
- migration support
- deprecated-but-supported APIs

Do not remove such behavior unless a breaking change is explicitly authorized.

---

# PHASE 1 — FEATURE DISCOVERY

Locate everything related to the requested feature.

Search the full repository.

Inspect:

- source files
- exports
- parser rules
- compiler transforms
- runtime handlers
- types
- tests
- fixtures
- examples
- documentation
- configuration
- CLI
- Vite integration
- package exports

Do not search only by filename.

Search symbols, concepts, aliases, syntax strings, tests, and generated output.

---

# PHASE 2 — PUBLIC API DISCOVERY

Identify everything users can actually use.

Classify discovered items as:

```text
PUBLIC
INTERNAL
EXPERIMENTAL
LEGACY
DEPRECATED
PLANNED
```

Inspect:

- exported functions
- exported objects
- exported classes
- HTML syntax
- directives
- attributes
- special elements
- JavaScript APIs
- configuration
- CLI commands
- compiler syntax
- Vite hooks intended for consumers

Do not present internal helpers as public APIs.

---

# PHASE 3 — SYNTAX DISCOVERY

Find every supported syntax for the feature.

Check for:

- canonical syntax
- shorthand syntax
- long-form syntax
- aliases
- HTML syntax
- JavaScript syntax
- configuration syntax
- component syntax
- legacy syntax
- compatibility syntax

Create a syntax matrix:

| Form | Syntax | Supported | Recommended | Legacy |
|---|---|---|---|---|

Do not silently discard old supported syntax.

---

# PHASE 4 — DEPENDENCY MAP

Determine which systems interact with the feature.

Possible systems include:

```text
Compiler
Runtime
State
Reactivity
Components
Router
Events
Forms
Requests
DOM
vd-css
CLI
Vite
Types
Package exports
Examples
Tests
Documentation
```

Only include actual dependencies.

Create a dependency map before modifying implementation.

---

# PHASE 5 — COMPILER TRACE

When the feature affects compilation, trace:

```text
User source
↓
Parser
↓
AST / internal representation
↓
Transform
↓
Generated code
↓
Runtime
↓
DOM / result
```

Identify the actual implementation files and functions.

Check whether multiple syntax forms converge on the same transform or use separate code paths.

---

# PHASE 6 — RUNTIME TRACE

Determine:

- initialization behavior
- update behavior
- cleanup
- DOM effects
- state dependencies
- event behavior
- error behavior
- fallback behavior
- edge cases

Do not infer behavior solely from names or comments.

Trace real execution paths.

---

# PHASE 7 — GIT REGRESSION ARCHAEOLOGY

Inspect Git history for the requested feature.

Useful commands include:

```bash
git log --all -- <paths>
git log -p -- <paths>
git blame <file>
git show <commit>
git diff <old>..<new> -- <paths>
```

Search for:

- removed public exports
- deleted parser branches
- deleted syntax
- renamed directives
- removed aliases
- changed defaults
- deleted tests
- deleted examples
- changed runtime behavior
- removed compatibility code
- type declarations that disappeared

Classify each historical finding:

```text
UNCHANGED
IMPROVED
EXTENDED
REPLACED
DEPRECATED
LEGACY_SUPPORTED
REMOVED_INTENTIONALLY
POSSIBLE_REGRESSION
BROKEN
UNKNOWN
```

Never restore historical behavior automatically.

---

# PHASE 8 — REGRESSION CHECK

Ask:

- Does old supported syntax still compile?
- Did any public export disappear?
- Did an alias disappear?
- Did default behavior change?
- Did generated code change unexpectedly?
- Did runtime behavior change?
- Did component integration change?
- Did router behavior change?
- Did TypeScript support disappear?
- Did an existing example stop working?
- Were important tests removed?

Report suspected regressions before fixing them.

---

# MODE: AUDIT

When running `--audit`:

## Allowed

- inspect code
- inspect Git history
- run tests
- create audit notes
- identify regressions
- identify missing tests
- identify documentation drift
- identify dead-code candidates

## Not Allowed

- remove public APIs
- change syntax
- refactor unrelated code
- delete legacy compatibility
- change behavior simply because a newer design looks cleaner

Output an audit summary.

---

# MODE: FIX

When running `--fix`, first complete the relevant audit.

For every confirmed bug:

1. reproduce the bug
2. identify the root cause
3. find or add a failing regression test
4. apply the smallest safe fix
5. run affected tests
6. run tests for dependent subsystems
7. verify old supported behavior remains valid
8. update docs/examples if observable behavior changed

Never:

- weaken assertions just to pass tests
- delete failing tests because they reveal a bug
- perform unrelated architecture rewrites
- change the public API unless explicitly requested

---

# MODE: REFACTOR

When running `--refactor`, establish a behavioral baseline first.

Before changing code, identify:

- public exports
- public syntax
- aliases
- legacy compatibility paths
- generated behavior
- dependent systems
- tests

Refactoring must preserve externally observable behavior.

Prefer:

- smaller internal functions
- clearer internal names
- shared helpers
- reduced duplication
- stronger internal types
- clearer module boundaries
- simpler control flow
- removal of confirmed unreachable code
- removal of accidental debug artifacts

Avoid:

- public renames
- syntax redesign
- architecture rewrites without necessity
- speculative abstraction
- deleting compatibility code
- changing defaults

After refactoring, compare public behavior before and after.

---

# OLD CODE CLEANUP RULES

Never delete code merely because it looks old.

Classify every cleanup candidate:

```text
KEEP
PUBLIC_ACTIVE
PUBLIC_COMPATIBILITY
LEGACY_SUPPORTED
DEPRECATED_SUPPORTED
INTERNAL_ACTIVE
INTERNAL_DUPLICATED
UNREACHABLE
OBSOLETE
DEBUG_ARTIFACT
UNKNOWN
```

Automatic deletion is allowed only for:

```text
UNREACHABLE
OBSOLETE
DEBUG_ARTIFACT
```

`INTERNAL_DUPLICATED` may be consolidated only after tests prove equivalent behavior.

Never automatically remove:

```text
PUBLIC_COMPATIBILITY
LEGACY_SUPPORTED
DEPRECATED_SUPPORTED
UNKNOWN
```

If uncertain, keep the code and report it.

---

# DEBUG CLEANUP

Search for accidental development artifacts such as:

```text
console.log
console.debug
debugger
temporary debug flags
temporary dumps
temporary instrumentation
test-only code accidentally shipped
development hacks
```

Do not blindly remove:

```text
console.warn
console.error
compiler diagnostics
runtime diagnostics
intentional dev-mode warnings
official logging/debug tooling
```

Determine intent first.

---

# MODE: FULL

`--full` performs the complete maintenance pipeline.

Order:

```text
1. Discover
2. Audit
3. Public API inventory
4. Syntax inventory
5. Dependency map
6. Git regression archaeology
7. Tests baseline
8. Find confirmed bugs
9. Fix confirmed bugs
10. Safe refactor
11. Safe old-code cleanup
12. Debug artifact cleanup
13. Regression tests
14. Integration tests
15. Package consumer verification
16. Examples verification
17. Documentation sync
18. Final report
```

Do not reorder cleanup before audit.

---

# TYPESCRIPT AUDIT

Compare runtime exports and behavior with type declarations.

Look for:

```text
runtime API missing from types
type declaration for removed API
wrong parameter type
wrong return type
missing option
obsolete option
incorrect exported type
```

Types must describe actual public behavior.

---

# TESTING

Use the project's existing test conventions.

Check:

- unit tests
- compiler tests
- runtime tests
- integration tests
- browser tests
- Playwright tests if present
- TestSprite tests if present
- package consumer tests

For the requested feature verify:

```text
basic usage
all syntax variants
edge cases
invalid usage where relevant
regression behavior
integration with dependent systems
```

Do not introduce a large new testing dependency unless explicitly requested or clearly necessary.

---

# EXAMPLES

Every public feature should have verified examples.

Prefer:

```text
Example 1 — Minimal
Example 2 — Practical
Example 3 — Advanced
Example 4 — Alternative syntax
Example 5 — Edge case
```

Only include examples actually supported by the current implementation.

Do not invent VeloDom syntax.

Where practical:

- compile the example
- run it
- verify expected output

---

# DOCUMENTATION SYNC

After behavior is verified, synchronize documentation.

Prefer existing equivalent files instead of creating duplicates.

Expected documentation files may include:

```text
docs/README.md
docs/FEATURE_INVENTORY.md
docs/SYNTAX_REFERENCE.md
docs/FEATURE_MAP.md
docs/REGRESSION_AUDIT.md
docs/DOCUMENTATION_AUDIT.md
docs/API_CONSISTENCY.md
docs/FRAMEWORK_AUDIT.md
```

If these files do not exist, create them only when relevant to the task.

---

# FEATURE INVENTORY

Update the feature entry in:

```text
docs/FEATURE_INVENTORY.md
```

Suggested fields:

| Field | Value |
|---|---|
| Feature ID | |
| Name | |
| Category | |
| Status | |
| Public API | |
| Primary Syntax | |
| Alternatives | |
| Tests | |
| Documentation | |
| Confidence | |
| Source | |

Confidence levels:

```text
A — implemented + tested + documented
B — implemented + tested
C — implemented but weakly tested
D — partial or ambiguous
F — broken or likely regression
```

Do not create duplicate entries for an existing feature.

---

# SYNTAX REFERENCE

Update:

```text
docs/SYNTAX_REFERENCE.md
```

Include:

```text
Recommended syntax
Alternative syntax
JavaScript API
Legacy syntax
Aliases
```

Only include forms that actually exist.

---

# MAIN DOCUMENTATION

Update the appropriate section in:

```text
docs/README.md
```

Do not blindly append duplicate sections.

For each important public feature document:

```text
What it does
Why use it
Basic syntax
Minimal example
How it works
Alternative syntax
Complete example
Parameters / attributes
Edge cases
Common mistakes
Best practices
Related features
Status
```

The documentation should be beginner-friendly and detailed enough to later become the source for the official VeloDom documentation website.

---

# DOCUMENTATION DRIFT

If implementation and documentation disagree, update:

```text
docs/DOCUMENTATION_AUDIT.md
```

Classify findings as:

```text
IMPLEMENTED_NOT_DOCUMENTED
DOCUMENTED_NOT_IMPLEMENTED
OUTDATED_DOCUMENTATION
WRONG_SYNTAX
WRONG_EXAMPLE
MISSING_EXAMPLE
PARTIAL_IMPLEMENTATION
```

---

# REGRESSION REPORT

When historical behavior may have been lost, update:

```text
docs/REGRESSION_AUDIT.md
```

Include:

```text
Feature
Old behavior
Current behavior
Old syntax
Current syntax
Relevant history
Compatibility impact
Confidence
Recommendation
```

Do not silently fix uncertain historical behavior.

---

# API CONSISTENCY

Check consistency between:

```text
Compiler
Runtime
Types
Tests
Examples
README
Package exports
CLI
Vite integration
```

Record meaningful mismatches in:

```text
docs/API_CONSISTENCY.md
```

---

# FEATURE STATUS

Use:

```text
✅ Stable
🟢 Supported
🧪 Experimental
🟡 Partial
⚠️ Deprecated
🏛 Legacy
❌ Broken
📋 Planned
```

Never mark a TODO-only feature as implemented.

---

# CROSS-FEATURE REGRESSION RULES

For foundational feature changes, test dependent systems.

## State changes

Check:

```text
bindings
conditions
loops
components
forms
effects
```

## Compiler changes

Check:

```text
directives
state expressions
components
routing
generated output
```

## Router changes

Check:

```text
links
navigation
params
history
pages
SPA fallback
```

## Component changes

Check:

```text
props
events
slots
state
routing
nested components
```

## vd-css changes

Check:

```text
compiler transforms
dynamic styling
responsive behavior
RTL
themes
component styling
production build
```

---

# PACKAGE CONSUMER CHECK

When changes affect public package behavior, verify usage from a consumer perspective.

Check:

```text
package exports
built files
type declarations
CLI binaries
Vite integration
consumer installation
production build
```

Do not document workspace-only behavior as a public npm capability.

---

# BREAKING CHANGE PROTECTION

This skill never authorizes a breaking change by itself.

If a proposed fix/refactor requires:

- removing a public API
- removing syntax
- changing default behavior
- renaming a directive
- changing package exports
- removing legacy support

stop that specific breaking modification and report:

```text
BREAKING CHANGE CANDIDATE
```

Include:

```text
Current behavior
Proposed behavior
Affected users
Migration impact
Recommended migration
```

Continue with all safe non-breaking work.

---

# COMPLETION SUMMARY — AUDIT

```text
VELODOM FEATURE AUDIT COMPLETE

Feature:
Mode: audit
Status:

Public APIs:
Syntax variants:
Aliases:
Legacy syntax:
Dependencies:

Existing tests:
Missing tests:

Possible regressions:
Documentation mismatches:
Type mismatches:
Dead-code candidates:

Files inspected:
Documentation updated:

Confidence:
```

---

# COMPLETION SUMMARY — FIX

```text
VELODOM FEATURE MAINTENANCE COMPLETE

Feature:
Mode: fix

Confirmed bugs:
Root causes:
Regression tests added:
Fixes applied:

Tests passed:
Tests failed:

Public API changes:
Public syntax changes:

Documentation updated:
Remaining risks:
```

---

# COMPLETION SUMMARY — REFACTOR

```text
VELODOM FEATURE MAINTENANCE COMPLETE

Feature:
Mode: refactor

Files refactored:
Duplicated code consolidated:
Dead code removed:
Debug artifacts removed:

Public APIs changed:
Public syntax changed:
Expected behavior changes:

Tests passed:
Tests failed:

Compatibility risks:
Documentation updated:
```

Expected values for a safe refactor:

```text
Public APIs changed: 0
Public syntax changed: 0
Unexpected behavior changes: 0
```

---

# COMPLETION SUMMARY — FULL

```text
VELODOM FEATURE MAINTENANCE COMPLETE

Feature:
Mode: full

Public APIs:
Syntax variants:
Aliases:
Legacy compatibility:

Confirmed bugs fixed:
Possible regressions:
Files refactored:
Dead code removed:
Debug artifacts removed:

Tests added:
Tests passed:
Tests failed:

Examples added/updated:
Documentation updated:

Public APIs removed:
Public syntax removed:
Breaking changes introduced:

Remaining risks:
Final confidence:
```

Expected values unless explicitly authorized:

```text
Public APIs removed: 0
Public syntax removed: 0
Breaking changes introduced: 0
```

---

# FINAL RULE

A VeloDom feature update is not considered complete until these remain synchronized:

```text
Implementation
Compiler
Runtime
Public API
Types
Tests
Examples
Backward compatibility
Documentation
```

Always:

```text
DISCOVER BEFORE MODIFYING
TEST BEFORE DELETING
VERIFY BEFORE DOCUMENTING
PRESERVE BEFORE REFACTORING
```
