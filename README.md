# VeloDom

VeloDom is an HTML-first, compiler-first frontend framework for lightweight,
folder-first web applications. Framework internals are written in TypeScript;
application authors may use Vanilla JavaScript or TypeScript without changing
the authoring model.

The full framework guide, installation instructions, API examples,
architecture, release notes, and roadmap are in
[docs/README.md](docs/README.md).

For the publishable package, see
[packages/velodom](packages/velodom/README.md). The repository's working
application is the VeloDom documentation blog in `examples/blog`.

## Technology

- TypeScript framework source and generated ESM declarations
- Vite compiler/build integration
- ESLint and Node.js tests
- Tailwind CSS and daisyUI in the example application only
- Playwright-based real-browser verification

## Run the Workspace

```bash
npm install
npm run dev
```

Useful verification commands:

```bash
npm test
npm run check
npm run build
npm run pack:check
```

## Repository Structure

```text
packages/velodom/         Publishable framework package
packages/velodom-vscode/  Optional private editor-tooling prototype
examples/blog/            Real application consuming public package exports
tools/                    Repository tests and release/build verification
docs/                     Guide, architecture, decisions, roadmap, and history
```

Generated dependencies and build artifacts (`node_modules`, `lib`, `types`,
and `dist`) are intentionally ignored by Git and recreated through npm scripts.
They are not application source and are not published unless explicitly
allowlisted by `packages/velodom/package.json`.

## Current Status

V1 is locally verified with 233 automated tests, package-consumer validation,
and production build checks. The roadmap is [docs/TODO.md](docs/TODO.md);
remaining work is release governance, a strict Firefox-capable browser run,
and starter presets.

The npm package has a strict `files` allowlist, explicit public exports,
package-consumer tests, and a dry-run tarball check. It intentionally keeps
`private: true`; this prevents accidental publication until the npm account,
name ownership, 2FA policy, version, and release approval are confirmed.

The next product roadmap is intentionally staged: V1.1 has completed opt-in
static prerendering, conventional page data loading, and progressive native
forms, generated application declarations, and optional derived state. V1.2
adds optional production adapters and ecosystem tooling; V2 investigates
hybrid rendering and partial hydration. See
[docs/TODO.md](docs/TODO.md) for the complete rationale and order.

## Completed Organization Work

- Consolidated reusable framework code under `packages/velodom`.
- Kept application-owned pages, components, layouts, APIs, and assets in the
  independent example project.
- Moved repository-only tests, fixtures, and scripts under `tools`.
- Made framework builds self-contained inside the npm package workspace.
- Registered the optional VS Code prototype as a private workspace consumer.
- Added npm metadata and automated package-boundary checks.

## Next Tasks

- Complete the strict browser matrix on a Firefox-capable CI/release machine.
- Confirm npm package ownership, publishing account, access, and 2FA policy.
- Approve the exact V1 release notes and tag before enabling publication.
- Publish the package before adding npm-installable starter presets.
- Continue only the optional items recorded in [docs/TODO.md](docs/TODO.md).

## Handoff Notes

- Do not move user application files into the framework package.
- Do not import private paths such as `velodom/lib/*`; use documented exports.
- Do not delete `packages/velodom/lib` or `packages/velodom/types` merely to
  clean the tree. They are ignored, generated local outputs used for testing.
- Do not remove `private: true` or publish without explicit owner approval.
- Update this file, `docs/TODO.md`, `docs/CHANGELOG.md`, and relevant decisions
  after architecture or release-readiness changes.
