# VeloDom Lab — Master Codex Implementation Prompt

## Mission

You are working inside the **VeloDom** repository.

Your job is to design and implement a major optional developer-experience subsystem called:

# VeloDom Lab

VeloDom Lab must turn VeloDom from “just a frontend framework” into a complete development, debugging, learning, inspection, and experimentation environment.

The feature must be inspired by the strongest developer-experience ideas found across modern frameworks and tooling ecosystems such as React DevTools, Vue Devtools, Svelte Playground/REPL, Angular DevTools, Astro Dev Toolbar, Qwik debugging concepts, Vite HMR, browser DevTools, component explorers, framework playgrounds, and modern AI-assisted development tools.

Do **not** copy proprietary source code, branding, UI, or implementation details from other projects.

Instead, study the concepts, then implement an original VeloDom-native architecture.

The final result should feel cohesive and intentional rather than like unrelated features copied from other ecosystems.

---

# 1. Product Philosophy

VeloDom Lab must follow these principles:

1. **Optional, never mandatory**
2. **Zero or near-zero production runtime cost**
3. **No breaking changes to existing VeloDom projects**
4. **Works locally**
5. **Integrates naturally with Vite**
6. **Beginner-friendly**
7. **Useful to advanced developers**
8. **Tree-shakeable / dev-only where possible**
9. **Framework-native**
10. **Extensible for future plugins**
11. **Fast startup**
12. **Secure by default**
13. **No source code upload to external services**
14. **No hidden telemetry**
15. **Excellent error messages**
16. **First-class JavaScript and TypeScript support**

VeloDom should remain lightweight if the user does not install or enable Lab.

---

# 2. Existing VeloDom Environment

Assume VeloDom currently uses Vite for development.

Typical project commands include:

```bash
npm install
npm run dev
npm run build
npm run preview
```

Typical local Vite development runs around:

```text
http://localhost:5173
```

Do not replace Vite.

Build VeloDom Lab **on top of the existing Vite-based developer workflow**.

Preserve all existing VeloDom syntax and behavior unless a change is strictly required.

Before modifying anything:

- inspect the repository
- inspect workspace structure
- inspect packages
- inspect CLI
- inspect create-velodom
- inspect compiler
- inspect runtime
- inspect router
- inspect state/reactivity
- inspect components
- inspect request/data features
- inspect current examples
- inspect tests
- inspect documentation
- inspect package exports
- inspect build configuration

Never assume filenames or architecture before checking the repository.

---

# 3. Main User Experience

The user should be able to create a new VeloDom application and optionally install VeloDom Lab.

Example:

```text
◆ Project name:
  my-velodom-app

◆ Select a starter:
  ● Minimal
  ○ Blog
  ○ Empty

◆ Language:
  ● JavaScript
  ○ TypeScript

◆ Add Tailwind CSS?
  ● Yes
  ○ No

◆ Add ESLint?
  ● Yes
  ○ No

◆ Add VeloDom Lab?
  ● Yes
  ○ No

◆ Install dependencies?
  ● Yes
  ○ No

◆ Start dev server?
  ● Yes
  ○ No
```

If the user selects **No**, the resulting project must not carry unnecessary Lab dependencies.

If the user selects **Yes**, configure Lab automatically.

---

# 4. Required CLI Commands

Implement or extend the VeloDom CLI to support:

```bash
vd lab
vd inspect
vd doctor
vd explain
vd migrate
```

Also support appropriate npm/npx usage where consistent with the current CLI architecture.

Example:

```bash
npx velodom lab
```

Do not introduce conflicting command names.

---

# 5. `vd lab`

`vd lab` should launch the main VeloDom Lab experience.

Prefer integration with the current Vite dev server rather than creating an unnecessary second development stack.

The UI should be modern, responsive, fast, accessible, and clearly branded as VeloDom.

Recommended primary layout:

```text
┌─────────────────────────────────────────────────────┐
│ VeloDom Lab                                         │
├───────────────┬──────────────────┬──────────────────┤
│ Code / Files  │ Live Preview     │ Inspector        │
│               │                  │                  │
│               │                  │                  │
├───────────────┴──────────────────┴──────────────────┤
│ Console / Timeline / Diagnostics / Network          │
└─────────────────────────────────────────────────────┘
```

Panels should be resizable and collapsible.

Persist developer preferences locally.

---

# 6. Live Playground

Implement an interactive VeloDom playground.

