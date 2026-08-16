# VeloDom

VeloDom is an HTML-first, compiler-first frontend framework for lightweight,
folder-first web applications.

The full framework guide, installation instructions, API examples, architecture,
release notes, and roadmap are in [docs/README.md](docs/README.md).

For the publishable package, see
[packages/velodom](packages/velodom/README.md). The repository's working
application is the VeloDom documentation blog in `examples/blog`.

## Quick Start

```bash
npm install
npm run dev
```

The workspace is TypeScript, Vite, ESLint, Tailwind CSS, and Node.js. It keeps
the framework in `packages/velodom`, the real blog consumer in `examples/blog`,
and the full documentation, decisions, changelog, and roadmap in `docs/`.

## Current Status

V1 is locally verified with 216 automated tests, package-consumer validation,
and production build checks. The roadmap is [docs/TODO.md](docs/TODO.md);
remaining work is release governance, a strict Firefox-capable browser run,
optional CSS budgets, and starter presets.
