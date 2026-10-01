# VeloDom AI and contributor guidance

Read [packages/velodom/AI_CONTEXT.md](packages/velodom/AI_CONTEXT.md) before
designing, generating, or refactoring a VeloDom application. It is the compact,
machine-oriented package contract; [docs/README.md](docs/README.md) remains the
complete repository handbook.

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

1. Read `packages/velodom/AI_CONTEXT.md`, the package syntax/inventory, and the
   relevant section of `docs/README.md`.
2. Inspect the existing application structure before adding files.
3. Keep new feature logic application-owned unless it is generic, reusable,
   and explicitly requested as a framework capability.
4. Add loading, error, empty, accessibility, and SEO behavior where relevant.
5. Run the documented checks and update README/TODO/CHANGELOG when the change
   changes the public contract.

## Scope boundary

The publishable package is `packages/velodom`. The documentation blog under
`examples/velodom-blog` is a real consumer and teaching example, not part of Core.
Never solve an application problem by coupling Core to the blog's data,
branding, Tailwind classes, or backend policy.

# Mandatory Post-Change Synchronization Protocol

This protocol is mandatory after **EVERY modification performed by the agent** in the VeloDom repository.

It applies automatically after:

- feature implementation
- feature extension
- bug fix
- refactor
- compiler modification
- runtime modification
- CLI modification
- API modification
- syntax modification
- configuration modification
- DX improvement
- performance change
- template change
- documentation-related implementation change

This protocol is NOT a separate optional maintenance task.

It is the mandatory final phase of the task the agent is already performing.

The agent must apply it specifically to the code and behavior changed during the current task.

---

# Core Principle

Whenever you modify VeloDom, do not stop after the changed file works.

You must verify that the modification remains synchronized with:

```text
Related implementation
Compiler
Runtime
Types
Public API
Package exports
CLI
Templates
Tests
Examples
Documentation
Educational content
Generated projects
```

The repository must remain internally consistent after every change.

---

# 1. Post-Change Scope Detection

After completing the requested modification, identify exactly what was affected.

Create an internal change scope containing:

```text
Changed feature
Changed public APIs
Changed syntax
Changed internal APIs
Changed compiler behavior
Changed runtime behavior
Changed configuration
Changed file structure
Changed dependencies
Changed package exports
Changed generated output
Changed CLI behavior
```

Use this scope to determine what else must be synchronized.

Do NOT perform unrelated repository-wide refactoring.

---

# 2. Clean Old Code Created by the Current Change

After implementing the modification, inspect the previous implementation of the same behavior.

Search for code that the new implementation made unnecessary.

Classify candidates as:

```text
ACTIVE
COMPATIBILITY_REQUIRED
DEPRECATED_SUPPORTED
DUPLICATE
SUPERSEDED
UNREACHABLE
DEAD
DEBUG_ARTIFACT
UNKNOWN
```

Automatically clean only:

```text
DUPLICATE
SUPERSEDED
UNREACHABLE
DEAD
DEBUG_ARTIFACT
```

Never remove:

```text
COMPATIBILITY_REQUIRED
DEPRECATED_SUPPORTED
UNKNOWN
```

without explicit breaking-change authorization.

The goal is:

```text
new implementation
+
required compatibility
```

not:

```text
new implementation
+
old abandoned implementation
+
duplicate helpers
+
temporary compatibility hacks
```

---

# 3. Remove Duplicate Implementations

Whenever the current change introduces functionality already implemented elsewhere:

- reuse existing helpers when appropriate
- consolidate equivalent internal utilities
- avoid two implementations of the same parser rule
- avoid duplicate runtime handlers
- avoid duplicate state logic
- avoid duplicate validation
- avoid duplicate CLI configuration logic
- avoid duplicate template-generation logic

Before consolidating, verify behavior with tests.

Do not abstract unrelated code merely for theoretical reuse.

---

# 4. Repository-Wide Code Synchronization Check

After every modification, inspect all systems that may interact with the changed behavior.