Capabilities:

- edit VeloDom examples
- live preview
- instant refresh
- compile on change
- clear compile errors
- runtime errors
- warnings
- reset example
- fork example
- copy example
- export example to local project
- load starter examples
- search examples

Examples should include:

- Hello World
- reactive state
- bindings
- events
- conditionals
- loops
- components
- props
- routing
- nested routing if supported
- requests/data fetching
- forms
- reusable components
- layout example
- Todo app
- small dashboard
- blog example

Use real supported VeloDom syntax only.

Do not invent syntax just to make the Lab look impressive.

---

# 7. VeloDom Inspector

Build a framework-aware inspector.

The inspector should expose useful runtime information such as:

## Component Tree

Display:

- component hierarchy
- component name
- source file
- props
- local state
- children
- lifecycle state where relevant
- render/update count
- mount state

Allow selecting a component and highlighting its corresponding DOM area.

---

# 8. Reactive State Inspector

Provide a dedicated reactive-state panel.

Show:

- state key
- current value
- previous value
- update timestamp
- update source where detectable
- subscribers/dependencies
- affected components
- affected bindings

Allow safe value inspection.

Development-only editing may be added when technically safe.

Never allow dangerous arbitrary code execution through inspector controls.

---

# 9. Binding Inspector

Expose VeloDom bindings.

For each binding show:

- source state/expression
- target node
- binding type
- current value
- dependency relationship
- last update
- source location where possible

Selecting a binding should highlight the associated DOM node.

---

# 10. Update Timeline

Create a timeline that explains what happened after an event.

Example:

```text
Click: #increment
↓
state.count changed: 4 → 5
↓
2 bindings invalidated
↓
Counter component updated
↓
DOM text node patched
↓
Total update time: 0.8ms
```

This feature should make VeloDom's internal behavior understandable without requiring developers to read framework internals.

---

# 11. Render / Update Visualization

Add optional developer overlays.

Examples:

- highlight updated DOM nodes
- highlight mounted components
- visualize rerenders/updates
- show update duration
- show unnecessary repeated updates if detectable

This must be disabled by default if it causes noticeable overhead.

---

# 12. Router Inspector

If routing exists in the current project, inspect it.

Show:

- current route
- route parameters
- query parameters
- route tree
- matched route
- navigation history
- navigation timing
- redirects
- guards/hooks if supported
- 404 fallback information

Provide a route navigation tester.

Do not modify browser history unexpectedly during inspection.

---

# 13. Request / Network Inspector

If VeloDom provides request/data APIs, inspect framework-level requests.

Show:

- method
- URL
- status
- duration
- request time
- response type
- associated component
- request initiator
- errors
- cancellation if supported

Never expose sensitive authorization headers, tokens, cookies, or secrets by default.

Redact sensitive data.

---

# 14. Compiler Inspector

This is one of the most important differentiators.

VeloDom is compiler-oriented, so Lab should expose compiler behavior.

Provide views for:

```text
Source
↓
Parsed representation
↓
Transforms
↓
Generated JavaScript
↓
Generated runtime bindings
```

Where architecture permits, expose:

- compiler phases
- generated code
- source maps
- optimization notes
- diagnostics
- dead/unnecessary code warnings
- generated binding metadata

Add a diff mode:

```text
VeloDom Source  ↔  Generated Output
```

The purpose is educational and diagnostic.

Do not expose unstable compiler internals as public APIs unless necessary.

---

# 15. Performance Panel

Add lightweight framework-specific performance analysis.

Useful measurements:

- component mount duration
- component update duration
- state propagation time
- compiler duration
- route navigation duration
- request timing
- slow bindings
- repeated updates
- unusually large state
- long tasks caused by framework operations

Provide actionable explanations instead of meaningless raw numbers.

Example:

```text
Potential issue:
`ProductList` updated 31 times in 2 seconds.

Likely cause:
`filters` is changing repeatedly.

Suggested investigation:
Inspect the state timeline and dependent bindings.
```

Avoid fake scores.

---

# 16. Error Overlay

Upgrade development errors into VeloDom-aware diagnostics.

Each error should try to include:

- human-readable title
- what happened
- likely reason
- source file
- source line
- code frame
- related VeloDom syntax
- suggestion
- documentation link or local docs reference
- error code

Example:

```text
VD1004
Unknown reactive binding: `countt`

Did you mean:
`count`

Found in:
src/pages/home.vd:14
```

Create stable error-code categories if the repository does not already have them.

Do not silently change existing documented errors without migration.

---

# 17. `vd doctor`

Implement:

```bash
vd doctor
```

It should inspect the current VeloDom project.

Check relevant items such as:

- Node version
- npm/pnpm/yarn compatibility
- VeloDom version
- Vite version
- configuration
- missing dependencies
- duplicate VeloDom installations
- invalid project structure
- broken imports
- stale generated files
- unsupported configuration
- route configuration problems
- Lab setup problems
- TypeScript problems
- common migration issues

Output should look professional.

Example:

```text
VeloDom Doctor

✓ Node.js supported
✓ VeloDom 1.x detected
✓ Vite configuration valid
✓ Router configuration valid
! Lab plugin is installed but disabled
✗ Missing dependency: ...

2 issues found.
```

Where safe, support:

```bash
vd doctor --fix
```

Never make destructive automatic fixes.

---

# 18. `vd inspect`

Implement a CLI inspection command for developers who do not want to open the full graphical Lab.

Examples:

```bash
vd inspect
vd inspect routes
vd inspect components
vd inspect config
vd inspect build
```

Output should be machine-readable optionally:

```bash
vd inspect routes --json
```

Use this capability internally where useful instead of duplicating analysis logic.

---

# 19. `vd explain`

Implement a framework-aware educational command.

Examples:

```bash
vd explain src/pages/home.*
vd explain src/components/Card.*
vd explain "state"
vd explain "routing"
```

Depending on what is feasible without external AI, implement deterministic explanations from:

- compiler metadata
- syntax definitions
- framework docs
- AST
- dependency graph
- diagnostics

If an AI provider is later integrated, design a provider interface but **do not make cloud AI mandatory**.

The base feature must remain useful offline.

---

# 20. Optional Local AI Layer

Design VeloDom Lab so an optional AI layer can be added.

Important:

- AI must not be required
- no source upload without explicit consent
- local/offline model support should be possible
- provider adapters should be isolated

Possible future capabilities:

- Explain this code
- Explain this error
- Explain this render/update
- Generate VeloDom example
- Convert HTML/JS to VeloDom
- Suggest VeloDom-native refactor
- Generate component
- Generate route
- Explain generated compiler output

For the first implementation, prioritize solid deterministic tooling over unreliable AI gimmicks.

---

# 21. `vd migrate`

Create migration infrastructure.

Examples:

```bash
vd migrate
vd migrate --check
vd migrate --from 1.x --to 2.x
```

Initial implementation can focus on architecture if there is no current migration need.

Requirements:

- dry-run first
- show files to change
- show transformations
- backup strategy
- AST-based changes where practical
- never blindly regex-transform complex code
- generate migration report

Future migration adapters may support converting simple patterns from vanilla HTML/JS or other frameworks, but do not promise full automatic framework conversion.

---

# 22. Dependency Graph

Provide a development dependency graph when architecture supports it.

Possible nodes:

- pages
- components
- state
- routes
- requests
- modules
- bindings

Example:

```text
HomePage
 ├── Header
 ├── ProductGrid
 │    ├── ProductCard
 │    └── state.products
 └── router.currentRoute
```

Allow clicking graph nodes to inspect details.

Avoid huge graph rendering failures on large projects.

Implement filtering and limits.

---

# 23. Source Navigation

Where source locations are available:

- click component → source
- click state → source
- click route → source
- click compiler diagnostic → source

Provide configurable editor URL support where reasonable.

Examples might include VS Code-compatible local links.

Never assume a single editor.

---

# 24. DOM ↔ VeloDom Mapping

Create an inspect mode similar in convenience to browser element inspection but framework-aware.

Flow:

1. activate VeloDom inspect mode
2. hover an element
3. highlight it
4. click
5. show:
   - DOM node
   - owning VeloDom component
   - source
   - active bindings
   - related state
   - update history

This should be one of Lab's flagship features.

---

# 25. Event Inspector

Track framework-relevant UI events in development mode.

Examples:

- click
- input
- change
- submit
- custom VeloDom events if supported

Display:

- event
- target
- handler
- component
- resulting state changes
- resulting DOM updates

Use bounded history to avoid memory leaks.

---

# 26. Learning Mode

Add a dedicated optional **Learning Mode**.

When enabled, Lab explains framework behavior in beginner-friendly language.