At minimum evaluate:

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
Types
Vite integration
Package exports
CLI
Templates
Tests
Examples
Documentation
```

Only modify systems actually affected.

The important rule is:

> Never assume that because one file compiles, the framework is synchronized.

Trace dependencies in both directions:

```text
What does the changed code depend on?
What depends on the changed code?
```

---

# 5. Cross-Feature Synchronization

For foundational changes, verify dependent features.

## Compiler modification

Check whether it affects:

```text
directives
expressions
state
events
components
router
vd-css
generated code
source maps
dev diagnostics
production builds
```

## Runtime modification

Check:

```text
compiler-generated calls
components
state
events
DOM updates
cleanup
routing
effects
SSR-related assumptions if any
```

## State / Reactivity modification

Check:

```text
bindings
conditions
loops
components
forms
effects
computed behavior
DOM synchronization
```

## Component modification

Check:

```text
props
events
slots
state
nested components
routing
styles
cleanup
```

## Router modification

Check:

```text
navigation
links
history
params
pages
guards
SPA fallback
Vite integration
generated starters
```

## vd-css modification

Check:

```text
compiler
runtime
components
responsive behavior
RTL
themes
production builds
starter templates
examples
```

---

# 6. Public API Synchronization

If the modification affects something users can access, verify synchronization between:

```text
Runtime implementation
Compiler support
Exports
Type declarations
Documentation
Examples
CLI
Starter templates
```

Examples of public-facing changes:

```text
new function
new directive
new HTML attribute
new configuration option
new component API
new router API
new request API
new vd-css capability
new lifecycle behavior
new CLI option
```

A public feature must not exist only in the implementation.

---

# 7. TypeScript Synchronization

Whenever runtime or public APIs change, inspect type declarations.

Check for:

```text
missing type
stale type
wrong parameter
wrong return type
missing configuration field
removed configuration field
missing export
stale export
new runtime behavior not represented in types
```

Runtime and TypeScript definitions must describe the same framework.

---

# 8. CLI Feature Synchronization

This rule is especially important.

Whenever a **new feature** or meaningful framework capability is added, explicitly ask:

> Should this feature affect project creation or CLI configuration?

Inspect the VeloDom CLI whenever the new capability could reasonably require:

- starter selection
- configuration prompts
- generated files
- dependencies
- dev dependencies
- package scripts
- project structure
- optional integrations
- template files
- feature flags
- recommended defaults
- setup commands

Relevant areas may include:

```text
create-velodom
vd
CLI prompts
scaffolding
template selection
template copying
dependency installation
configuration generation
post-install setup
```

If the feature should be configurable during project creation, integrate it into the CLI.

Do not leave a feature requiring users to manually modify generated projects when the CLI should reasonably handle it.

---

# 9. CLI Decision Matrix

For every new public feature, classify its CLI impact:

```text
NONE
DEFAULT_INCLUDED
OPTIONAL_PROMPT
STARTER_SPECIFIC
LANGUAGE_SPECIFIC
CONFIG_GENERATED
DEPENDENCY_OPTION
POST_CREATE_STEP
```

Examples:

A feature that is always part of VeloDom runtime:

```text
DEFAULT_INCLUDED
```

An optional integration:

```text
OPTIONAL_PROMPT
```

A Blog-only capability:

```text
STARTER_SPECIFIC
```

A TypeScript helper:

```text
LANGUAGE_SPECIFIC
```

A feature requiring a new config entry:

```text
CONFIG_GENERATED
```

Record the decision even when CLI changes are not needed.

---

# 10. Verify CLI Combinations

If CLI behavior changed, test relevant combinations.

For example:

```text
Starter
×
JavaScript / TypeScript
×
Tailwind on/off
×
ESLint on/off
×
new feature option
```

Do not assume only the default path works.

At minimum verify:

```text
default project
minimal starter
blog starter
JavaScript
TypeScript
```

plus any directly affected options.

---

# 11. Template Synchronization

Whenever implementation or CLI behavior changes, inspect:

```text
packages/velodom/templates/
package/templates/
templates/
```

and equivalent real repository paths.

Update affected templates so a newly generated project uses:

```text
current syntax
current APIs
current imports
current configuration
current dependencies
current recommended patterns
```

Search explicitly for the old implementation or syntax inside templates.

---

# 12. Generated Project Synchronization

A generated project must represent the current VeloDom framework.

Inspect generated:

```text
README
source files
configuration
package.json
example pages
components
styles
tutorial content
welcome UI
comments
```

Do not allow:

```text
framework implementation = new
CLI starter = old
```

---

# 13. Example Synchronization

Inspect relevant examples, including:

```text
examples/velodom-blog/
```

and all affected projects under:

```text
examples/
```

If the feature is represented there, update:

```text
source code
syntax
components
configuration
UI behavior
educational content
code snippets
feature explanations
```

Examples are executable documentation.

---

# 14. UI & Educational Content Synchronization

VeloDom repositories may contain documentation inside actual websites and UI.

Search user-facing content for the changed feature.

Update:

```text
tutorial pages
feature cards
code examples
syntax demos
getting-started sections
welcome pages
interactive demos
documentation UI
blog educational content
starter project instructions
```

This includes:

```text
examples/velodom-blog
```

and any documentation website in the repository or npm package.

Do not update only the source code while leaving the UI teaching the previous behavior.

---

# 15. Root Documentation Synchronization

Inspect relevant documentation under:

```text
docs/
```

and root Markdown files.

Possible files include:

```text
README.md
CHANGELOG.md
TODO.md
NOTES.md
AI_GUIDE.md
AI_CONTEXT.md
FEATURE_INVENTORY.md
SYNTAX_REFERENCE.md
QUICK_START.md
RELEASING.md
```

Only update affected sections.

Do not append duplicate documentation.

---

# 16. Package Documentation Synchronization

Also inspect documentation shipped inside the package.

Possible locations:

```text
packages/velodom/docs/
packages/velodom/*.md
package/docs/
package/*.md
```

Use the actual repository structure.

Root documentation and npm package documentation must describe the same current feature behavior.

---

# 17. AI Documentation Synchronization

If files exist such as:

```text
AI_CONTEXT.md
AI_GUIDE.md
AGENTS.md
FEATURE_INVENTORY.md
SYNTAX_REFERENCE.md
```

treat them as machine-readable framework documentation.

Update them when the public API, architecture, syntax, CLI, or recommended usage changes.

An AI coding agent reading these files must receive current information.

---

# 18. Test Synchronization

After changing implementation:

1. update existing affected tests
2. add regression tests for bugs
3. add feature tests for new behavior
4. remove tests only for intentionally removed internal behavior
5. preserve compatibility tests
6. run dependent subsystem tests

Check:

```text
unit
compiler
runtime
integration
browser
Playwright
package consumer
CLI
template generation
```

when applicable.

---

# 19. Package Export Synchronization

If the feature adds or changes a public module/API, inspect:

```text
package.json exports
main
module
types
files
build output
index exports
subpath exports
CLI bin
```

Verify the feature is actually available from the published package.

Do not document workspace-only exports as npm features.

---

# 20. package.json Synchronization

Inspect affected `package.json` files whenever the task changes:

```text
dependencies
devDependencies
scripts
exports
types
files
bin
engines
metadata
build configuration
```

Do NOT bump package versions automatically unless release/version work is explicitly requested.

---

# 21. npm Package Content Synchronization

When templates, docs, generated assets, CLI files, types, or runtime files change, verify npm packaging.

Inspect:

```text
files
.npmignore
build copy logic
package build scripts
template copy logic
documentation copy logic
```

The published npm package must actually contain the files documented as public.

---

# 22. Old Syntax Sweep

If syntax changed:

Search the full repository for:

```text
old syntax
new syntax
aliases
old configuration keys
old import paths
old CLI options
```

Classify old occurrences as:

```text
MIGRATE
COMPATIBILITY_TEST
MIGRATION_DOCUMENTATION
HISTORICAL_CHANGELOG
DEPRECATED_DOCUMENTATION
REMOVE
```

Migrate everything that represents active current usage.

---

# 23. Full-Code Synchronization Verification

Before finishing the task, perform a final consistency pass across the framework.

Verify that these layers agree:

```text
Parser
Compiler
Generated code
Runtime
Types
Exports
CLI
Templates
Examples
Tests
Docs
```

Look specifically for mismatches such as:

```text
Compiler emits runtime API that no longer exists
Runtime exports API that types do not declare
Types declare API runtime does not export
CLI generates unsupported syntax
Templates use old APIs
Examples use deprecated syntax
Docs describe missing functionality
New feature exists but package export is missing
CLI option exists but template does not implement it
```

Resolve confirmed inconsistencies caused by or exposed by the current task.

---

# 24. Do Not Expand Scope Blindly

This synchronization process is repository-wide in **verification**, but not necessarily repository-wide in **modification**.

Do not rewrite unrelated systems just because they were inspected.

Modify them only when:

```text
the current change affects them
or
a confirmed existing mismatch directly breaks the changed feature
```

Report unrelated issues separately.

---

# 25. Mandatory Completion Checklist

After every agent modification:

```text
[ ] Current change implemented

[ ] Related implementation searched

[ ] Dependent systems checked

[ ] Dead code created by replacement removed

[ ] Duplicate implementation removed or justified

[ ] Superseded implementation removed

[ ] Compatibility behavior preserved

[ ] Debug artifacts removed

[ ] Runtime/compiler synchronization checked

[ ] Cross-feature synchronization checked

[ ] Types checked

[ ] Public exports checked

[ ] CLI impact explicitly evaluated

[ ] CLI updated if necessary

[ ] CLI generation tested if affected

[ ] Templates checked

[ ] Generated projects checked

[ ] Examples checked

[ ] examples/velodom-blog checked when relevant

[ ] UI educational content checked

[ ] Root docs checked

[ ] Package docs checked

[ ] Syntax reference checked

[ ] AI documentation checked

[ ] Tests updated

[ ] Dependent tests executed

[ ] package.json checked

[ ] npm package contents checked when relevant

[ ] Old syntax searched when relevant

[ ] Final full-code synchronization pass completed
```

---

# 26. Mandatory Final Report

Every coding task must finish with:

```text
POST-CHANGE SYNCHRONIZATION

Change:
Affected feature:

Implementation:
- ...

Cleanup:
- dead code:
- duplicate code:
- superseded code:
- debug artifacts:

Cross-system synchronization:
- compiler:
- runtime:
- types:
- exports:
- related features:

CLI impact:
- classification:
- CLI changes:
- generated-project changes:
- combinations verified:

Templates:
- checked:
- changed:

Examples:
- checked:
- changed:

examples/velodom-blog:
- code:
- UI:
- educational content:

Documentation:
- root docs:
- package docs:
- syntax docs:
- AI docs:

Tests:
- added:
- updated:
- removed:
- executed:

Package:
- package.json:
- exports:
- npm-shipped files:

Compatibility:
- preserved behavior:
- legacy behavior retained:
- breaking changes:

Synchronization result:
- synchronized
or
- unresolved mismatches listed below

Remaining issues:
- ...
```

Do not report:

```text
Documentation updated.
```

without identifying what was updated.

---

# Final Rule

After every change, think:

```text
WHAT DID I CHANGE?
        ↓
WHAT OLD CODE DID THIS REPLACE?
        ↓
WHAT DEPENDS ON IT?
        ↓
WHAT DOES IT DEPEND ON?
        ↓
DO COMPILER + RUNTIME + TYPES STILL AGREE?
        ↓
DO PUBLIC EXPORTS MATCH?
        ↓
DOES CLI NEED TO EXPOSE OR CONFIGURE IT?
        ↓
DO TEMPLATES GENERATE THE NEW BEHAVIOR?
        ↓
DO EXAMPLES USE IT CORRECTLY?
        ↓
DO DOCS TEACH IT CORRECTLY?
        ↓
DO TESTS PROVE IT?
        ↓
IS THE ENTIRE FRAMEWORK SYNCHRONIZED?
```

**Never consider a VeloDom modification complete until all affected layers are synchronized.**