Example:

```text
You clicked the + button.

VeloDom executed the click handler.

The handler changed `count` from 4 to 5.

Because this text depends on `count`,
VeloDom updated only the related DOM value.
```

Provide levels:

```text
Beginner
Developer
Advanced
```

Advanced mode can expose compiler/runtime terminology.

---

# 27. Examples Library

Build an organized local examples library.

Categories:

```text
Getting Started
State
Events
Bindings
Components
Routing
Forms
Requests
Styling
Architecture
Performance
Advanced
```

Every example should include:

- explanation
- runnable code
- expected result
- relevant framework concepts
- link to source/docs where available

Examples must be validated against actual framework behavior.

---

# 28. Documentation Integration

Design a reusable component/API so the future VeloDom documentation website can expose:

```text
Open in VeloDom Lab
```

for runnable examples.

Lab should be able to open an encoded/local example definition.

Avoid fragile URL payloads containing huge source files.

Design a small example manifest format.

---

# 29. Lab Architecture

Prefer a modular package architecture.

Adapt to the actual monorepo structure.

A possible structure might resemble:

```text
packages/
  velodom/
  velodom-lab/
  velodom-devtools/
  velodom-inspector/
  velodom-vite-plugin/
```

But DO NOT blindly create these packages.

First inspect the existing repository.

Use the minimum clean package split justified by:

- runtime isolation
- optional installation
- clear ownership
- testability
- public package publishing needs

Avoid overengineering.

---

# 30. Runtime Instrumentation

Add a carefully designed development instrumentation layer.

It may expose events such as:

```text
component:mount
component:update
component:unmount

state:create
state:update

binding:create
binding:update

route:navigate

request:start
request:end
request:error

compiler:start
compiler:end

dom:patch
```

Do not expose this exact API unless it fits the current architecture.

Design based on VeloDom internals.

Core requirement:

```text
Production build:
instrumentation disabled / removed / negligible
```

Development build:

```text
instrumentation optionally enabled
```

Avoid hard dependencies from runtime → Lab UI.

Use an adapter/event bridge.

---

# 31. DevTools Protocol

Create an internal versioned protocol between VeloDom runtime instrumentation and VeloDom Lab.

Example concept:

```ts
interface VeloDomDevtoolsMessage {
  version: number
  type: string
  timestamp: number
  payload: unknown
}
```

Do not expose unstable implementation structures directly.

The protocol should make future browser extensions possible without requiring them today.

---

# 32. Security

Treat Lab as a developer tool with a significant local attack surface.

Requirements:

- bind locally by default
- avoid arbitrary remote access
- do not expose filesystem APIs to untrusted browser content
- validate IPC/dev-server messages
- sanitize rendered strings
- prevent XSS in error/source rendering
- prevent arbitrary shell execution
- protect project file write operations
- require explicit action before changing files
- redact secrets
- no telemetry by default

Document security assumptions.

---

# 33. Performance

Lab must not make normal VeloDom development unpleasant.

Targets:

- lazy-load heavy panels
- bounded event history
- virtualize large lists
- debounce expensive analysis
- avoid serializing giant state trees repeatedly
- detect circular state
- avoid blocking main thread where possible
- use Web Workers for heavy analysis if justified

Measure before optimizing.

---

# 34. Optional Installation

The VeloDom package or starter may expose Lab as an optional feature.

Preferred experience:

```text
Add VeloDom Lab?
● Yes
○ No
```

If yes:

- add relevant dev dependencies
- update scripts if needed
- add configuration
- add starter Lab config
- print usage

Example scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "lab": "vd lab",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

Only modify scripts if compatible with the existing repository.

If Lab is not installed, core commands must continue working normally.

---

# 35. Configuration

Create a small configuration surface only if needed.

Possible concept:

```ts
export default {
  lab: {
    enabled: true,
    learningMode: true,
    performance: true
  }
}
```

Prefer convention over excessive configuration.

Do not add config knobs unless they solve a real problem.

---

# 36. Vite Integration

Create clean Vite integration.

Possible responsibilities:

- inject development instrumentation
- establish Lab communication
- expose compiler metadata
- HMR integration
- source mapping
- error overlay integration
- virtual modules if justified

Do not duplicate Vite features that already work well.

Reuse:

- HMR
- dev server
- module graph
- source maps
- plugin hooks

where appropriate.

---

# 37. HMR

VeloDom Lab should understand hot updates.

Display useful events:

```text
Component updated through HMR
State preserved
Route unchanged
```

Do not force full reload when VeloDom can safely update.

If state preservation is not currently supported, do not fake it.

Document actual behavior.

---

# 38. Accessibility

Lab UI must support:

- keyboard navigation
- visible focus
- ARIA where appropriate
- semantic controls
- screen-reader labels
- contrast
- reduced motion
- resizable panel usability

Accessibility is a requirement, not a polish task.

---

# 39. UX Quality

Do not generate a generic low-quality admin dashboard.

The interface should feel like a professional developer tool.

Use:

- strong information hierarchy
- dense but readable layout
- good empty states
- keyboard shortcuts
- command palette
- search
- tabs
- breadcrumbs where useful
- status indicators
- contextual actions

Avoid:

- excessive gradients
- giant cards
- fake analytics
- unnecessary marketing UI inside the developer tool
- visual clutter

---

# 40. Command Palette

Add a command palette.

Example:

```text
Open Component Inspector
Open State Inspector
Toggle Update Highlights
Clear Timeline
Run Doctor
Open Routes
Open Compiler Output
Switch Learning Mode
```

Keyboard shortcut should respect platform conventions.

---

# 41. Search

Global Lab search should find relevant:

- components
- states
- routes
- files
- diagnostics
- examples

Do not build a huge indexing system initially.

Start with lightweight indexing.

---

# 42. Testing

Implement serious automated tests.

Required categories:

## Unit Tests

For:

- instrumentation
- protocol
- CLI parsing
- doctor checks
- inspectors
- serialization
- compiler metadata adapters

## Integration Tests

For:

- runtime ↔ Lab bridge
- Vite plugin
- CLI
- optional installation
- example loading
- HMR if testable

## E2E Tests

Use the repository's chosen E2E system.

Playwright is preferred if already used or appropriate.

Test workflows such as:

```text
create project
select Lab
install
run dev
open Lab
inspect state
trigger event
observe timeline
inspect route
inspect compiler output
```

Also test:

```text
create project WITHOUT Lab
build
verify no Lab dependency leaks into production
```

---

# 43. Production Safety Test

Add a specific check proving Lab is not accidentally bundled into normal production output.

Measure:

- dependency graph
- bundle output
- instrumentation markers

Fail CI if optional dev tooling leaks into production unexpectedly.

---

# 44. CLI Tests

Test interactive scaffolding.

Verify combinations such as:

```text
Minimal + JS + Lab
Minimal + TS + Lab
Blog + JS + Lab
Blog + TS + Lab
Empty + no Lab
Tailwind + Lab
ESLint + Lab
Tailwind + ESLint + Lab
```

Do not create an exponential test matrix unnecessarily.

Use representative pairwise combinations where appropriate.

---

# 45. Error Tests

Add fixtures for invalid VeloDom syntax and ensure diagnostics are useful.

Test:

- unknown bindings
- malformed expressions
- missing component
- invalid route
- runtime errors
- request failure
- compiler error

Snapshot stable diagnostic output carefully.

---

# 46. Documentation

Update project documentation.

At minimum:

```text
README
AI_CONTEXT
AI_GUIDE
SYNTAX_REFERENCE
FEATURE_INVENTORY
QUICK_START
CHANGELOG
TODO
```

Only update files that actually exist.

Add Lab documentation:

```text
docs/
  lab/
    overview
    installation
    inspector
    state
    components
    routing
    compiler
    performance
    learning-mode
    doctor
    security
```

Adapt to current docs architecture instead of forcing this structure.

---

# 47. Feature Inventory

Every implemented Lab capability must be reflected in the project's feature inventory.

Clearly distinguish:

```text
Stable
Experimental
Internal
Planned
```

Do not claim unfinished capabilities as complete.

---

# 48. Changelog

Add one coherent changelog entry.

Avoid duplicated historic entries.

Do not rewrite unrelated release history.

Clearly state whether Lab is:

```text
experimental
preview
stable
```

Choose status based on actual test coverage and implementation maturity.

---

# 49. AI Documentation

VeloDom already values AI-readable project context.

Update AI-facing documentation so coding agents can understand:

- Lab architecture
- runtime instrumentation
- protocol
- CLI
- optional installation
- safe extension points
- public vs internal APIs
- testing expectations

Do not overload AI context with generated noise.

---

# 50. API Stability

Avoid exposing too many public APIs in the first release.

Classify APIs as:

```text
Public
Experimental
Internal
```

Internal DevTools protocol should be versioned but may remain undocumented for normal users.

---

# 51. Browser Extension Future-Proofing

Do NOT build a browser extension unless architecture makes it trivial and scope permits.

However, structure communication so a future:

```text
VeloDom DevTools browser extension
```

can connect to the same devtools protocol.

Avoid architecture that permanently locks Lab to one UI host.

---

# 52. Standalone Lab Future

Design with future support for:

```text
lab.velodom.dev
```

or an online playground.

But the initial implementation should prioritize local development.

No cloud dependency.

---

# 53. Offline Behavior

Core VeloDom Lab should work offline after dependencies have been installed.

Examples, help, and syntax metadata should be shipped locally where practical.

Do not require remote CDN assets.

---

# 54. Framework Comparison Goal

Use the following ecosystems only as conceptual benchmarks:

## React ecosystem

Learn from:

- component inspection
- props/state inspection
- render highlighting
- profiling

## Vue ecosystem

Learn from:

- component tree
- state visibility
- router inspection
- event inspection
- polished framework-aware DevTools

## Svelte ecosystem

Learn from:

- simple playground/REPL
- compiler visibility
- low-friction examples

## Angular ecosystem

Learn from:

- component hierarchy
- dependency clarity
- performance debugging

## Astro ecosystem

Learn from:

- development toolbar
- nonintrusive dev overlays
- plugin mindset

## Qwik ecosystem

Learn from:

- fine-grained execution visibility
- lazy execution concepts
- performance transparency

## Vite

Learn from:

- HMR
- plugin architecture
- source maps
- dev server integration

The VeloDom implementation must remain original.

---

# 55. VeloDom-Specific Differentiators

Do not merely recreate generic framework DevTools.

Create features that specifically showcase VeloDom.

Prioritize:

1. Compiler Inspector
2. State → Binding → DOM visualization
3. Event → State → Update timeline
4. DOM → VeloDom source mapping
5. Learning Mode
6. `vd doctor`
7. optional Lab installation
8. lightweight production footprint

The ideal experience should make a developer say:

> “I can actually see how VeloDom works.”

---

# 56. Installation Design

Evaluate whether Lab should be:

```text
A. bundled in the main package but lazy/optional
B. a separate npm dev package installed by the VeloDom starter
C. workspace package published separately
D. hybrid architecture
```

Choose the architecture that best satisfies:

- minimal core install size
- minimal production footprint
- easy starter UX
- maintainability
- independent Lab releases if necessary

Do not choose based on convenience alone.

Document the decision.

My preferred direction is:

```text
User chooses Lab during scaffolding
↓
starter adds a Lab dev dependency
↓
core VeloDom remains lean
↓
CLI configures integration automatically
```

But confirm against the actual repository before implementation.

---

# 57. Backward Compatibility

Existing applications must keep working.

Specifically verify:

```bash
npm run dev
npm run build
npm run preview
```

without requiring Lab.

Do not rename existing public commands or APIs unnecessarily.

---

# 58. Version Compatibility

Lab should detect compatible VeloDom versions.

If incompatible:

```text
VeloDom Lab 1.2 requires VeloDom >=1.x <2.x

Installed:
VeloDom 0.x
```

Provide actionable resolution.

Avoid mysterious crashes.

---

# 59. Structured Diagnostics

Create a reusable diagnostics schema.

Conceptual example:

```ts
type Diagnostic = {
  code: string
  severity: "info" | "warning" | "error"
  title: string
  message: string
  file?: string
  line?: number
  column?: number
  hint?: string
  docs?: string
}
```

Use one diagnostic model across:

- compiler
- doctor
- Lab
- CLI
- future editor integration

Adapt to existing diagnostic architecture if already present.

---

# 60. Logging

Use structured dev logging.

Levels:

```text
debug
info
warn
error
```

Do not flood users with logs.

Provide:

```bash
vd lab --debug
```

if consistent with current CLI patterns.

Redact sensitive data.

---

# 61. File Writing

The Lab should be read-only by default when inspecting a project.

Actions that modify project files must require explicit user action.

Before write:

```text
Show diff
Confirm
Apply
```

Provide undo or backup where practical.

---

# 62. Source Export

Playground examples should be exportable into the user's project.

Example:

```text
Export Example
→ choose destination
→ preview files
→ write
```

Prevent path traversal.

Prevent overwriting files without explicit confirmation.

---

# 63. Large Project Handling

Ensure Lab remains usable for larger projects.

Add:

- result limits
- virtualized trees
- filters
- lazy node expansion
- bounded history
- state preview truncation

Never stringify the entire app state on every event.

---

# 64. Serialization

Create a safe serializer for inspector values.

Handle:

- circular references
- functions
- DOM nodes
- Errors
- Dates
- Maps/Sets
- typed arrays
- large objects
- symbols

Avoid executing getters if unsafe.

Protect against runaway serialization.

---

# 65. Dev Event Buffer

Use bounded buffers.

Example configurable internal defaults:

```text
Timeline: last 500 events
Network: last 200 requests
Errors: last 100 entries
```

Choose values based on actual implementation needs.

Do not leak memory during long dev sessions.

---

# 66. Source Maps

Use source maps so generated runtime/compiler events point back to original VeloDom source wherever possible.

This is extremely important.

Do not expose only generated JavaScript locations if original source mapping is available.

---

# 67. Compiler Metadata

If necessary, extend compiler output with development metadata.

Examples:

- component IDs
- binding IDs
- source ranges
- state dependency IDs

Metadata must be:

- deterministic
- compact
- dev-only when possible

Avoid shipping large debug maps in production.

---

# 68. IDs

Runtime identifiers must be stable enough for a single development session.

Avoid user-visible random IDs where source-based identifiers can be generated safely.

Never use paths containing private machine details in exported reports unless explicitly requested.

---

# 69. Reports

Allow exporting a debugging report.

Example:

```bash
vd doctor --report
```

or Lab:

```text
Export Diagnostic Report
```

Report may include:

- VeloDom version
- Node version
- Vite version
- sanitized config
- diagnostics
- selected timeline data

Never include:

- secrets
- env values
- auth tokens
- cookies
- full private source code by default

---

# 70. Keyboard Shortcuts

Suggested capabilities:

```text
Ctrl/Cmd + K  Command palette
Ctrl/Cmd + P  Search source/entity
Esc           Exit inspect mode
```

Do not override browser/system shortcuts unnecessarily.

---

# 71. Dark / Light Theme

Support:

```text
System
Light
Dark
```

Persist locally.

Do not add theme libraries unless necessary.

---

# 72. Responsive Design

Desktop is the primary target.

Still ensure smaller screens do not become unusable.

On narrow screens:

- tabs replace simultaneous panels
- inspector remains accessible
- code editor remains usable

---

# 73. Dependency Policy

Before adding dependencies:

1. check whether repository already contains equivalent functionality
2. prefer small proven packages
3. avoid enormous dependencies for trivial jobs
4. avoid abandoned libraries
5. document why significant dependencies were added

Keep VeloDom's install footprint reasonable.

---

# 74. Coding Standards

Follow the repository's current:

- formatting
- lint rules
- TypeScript configuration
- module system
- naming
- package patterns
- test style

Do not introduce a second coding style.

---

# 75. Refactoring

Refactor only when needed for a clean DevTools boundary.

When touching old code:

- remove dead code where clearly safe
- clean duplicated logic
- improve typing
- fix debug leftovers
- preserve public behavior

Do not perform unrelated massive rewrites.

---

# 76. Implementation Phases

Work in phases.

## Phase 0 — Repository Audit

Produce an internal implementation map:

```text
Current runtime architecture
Current compiler architecture
Current CLI
Current Vite integration
Current package boundaries
Current testing
Current docs
Risks
```

Do not modify code until the architecture is understood.

## Phase 1 — DevTools Foundation

Implement:

- instrumentation
- internal protocol
- safe serializer
- Vite bridge
- tests

## Phase 2 — Lab Shell

Implement:

- UI shell
- panels
- communication
- command palette
- navigation

## Phase 3 — Core Inspectors

Implement:

- components
- state
- bindings
- DOM mapping
- events
- timeline

## Phase 4 — Framework Systems

Implement:

- router
- requests
- compiler
- performance

## Phase 5 — CLI

Implement:

- `vd lab`
- `vd inspect`
- `vd doctor`

## Phase 6 — Learning / Examples

Implement:

- playground
- examples
- learning mode
- docs integration

## Phase 7 — Starter Integration

Add optional:

```text
Add VeloDom Lab?
```

## Phase 8 — Hardening

Complete:

- security
- performance
- accessibility
- E2E
- production leakage tests

## Phase 9 — Documentation

Update all relevant docs and release metadata.

---

# 77. Do Not Stop at Scaffolding

Do not return a folder full of placeholders.

For each implemented feature:

- implement functionality
- test it
- document it
- integrate it

If scope must be reduced, prioritize a complete high-quality vertical slice rather than dozens of fake panels.

Priority vertical slice:

```text
vd lab
→ open Lab
→ inspect component
→ inspect state
→ click app button
→ see state change
→ see binding update
→ see DOM update
→ open source
→ inspect compiler output
```

This path must actually work.

---

# 78. No Fake Features

Do not add buttons that do nothing.

Do not show fabricated performance metrics.

Do not invent framework support.

Do not claim network interception if it is not implemented.

Do not label mock data as runtime data.

Development placeholders must be clearly marked and should not remain in final release.

---

# 79. Verification Checklist

Before considering the task complete, verify:

```text
[ ] Existing VeloDom app still works
[ ] Existing tests pass
[ ] Core build passes
[ ] Lab is optional
[ ] No Lab production leak
[ ] `vd lab` works
[ ] `vd inspect` works
[ ] `vd doctor` works
[ ] component inspector works
[ ] state inspector works
[ ] bindings inspector works
[ ] timeline works
[ ] DOM highlighting works
[ ] router inspector works if router exists
[ ] request inspector works if framework request API exists
[ ] compiler inspector works
[ ] source maps work
[ ] error overlay works
[ ] playground works
[ ] JS starter works
[ ] TS starter works
[ ] Lab installer option works
[ ] no-Lab installer path works
[ ] build works
[ ] preview works
[ ] E2E passes
[ ] accessibility baseline passes
[ ] docs updated
[ ] changelog updated
[ ] feature inventory updated
```

---

# 80. Final Deliverables

At completion provide:

## A. Architecture Summary

Explain:

- packages changed
- new packages
- data flow
- runtime instrumentation
- Vite integration
- Lab UI
- CLI

## B. File Change List

List:

```text
Added
Modified
Deleted
```

with reasons.

## C. Feature Matrix

For every requested feature:

```text
Implemented
Partial
Deferred
Not applicable
```

Never hide missing work.

## D. Test Results

Report actual executed commands and results.

Example:

```text
npm test
npm run build
npm run typecheck
...
```

Do not claim a command passed if it was not executed.

## E. Bundle Impact

Compare:

```text
core before
core after
with Lab
without Lab
production build
```

Where measurement is available.

## F. Known Limitations

Explicitly list limitations.

## G. Recommended Next Steps

Recommend future improvements only after the working implementation is complete.

---

# 81. Decision Rules

When uncertain:

1. inspect existing VeloDom implementation
2. preserve backward compatibility
3. prefer minimal public API
4. prefer optional dev-only integration
5. prefer deterministic tooling before AI
6. reuse Vite rather than duplicating it
7. test real behavior
8. document tradeoffs

Do not ask unnecessary questions.

Make strong engineering decisions based on repository evidence.

---

# 82. Definition of Success

This feature succeeds when a developer can install VeloDom, optionally choose Lab, start the project, open VeloDom Lab, and visually understand:

```text
What components exist?
What state exists?
What changed?
Why did it change?
Which binding reacted?
Which DOM node changed?
Which route is active?
Which request happened?
What did the compiler generate?
Was the update expensive?
Where is the source?
How can I fix the problem?
```

The experience should be useful both to:

```text
a beginner learning VeloDom
```

and:

```text
an experienced framework developer debugging a complex application
```

The final result must feel like one coherent VeloDom product.

---

# 83. Execution Instruction for Codex

Begin now.

First inspect the entire repository and create a concise implementation plan based on the actual codebase.

Then execute the plan phase by phase.

Do not merely describe the solution.

Modify the repository.

Run tests continuously.

Fix regressions before moving forward.

Prefer production-quality implementation over maximum feature count.

When an architectural conflict is discovered, choose the solution that preserves VeloDom's core principles:

```text
compiler-first
HTML-first
simple
fast
lightweight
beginner-friendly
AI-readable
developer-friendly
```

Do not break existing VeloDom syntax merely to simplify DevTools implementation.

The Lab must adapt to VeloDom — VeloDom should not become bloated to accommodate the Lab.
